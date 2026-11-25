
const WarrantyReminder = require("../models/WarrantyReminder");
const Order = require("../models/Order");
const User = require("../models/User");

const sendEmail = require("../utils/sendEmail");

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const HOUR_IN_MS = 60 * 60 * 1000;

const MAX_ATTEMPTS = 5;
const MAX_BATCH_SIZE = 100;
const LOCK_TIMEOUT_MS = 15 * 60 * 1000;

let schedulerTimer = null;
let schedulerRunning = false;

// ======================================================
// DATE FORMATTING
// ======================================================

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-BD", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// ======================================================
// UPDATE REMINDER STATUS
// ======================================================

const updateReminder = async (reminderId, update) => {
  await WarrantyReminder.updateOne(
    { _id: reminderId },
    { $set: update }
  );
};

// ======================================================
// SKIP REMINDER
// ======================================================

const skipReminder = async (
  reminder,
  reason
) => {
  await updateReminder(reminder._id, {
    status: "skipped",
    lockedAt: null,
    lastError: reason,
  });
};

// ======================================================
// CLAIM NEXT DUE REMINDER
// Atomic claim prevents concurrent workers from
// intentionally sending the same reminder.
// ======================================================

const claimNextReminder = async (now) => {
  const staleLockTime = new Date(
    now.getTime() - LOCK_TIMEOUT_MS
  );

  return WarrantyReminder.findOneAndUpdate(
    {
      dueAt: { $lte: now },
      attempts: { $lt: MAX_ATTEMPTS },

      $or: [
        {
          status: {
            $in: ["pending", "failed"],
          },
          nextAttemptAt: { $lte: now },
        },

        {
          status: "processing",
          lockedAt: { $lte: staleLockTime },
        },
      ],
    },
    {
      $set: {
        status: "processing",
        lockedAt: now,
        lastAttemptAt: now,
      },

      $inc: {
        attempts: 1,
      },
    },
    {
      new: true,
      sort: {
        dueAt: 1,
      },
    }
  );
};

// ======================================================
// SEND ONE WARRANTY REMINDER
// ======================================================

const processWarrantyReminder = async (
  reminder
) => {
  const [order, customer] = await Promise.all([
    Order.findById(reminder.orderId).select(
      "status deliveredAt items"
    ),

    User.findOne({
      _id: reminder.customerId,
      role: "customer",
    }).select(
      "name email status preferences"
    ),
  ]);

  if (
    !order ||
    order.status !== "delivered" ||
    !order.deliveredAt
  ) {
    await skipReminder(
      reminder,
      "The associated order is not delivered."
    );

    return "skipped";
  }

  if (!customer || customer.status !== "active") {
    await skipReminder(
      reminder,
      "The customer account is unavailable."
    );

    return "skipped";
  }

  if (
    customer.preferences?.warrantyExpiryReminders ===
    false
  ) {
    await skipReminder(
      reminder,
      "The customer disabled warranty expiry reminders."
    );

    return "skipped";
  }

  if (!customer.email) {
    await skipReminder(
      reminder,
      "Customer email address is unavailable."
    );

    return "skipped";
  }

  const item = order.items[reminder.orderItemIndex];

  const warranty = item?.snapshot?.warranty;

  if (!warranty?.expiresAt) {
    await skipReminder(
      reminder,
      "Warranty expiry date is unavailable in the order snapshot."
    );

    return "skipped";
  }

  const currentExpiry = new Date(
    warranty.expiresAt
  );

  const storedExpiry = new Date(
    reminder.warrantyExpiresAt
  );

  if (
    currentExpiry.getTime() !== storedExpiry.getTime()
  ) {
    await skipReminder(
      reminder,
      "Warranty expiry snapshot does not match."
    );

    return "skipped";
  }

  const now = new Date();

  const remainingMilliseconds =
    currentExpiry.getTime() - now.getTime();

  if (remainingMilliseconds <= 0) {
    await skipReminder(
      reminder,
      "Warranty has already expired."
    );

    return "skipped";
  }

  const remainingDays = Math.ceil(
    remainingMilliseconds / DAY_IN_MS
  );

  const expiryDate = formatDate(currentExpiry);
  const deliveryDate = formatDate(order.deliveredAt);

  const productTitle =
    reminder.productTitle || "Product";

  const orderNumber = String(order._id);

  const message =
    `Hello ${customer.name || "Customer"},\n\n` +
    `This is a reminder that the warranty for your ` +
    `${productTitle} is approaching its expiry date.\n\n` +
    `Product: ${productTitle}\n` +
    `Variant SKU: ${reminder.variantSku}\n` +
    `Warranty type: ${reminder.warrantyType}\n` +
    `Order ID: ${orderNumber}\n` +
    `Delivery date: ${deliveryDate}\n` +
    `Warranty expiry date: ${expiryDate}\n` +
    `Approximate remaining time: ${remainingDays} day(s)\n\n` +
    `Please contact the product seller or the relevant ` +
    `warranty provider before the expiry date if you need ` +
    `warranty service.\n\n` +
    `Thank you for shopping with LUTech.`;

  const subject =
    `LUTech warranty reminder: ${productTitle}`;

  await sendEmail(
    customer.email,
    subject,
    message
  );

  await updateReminder(reminder._id, {
    status: "sent",
    sentAt: new Date(),
    lockedAt: null,
    lastError: "",
  });

  return "sent";
};

