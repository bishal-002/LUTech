
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const AdminProfile = require("../models/AdminProfile");

const { writeAuditLog } = require("../services/auditLogService");

const {
    OTP_EXPIRY_MS,
    OTP_MAX_ATTEMPTS,
    encryptSecret,
    decryptSecret,
    generateTotpSecret,
    verifyTotpCode,
    buildOtpAuthUrl,
    generateEmailOtp,
    hashOtp,
    verifyHashedOtp,
    sendEmailOtp,
    normalizeAllowedIps,
    isIpAllowed,
    getRequestIp,
} = require("../services/adminSecurityService");

// ======================================================
// COMMON HELPERS
// ======================================================

class HttpError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

const handleError = (res, error, fallbackMessage) => {
    let statusCode = error.statusCode || 500;

    if (error.name === "ValidationError") {
        statusCode = 400;
    }

    if (error.code === 11000) {
        statusCode = 409;
    }

    if (statusCode === 500) {
        console.error(fallbackMessage, error);
    }

    return res.status(statusCode).json({
        message:
            statusCode === 500
                ? fallbackMessage
                : error.message,
    });
};

const getOwnAdminProfile = async (userId) =>
    AdminProfile.findOne({ userId }).select([
        "+security.twoFactorSecretEncrypted",
        "+security.twoFactorPendingMethod",
        "+security.twoFactorPendingSecretEncrypted",
        "+security.twoFactorSetupExpiresAt",
        "+security.twoFactorSetupOtpHash",
        "+security.twoFactorSetupOtpAttempts",
        "+security.twoFactorDisableOtpHash",
        "+security.twoFactorDisableOtpExpiresAt",
        "+security.twoFactorDisableOtpAttempts",
    ].join(" "));

const normalizePhone = (phone) => {
    if (typeof phone !== "string") return "";

    let value = phone.trim().replace(/[\s-]/g, "");

    if (/^01[3-9]\d{8}$/.test(value)) {
        value = `+880${value.slice(1)}`;
    } else if (/^8801[3-9]\d{8}$/.test(value)) {
        value = `+${value}`;
    }

    return value;
};

const isValidBangladeshPhone = (phone) =>
    /^\+8801[3-9]\d{8}$/.test(phone);

const maskPhone = (phone) => {
    if (typeof phone !== "string" || phone.length < 8) {
        return "";
    }

    return `${phone.slice(0, 6)}******${phone.slice(-3)}`;
};

const normalizeNote = (note, required = false) => {
    if (typeof note !== "string") {
        if (required) {
            throw new HttpError(400, "An internal note is required.");
        }

        return "";
    }

    const value = note.trim();

    if (value.length > 500) {
        throw new HttpError(
            400,
            "The internal note cannot exceed 500 characters."
        );
    }

    if (required && !value) {
        throw new HttpError(400, "An internal note is required.");
    }

    return value;
};

const createSecuritySnapshot = (profile, user) => ({
    userId: user._id.toString(),
    phone: maskPhone(user.phone || ""),
    twoFactorEnabled: Boolean(
        profile.security?.twoFactorEnabled
    ),
    twoFactorMethod:
        profile.security?.twoFactorMethod || null,
    allowedIps: [
        ...(profile.security?.allowedIps || []),
    ],
});

// ======================================================
// START TWO-FACTOR ENROLLMENT
// POST /api/admin/security/2fa/setup
// ======================================================

