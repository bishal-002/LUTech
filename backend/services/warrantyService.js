
const Product = require("../models/Product");
const WarrantyReminder = require("../models/WarrantyReminder");

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// ======================================================
// CALENDAR DATE HELPERS
// ======================================================

const addUtcDays = (date, days) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const addUtcMonthsClamped = (date, months) => {
  const day = date.getUTCDate();

  const result = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      1,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds()
    )
  );

  const lastDay = new Date(
    Date.UTC(
      result.getUTCFullYear(),
      result.getUTCMonth() + 1,
      0
    )
  ).getUTCDate();

  result.setUTCDate(Math.min(day, lastDay));

  return result;
};

// ======================================================
// CALCULATE WARRANTY EXPIRY
// ======================================================

const calculateWarrantyExpiry = (
  startDate,
  warrantyType,
  duration
) => {
  if (
    !warrantyType ||
    warrantyType === "No Warranty"
  ) {
    return null;
  }

  const value = Number(duration?.value);
  const unit = duration?.unit;

  if (unit === "Lifetime") {
    return null;
  }

  if (
    !Number.isInteger(value) ||
    value < 1
  ) {
    return null;
  }

  switch (unit) {
    case "Days":
      return addUtcDays(startDate, value);

    case "Months":
      return addUtcMonthsClamped(startDate, value);

    case "Years":
      return addUtcMonthsClamped(
        startDate,
        value * 12
      );

    default:
      return null;
  }
};

// ======================================================
// SELECT REMINDER SCHEDULE
// ======================================================

const getReminderOffsets = (
  startDate,
  expiryDate
) => {
  const totalDays = Math.ceil(
    (expiryDate.getTime() - startDate.getTime()) /
      DAY_IN_MS
  );

  if (totalDays > 30) {
    return [30, 7];
  }

  if (totalDays > 7) {
    return [7, 1];
  }

  if (totalDays > 1) {
    return [1];
  }

  return [];
};

// ======================================================
// INITIALIZE WARRANTY REMINDERS AFTER DELIVERY
// ======================================================

const initializeWarrantyRemindersForDeliveredOrder =
  async ({
    order,
    deliveredAt,
    session,
  }) => {
    if (
      !order ||
      !Array.isArray(order.items) ||
      !deliveredAt ||
      !order.customerId
    ) {
      throw new Error(
        "Invalid order information for warranty initialization."
      );
    }

    const reminderDocuments = [];

    for (
      let itemIndex = 0;
      itemIndex < order.items.length;
      itemIndex += 1
    ) {
      const item = order.items[itemIndex];

      if (!item.snapshot) {
        continue;
      }

      // New orders already contain a warranty snapshot
      // from checkout. Older pending orders may not.
      let savedWarranty =
        item.snapshot.warranty?.toObject
          ? item.snapshot.warranty.toObject()
          : item.snapshot.warranty;

      let warrantyType = savedWarranty?.type || "";
      let duration = savedWarranty?.duration || null;
      let warrantyPolicy =
        savedWarranty?.policy || "";

      // Backward compatibility for orders created before
      // warranty snapshots were introduced.
      if (!warrantyType) {
        const product = await Product.findById(
          item.productId
        )
          .select(
            "title warrantyType warrantyDuration warrantyPolicy"
          )
          .session(session);

        warrantyType =
          product?.warrantyType || "No Warranty";

        duration = product?.warrantyDuration
          ? {
              value:
                product.warrantyDuration.value ?? null,
              unit:
                product.warrantyDuration.unit || "Months",
            }
          : {
              value: null,
              unit: "Months",
            };

        warrantyPolicy =
          product?.warrantyPolicy || "";
      }

      const normalizedDuration = {
        value: duration?.value ?? null,
        unit: duration?.unit || "Months",
      };

      const warrantyExpiresAt =
        calculateWarrantyExpiry(
          deliveredAt,
          warrantyType,
          normalizedDuration
        );

      // Warranty starts on actual delivery date.
      item.snapshot.warranty = {
        type: warrantyType,
        duration: normalizedDuration,
        policy: warrantyPolicy,
        startsAt: deliveredAt,
        expiresAt: warrantyExpiresAt,
      };

      // No reminder is created for no-warranty,
      // lifetime-warranty, or invalid-duration products.
      if (!warrantyExpiresAt) {
        continue;
      }

      const reminderOffsets = getReminderOffsets(
        deliveredAt,
        warrantyExpiresAt
      );

      for (const daysBefore of reminderOffsets) {
        const dueAt = new Date(
          warrantyExpiresAt.getTime() -
            daysBefore * DAY_IN_MS
        );

        reminderDocuments.push({
          orderId: order._id,
          customerId: order.customerId,
          orderItemIndex: itemIndex,
          productTitle:
            item.snapshot.title ||
            item.name ||
            "Product",
          variantSku:
            item.snapshot.sku || "UNKNOWN",
          warrantyType,
          warrantyExpiresAt,
          reminderDaysBefore: daysBefore,
          dueAt,
          nextAttemptAt: dueAt,
          status: "pending",
        });
      }
    }

    if (reminderDocuments.length > 0) {
      await WarrantyReminder.insertMany(
        reminderDocuments,
        {
          session,
          ordered: true,
        }
      );
    }

    return reminderDocuments.length;
  };

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  calculateWarrantyExpiry,
  getReminderOffsets,
  initializeWarrantyRemindersForDeliveredOrder,
};
