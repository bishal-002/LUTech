
const User = require("../models/User");
const AdminProfile = require("../models/AdminProfile");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const {
    OTP_EXPIRY_MS,
    OTP_MAX_ATTEMPTS,
    encryptSecret,
    decryptSecret,
    verifyTotpCode,
    generateEmailOtp,
    hashOtp,
    verifyHashedOtp,
    sendEmailOtp,
    isIpAllowed,
    getRequestIp,
} = require("../services/adminSecurityService");

// ======================================================
// HELPERS
// ======================================================

const normalizeEmail = (email) =>
    typeof email === "string"
        ? email.trim().toLowerCase()
        : "";

const isValidEmail = (email) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const sendServerError = (res) =>
    res.status(500).json({
        message: "Authentication service error.",
    });

const getPublicUser = (user) => ({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role || "customer",
    sellerStatus: user.sellerStatus || "not_applicable",
    verificationStatus:
        user.verificationStatus || "pending_review",
    isVerified: user.isVerified,
});

const validateAccountStatus = (user, res) => {
    if (!user.isVerified) {
        res.status(403).json({
            message: "Please verify your email first.",
        });
        return false;
    }

    if (user.status && user.status !== "active") {
        res.status(403).json({
            message:
                user.status === "deactivated"
                    ? "This account has been deactivated."
                    : "Your account has been suspended.",
        });
        return false;
    }

    if (
        user.sellerStatus === "suspended" ||
        user.verificationStatus === "suspended"
    ) {
        res.status(403).json({
            message: "Your account has been suspended.",
        });
        return false;
    }

    return true;
};

const isAdminIpAllowed = (profile, requestIp) => {
    const allowedIps = profile.security?.allowedIps || [];

    const restricted =
        profile.adminRole === "super_admin" ||
        profile.department === "Finance";

    if (!restricted || allowedIps.length === 0) {
        return true;
    }

    return isIpAllowed(requestIp, allowedIps);
};

// ======================================================
// ISSUE ACCESS TOKEN AFTER ALL REQUIRED AUTHENTICATION
// ======================================================

const issueAccessToken = async (
    user,
    req,
    adminProfile = null,
    authMethods = ["pwd"]
) => {
    const lastLoginAt = new Date();

    user.lastLoginAt = lastLoginAt;
    await user.save();

    if (adminProfile) {
        adminProfile.security.lastLoginIp =
            getRequestIp(req).slice(0, 64);

        adminProfile.security.lastUserAgent =
            String(req.get("user-agent") || "").slice(0, 500);

        await adminProfile.save();
    }

    const token = jwt.sign(
        {
            userId: user._id.toString(),
            tokenType: "access",
            amr: authMethods,
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "1d",
        }
    );

    return {
        message: "Login successful.",
        token,
        user: getPublicUser(user),
    };
};

// ======================================================
// LOGIN
// POST /api/users/login
// ======================================================