const startTwoFactorSetup = async (req, res) => {
    try {
        const { method } = req.body || {};

        if (!["authenticator_app", "email_otp"].includes(method)) {
            return res.status(400).json({
                message:
                    "Method must be authenticator_app or email_otp.",
            });
        }

        const user = await User.findById(req.user._id);

        if (!user || user.role !== "admin") {
            return res.status(403).json({
                message: "Administrator account required.",
            });
        }

        if (!user.isVerified || user.status !== "active") {
            return res.status(403).json({
                message: "Your administrator account is not active.",
            });
        }

        const profile = await getOwnAdminProfile(user._id);

        if (!profile || profile.status !== "active") {
            return res.status(403).json({
                message: "Active administrator profile required.",
            });
        }

        if (profile.security.twoFactorEnabled) {
            return res.status(409).json({
                message: "Two-factor authentication is already enabled.",
            });
        }

        const now = new Date();

        profile.security.twoFactorPendingMethod = method;
        profile.security.twoFactorSetupExpiresAt =
            new Date(now.getTime() + OTP_EXPIRY_MS);

        profile.security.twoFactorSetupOtpAttempts = 0;
        profile.security.twoFactorSetupOtpHash = undefined;
        profile.security.twoFactorPendingSecretEncrypted =
            undefined;

        if (method === "authenticator_app") {
            const secret = generateTotpSecret();

            profile.security.twoFactorPendingSecretEncrypted =
                encryptSecret(secret);

            await profile.save();

            return res.status(200).json({
                message:
                    "Scan the authenticator setup URI or enter the secret manually. Then verify the code to enable 2FA.",
                method,
                secret,
                otpAuthUrl: buildOtpAuthUrl(
                    secret,
                    user.email
                ),
                expiresIn: OTP_EXPIRY_MS / 1000,
            });
        }

        // Email OTP enrollment.
        const otp = generateEmailOtp();

        profile.security.twoFactorSetupOtpHash =
            await hashOtp(otp);

        await profile.save();

        try {
            await sendEmailOtp({
                email: user.email,
                otp,
                subject: "LUTech Administrator 2FA Setup",
                purpose: "two-factor authentication setup",
            });
        } catch (mailError) {
            console.error("2FA setup email failed:", mailError);

            profile.security.twoFactorPendingMethod = undefined;
            profile.security.twoFactorSetupExpiresAt = null;
            profile.security.twoFactorSetupOtpHash = undefined;

            await profile.save();

            return res.status(503).json({
                message:
                    "Unable to send the administrator setup verification code.",
            });
        }

        return res.status(200).json({
            message:
                "A verification code has been sent to your administrator email.",
            method,
            expiresIn: OTP_EXPIRY_MS / 1000,
        });
    } catch (error) {
        return handleError(
            res,
            error,
            "Unable to start two-factor authentication setup."
        );
    }
};

// ======================================================
// ENABLE TWO-FACTOR AUTHENTICATION
// POST /api/admin/security/2fa/enable
// ======================================================