// ======================================================
// HANDLE EMAIL FAILURE AND RETRY
// ======================================================

const handleReminderFailure = async (
  reminder,
  error
) => {
  const terminal = reminder.attempts >= MAX_ATTEMPTS;

  const retryDelay = Math.min(
    15 * 60 * 1000 *
      Math.pow(2, Math.max(0, reminder.attempts - 1)),
    24 * HOUR_IN_MS
  );

  await updateReminder(reminder._id, {
    status: terminal ? "dead" : "failed",

    nextAttemptAt: terminal
      ? new Date()
      : new Date(Date.now() + retryDelay),

    lockedAt: null,

    lastError: String(
      error?.message || "Unknown email delivery error."
    ).slice(0, 1000),
  });

  console.error(
    `Warranty reminder ${reminder._id} failed ` +
      `(attempt ${reminder.attempts}/${MAX_ATTEMPTS}):`,
    error.message
  );
};

// ======================================================
// RUN DUE WARRANTY REMINDERS
// ======================================================

const runWarrantyReminderBatch = async () => {
  const now = new Date();

  const staleLockTime = new Date(
    now.getTime() - LOCK_TIMEOUT_MS
  );

  // Recover workers that crashed after their final claim.
  await WarrantyReminder.updateMany(
    {
      status: "processing",
      lockedAt: { $lte: staleLockTime },
      attempts: { $gte: MAX_ATTEMPTS },
    },
    {
      $set: {
        status: "dead",
        lockedAt: null,
        lastError:
          "Maximum attempts reached after an interrupted job.",
      },
    }
  );

  const summary = {
    claimed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  while (summary.claimed < MAX_BATCH_SIZE) {
    const reminder = await claimNextReminder(
      new Date()
    );

    if (!reminder) {
      break;
    }

    summary.claimed += 1;

    try {
      const result = await processWarrantyReminder(
        reminder
      );

      if (result === "sent") {
        summary.sent += 1;
      } else {
        summary.skipped += 1;
      }
    } catch (error) {
      summary.failed += 1;

      await handleReminderFailure(
        reminder,
        error
      );
    }
  }

  return summary;
};

// ======================================================
// START SCHEDULER
// ======================================================

const startWarrantyReminderScheduler = () => {
  if (schedulerTimer) {
    return schedulerTimer;
  }

  const configuredInterval = Number(
    process.env.WARRANTY_REMINDER_INTERVAL_MS
  );

  const intervalMs =
    Number.isFinite(configuredInterval) &&
    configuredInterval >= 60 * 1000
      ? configuredInterval
      : HOUR_IN_MS;

  const runSafely = async () => {
    if (schedulerRunning) {
      return;
    }

    schedulerRunning = true;

    try {
      const result = await runWarrantyReminderBatch();

      if (result.claimed > 0) {
        console.log(
          "Warranty reminder job completed:",
          result
        );
      }
    } catch (error) {
      console.error(
        "Warranty reminder scheduler error:",
        error
      );
    } finally {
      schedulerRunning = false;
    }
  };

  // Run immediately after database connection.
  void runSafely();

  // Then check for due reminders hourly by default.
  schedulerTimer = setInterval(
    runSafely,
    intervalMs
  );

  if (typeof schedulerTimer.unref === "function") {
    schedulerTimer.unref();
  }

  console.log(
    `Warranty reminder scheduler started. Interval: ${intervalMs} ms`
  );

  return schedulerTimer;
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  startWarrantyReminderScheduler,
  runWarrantyReminderBatch,
};
