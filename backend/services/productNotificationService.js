const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

// ======================================================
// HELPERS
// ======================================================

const toPlainObject = (value) =>
  value?.toObject ? value.toObject() : value;

const normalizeSku = (value) =>
  String(value || "").trim().toUpperCase();

const getEffectivePrice = (variant) => {
  if (!variant) return null;

  const value =
    variant.salePrice !== null &&
    variant.salePrice !== undefined
      ? variant.salePrice
      : variant.regularPrice;

  const price = Number(value);

  return Number.isFinite(price) ? price : null;
};

const formatPrice = (value) =>
  `BDT ${Number(value).toFixed(2)}`;

const matchesAlertVariant = (alert, sku) => {
  const alertSku = normalizeSku(alert.variantSku);

  // An empty SKU means the alert applies to
  // every variant of the selected product.
  return !alertSku || alertSku === normalizeSku(sku);
};

const getProductLink = (product) => {
  const clientUrl = String(
    process.env.CLIENT_URL || ""
  )
    .split(",")[0]
    .trim();

  if (!clientUrl) return "";

  try {
    const identifier = product.slug || product._id;

    return new URL(
      `/products/${encodeURIComponent(identifier)}`,
      clientUrl
    ).toString();
  } catch {
    return "";
  }
};

const createResult = () => ({
  priceDropEmailsSent: 0,
  restockEmailsSent: 0,
  deliveryFailures: 0,
});

const deliverEmail = async (
  user,
  subject,
  message,
  result,
  counter
) => {
  try {
    if (!user.email) {
      throw new Error("Customer email address is missing.");
    }

    await sendEmail(user.email, subject, message);

    result[counter] += 1;
  } catch (error) {
    result.deliveryFailures += 1;

    console.error(
      `Product notification failed for customer ${user._id}:`,
      error.message
    );
  }
};

// ======================================================
// FIND VARIANT CHANGES
// ======================================================

const getVariantChanges = (
  beforeProduct,
  afterProduct
) => {
  const previousVariants = Array.isArray(
    beforeProduct.variants
  )
    ? beforeProduct.variants
    : [];

  const currentVariants = Array.isArray(
    afterProduct.variants
  )
    ? afterProduct.variants
    : [];

  const previousBySku = new Map();

  for (const variant of previousVariants) {
    const sku = normalizeSku(variant.sku);

    if (sku) {
      previousBySku.set(sku, variant);
    }
  }

  const changes = [];

  for (const current of currentVariants) {
    const sku = normalizeSku(current.sku);
    const previous = previousBySku.get(sku);

    if (!previous || !sku) continue;

    const oldPrice = getEffectivePrice(previous);
    const newPrice = getEffectivePrice(current);

    const oldStock = Number(
      previous.stockQuantity || 0
    );

    const newStock = Number(
      current.stockQuantity || 0
    );

    changes.push({
      sku,
      oldPrice,
      newPrice,
      oldStock,
      newStock,
    });
  }

  return changes;
};

// ======================================================
// SEND PRICE DROP AND RESTOCK NOTIFICATIONS
// Triggered after a successful product update.
// ======================================================