const enableTwoFactor = async (req, res) => {
    try {
        const { code } = req.body || {};

        if (
            typeof code !== "string" ||
            !/^\d{6}$/.test(code.trim())
        ) {
            return res.status(400).json({
                message: "A six-digit verification code is required.",
            });
        }

        const user = await User.findById(req.user._id);

        if (!user || user.role !== "admin") {
            return res.status(403).json({
                message: "Administrator account required.",
            });
        }

        const profile = await getOwnAdminProfile(user._id);

        if (!profile || profile.status !== "active") {
            return res.status(403).json({
                message: "Active administrator profile required.",
            });
        }

        const security = profile.security;
        const method = security.twoFactorPendingMethod;

        if (!method) {
            return res.status(400).json({
                message:
                    "No pending two-factor enrollment. Start setup first.",
            });
        }

        if (
            !security.twoFactorSetupExpiresAt ||
            security.twoFactorSetupExpiresAt.getTime() <= Date.now()
        ) {
            security.twoFactorPendingMethod = undefined;
            security.twoFactorPendingSecretEncrypted = undefined;
            security.twoFactorSetupOtpHash = undefined;
            security.twoFactorSetupExpiresAt = null;

            await profile.save();

            return res.status(400).json({
                message:
                    "The two-factor setup has expired. Start setup again.",
            });
        }

        if (
            security.twoFactorSetupOtpAttempts >= OTP_MAX_ATTEMPTS
        ) {
            return res.status(429).json({
                message:
                    "Too many incorrect setup attempts. Start setup again.",
            });
        }

        let verified = false;

        if (method === "authenticator_app") {
            if (!security.twoFactorPendingSecretEncrypted) {
                return res.status(400).json({
                    message: "Pending authenticator secret is missing.",
                });
            }

            const secret = decryptSecret(
                security.twoFactorPendingSecretEncrypted
            );

            verified = verifyTotpCode(secret, code.trim());
        } else if (method === "email_otp") {
            verified = await verifyHashedOtp(
                code.trim(),
                security.twoFactorSetupOtpHash
            );
        }

        if (!verified) {
            security.twoFactorSetupOtpAttempts += 1;

            const attemptsRemaining =
                OTP_MAX_ATTEMPTS -
                security.twoFactorSetupOtpAttempts;

            if (attemptsRemaining <= 0) {
                security.twoFactorPendingMethod = undefined;
                security.twoFactorPendingSecretEncrypted = undefined;
                security.twoFactorSetupOtpHash = undefined;
                security.twoFactorSetupExpiresAt = null;
            }

            await profile.save();

            return res.status(
                attemptsRemaining <= 0 ? 429 : 400
            ).json({
                message:
                    attemptsRemaining <= 0
                        ? "Too many incorrect attempts. Start setup again."
                        : `Invalid verification code. ${attemptsRemaining} attempts remaining.`,
            });
        }

        const before = {
            twoFactorEnabled: false,
            twoFactorMethod: null,
        };

        profile.security.twoFactorEnabled = true;
        profile.security.twoFactorMethod = method;

        if (method === "authenticator_app") {
            profile.security.twoFactorSecretEncrypted =
                security.twoFactorPendingSecretEncrypted;
        } else {
            profile.security.twoFactorSecretEncrypted = undefined;
        }

        // Clear all pending enrollment data.
        profile.security.twoFactorPendingMethod = undefined;
        profile.security.twoFactorPendingSecretEncrypted =
            undefined;
        profile.security.twoFactorSetupOtpHash = undefined;
        profile.security.twoFactorSetupExpiresAt = null;
        profile.security.twoFactorSetupOtpAttempts = 0;

        await profile.save();

        await writeAuditLog({
            adminId: user._id,
            action: "ADMIN_2FA_ENABLED",
            targetType: "AdminProfile",
            targetId: profile._id,
            changes: {
                before,
                after: {
                    twoFactorEnabled: true,
                    twoFactorMethod: method,
                },
            },
        });

        return res.status(200).json({
            message: "Two-factor authentication enabled successfully.",
            twoFactorEnabled: true,
            twoFactorMethod: method,
        });
    } catch (error) {
        return handleError(
            res,
            error,
            "Unable to enable two-factor authentication."
        );
    }
};

// ======================================================
// REQUEST 2FA DISABLE CODE
// POST /api/admin/security/2fa/disable/request
// ======================================================

const requestDisableTwoFactor = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user || user.role !== "admin") {
            return res.status(403).json({
                message: "Administrator account required.",
            });
        }

        const profile = await getOwnAdminProfile(user._id);

        if (!profile || profile.status !== "active") {
            return res.status(403).json({
                message: "Active administrator profile required.",
            });
        }

        if (!profile.security.twoFactorEnabled) {
            return res.status(400).json({
                message: "Two-factor authentication is not enabled.",
            });
        }

        if (
            profile.security.twoFactorMethod === "authenticator_app"
        ) {
            return res.status(200).json({
                message:
                    "Open your authenticator app. Submit its current code to the disable endpoint.",
                method: "authenticator_app",
            });
        }

        if (profile.security.twoFactorMethod !== "email_otp") {
            return res.status(400).json({
                message: "Invalid two-factor authentication method.",
            });
        }

        const otp = generateEmailOtp();

        profile.security.twoFactorDisableOtpHash =
            await hashOtp(otp);

        profile.security.twoFactorDisableOtpExpiresAt =
            new Date(Date.now() + OTP_EXPIRY_MS);

        profile.security.twoFactorDisableOtpAttempts = 0;

        await profile.save();

        try {
            await sendEmailOtp({
                email: user.email,
                otp,
                subject: "LUTech Administrator 2FA Disable Verification",
                purpose: "two-factor authentication disable request",
            });
        } catch (mailError) {
            console.error("2FA disable email failed:", mailError);

            profile.security.twoFactorDisableOtpHash = undefined;
            profile.security.twoFactorDisableOtpExpiresAt = null;

            await profile.save();

            return res.status(503).json({
                message:
                    "Unable to send the verification code to your email.",
            });
        }

        return res.status(200).json({
            message:
                "A verification code has been sent to your administrator email.",
            method: "email_otp",
            expiresIn: OTP_EXPIRY_MS / 1000,
        });
    } catch (error) {
        return handleError(
            res,
            error,
            "Unable to request two-factor authentication disable."
        );
    }
};

