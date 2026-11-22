const Payout = require("../models/Payout");
const User = require("../models/User");

const {
  getPlatformSettings,
} = require("./platformSettingsService");

const {
  writeAuditLog,
} = require("./auditLogService");

// ======================================================
// MONEY HELPER
// ======================================================

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

// ======================================================
// REFRESH MATURED PAYOUTS
// ======================================================

const refreshMaturedPayouts = async () => {
  const now = new Date();

  const result = await Payout.updateMany(
    {
      status: "on_hold",
      eligibleAt: { $lte: now },
    },
    {
      $set: {
        status: "available",
      },
    }
  );

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
};

// ======================================================
// CREATE PAYOUT FROM A DELIVERED COD ORDER
// Must be called inside the order-delivery transaction.
// ======================================================

const createPayoutForDeliveredOrder = async ({
  order,
  session,
}) => {
  if (!order || !session) {
    throw new Error(
      "An order and MongoDB transaction session are required."
    );
  }

  if (
    order.status !== "delivered" ||
    order.paymentMethod !== "COD" ||
    order.paymentStatus !== "paid"
  ) {
    throw new Error(
      "A payout can only be created for a delivered and paid COD order."
    );
  }

  // Idempotency check.
  const existingPayout = await Payout.findOne({
    orderId: order._id,
  }).session(session);

  if (existingPayout) {
    return existingPayout;
  }

  // ----------------------------------------------
  // LEGACY ORDER SNAPSHOT FALLBACK
  // ----------------------------------------------

  const hasCommissionSnapshot =
    order.commissionRateSnapshot !== null &&
    order.commissionRateSnapshot !== undefined;

  const hasHoldSnapshot =
    order.payoutHoldDaysSnapshot !== null &&
    order.payoutHoldDaysSnapshot !== undefined;

  if (!hasCommissionSnapshot || !hasHoldSnapshot) {
    const seller = await User.findOne({
      _id: order.sellerId,
      role: "seller",
    })
      .select("+commissionRate")
      .session(session);

    if (!seller) {
      throw new Error(
        "Seller account was not found while creating the payout."
      );
    }

    const settings = await getPlatformSettings({
      session,
    });

    const sellerRate = Number(seller.commissionRate);

    const defaultRate = Number(
      settings.defaultCommissionRate
    );

    const effectiveRate =
      Number.isFinite(sellerRate) && sellerRate > 0
        ? sellerRate
        : defaultRate;

    const holdDays = Number(settings.payoutHoldDays);

    if (
      !Number.isFinite(effectiveRate) ||
      effectiveRate < 0 ||
      effectiveRate > 100
    ) {
      throw new Error(
        "A valid seller commission rate could not be determined."
      );
    }

    if (
      !Number.isInteger(holdDays) ||
      holdDays < 0 ||
      holdDays > 365
    ) {
      throw new Error(
        "The platform payout hold period is invalid."
      );
    }

    order.commissionRateSnapshot = effectiveRate;
    order.payoutHoldDaysSnapshot = holdDays;

    // The Order pre-validation hook calculates the
    // commission base, commission and seller net amount.
    await order.save({ session });
  }

  // ----------------------------------------------
  // VALIDATE FINANCIAL SNAPSHOTS
  // ----------------------------------------------

  const commissionRate = Number(
    order.commissionRateSnapshot
  );

  const holdDays = Number(
    order.payoutHoldDaysSnapshot
  );

  const grossAmount = Number(
    order.commissionBaseAmount
  );

  const commissionAmount = Number(
    order.platformCommissionAmount
  );

  const netAmount = Number(
    order.sellerNetAmount
  );

  if (
    !Number.isFinite(commissionRate) ||
    commissionRate < 0 ||
    commissionRate > 100 ||
    !Number.isInteger(holdDays) ||
    holdDays < 0 ||
    holdDays > 365 ||
    !Number.isFinite(grossAmount) ||
    !Number.isFinite(commissionAmount) ||
    !Number.isFinite(netAmount) ||
    grossAmount < 0 ||
    commissionAmount < 0 ||
    netAmount < 0
  ) {
    throw new Error(
      "The order contains invalid payout financial snapshots."
    );
  }

  const deliveredAt = order.deliveredAt || new Date();

  const eligibleAt = new Date(
    deliveredAt.getTime() +
      holdDays * 24 * 60 * 60 * 1000
  );

  const initialStatus =
    eligibleAt.getTime() <= Date.now()
      ? "available"
      : "on_hold";

  // ----------------------------------------------
  // CREATE PAYOUT RECORD
  // ----------------------------------------------

  const [payout] = await Payout.create(
    [
      {
        orderId: order._id,
        sellerId: order.sellerId,
        customerId: order.customerId,

        currency: "BDT",

        grossAmount: roundMoney(grossAmount),
        commissionRate,
        commissionAmount: roundMoney(commissionAmount),
        netAmount: roundMoney(netAmount),

        holdDays,
        eligibleAt,
        status: initialStatus,
      },
    ],
    { session }
  );

  // ----------------------------------------------
  // SYSTEM AUDIT LOG
  // ----------------------------------------------

  await writeAuditLog({
    actorRole: "system",
    action: "PAYOUT_CREATED",
    targetType: "Payout",
    targetId: payout._id,
    changes: {
      before: null,
      after: {
        orderId: order._id.toString(),
        sellerId: order.sellerId.toString(),
        grossAmount: payout.grossAmount,
        commissionRate: payout.commissionRate,
        commissionAmount: payout.commissionAmount,
        netAmount: payout.netAmount,
        holdDays: payout.holdDays,
        eligibleAt: payout.eligibleAt,
        status: payout.status,
      },
    },
    session,
  });

  return payout;
};

module.exports = {
  roundMoney,
  refreshMaturedPayouts,
  createPayoutForDeliveredOrder,
};