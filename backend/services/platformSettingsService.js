const PlatformSettings = require("../models/PlatformSettings");

// ======================================================
// GET OR CREATE GLOBAL PLATFORM SETTINGS
// ======================================================

const getPlatformSettings = async ({ session = null } = {}) => {
  const options = {
    returnDocument: "after",
    upsert: true,
    setDefaultsOnInsert: true,
    runValidators: true,
  };

  if (session) {
    options.session = session;
  }

  const settings = await PlatformSettings.findOneAndUpdate(
    {
      settingKey: "global",
    },
    {
      $setOnInsert: {
        settingKey: "global",
      },
    },
    options
  );

  return settings;
};

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  getPlatformSettings,
};