const Brand = require("../models/Brand");

const {
  getPlatformSettings,
} = require("../services/platformSettingsService");

// ======================================================
// GET SELLER MASTER BRANDS
// GET /api/catalog/seller/master-brands
// ======================================================

const getSellerMasterBrands = async (
  req,
  res
) => {
  try {
    const settings = await getPlatformSettings();

    const masterBrandIds =
      settings.masterBrands || [];

    const brands =
      masterBrandIds.length > 0
        ? await Brand.find({
            _id: {
              $in: masterBrandIds,
            },
            isActive: true,
          })
            .sort({ name: 1 })
            .lean()
        : [];

    return res.status(200).json({
      count: brands.length,
      brands,
    });
  } catch (error) {
    console.error(
      "Get seller master brands:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to retrieve the approved master brands.",
    });
  }
};

module.exports = {
  getSellerMasterBrands,
};