// ======================================================
// DISABLE TWO-FACTOR AUTHENTICATION
// POST /api/admin/security/2fa/disable
// ======================================================

const disableTwoFactor = async (req, res) => {
    try {
        const { code, note } = req.body || {};

        if (
            typeof code !== "string" ||
            !/^\d{6}$/.test(code.trim())
        ) {
            return res.status(400).json({
                message: "A six-digit verification code is required.",
            });
        }

        const normalizedNote = normalizeNote(note, true);

        const user = await User.findById(req.user._id);

        if (!user || user.role !== "admin") {
            return res.status(403).json({
                message: "Administrator account required.",
            });
        }

        const profile = await getOwnAdminProfile(user._id);

        if (!profile || profile.status !== "active") {
            return res.status(403).json({
                message: "Active administrator profile required.",
            });
        }

        const security = profile.security;

        if (!security.twoFactorEnabled) {
            return res.status(400).json({
                message: "Two-factor authentication is not enabled.",
            });
        }

        let verified = false;

        if (security.twoFactorMethod === "authenticator_app") {
            if (!security.twoFactorSecretEncrypted) {
                return res.status(400).json({
                    message: "Authenticator configuration is incomplete.",
                });
            }

            const secret = decryptSecret(
                security.twoFactorSecretEncrypted
            );

            verified = verifyTotpCode(secret, code.trim());
        } else if (security.twoFactorMethod === "email_otp") {
            if (
                !security.twoFactorDisableOtpHash ||
                !security.twoFactorDisableOtpExpiresAt ||
                security.twoFactorDisableOtpExpiresAt.getTime() <= Date.now()
            ) {
                return res.status(400).json({
                    message:
                        "Request a new email verification code before disabling 2FA.",
                });
            }

            if (
                security.twoFactorDisableOtpAttempts >= OTP_MAX_ATTEMPTS
            ) {
                return res.status(429).json({
                    message:
                        "Too many incorrect attempts. Request a new code.",
                });
            }

            verified = await verifyHashedOtp(
                code.trim(),
                security.twoFactorDisableOtpHash
            );

            if (!verified) {
                security.twoFactorDisableOtpAttempts += 1;
                await profile.save();

                return res.status(400).json({
                    message: "Invalid email verification code.",
                });
            }
        }

        if (!verified) {
            return res.status(400).json({
                message: "Invalid authenticator verification code.",
            });
        }

        const before = {
            twoFactorEnabled: true,
            twoFactorMethod: security.twoFactorMethod,
        };

        security.twoFactorEnabled = false;
        security.twoFactorMethod = undefined;
        security.twoFactorSecretEncrypted = undefined;

        security.twoFactorPendingMethod = undefined;
        security.twoFactorPendingSecretEncrypted = undefined;
        security.twoFactorSetupOtpHash = undefined;
        security.twoFactorSetupExpiresAt = null;
        security.twoFactorSetupOtpAttempts = 0;

        security.twoFactorDisableOtpHash = undefined;
        security.twoFactorDisableOtpExpiresAt = null;
        security.twoFactorDisableOtpAttempts = 0;

        security.twoFactorChallengeId = undefined;
        security.twoFactorChallengeExpiresAt = null;
        security.twoFactorChallengeAttempts = 0;

        security.twoFactorLoginOtpHash = undefined;
        security.twoFactorLoginOtpExpiresAt = null;
        security.twoFactorLoginOtpAttempts = 0;

        await profile.save();

        await writeAuditLog({
            adminId: user._id,
            action: "ADMIN_2FA_DISABLED",
            targetType: "AdminProfile",
            targetId: profile._id,
            changes: {
                before,
                after: {
                    twoFactorEnabled: false,
                    twoFactorMethod: null,
                },
            },
            note: normalizedNote,
        });

        return res.status(200).json({
            message: "Two-factor authentication disabled successfully.",
            twoFactorEnabled: false,
        });
    } catch (error) {
        return handleError(
            res,
            error,
            "Unable to disable two-factor authentication."
        );
    }
};