const loginUser = async (req, res) => {
    try {
        const email = normalizeEmail(req.body?.email);
        const password = req.body?.password;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required.",
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                message: "Please provide a valid email.",
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured.");
            return sendServerError(res);
        }

        const user = await User.findOne({ email })
            .select("+password");

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password.",
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Invalid email or password.",
            });
        }

        if (!validateAccountStatus(user, res)) {
            return;
        }

        // Non-admin login follows the existing password-only flow.
        if (user.role !== "admin") {
            const result = await issueAccessToken(
                user,
                req,
                null,
                ["pwd"]
            );

            return res.status(200).json(result);
        }

        // ==================================================
        // ADMIN PROFILE VALIDATION
        // ==================================================

        const adminProfile = await AdminProfile.findOne({
            userId: user._id,
        }).select([
            "+security.twoFactorLoginOtpHash",
            "+security.twoFactorLoginOtpSentAt",
            "+security.twoFactorLoginOtpSendCount",
            "+security.twoFactorLoginOtpWindowStart",
        ].join(" "));

        if (!adminProfile) {
            return res.status(403).json({
                message: "Administrator profile is not configured.",
                code: "ADMIN_PROFILE_MISSING",
            });
        }

        if (adminProfile.status !== "active") {
            return res.status(403).json({
                message:
                    adminProfile.status === "revoked"
                        ? "Your administrator access has been revoked."
                        : "Your administrator account is suspended.",
                code:
                    adminProfile.status === "revoked"
                        ? "ADMIN_ACCESS_REVOKED"
                        : "ADMIN_ACCOUNT_SUSPENDED",
            });
        }

        const requestIp = getRequestIp(req);

        if (!isAdminIpAllowed(adminProfile, requestIp)) {
            return res.status(403).json({
                message:
                    "Administrator login is not allowed from this IP address.",
                code: "ADMIN_IP_NOT_ALLOWED",
            });
        }

        // ==================================================
        // ADMIN LOGIN WITHOUT 2FA
        // ==================================================

        if (!adminProfile.security?.twoFactorEnabled) {
            const result = await issueAccessToken(
                user,
                req,
                adminProfile,
                ["pwd"]
            );

            return res.status(200).json(result);
        }

        // ==================================================
        // ADMIN LOGIN WITH 2FA
        // ==================================================

        const method = adminProfile.security.twoFactorMethod;

        if (!["authenticator_app", "email_otp"].includes(method)) {
            return res.status(403).json({
                message: "Administrator 2FA configuration is invalid.",
                code: "ADMIN_2FA_CONFIGURATION_INVALID",
            });
        }

        const now = new Date();

        if (method === "email_otp") {
            const lastSentAt =
                adminProfile.security.twoFactorLoginOtpSentAt;

            if (
                lastSentAt &&
                now.getTime() - lastSentAt.getTime() < 60 * 1000
            ) {
                return res.status(429).json({
                    message:
                        "A verification code was recently sent. Please wait before requesting another login code.",
                });
            }

            let windowStart =
                adminProfile.security.twoFactorLoginOtpWindowStart;

            let sendCount =
                adminProfile.security.twoFactorLoginOtpSendCount || 0;

            if (
                !windowStart ||
                now.getTime() - windowStart.getTime() >= 60 * 60 * 1000
            ) {
                windowStart = now;
                sendCount = 0;
            }

            if (sendCount >= 5) {
                return res.status(429).json({
                    message:
                        "The maximum number of administrator login codes has been reached for this hour.",
                });
            }
        }

        const challengeId = crypto.randomUUID();
        const challengeExpiresAt = new Date(
            now.getTime() + OTP_EXPIRY_MS
        );

        adminProfile.security.twoFactorChallengeId = challengeId;
        adminProfile.security.twoFactorChallengeExpiresAt =
            challengeExpiresAt;

        adminProfile.security.twoFactorChallengeAttempts = 0;

        let emailOtp = null;

        if (method === "email_otp") {
            emailOtp = generateEmailOtp();

            let windowStart =
                adminProfile.security.twoFactorLoginOtpWindowStart;

            let sendCount =
                adminProfile.security.twoFactorLoginOtpSendCount || 0;

            if (
                !windowStart ||
                now.getTime() - windowStart.getTime() >= 60 * 60 * 1000
            ) {
                windowStart = now;
                sendCount = 0;
            }

            adminProfile.security.twoFactorLoginOtpHash =
                await hashOtp(emailOtp);

            adminProfile.security.twoFactorLoginOtpExpiresAt =
                challengeExpiresAt;

            adminProfile.security.twoFactorLoginOtpAttempts = 0;
            adminProfile.security.twoFactorLoginOtpSentAt = now;
            adminProfile.security.twoFactorLoginOtpSendCount =
                sendCount + 1;
            adminProfile.security.twoFactorLoginOtpWindowStart =
                windowStart;
        }

        await adminProfile.save();

        // Deliver email OTP after saving the challenge.
        if (method === "email_otp") {
            try {
                await sendEmailOtp({
                    email: user.email,
                    otp: emailOtp,
                    subject: "LUTech Administrator Login Verification",
                    purpose: "administrator login",
                });
            } catch (mailError) {
                console.error(
                    "Administrator login OTP delivery failed:",
                    mailError
                );

                adminProfile.security.twoFactorChallengeId = undefined;
                adminProfile.security.twoFactorChallengeExpiresAt = null;
                adminProfile.security.twoFactorLoginOtpHash = undefined;
                adminProfile.security.twoFactorLoginOtpExpiresAt = null;

                await adminProfile.save();

                return res.status(503).json({
                    message:
                        "Unable to send the administrator verification code.",
                });
            }
        }

        const challengeToken = jwt.sign(
            {
                userId: user._id.toString(),
                purpose: "admin_2fa",
                challengeId,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "5m",
            }
        );

        return res.status(202).json({
            message:
                method === "email_otp"
                    ? "A verification code has been sent to your administrator email."
                    : "Enter the code from your authenticator app.",
            requiresTwoFactor: true,
            method,
            challengeToken,
            expiresIn: 300,
        });
    } catch (error) {
        console.error("Login user error:", error);
        return sendServerError(res);
    }
};

// ======================================================
// VERIFY ADMIN LOGIN SECOND FACTOR
// POST /api/users/admin-2fa/verify
// ======================================================

