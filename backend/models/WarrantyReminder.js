
const mongoose = require("mongoose");

const warrantyReminderSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    orderItemIndex: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Order item index must be a whole number.",
      },
    },

    productTitle: {
      type: String,
      required: true,
      trim: true,
    },

    variantSku: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    warrantyType: {
      type: String,
      required: true,
      trim: true,
    },

    warrantyExpiresAt: {
      type: Date,
      required: true,
    },

    reminderDaysBefore: {
      type: Number,
      enum: [30, 7, 1],
      required: true,
    },

    dueAt: {
      type: Date,
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "sent",
        "skipped",
        "failed",
        "dead",
      ],
      default: "pending",
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },

    nextAttemptAt: {
      type: Date,
      required: true,
      index: true,
    },

    lockedAt: {
      type: Date,
      default: null,
    },

    lastAttemptAt: {
      type: Date,
      default: null,
    },

    sentAt: {
      type: Date,
      default: null,
    },

    lastError: {
      type: String,
      default: "",
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// One reminder of each type per order item.
warrantyReminderSchema.index(
  {
    orderId: 1,
    orderItemIndex: 1,
    reminderDaysBefore: 1,
  },
  {
    unique: true,
  }
);

warrantyReminderSchema.index({
  status: 1,
  dueAt: 1,
  nextAttemptAt: 1,
});

module.exports =
  mongoose.models.WarrantyReminder ||
  mongoose.model(
    "WarrantyReminder",
    warrantyReminderSchema
  );
