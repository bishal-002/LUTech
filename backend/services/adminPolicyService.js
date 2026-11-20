const getAdminAllowedDomains = () => {
  return [
    ...new Set(
      String(process.env.ADMIN_ALLOWED_EMAIL_DOMAINS || "")
        .split(",")
        .map((domain) =>
          domain.trim().toLowerCase().replace(/^@/, "")
        )
        .filter(Boolean)
    ),
  ];
};

const isAllowedAdminEmail = (email) => {
  if (typeof email !== "string") {
    return false;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const separatorIndex = normalizedEmail.lastIndexOf("@");

  if (separatorIndex <= 0) {
    return false;
  }

  const emailDomain = normalizedEmail.slice(separatorIndex + 1);
  const allowedDomains = getAdminAllowedDomains();

  return (
    allowedDomains.length > 0 &&
    allowedDomains.includes(emailDomain)
  );
};

const getAdminPasswordMaxAgeDays = () => {
  const configuredValue = Number(
    process.env.ADMIN_PASSWORD_MAX_AGE_DAYS || 90
  );

  if (
    !Number.isInteger(configuredValue) ||
    configuredValue < 1 ||
    configuredValue > 365
  ) {
    return 90;
  }

  return configuredValue;
};

const isAdminPasswordExpired = (
  passwordChangedAt,
  currentTime = Date.now()
) => {
  if (!passwordChangedAt) {
    return true;
  }

  const changedAt = new Date(passwordChangedAt).getTime();

  if (!Number.isFinite(changedAt)) {
    return true;
  }

  const maxAgeMilliseconds =
    getAdminPasswordMaxAgeDays() *
    24 *
    60 *
    60 *
    1000;

  return currentTime - changedAt >= maxAgeMilliseconds;
};

module.exports = {
  getAdminAllowedDomains,
  isAllowedAdminEmail,
  getAdminPasswordMaxAgeDays,
  isAdminPasswordExpired,
};