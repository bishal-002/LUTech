
const mongoose = require("mongoose");

const {
  AuditLog,
  AUDIT_ACTIONS,
  AUDIT_TARGET_TYPES,
} = require("../models/AuditLog");

// ======================================================
// COMMON ERROR HANDLER
// ======================================================

const handleError = (res, error, fallbackMessage) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      message: error.message,
    });
  }

  console.error(fallbackMessage, error);

  return res.status(500).json({
    message: fallbackMessage,
  });
};

// ======================================================
// ADMIN POPULATION
// ======================================================

const populateAuditAdmin = (query) => {
  return query.populate({
    path: "adminId",
    select: "name email role",
  });
};

// ======================================================
// GET ALL AUDIT LOGS
// GET /api/admin/audit-logs
// ======================================================

const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(req.query.limit, 10) || 20
      )
    );

    const filter = {};

    // ----------------------------------------------
    // Filter by action
    // ----------------------------------------------

    if (req.query.action) {
      if (!AUDIT_ACTIONS.includes(req.query.action)) {
        return res.status(400).json({
          message: "Invalid audit action filter.",
        });
      }

      filter.action = req.query.action;
    }

    // ----------------------------------------------
    // Filter by target type
    // ----------------------------------------------

    if (req.query.targetType) {
      if (!AUDIT_TARGET_TYPES.includes(req.query.targetType)) {
        return res.status(400).json({
          message: "Invalid audit target type.",
        });
      }

      filter.targetType = req.query.targetType;
    }

    // ----------------------------------------------
    // Filter by administrator
    // ----------------------------------------------

    if (req.query.adminId) {
      if (!mongoose.isValidObjectId(req.query.adminId)) {
        return res.status(400).json({
          message: "Invalid administrator ID.",
        });
      }

      filter.adminId = req.query.adminId;
    }

    // ----------------------------------------------
    // Filter by affected resource
    // ----------------------------------------------

    if (req.query.targetId) {
      if (!mongoose.isValidObjectId(req.query.targetId)) {
        return res.status(400).json({
          message: "Invalid target ID.",
        });
      }

      filter.targetId = req.query.targetId;
    }

    // ----------------------------------------------
    // Filter by date range
    // Use ISO date strings in startDate/endDate.
    // ----------------------------------------------

    const { startDate, endDate } = req.query;

    if (startDate || endDate) {
      const dateFilter = {};

      if (startDate) {
        const parsedStartDate = new Date(startDate);

        if (Number.isNaN(parsedStartDate.getTime())) {
          return res.status(400).json({
            message: "Invalid startDate. Use a valid ISO date.",
          });
        }

        dateFilter.$gte = parsedStartDate;
      }

      if (endDate) {
        const parsedEndDate = new Date(endDate);

        if (Number.isNaN(parsedEndDate.getTime())) {
          return res.status(400).json({
            message: "Invalid endDate. Use a valid ISO date.",
          });
        }

        dateFilter.$lte = parsedEndDate;
      }

      if (
        dateFilter.$gte &&
        dateFilter.$lte &&
        dateFilter.$gte > dateFilter.$lte
      ) {
        return res.status(400).json({
          message: "startDate cannot be later than endDate.",
        });
      }

      filter.createdAt = dateFilter;
    }

    // ----------------------------------------------
    // Retrieve audit records
    // ----------------------------------------------

    const [logs, totalLogs] = await Promise.all([
      populateAuditAdmin(
        AuditLog.find(filter)
          .sort({
            createdAt: -1,
            _id: -1,
          })
          .skip((page - 1) * limit)
          .limit(limit)
      ),

      AuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      logs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalLogs / limit),
        totalLogs,
        limit,
      },
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to retrieve audit logs."
    );
  }
};

// ======================================================
// GET SINGLE AUDIT LOG
// GET /api/admin/audit-logs/:id
// ======================================================

const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid audit log ID.",
      });
    }

    const log = await populateAuditAdmin(
      AuditLog.findById(id)
    );

    if (!log) {
      return res.status(404).json({
        message: "Audit log not found.",
      });
    }

    return res.status(200).json({
      log,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Unable to retrieve audit log."
    );
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getAuditLogs,
  getAuditLogById,
};
