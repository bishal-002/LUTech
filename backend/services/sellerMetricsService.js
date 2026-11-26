
const Order = require("../models/Order");
const User = require("../models/User");

const roundMetric = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
};

/**
 * Recalculate operational seller metrics from source orders.
 *
 * Must be called inside the same MongoDB transaction as the
 * order status transition:
 *
 * await refreshSellerMetrics({
 *   sellerId: order.sellerId,
 *   session,
 * });
 */
const refreshSellerMetrics = async ({
  sellerId,
  session,
}) => {
  if (!sellerId) {
    throw new Error("A seller ID is required to refresh seller metrics.");
  }

  if (!session) {
    throw new Error(
      "A MongoDB transaction session is required to refresh seller metrics."
    );
  }

  const orders = await Order.find({
    sellerId,
  })
    .select(
      [
        "status",
        "createdAt",
        "confirmedAt",
        "expectedShipAt",
        "shippedAt",
        "cancelledAt",
        "cancelledBy",
      ].join(" ")
    )
    .session(session)
    .lean();

  // Successfully delivered orders.
  const completedOrders = orders.filter(
    (order) => order.status === "delivered"
  ).length;

  // Average time from order placement to first confirmation.
  const responseTimes = orders
    .filter(
      (order) =>
        order.createdAt &&
        order.confirmedAt &&
        new Date(order.confirmedAt) >= new Date(order.createdAt)
    )
    .map(
      (order) =>
        (new Date(order.confirmedAt).getTime() -
          new Date(order.createdAt).getTime()) /
        60000
    )
    .filter(
      (minutes) => Number.isFinite(minutes) && minutes >= 0
    );

  const avgResponseMinutes =
    responseTimes.length > 0
      ? roundMetric(
          responseTimes.reduce((sum, value) => sum + value, 0) /
            responseTimes.length
        )
      : 0;

  // On-time shipping:
  // Only orders with both a recorded shipment and a deadline
  // are included. Orders without a deadline are excluded.
  const shippingOrders = orders.filter(
    (order) =>
      order.shippedAt &&
      order.expectedShipAt
  );

  const onTimeShipments = shippingOrders.filter(
    (order) =>
      new Date(order.shippedAt).getTime() <=
      new Date(order.expectedShipAt).getTime()
  ).length;

  const onTimeShipRate =
    shippingOrders.length > 0
      ? roundMetric(
          (onTimeShipments / shippingOrders.length) * 100
        )
      : 0;

  // Cancellation denominator:
  // Orders that were confirmed or progressed further,
  // plus cancelled orders. Pending orders that remain
  // pending are not included.
  const eligibleCancellationOrders = orders.filter(
    (order) =>
      Boolean(order.confirmedAt) ||
      [
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "refused",
        "cancelled",
      ].includes(order.status)
  );

  const sellerCancelledOrders =
    eligibleCancellationOrders.filter(
      (order) =>
        order.status === "cancelled" &&
        order.cancelledBy === "seller"
    ).length;

  const cancellationRate =
    eligibleCancellationOrders.length > 0
      ? roundMetric(
          (sellerCancelledOrders /
            eligibleCancellationOrders.length) *
            100
        )
      : 0;

  const update = await User.updateOne(
    {
      _id: sellerId,
      role: "seller",
    },
    {
      $set: {
        "metrics.completedOrders": completedOrders,
        "metrics.avgResponseMinutes": avgResponseMinutes,
        "metrics.onTimeShipRate": onTimeShipRate,
        "metrics.cancellationRate": cancellationRate,
      },
    },
    {
      session,
      runValidators: true,
    }
  );

  if (update.matchedCount !== 1) {
    throw new Error(
      "Seller account not found. Seller metrics could not be updated."
    );
  }

  return {
    completedOrders,
    avgResponseMinutes,
    onTimeShipRate,
    cancellationRate,
    sampleSizes: {
      confirmedOrders: responseTimes.length,
      shippedOrdersWithDeadline: shippingOrders.length,
      cancellationEligibleOrders:
        eligibleCancellationOrders.length,
    },
  };
};

module.exports = {
  refreshSellerMetrics,
};
