const mongoose = require("mongoose");

const SellerRecovery = require("../models/SellerRecovery");

const ALLOWED_STATUSES = [
  "pending",
  "partially_recovered",
  "recovered",
];

const getSellerRecoveries = async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const filter = {
      sellerId: req.user._id,
    };

    if (req.query.status) {
      if (!ALLOWED_STATUSES.includes(req.query.status)) {
        return res.status(400).json({
          message: "Invalid seller recovery status filter.",
        });
      }

      filter.status = req.query.status;
    }

    const [recoveries, total, summaryRows] = await Promise.all([
      SellerRecovery.find(filter)
        .populate(
          "refundId",
          "approvedAmount currency status disputeId"
        )
        .populate(
          "orderId",
          "createdAt status totalAmount"
        )
        .populate(
          "lastPayoutId",
          "status netAmount paidAt"
        )
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),

      SellerRecovery.countDocuments(filter),

      SellerRecovery.aggregate([
        {
          $match: {
            sellerId: new mongoose.Types.ObjectId(req.user._id),
          },
        },
        {
          $group: {
            _id: null,
            totalCases: { $sum: 1 },
            originalAmount: { $sum: "$originalAmount" },
            recoveredAmount: { $sum: "$recoveredAmount" },
            outstandingAmount: { $sum: "$remainingAmount" },
            pendingCases: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      ["pending", "partially_recovered"],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const summary = summaryRows[0] || {
      totalCases: 0,
      originalAmount: 0,
      recoveredAmount: 0,
      outstandingAmount: 0,
      pendingCases: 0,
    };

    delete summary._id;

    for (const key of [
      "originalAmount",
      "recoveredAmount",
      "outstandingAmount",
    ]) {
      summary[key] =
        Math.round(
          (Number(summary[key] || 0) + Number.EPSILON) * 100
        ) / 100;
    }

    return res.status(200).json({
      currency: "BDT",
      summary,
      recoveries,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRecoveries: total,
        limit,
      },
    });
  } catch (error) {
    console.error("Get seller recoveries:", error);

    return res.status(500).json({
      message: "Unable to retrieve seller refund recoveries.",
    });
  }
};

module.exports = {
  getSellerRecoveries,
};