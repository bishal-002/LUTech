const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");

const CUSTOMER_FIELDS = [
  "_id",
  "name",
  "email",
  "role",
  "status",
  "isVerified",
  "phone",
  "isPhoneVerified",
  "avatarUrl",
  "address",
  "addresses",
  "wishlist",
  "priceAlerts",
  "ownedDevices",
  "recentlyViewed",
  "billingProfile",
  "preferences",
  "customerMetrics",
  "lastLoginAt",
  "createdAt",
  "updatedAt",
].join(" ");

const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const normalizeBdPhone = (phone) => {
  const value = String(phone || "").replace(/[\s-]/g, "");

  if (value.startsWith("01")) {
    return `+880${value.slice(1)}`;
  }

  return value;
};

const isValidBdPhone = (phone) =>
  /^(?:\+8801|01)[3-9]\d{8}$/.test(phone);

const isValidHttpUrl = (value) => {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const getCustomer = async (userId) =>
  User.findOne({
    _id: userId,
    role: "customer",
  });

const customerOnly = async (req, res) => {
  const user = await getCustomer(req.user._id);

  if (!user) {
    res.status(403).json({
      message: "Customer account required.",
    });

    return null;
  }

  return user;
};

// ======================================================
// GET CUSTOMER PROFILE
// ======================================================

const getCustomerProfile = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.user._id,
      role: "customer",
    }).select(CUSTOMER_FIELDS);

    if (!user) {
      return res.status(404).json({
        message: "Customer account not found.",
      });
    }

    return res.status(200).json({ user });
  } catch (error) {
    console.error("Get customer profile:", error);

    return res.status(500).json({
      message: "Unable to retrieve customer profile.",
    });
  }
};

// ======================================================
// UPDATE CUSTOMER PROFILE
// ======================================================

