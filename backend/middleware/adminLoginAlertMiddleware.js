const jwt = require("jsonwebtoken");

const User = require("../models/User");
const AdminProfile = require("../models/AdminProfile");

const sendEmail = require("../utils/sendEmail");

const {
  getRequestIp,
} = require("../services/adminSecurityService");

const {
  isAllowedAdminEmail,
} = require("../services/adminPolicyService");

// ======================================================
// FIND ADMINISTRATOR FOR LOGIN REQUEST
// ======================================================

const getLoginAdministrator = async (req) => {
  try {
    if (req.path === "/login") {
      const email = String(req.body?.email || "")
        .trim()
        .toLowerCase();

      if (!email) {
        return null;
      }

      return User.findOne({
        email,
        role: "admin",
      }).select("_id name email role");
    }

    if (req.path === "/admin-2fa/verify") {
      const challengeToken =
        req.body?.challengeToken;

      if (
        typeof challengeToken !== "string" ||
        !process.env.JWT_SECRET
      ) {
        return null;
      }

      const decoded = jwt.verify(
        challengeToken,
        process.env.JWT_SECRET
      );

      if (
        decoded.purpose !== "admin_2fa" ||
        !decoded.userId
      ) {
        return null;
      }

      return User.findOne({
        _id: decoded.userId,
        role: "admin",
      }).select("_id name email role");
    }

    return null;
  } catch {
    return null;
  }
};

// ======================================================
// ADMIN LOGIN ALERT
// ======================================================

const adminLoginAlertMiddleware = async (
  req,
  res,
  next
) => {
  try {
    const user = await getLoginAdministrator(req);

    if (!user) {
      return next();
    }

    const profile = await AdminProfile.findOne({
      userId: user._id,
    }).select(
      "security.lastLoginIp security.lastUserAgent"
    );

    if (!profile) {
      return next();
    }

    // Capture previous metadata before the authentication
    // controller updates it.
    const previousIp =
      profile.security?.lastLoginIp || "";

    const previousUserAgent =
      profile.security?.lastUserAgent || "";

    const originalJson = res.json.bind(res);

    let notificationHandled = false;

    res.json = function (payload) {
      const isSuccessfulAdminAuthentication =
        payload &&
        (
          Boolean(payload.token) ||
          payload.requiresTwoFactor === true
        );

      if (
        !notificationHandled &&
        isSuccessfulAdminAuthentication
      ) {
        notificationHandled = true;

        // Enforce the official domain only after the
        // authentication controller has verified credentials.
        if (!isAllowedAdminEmail(user.email)) {
          res.statusCode = 403;

          return originalJson({
            message:
              "Administrator access requires an authorized official email domain. Contact the Super Admin.",
            code: "ADMIN_EMAIL_DOMAIN_NOT_ALLOWED",
          });
        }

        // Do not update login metadata while the user is
        // still waiting for the second authentication factor.
        if (payload.token) {
          const currentIp = String(
            getRequestIp(req) || ""
          ).slice(0, 64);

          const currentUserAgent = String(
            req.get("user-agent") || ""
          ).slice(0, 500);

          const isUnfamiliarLogin =
            !previousIp ||
            !previousUserAgent ||
            previousIp !== currentIp ||
            previousUserAgent !== currentUserAgent;

          // Update only the two login metadata fields.
          // This does not overwrite 2FA challenge information.
          AdminProfile.updateOne(
            {
              _id: profile._id,
            },
            {
              $set: {
                "security.lastLoginIp": currentIp,
                "security.lastUserAgent": currentUserAgent,
              },
            }
          )
            .then(async () => {
              if (!isUnfamiliarLogin) {
                return;
              }

              const emailSubject =
                "LUTech Administrator Security Alert";

              const emailMessage = [
                "A new or unfamiliar administrator login was detected.",
                "",
                `Administrator: ${user.name}`,
                `Email: ${user.email}`,
                `IP address: ${currentIp || "Unavailable"}`,
                `Browser/device: ${
                  currentUserAgent || "Unavailable"
                }`,
                `Login time: ${new Date().toISOString()}`,
                "",
                "If you did not perform this login, contact the platform administrator immediately.",
              ].join("\n");

              await sendEmail(
                user.email,
                emailSubject,
                emailMessage
              );
            })
            .catch((error) => {
              console.error(
                "Administrator login alert failed:",
                error.message
              );
            });
        }
      }

      return originalJson(payload);
    };

    return next();
  } catch (error) {
    // Security notifications must not break the existing
    // authentication flow when the notification service fails.
    console.error(
      "Admin login monitoring error:",
      error.message
    );

    return next();
  }
};

module.exports = adminLoginAlertMiddleware;