// ======================================================
// CHANGE ADMINISTRATOR PASSWORD
// PATCH /api/admin/security/password
// ======================================================

const changeAdminPassword = async (req, res) => {
    try {
        const {
            currentPassword,
            newPassword,
            confirmPassword,
        } = req.body || {};

        if (
            typeof currentPassword !== "string" ||
            typeof newPassword !== "string" ||
            typeof confirmPassword !== "string"
        ) {
            return res.status(400).json({
                message:
                    "Current password, new password and confirmation are required.",
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "New password and confirmation do not match.",
            });
        }

        if (
            newPassword.length < 12 ||
            !/[a-z]/.test(newPassword) ||
            !/[A-Z]/.test(newPassword) ||
            !/\d/.test(newPassword) ||
            !/[^A-Za-z0-9]/.test(newPassword)
        ) {
            return res.status(400).json({
                message:
                    "New password must contain at least 12 characters, including uppercase, lowercase, number and special character.",
            });
        }

        const user = await User.findById(req.user._id)
            .select("+password");

        if (!user || user.role !== "admin") {
            return res.status(403).json({
                message: "Administrator account required.",
            });
        }

        const currentMatches = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!currentMatches) {
            return res.status(400).json({
                message: "Current password is incorrect.",
            });
        }

        const samePassword = await bcrypt.compare(
            newPassword,
            user.password
        );

        if (samePassword) {
            return res.status(400).json({
                message:
                    "New password must be different from your current password.",
            });
        }

        const profile = await getOwnAdminProfile(user._id);

        if (!profile || profile.status !== "active") {
            return res.status(403).json({
                message: "Active administrator profile required.",
            });
        }

        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();

        // Move the timestamp to the next full second so every
        // token issued before the password change is invalidated.
        const passwordChangedAt = new Date(
            (Math.floor(Date.now() / 1000) + 1) * 1000
        );

        profile.security.passwordChangedAt = passwordChangedAt;

        // Invalidate pending login challenges as a precaution.
        profile.security.twoFactorChallengeId = undefined;
        profile.security.twoFactorChallengeExpiresAt = null;
        profile.security.twoFactorLoginOtpHash = undefined;
        profile.security.twoFactorLoginOtpExpiresAt = null;

        await profile.save();

        await writeAuditLog({
            adminId: user._id,
            action: "ADMIN_PASSWORD_CHANGED",
            targetType: "AdminProfile",
            targetId: profile._id,
            changes: {
                before: {
                    passwordChangedAt: null,
                },
                after: {
                    passwordChangedAt,
                },
            },
        });

        return res.status(200).json({
            message:
                "Administrator password changed successfully. Please log in again.",
            reauthenticationRequired: true,
        });
    } catch (error) {
        return handleError(
            res,
            error,
            "Unable to change administrator password."
        );
    }
};

// ======================================================
// SUPER ADMIN: UPDATE ANOTHER ADMIN'S SECURITY SETTINGS
// PATCH /api/admin/profiles/:id/security
// ======================================================