const verifyAdminLoginTwoFactor = async (req, res) => {
    try {
        const { challengeToken, code } = req.body || {};

        if (
            typeof challengeToken !== "string" ||
            typeof code !== "string" ||
            !/^\d{6}$/.test(code.trim())
        ) {
            return res.status(400).json({
                message:
                    "A valid challenge token and six-digit verification code are required.",
            });
        }

        if (!process.env.JWT_SECRET) {
            return sendServerError(res);
        }

        let decoded;

        try {
            decoded = jwt.verify(
                challengeToken,
                process.env.JWT_SECRET
            );
        } catch {
            return res.status(401).json({
                message: "The administrator login challenge has expired or is invalid.",
            });
        }

        if (
            decoded.purpose !== "admin_2fa" ||
            !decoded.userId ||
            !decoded.challengeId
        ) {
            return res.status(401).json({
                message: "Invalid administrator login challenge.",
            });
        }

        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                message: "Administrator account not found.",
            });
        }

        if (!validateAccountStatus(user, res)) {
            return;
        }

        if (user.role !== "admin") {
            return res.status(403).json({
                message: "Administrator account required.",
            });
        }

        const adminProfile = await AdminProfile.findOne({
            userId: user._id,
        }).select([
            "+security.twoFactorSecretEncrypted",
            "+security.twoFactorLoginOtpHash",
            "+security.twoFactorLoginOtpExpiresAt",
            "+security.twoFactorLoginOtpAttempts",
            "+security.twoFactorChallengeId",
            "+security.twoFactorChallengeExpiresAt",
            "+security.twoFactorChallengeAttempts",
        ].join(" "));

        if (
            !adminProfile ||
            adminProfile.status !== "active" ||
            !adminProfile.security?.twoFactorEnabled
        ) {
            return res.status(403).json({
                message: "Administrator security configuration is no longer valid.",
            });
        }

        const requestIp = getRequestIp(req);

        if (!isAdminIpAllowed(adminProfile, requestIp)) {
            return res.status(403).json({
                message:
                    "Administrator login is not allowed from this IP address.",
                code: "ADMIN_IP_NOT_ALLOWED",
            });
        }

        const security = adminProfile.security;

        if (
            security.twoFactorChallengeId !== decoded.challengeId ||
            !security.twoFactorChallengeExpiresAt ||
            security.twoFactorChallengeExpiresAt.getTime() <= Date.now()
        ) {
            return res.status(401).json({
                message:
                    "The administrator login challenge has expired or has already been used.",
            });
        }

        if (
            security.twoFactorChallengeAttempts >= OTP_MAX_ATTEMPTS
        ) {
            return res.status(429).json({
                message:
                    "Too many incorrect verification attempts. Please log in again.",
            });
        }

        let isValid = false;

        if (security.twoFactorMethod === "authenticator_app") {
            if (!security.twoFactorSecretEncrypted) {
                return res.status(403).json({
                    message: "Authenticator configuration is incomplete.",
                });
            }

            const secret = decryptSecret(
                security.twoFactorSecretEncrypted
            );

            isValid = verifyTotpCode(secret, code.trim());
        } else if (security.twoFactorMethod === "email_otp") {
            const otpExpired =
                !security.twoFactorLoginOtpExpiresAt ||
                security.twoFactorLoginOtpExpiresAt.getTime() <= Date.now();

            if (
                !security.twoFactorLoginOtpHash ||
                otpExpired
            ) {
                return res.status(400).json({
                    message: "The email verification code has expired.",
                });
            }

            isValid = await verifyHashedOtp(
                code.trim(),
                security.twoFactorLoginOtpHash
            );
        }

        if (!isValid) {
            security.twoFactorChallengeAttempts += 1;

            if (security.twoFactorMethod === "email_otp") {
                security.twoFactorLoginOtpAttempts += 1;
            }

            const attemptsRemaining =
                OTP_MAX_ATTEMPTS - security.twoFactorChallengeAttempts;

            if (attemptsRemaining <= 0) {
                security.twoFactorChallengeId = undefined;
                security.twoFactorChallengeExpiresAt = null;
                security.twoFactorLoginOtpHash = undefined;
                security.twoFactorLoginOtpExpiresAt = null;
            }

            await adminProfile.save();

            return res.status(
                attemptsRemaining <= 0 ? 429 : 400
            ).json({
                message:
                    attemptsRemaining <= 0
                        ? "Too many incorrect attempts. Please log in again."
                        : `Invalid verification code. ${attemptsRemaining} attempts remaining.`,
            });
        }

        // Consume the challenge so that it cannot be reused.
        security.twoFactorChallengeId = undefined;
        security.twoFactorChallengeExpiresAt = null;
        security.twoFactorChallengeAttempts = 0;

        security.twoFactorLoginOtpHash = undefined;
        security.twoFactorLoginOtpExpiresAt = null;
        security.twoFactorLoginOtpAttempts = 0;

        await adminProfile.save();

        const result = await issueAccessToken(
            user,
            req,
            adminProfile,
            ["pwd", "otp"]
        );

        return res.status(200).json(result);
    } catch (error) {
        console.error(
            "Admin two-factor verification error:",
            error
        );

        return sendServerError(res);
    }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
    loginUser,
    verifyAdminLoginTwoFactor,
};