const updateCustomerProfile = async (req, res) => {
  try {
    const user = await customerOnly(req, res);
    if (!user) return;

    const {
      fullName,
      name,
      phone,
      avatarUrl,
      addresses,
      billingProfile,
      preferences,
      ownedDevices,
    } = req.body;

    // Name is stored in the existing "name" field.
    const updatedName = fullName ?? name;

    if (updatedName !== undefined) {
      if (
        typeof updatedName !== "string" ||
        updatedName.trim().length < 2 ||
        updatedName.trim().length > 80
      ) {
        return res.status(400).json({
          message: "Full name must contain 2–80 characters.",
        });
      }

      user.name = updatedName.trim();
    }

    // Phone number.
    if (phone !== undefined) {
      if (typeof phone !== "string") {
        return res.status(400).json({
          message: "Phone number must be text.",
        });
      }

      const normalizedPhone = normalizeBdPhone(phone);

      if (
        normalizedPhone &&
        !isValidBdPhone(normalizedPhone)
      ) {
        return res.status(400).json({
          message:
            "Enter a valid Bangladesh phone number, such as +8801XXXXXXXXX.",
        });
      }

      if (normalizedPhone) {
        const duplicate = await User.findOne({
          phone: normalizedPhone,
          _id: { $ne: user._id },
        }).select("_id");

        if (duplicate) {
          return res.status(409).json({
            message: "This phone number is already registered.",
          });
        }

        if (user.phone !== normalizedPhone) {
          user.isPhoneVerified = false;
        }

        user.phone = normalizedPhone;
      } else {
        user.phone = undefined;
        user.isPhoneVerified = false;
      }
    }

    // Avatar URL.
    if (avatarUrl !== undefined) {
      if (
        typeof avatarUrl !== "string" ||
        avatarUrl.trim().length > 2048 ||
        (avatarUrl.trim() && !isValidHttpUrl(avatarUrl.trim()))
      ) {
        return res.status(400).json({
          message: "Avatar URL must be a valid HTTP or HTTPS URL.",
        });
      }

      user.avatarUrl = avatarUrl.trim();
    }

    // Saved addresses.
    if (addresses !== undefined) {
      if (!Array.isArray(addresses) || addresses.length > 5) {
        return res.status(400).json({
          message: "You can save a maximum of 5 addresses.",
        });
      }

      const allowedLabels = [
        "Home",
        "Office",
        "Campus / Hostel",
        "Other",
      ];

      const normalizedAddresses = [];

      for (const item of addresses) {
        if (
          !isPlainObject(item) ||
          !allowedLabels.includes(item.label || "Home")
        ) {
          return res.status(400).json({
            message: "Invalid address information.",
          });
        }

        const textFields = [
          "recipientName",
          "recipientPhone",
          "division",
          "district",
          "area",
          "streetAddress",
          "postalCode",
        ];

        const invalidField = textFields.some((field) => {
          const maxLength =
            field === "streetAddress" ? 200 : 120;

          return (
            item[field] !== undefined &&
            (
              typeof item[field] !== "string" ||
              item[field].length > maxLength
            )
          );
        });

        if (invalidField) {
          return res.status(400).json({
            message: "One or more address fields are invalid.",
          });
        }

        const recipientPhone = normalizeBdPhone(
          item.recipientPhone || ""
        );

        if (
          recipientPhone &&
          !isValidBdPhone(recipientPhone)
        ) {
          return res.status(400).json({
            message: "An address contains an invalid phone number.",
          });
        }

        normalizedAddresses.push({
          ...(item._id && mongoose.isValidObjectId(item._id)
            ? { _id: item._id }
            : {}),

          label: item.label || "Home",
          recipientName: (item.recipientName || "").trim(),
          recipientPhone,
          division: (item.division || "").trim(),
          district: (item.district || "").trim(),
          area: (item.area || "").trim(),
          streetAddress: (item.streetAddress || "").trim(),
          postalCode: (item.postalCode || "").trim(),
          isDefaultShipping: Boolean(item.isDefaultShipping),
          isDefaultBilling: Boolean(item.isDefaultBilling),
        });
      }

      const shippingCount = normalizedAddresses.filter(
        (item) => item.isDefaultShipping
      ).length;

      const billingCount = normalizedAddresses.filter(
        (item) => item.isDefaultBilling
      ).length;

      if (shippingCount > 1 || billingCount > 1) {
        return res.status(400).json({
          message:
            "Only one default shipping and one default billing address are allowed.",
        });
      }

      user.addresses = normalizedAddresses;

      // Maintain the old address field for compatibility.
      const defaultAddress =
        normalizedAddresses.find(
          (item) => item.isDefaultShipping
        ) || normalizedAddresses[0];

      user.address = defaultAddress
        ? [
            defaultAddress.streetAddress,
            defaultAddress.area,
            defaultAddress.district,
            defaultAddress.division,
            defaultAddress.postalCode,
          ]
            .filter(Boolean)
            .join(", ")
        : "";
    }

    // Billing profile.
    if (billingProfile !== undefined) {
      if (!isPlainObject(billingProfile)) {
        return res.status(400).json({
          message: "Billing profile must be an object.",
        });
      }

      const companyName =
        billingProfile.companyName ??
        user.billingProfile?.companyName ??
        "";

      const binNumber =
        billingProfile.binNumber ??
        user.billingProfile?.binNumber ??
        "";

      if (
        typeof companyName !== "string" ||
        companyName.trim().length > 120 ||
        typeof binNumber !== "string" ||
        binNumber.trim().length > 30
      ) {
        return res.status(400).json({
          message: "Invalid billing information.",
        });
      }

      user.billingProfile = {
        companyName: companyName.trim(),
        binNumber: binNumber.trim(),
      };
    }

    // Communication preferences.
    if (preferences !== undefined) {
      if (!isPlainObject(preferences)) {
        return res.status(400).json({
          message: "Preferences must be an object.",
        });
      }

      const allowedPreferences = [
        "orderUpdatesSms",
        "priceDropEmails",
        "warrantyExpiryReminders",
      ];

      const currentPreferences =
        user.preferences?.toObject?.() || {};

      for (const key of allowedPreferences) {
        if (
          Object.prototype.hasOwnProperty.call(preferences, key)
        ) {
          if (typeof preferences[key] !== "boolean") {
            return res.status(400).json({
              message: `Preference ${key} must be true or false.`,
            });
          }

          currentPreferences[key] = preferences[key];
        }
      }

      user.preferences = currentPreferences;
    }

    // Owned devices.
    if (ownedDevices !== undefined) {
      if (
        !Array.isArray(ownedDevices) ||
        ownedDevices.length > 20
      ) {
        return res.status(400).json({
          message: "You can save a maximum of 20 devices.",
        });
      }

      const validDevices = ownedDevices.every((device) =>
        isPlainObject(device) &&
        ["brand", "model", "category"].every(
          (field) =>
            device[field] === undefined ||
            (
              typeof device[field] === "string" &&
              device[field].trim().length <= 100
            )
        )
      );

      if (!validDevices) {
        return res.status(400).json({
          message: "Invalid device information.",
        });
      }

      user.ownedDevices = ownedDevices.map((device) => ({
        brand: (device.brand || "").trim(),
        model: (device.model || "").trim(),
        category: (device.category || "").trim(),
      }));
    }

    await user.save();

    const updatedUser = await User.findById(user._id)
      .select(CUSTOMER_FIELDS);

    return res.status(200).json({
      message: "Customer profile updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update customer profile:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This phone number is already registered.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: "Unable to update customer profile.",
    });
  }
};

// ======================================================
// ADD TO WISHLIST
// ======================================================