const updateAdminSecuritySettings = async (req, res) => {
    try {
        if (req.adminProfile?.adminRole !== "super_admin") {
            return res.status(403).json({
                message:
                    "Only a Super Admin can manage administrator security settings.",
            });
        }

        const { id } = req.params;
        const body = req.body || {};

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid administrator profile ID.",
            });
        }

        const allowedFields = ["phone", "allowedIps", "note"];

        const unsupportedFields = Object.keys(body).filter(
            (field) => !allowedFields.includes(field)
        );

        if (unsupportedFields.length > 0) {
            return res.status(400).json({
                message:
                    `Unsupported security fields: ${unsupportedFields.join(", ")}`,
            });
        }

        const hasPhone =
            Object.prototype.hasOwnProperty.call(body, "phone");

        const hasAllowedIps =
            Object.prototype.hasOwnProperty.call(body, "allowedIps");

        if (!hasPhone && !hasAllowedIps) {
            return res.status(400).json({
                message:
                    "Provide a phone number or allowed IP list to update.",
            });
        }

        const profile = await AdminProfile.findById(id);

        if (!profile) {
            return res.status(404).json({
                message: "Administrator profile not found.",
            });
        }

        if (profile.status === "revoked") {
            return res.status(400).json({
                message:
                    "Security settings cannot be changed for a revoked administrator.",
            });
        }

        const user = await User.findById(profile.userId);

        if (!user) {
            return res.status(404).json({
                message: "Linked administrator user account not found.",
            });
        }

        const before = createSecuritySnapshot(profile, user);
        let phoneChanged = false;
        let ipsChanged = false;

        if (hasPhone) {
            const phone = normalizePhone(body.phone);

            if (!isValidBangladeshPhone(phone)) {
                return res.status(400).json({
                    message:
                        "Enter a valid Bangladesh phone number, such as +8801XXXXXXXXX.",
                });
            }

            if (phone !== user.phone) {
                const duplicate = await User.findOne({
                    phone,
                    _id: { $ne: user._id },
                }).select("_id");

                if (duplicate) {
                    return res.status(409).json({
                        message: "This phone number is already registered.",
                    });
                }

                user.phone = phone;
                user.isPhoneVerified = false;
                phoneChanged = true;
            }
        }

        if (hasAllowedIps) {
            let normalizedIps;

            try {
                normalizedIps = normalizeAllowedIps(body.allowedIps);
            } catch (error) {
                return res.status(400).json({
                    message: error.message,
                });
            }

            const needsRestriction =
                profile.adminRole === "super_admin" ||
                profile.department === "Finance";

            if (!needsRestriction && normalizedIps.length > 0) {
                return res.status(400).json({
                    message:
                        "IP restrictions are only available for Super Admins and Finance department administrators.",
                });
            }

            const isOwnProfile =
                user._id.toString() === req.user._id.toString();

            if (
                isOwnProfile &&
                needsRestriction &&
                normalizedIps.length > 0 &&
                !isIpAllowed(getRequestIp(req), normalizedIps)
            ) {
                return res.status(400).json({
                    message:
                        "Your current IP address is not included in the new whitelist. Add your current IP before saving.",
                });
            }

            const previousIps =
                profile.security.allowedIps || [];

            ipsChanged =
                JSON.stringify([...previousIps].sort()) !==
                JSON.stringify([...normalizedIps].sort());

            profile.security.allowedIps = normalizedIps;
        }

        if (!phoneChanged && !ipsChanged) {
            return res.status(400).json({
                message:
                    "No changes were detected in administrator security settings.",
            });
        }

        if (phoneChanged) {
            await user.save();
        }

        if (ipsChanged) {
            await profile.save();
        }

        const after = createSecuritySnapshot(profile, user);

        await writeAuditLog({
            adminId: req.user._id,
            action: "ADMIN_SECURITY_SETTINGS_UPDATED",
            targetType: "AdminProfile",
            targetId: profile._id,
            changes: {
                before,
                after,
            },
            note: normalizeNote(body.note),
        });

        const updatedProfile = await AdminProfile.findById(
            profile._id
        )
            .select("-security.twoFactorSecretEncrypted")
            .populate({
                path: "userId",
                select: "name email phone role status isVerified",
            });

        return res.status(200).json({
            message:
                "Administrator security settings updated successfully.",
            profile: updatedProfile,
        });
    } catch (error) {
        return handleError(
            res,
            error,
            "Unable to update administrator security settings."
        );
    }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
    startTwoFactorSetup,
    enableTwoFactor,
    requestDisableTwoFactor,
    disableTwoFactor,
    changeAdminPassword,
    updateAdminSecuritySettings,
};
