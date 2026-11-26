const Payout = require("../models/Payout");
const SellerRecovery = require("../models/SellerRecovery");
const User = require("../models/User");

const {
  getPlatformSettings,
} = require("./platformSettingsService");

const {
  writeAuditLog,
} = require("./auditLogService");

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

// Matured payouts are released only when they are not held by an active dispute.
const refreshMaturedPayouts = async () => {
  const now = new Date();

  const result = await Payout.updateMany(
    {
      status: "on_hold",
      disputeHold: { $ne: true },
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

// Create a payout from a delivered COD order and apply any outstanding
// seller refund recoveries in FIFO order before the payable is released.
// This function must run inside the order-delivery transaction.
const createPayoutForDeliveredOrder = async ({ order, session }) => {
  if (!order || !session) {
    throw new Error("An order and MongoDB transaction session are required.");
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

  const existingPayout = await Payout.findOne({
    orderId: order._id,
  }).session(session);

  if (existingPayout) return existingPayout;

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
      throw new Error("Seller account was not found while creating the payout.");
    }

    const settings = await getPlatformSettings({ session });
    const sellerRate = Number(seller.commissionRate);
    const defaultRate = Number(settings.defaultCommissionRate);

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
      throw new Error("A valid seller commission rate could not be determined.");
    }

    if (!Number.isInteger(holdDays) || holdDays < 0 || holdDays > 365) {
      throw new Error("The platform payout hold period is invalid.");
    }

    order.commissionRateSnapshot = effectiveRate;
    order.payoutHoldDaysSnapshot = holdDays;

    await order.save({ session });
  }

  const commissionRate = Number(order.commissionRateSnapshot);
  const holdDays = Number(order.payoutHoldDaysSnapshot);
  const grossAmount = Number(order.commissionBaseAmount);
  const commissionAmount = Number(order.platformCommissionAmount);
  const sellerEarningsAmount = Number(order.sellerNetAmount);

  if (
    !Number.isFinite(commissionRate) ||
    commissionRate < 0 ||
    commissionRate > 100 ||
    !Number.isInteger(holdDays) ||
    holdDays < 0 ||
    holdDays > 365 ||
    !Number.isFinite(grossAmount) ||
    !Number.isFinite(commissionAmount) ||
    !Number.isFinite(sellerEarningsAmount) ||
    grossAmount < 0 ||
    commissionAmount < 0 ||
    sellerEarningsAmount < 0
  ) {
    throw new Error("The order contains invalid payout financial snapshots.");
  }

  const deliveredAt = order.deliveredAt || new Date();

  const eligibleAt = new Date(
    deliveredAt.getTime() + holdDays * 24 * 60 * 60 * 1000
  );

  const initialStatus =
    eligibleAt.getTime() <= Date.now() ? "available" : "on_hold";

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
        sellerEarningsAmount: roundMoney(sellerEarningsAmount),
        recoveryDeduction: 0,
        refundDeduction: 0,
        refundedGrossAmount: 0,
        netAmount: roundMoney(sellerEarningsAmount),
        holdDays,
        eligibleAt,
        status: initialStatus,
        disputeHold: false,
      },
    ],
    { session }
  );

  // Recover approved refunds from previous orders before the seller is paid.
  let remainingPayable = roundMoney(sellerEarningsAmount);
  let totalRecoveryDeduction = 0;

  if (remainingPayable > 0) {
    const recoveries = await SellerRecovery.find({
      sellerId: order.sellerId,
      status: { $in: ["pending", "partially_recovered"] },
      remainingAmount: { $gt: 0 },
    })
      .sort({ createdAt: 1, _id: 1 })
      .session(session);

    for (const recovery of recoveries) {
      if (remainingPayable <= 0) break;

      const beforeRemaining = Number(recovery.remainingAmount || 0);

      const applied = roundMoney(
        Math.min(beforeRemaining, remainingPayable)
      );

      if (applied <= 0) continue;

      recovery.remainingAmount = roundMoney(beforeRemaining - applied);

      recovery.recoveredAmount = roundMoney(
        Number(recovery.recoveredAmount || 0) + applied
      );

      recovery.lastPayoutId = payout._id;

      recovery.status =
        recovery.remainingAmount <= 0.001
          ? "recovered"
          : "partially_recovered";

      recovery.recoveredAt =
        recovery.status === "recovered" ? new Date() : null;

      await recovery.save({ session });

      remainingPayable = roundMoney(remainingPayable - applied);

      totalRecoveryDeduction = roundMoney(
        totalRecoveryDeduction + applied
      );

      await writeAuditLog({
        actorRole: "system",
        action: "SELLER_RECOVERY_APPLIED",
        targetType: "SellerRecovery",
        targetId: recovery._id,
        changes: {
          before: {
            remainingAmount: beforeRemaining,
            recoveredAmount: roundMoney(
              Number(recovery.recoveredAmount || 0) - applied
            ),
          },
          after: {
            remainingAmount: recovery.remainingAmount,
            recoveredAmount: recovery.recoveredAmount,
            appliedAmount: applied,
            payoutId: payout._id.toString(),
            status: recovery.status,
          },
        },
        session,
      });
    }
  }

  payout.recoveryDeduction = roundMoney(totalRecoveryDeduction);
  payout.netAmount = roundMoney(remainingPayable);

  if (payout.netAmount <= 0.001) {
    payout.netAmount = 0;
    payout.status = "cancelled";
  }

  await payout.save({ session });

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
        sellerEarningsAmount: payout.sellerEarningsAmount,
        recoveryDeduction: payout.recoveryDeduction,
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