const notifyProductChanges = async (
  previousProduct,
  updatedProduct
) => {
  const result = createResult();

  try {
    const before = toPlainObject(previousProduct);
    const after = toPlainObject(updatedProduct);

    if (!before || !after || !after._id) {
      return result;
    }

    const changes = getVariantChanges(
      before,
      after
    );

    const priceDropChanges = changes.filter(
      (change) =>
        change.oldPrice !== null &&
        change.newPrice !== null &&
        change.newPrice < change.oldPrice
    );

    const restockChanges = changes.filter(
      (change) =>
        change.oldStock <= 0 &&
        change.newStock > 0
    );

    if (
      priceDropChanges.length === 0 &&
      restockChanges.length === 0
    ) {
      return result;
    }

    const users = await User.find({
      role: "customer",
      status: "active",
      "priceAlerts.productId": after._id,
    })
      .select(
        "name email preferences priceAlerts"
      )
      .lean();

    const productName =
      after.title || after.name || "A product";

    const productLink = getProductLink(after);

    for (const user of users) {
      const alerts = (user.priceAlerts || []).filter(
        (alert) =>
          String(alert.productId) ===
          String(after._id)
      );

      if (!alerts.length) continue;

      // ----------------------------------------------
      // PRICE DROP EMAIL
      // ----------------------------------------------

      if (
        user.preferences?.priceDropEmails !== false
      ) {
        const matchedPriceChanges = [];

        for (const change of priceDropChanges) {
          const matchingAlerts = alerts.filter(
            (alert) =>
              matchesAlertVariant(alert, change.sku) &&
              Number.isFinite(Number(alert.targetPrice)) &&
              change.newPrice <=
                Number(alert.targetPrice)
          );

          if (matchingAlerts.length > 0) {
            const targetPrice = Math.min(
              ...matchingAlerts.map((alert) =>
                Number(alert.targetPrice)
              )
            );

            matchedPriceChanges.push({
              ...change,
              targetPrice,
            });
          }
        }

        if (matchedPriceChanges.length > 0) {
          const details = matchedPriceChanges
            .map(
              (item) =>
                `SKU: ${item.sku}\n` +
                `Previous price: ${formatPrice(item.oldPrice)}\n` +
                `New price: ${formatPrice(item.newPrice)}\n` +
                `Your target price: ${formatPrice(item.targetPrice)}`
            )
            .join("\n\n");

          const message =
            `Hello ${user.name || "Customer"},\n\n` +
            `Good news! The price of ${productName} has dropped ` +
            `to or below your saved target price.\n\n` +
            `${details}\n\n` +
            (productLink
              ? `View product: ${productLink}\n\n`
              : "") +
            `You are receiving this email because you created ` +
            `a price alert on LUTech.\n\n` +
            `LUTech`;

          await deliverEmail(
            user,
            `LUTech price drop: ${productName}`,
            message,
            result,
            "priceDropEmailsSent"
          );
        }
      }

      // ----------------------------------------------
      // RESTOCK EMAIL
      // ----------------------------------------------

      if (
        user.preferences?.restockEmails !== false
      ) {
        const matchedRestocks =
          restockChanges.filter((change) =>
            alerts.some(
              (alert) =>
                alert.notifyOnRestock !== false &&
                matchesAlertVariant(alert, change.sku)
            )
          );

        if (matchedRestocks.length > 0) {
          const details = matchedRestocks
            .map(
              (item) =>
                `SKU: ${item.sku}\n` +
                `Available quantity: ${item.newStock}`
            )
            .join("\n\n");

          const message =
            `Hello ${user.name || "Customer"},\n\n` +
            `${productName} is back in stock!\n\n` +
            `${details}\n\n` +
            (productLink
              ? `View product: ${productLink}\n\n`
              : "") +
            `You are receiving this email because you enabled ` +
            `restock notifications for this product on LUTech.\n\n` +
            `LUTech`;

          await deliverEmail(
            user,
            `LUTech restock alert: ${productName}`,
            message,
            result,
            "restockEmailsSent"
          );
        }
      }
    }

    return result;
  } catch (error) {
    result.deliveryFailures += 1;

    console.error(
      "Product notification service error:",
      error
    );

    return result;
  }
};

// ======================================================
// RESTOCK NOTIFICATIONS FROM ORDER CANCELLATIONS
// Called only after the inventory transaction commits.
// ======================================================

const notifyRestockEvents = async (events = []) => {
  const result = createResult();

  try {
    if (!Array.isArray(events) || events.length === 0) {
      return result;
    }

    // Remove duplicate product / SKU events.
    const uniqueEvents = new Map();

    for (const event of events) {
      const productId = String(event.productId || "");
      const sku = normalizeSku(event.variantSku);

      if (!productId || !sku) continue;

      uniqueEvents.set(`${productId}:${sku}`, {
        ...event,
        productId,
        variantSku: sku,
      });
    }

    const normalizedEvents = [
      ...uniqueEvents.values(),
    ];

    if (!normalizedEvents.length) {
      return result;
    }

    const productIds = [
      ...new Set(
        normalizedEvents.map(
          (event) => event.productId
        )
      ),
    ];

    const users = await User.find({
      role: "customer",
      status: "active",
      "priceAlerts.productId": {
        $in: productIds,
      },
    })
      .select(
        "name email preferences priceAlerts"
      )
      .lean();

    for (const user of users) {
      if (
        user.preferences?.restockEmails === false
      ) {
        continue;
      }

      const matchedEvents = normalizedEvents.filter(
        (event) =>
          (user.priceAlerts || []).some(
            (alert) =>
              String(alert.productId) ===
                event.productId &&
              alert.notifyOnRestock !== false &&
              matchesAlertVariant(
                alert,
                event.variantSku
              )
          )
      );

      if (!matchedEvents.length) continue;

      const details = matchedEvents
        .map(
          (event) =>
            `${event.productTitle || "Product"}\n` +
            `SKU: ${event.variantSku}\n` +
            `Available quantity: ${event.availableQuantity}`
        )
        .join("\n\n");

      const message =
        `Hello ${user.name || "Customer"},\n\n` +
        `A product you are tracking is back in stock.\n\n` +
        `${details}\n\n` +
        `You are receiving this email because you enabled ` +
        `restock notifications on LUTech.\n\n` +
        `LUTech`;

      await deliverEmail(
        user,
        "LUTech restock notification",
        message,
        result,
        "restockEmailsSent"
      );
    }

    return result;
  } catch (error) {
    result.deliveryFailures += 1;

    console.error(
      "Order restock notification error:",
      error
    );

    return result;
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  notifyProductChanges,
  notifyRestockEvents,
};