const addToWishlist = async (req, res) => {
  try {
    const user = await customerOnly(req, res);
    if (!user) return;

    const { productId, variantSku = "" } = req.body;

    if (
      !mongoose.isValidObjectId(productId) ||
      typeof variantSku !== "string" ||
      variantSku.length > 80
    ) {
      return res.status(400).json({
        message: "Invalid product or variant information.",
      });
    }

    const productExists = await Product.exists({ _id: productId });

    if (!productExists) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    const sku = variantSku.trim().toUpperCase();

    const exists = user.wishlist.some(
      (item) =>
        item.productId.toString() === productId &&
        item.variantSku === sku
    );

    if (!exists) {
      if (user.wishlist.length >= 100) {
        return res.status(400).json({
          message: "Your wishlist has reached its limit.",
        });
      }

      user.wishlist.push({
        productId,
        variantSku: sku,
      });
    }

    await user.save();

    return res.status(200).json({
      message: "Wishlist updated.",
      wishlist: user.wishlist,
    });
  } catch (error) {
    console.error("Add wishlist item:", error);

    return res.status(500).json({
      message: "Unable to update wishlist.",
    });
  }
};

// ======================================================
// REMOVE FROM WISHLIST
// ======================================================

const removeFromWishlist = async (req, res) => {
  try {
    const user = await customerOnly(req, res);
    if (!user) return;

    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    user.wishlist = user.wishlist.filter(
      (item) => item.productId.toString() !== productId
    );

    await user.save();

    return res.status(200).json({
      message: "Wishlist item removed.",
      wishlist: user.wishlist,
    });
  } catch (error) {
    console.error("Remove wishlist item:", error);

    return res.status(500).json({
      message: "Unable to update wishlist.",
    });
  }
};

// ======================================================
// ADD OR UPDATE PRICE ALERT
// ======================================================

const addPriceAlert = async (req, res) => {
  try {
    const user = await customerOnly(req, res);
    if (!user) return;

    const {
      productId,
      variantSku = "",
      targetPrice,
      notifyOnRestock = true,
    } = req.body;

    const price = Number(targetPrice);

    if (
      targetPrice === undefined ||
      targetPrice === null ||
      targetPrice === "" ||
      !mongoose.isValidObjectId(productId) ||
      !Number.isFinite(price) ||
      price < 0 ||
      typeof variantSku !== "string" ||
      variantSku.length > 80 ||
      typeof notifyOnRestock !== "boolean"
    ) {
      return res.status(400).json({
        message: "Invalid price alert information.",
      });
    }

    if (!(await Product.exists({ _id: productId }))) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    const sku = variantSku.trim().toUpperCase();

    const existingAlert = user.priceAlerts.find(
      (item) =>
        item.productId.toString() === productId &&
        item.variantSku === sku
    );

    if (existingAlert) {
      existingAlert.targetPrice = price;
      existingAlert.notifyOnRestock = notifyOnRestock;
    } else {
      if (user.priceAlerts.length >= 20) {
        return res.status(400).json({
          message: "You can save a maximum of 20 price alerts.",
        });
      }

      user.priceAlerts.push({
        productId,
        variantSku: sku,
        targetPrice: price,
        notifyOnRestock,
      });
    }

    await user.save();

    return res.status(200).json({
      message: "Price alert saved.",
      priceAlerts: user.priceAlerts,
    });
  } catch (error) {
    console.error("Add price alert:", error);

    return res.status(500).json({
      message: "Unable to save price alert.",
    });
  }
};

// ======================================================
// REMOVE PRICE ALERT
// ======================================================

const removePriceAlert = async (req, res) => {
  try {
    const user = await customerOnly(req, res);
    if (!user) return;

    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    user.priceAlerts = user.priceAlerts.filter(
      (item) => item.productId.toString() !== productId
    );

    await user.save();

    return res.status(200).json({
      message: "Price alert removed.",
      priceAlerts: user.priceAlerts,
    });
  } catch (error) {
    console.error("Remove price alert:", error);

    return res.status(500).json({
      message: "Unable to remove price alert.",
    });
  }
};

// ======================================================
// UPDATE RECENTLY VIEWED
// ======================================================

const addRecentlyViewed = async (req, res) => {
  try {
    const user = await customerOnly(req, res);
    if (!user) return;

    const { productId } = req.body;

    if (!mongoose.isValidObjectId(productId)) {
      return res.status(400).json({
        message: "Invalid product ID.",
      });
    }

    if (!(await Product.exists({ _id: productId }))) {
      return res.status(404).json({
        message: "Product not found.",
      });
    }

    user.recentlyViewed = user.recentlyViewed.filter(
      (id) => id.toString() !== productId
    );

    user.recentlyViewed.push(productId);
    user.recentlyViewed = user.recentlyViewed.slice(-12);

    await user.save();

    return res.status(200).json({
      message: "Recently viewed updated.",
      recentlyViewed: user.recentlyViewed,
    });
  } catch (error) {
    console.error("Update recently viewed:", error);

    return res.status(500).json({
      message: "Unable to update recently viewed products.",
    });
  }
};

module.exports = {
  getCustomerProfile,
  updateCustomerProfile,
  addToWishlist,
  removeFromWishlist,
  addPriceAlert,
  removePriceAlert,
  addRecentlyViewed,
};