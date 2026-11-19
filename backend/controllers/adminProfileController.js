
const mongoose = require("mongoose");

const User = require("../models/User");
const AdminProfile = require("../models/AdminProfile");
const { writeAuditLog } = require("../services/auditLogService");

const {
  ADMIN_ROLES,
  ADMIN_PERMISSIONS,
  getDefaultPermissions,
} = require("../config/adminPermissions");

// ======================================================
// CONSTANTS
// ======================================================

const DEPARTMENTS = [
  "Operations",
  "Trust & Safety",
  "Catalog & Merchandising",
  "Finance",
  "Engineering",
];

const ADMIN_STATUSES = [
  "active",
  "suspended",
  "revoked",
];

// ======================================================
// CUSTOM HTTP ERROR
// ======================================================

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

// ======================================================
// COMMON ERROR HANDLER
// ======================================================

const handleControllerError = (res, error, fallbackMessage) => {
  let statusCode = error.statusCode || 500;

  if (error.name === "ValidationError") {
    statusCode = 400;
  }

  if (error.code === 11000) {
    statusCode = 409;
  }

  if (statusCode === 500) {
    console.error(fallbackMessage, error);
  }

  return res.status(statusCode).json({
    message:
      statusCode === 500
        ? fallbackMessage
        : error.message,
  });
};

// ======================================================
// AUTHORIZATION HELPERS
// ======================================================

const ensureSuperAdmin = (req, res) => {
  if (req.adminProfile?.adminRole !== "super_admin") {
    res.status(403).json({
      message:
        "Only a Super Admin can manage administrator profiles.",
    });

    return false;
  }

  return true;
};

const preventSelfManagement = (profile, req) => {
  if (profile.userId.toString() === req.user._id.toString()) {
    throw new HttpError(
      400,
      "You cannot modify your own administrator profile."
    );
  }
};

const ensureAnotherActiveSuperAdminExists = async (
  profile,
  session
) => {
  const otherActiveSuperAdmins = await AdminProfile.countDocuments({
    adminRole: "super_admin",
    status: "active",
    _id: { $ne: profile._id },
  }).session(session);

  if (otherActiveSuperAdmins < 1) {
    throw new HttpError(
      400,
      "The last active Super Admin cannot be downgraded, suspended or revoked."
    );
  }
};

// ======================================================
// AUDIT HELPERS
// ======================================================

// Keep audit snapshots limited to non-sensitive profile data.
const createAuditSnapshot = (profile) => ({
  userId: profile.userId.toString(),
  adminRole: profile.adminRole,
  permissions: [...profile.permissions],
  department: profile.department || null,
  status: profile.status,
});

// Validate and normalize the internal audit note.
const normalizeAuditNote = (note, required = false) => {
  if (note === undefined || note === null) {
    if (required) {
      throw new HttpError(
        400,
        "An internal note is required for this action."
      );
    }

    return "";
  }

  if (typeof note !== "string") {
    throw new HttpError(
      400,
      "The internal note must be text."
    );
  }

  const normalizedNote = note.trim();

  if (normalizedNote.length > 500) {
    throw new HttpError(
      400,
      "The internal note cannot exceed 500 characters."
    );
  }

  if (required && !normalizedNote) {
    throw new HttpError(
      400,
      "An internal note is required for this action."
    );
  }

  return normalizedNote;
};

// ======================================================
// PERMISSION VALIDATION
// ======================================================

const normalizePermissions = (
  adminRole,
  requestedPermissions
) => {
  const defaultPermissions = getDefaultPermissions(adminRole);

  if (requestedPermissions === undefined) {
    return defaultPermissions;
  }

  if (!Array.isArray(requestedPermissions)) {
    throw new HttpError(
      400,
      "Permissions must be provided as an array."
    );
  }

  const uniquePermissions = new Set(requestedPermissions);

  if (uniquePermissions.size !== requestedPermissions.length) {
    throw new HttpError(
      400,
      "Duplicate permissions are not allowed."
    );
  }

  const invalidPermissions = requestedPermissions.filter(
    (permission) =>
      typeof permission !== "string" ||
      !ADMIN_PERMISSIONS.includes(permission)
  );

  if (invalidPermissions.length > 0) {
    throw new HttpError(
      400,
      `Invalid permissions: ${invalidPermissions.join(", ")}`
    );
  }

  // Super Admins must retain every available permission.
  if (adminRole === "super_admin") {
    const hasAllPermissions =
      defaultPermissions.length === requestedPermissions.length &&
      defaultPermissions.every((permission) =>
        requestedPermissions.includes(permission)
      );

    if (!hasAllPermissions) {
      throw new HttpError(
        400,
        "A Super Admin must retain all default permissions."
      );
    }
  }

  // Administrator management is reserved for Super Admins.
  if (
    adminRole !== "super_admin" &&
    requestedPermissions.includes("manage_admins")
  ) {
    throw new HttpError(
      403,
      "The manage_admins permission is reserved for Super Admins."
    );
  }

  return requestedPermissions;
};

// ======================================================
// PROFILE RESPONSE HELPER
// ======================================================

const populateAdminProfile = (query) => {
  return query
    .select("-security.twoFactorSecretEncrypted")
    .populate({
      path: "userId",
      select: "name email phone role status isVerified",
    });
};

// ======================================================
// GET ALL ADMIN PROFILES
// GET /api/admin/profiles
// ======================================================

const getAdminProfiles = async (req, res) => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const page = Math.max(
      1,
      Number.parseInt(req.query.page, 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(req.query.limit, 10) || 10
      )
    );

    const filter = {};

    if (req.query.adminRole) {
      if (!ADMIN_ROLES.includes(req.query.adminRole)) {
        return res.status(400).json({
          message: "Invalid administrator role filter.",
        });
      }

      filter.adminRole = req.query.adminRole;
    }

    if (req.query.status) {
      if (!ADMIN_STATUSES.includes(req.query.status)) {
        return res.status(400).json({
          message: "Invalid administrator status filter.",
        });
      }

      filter.status = req.query.status;
    }

    if (req.query.search?.trim()) {
      const searchTerm = req.query.search.trim();

      const escapedSearch = searchTerm.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex = new RegExp(escapedSearch, "i");

      const matchingUsers = await User.find({
        role: "admin",
        $or: [
          { name: regex },
          { email: regex },
        ],
      })
        .select("_id")
        .lean();

      const matchingUserIds = matchingUsers.map(
        (user) => user._id
      );

      if (matchingUserIds.length === 0) {
        return res.status(200).json({
          profiles: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalProfiles: 0,
            limit,
          },
        });
      }

      filter.userId = {
        $in: matchingUserIds,
      };
    }

    const [profiles, totalProfiles] = await Promise.all([
      populateAdminProfile(
        AdminProfile.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
      ),

      AdminProfile.countDocuments(filter),
    ]);

    return res.status(200).json({
      profiles,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalProfiles / limit),
        totalProfiles,
        limit,
      },
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to retrieve administrator profiles."
    );
  }
};

// ======================================================
// GET SINGLE ADMIN PROFILE
// GET /api/admin/profiles/:id
// ======================================================

const getAdminProfileById = async (req, res) => {
  try {
    if (!ensureSuperAdmin(req, res)) return;

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid administrator profile ID.",
      });
    }

    const profile = await populateAdminProfile(
      AdminProfile.findById(id)
    );

    if (!profile) {
      return res.status(404).json({
        message: "Administrator profile not found.",
      });
    }

    return res.status(200).json({
      profile,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to retrieve administrator profile."
    );
  }
};

// ======================================================
// CREATE ADMIN PROFILE
// POST /api/admin/profiles
// ======================================================

const createAdminProfile = async (req, res) => {
  let session;

  try {
    if (!ensureSuperAdmin(req, res)) return;

    const {
      userId,
      adminRole,
      department,
      permissions,
    } = req.body;

    if (!mongoose.isValidObjectId(userId)) {
      throw new HttpError(
        400,
        "A valid existing user ID is required."
      );
    }

    if (!ADMIN_ROLES.includes(adminRole)) {
      throw new HttpError(
        400,
        "A valid administrator role is required."
      );
    }

    if (
      department !== undefined &&
      department !== null &&
      department !== "" &&
      !DEPARTMENTS.includes(department)
    ) {
      throw new HttpError(
        400,
        "Invalid administrator department."
      );
    }

    const finalPermissions = normalizePermissions(
      adminRole,
      permissions
    );

    session = await mongoose.startSession();

    let createdProfileId = null;

    await session.withTransaction(async () => {
      const user = await User.findById(userId).session(session);

      if (!user) {
        throw new HttpError(404, "User account not found.");
      }

      if (!["customer", "admin"].includes(user.role)) {
        throw new HttpError(
          400,
          "Only existing customer or admin accounts can receive an administrator profile."
        );
      }

      if (!user.isVerified) {
        throw new HttpError(
          400,
          "The user's email must be verified before administrator access is granted."
        );
      }

      if (user.status !== "active") {
        throw new HttpError(
          400,
          "The user's account must be active."
        );
      }

      const existingProfile = await AdminProfile.findOne({
        userId: user._id,
      }).session(session);

      if (existingProfile) {
        throw new HttpError(
          409,
          "This user already has an administrator profile."
        );
      }

      user.role = "admin";
      await user.save({ session });

      const [profile] = await AdminProfile.create(
        [
          {
            userId: user._id,
            adminRole,
            permissions: finalPermissions,
            department: department || null,
            status: "active",
            security: {
              twoFactorEnabled: false,
            },
          },
        ],
        { session }
      );

      // Record creation in the same transaction.
      await writeAuditLog({
        adminId: req.user._id,
        action: "ADMIN_PROFILE_CREATED",
        targetType: "AdminProfile",
        targetId: profile._id,
        changes: {
          before: null,
          after: createAuditSnapshot(profile),
        },
        session,
      });

      createdProfileId = profile._id;
    });

    const createdProfile = await populateAdminProfile(
      AdminProfile.findById(createdProfileId)
    );

    return res.status(201).json({
      message: "Administrator profile created successfully.",
      profile: createdProfile,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to create administrator profile."
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// ======================================================
// UPDATE ADMIN PROFILE
// PATCH /api/admin/profiles/:id
// ======================================================

const updateAdminProfile = async (req, res) => {
  let session;

  try {
    if (!ensureSuperAdmin(req, res)) return;

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      throw new HttpError(
        400,
        "Invalid administrator profile ID."
      );
    }

    const hasAdminRole = Object.prototype.hasOwnProperty.call(
      req.body,
      "adminRole"
    );

    const hasPermissions = Object.prototype.hasOwnProperty.call(
      req.body,
      "permissions"
    );

    const hasDepartment = Object.prototype.hasOwnProperty.call(
      req.body,
      "department"
    );

    if (!hasAdminRole && !hasPermissions && !hasDepartment) {
      throw new HttpError(
        400,
        "No valid profile fields were provided for updating."
      );
    }

    // This is the note used when a Super Admin is downgraded.
    const suppliedNote = normalizeAuditNote(req.body.note);

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const profile = await AdminProfile.findById(id).session(
        session
      );

      if (!profile) {
        throw new HttpError(
          404,
          "Administrator profile not found."
        );
      }

      preventSelfManagement(profile, req);

      if (profile.status === "revoked") {
        throw new HttpError(
          400,
          "A revoked administrator profile cannot be modified."
        );
      }

      const before = createAuditSnapshot(profile);

      const nextAdminRole = hasAdminRole
        ? req.body.adminRole
        : profile.adminRole;

      if (!ADMIN_ROLES.includes(nextAdminRole)) {
        throw new HttpError(
          400,
          "Invalid administrator role."
        );
      }

      let nextDepartment = profile.department;

      if (hasDepartment) {
        const department = req.body.department;

        if (
          department !== null &&
          department !== "" &&
          !DEPARTMENTS.includes(department)
        ) {
          throw new HttpError(
            400,
            "Invalid administrator department."
          );
        }

        nextDepartment = department || null;
      }

      const roleChanged = nextAdminRole !== profile.adminRole;

      const nextPermissions =
        hasPermissions || roleChanged
          ? normalizePermissions(
              nextAdminRole,
              hasPermissions
                ? req.body.permissions
                : undefined
            )
          : [...profile.permissions];

      const permissionsChanged =
        JSON.stringify([...profile.permissions].sort()) !==
        JSON.stringify([...nextPermissions].sort());

      const departmentChanged =
        (profile.department || null) !== nextDepartment;

      if (
        profile.adminRole === "super_admin" &&
        profile.status === "active" &&
        nextAdminRole !== "super_admin"
      ) {
        await ensureAnotherActiveSuperAdminExists(
          profile,
          session
        );
      }

      // A downgrade requires a reason.
      const isDowngrade =
        profile.adminRole === "super_admin" &&
        nextAdminRole !== "super_admin";

      const note = normalizeAuditNote(
        suppliedNote,
        isDowngrade
      );

      if (!roleChanged && !permissionsChanged && !departmentChanged) {
        throw new HttpError(
          400,
          "No changes were detected in the administrator profile."
        );
      }

      profile.adminRole = nextAdminRole;
      profile.permissions = nextPermissions;
      profile.department = nextDepartment;

      await profile.save({ session });

      const after = createAuditSnapshot(profile);

      let action = "ADMIN_PROFILE_UPDATED";

      if (isDowngrade) {
        action = "ADMIN_PROFILE_DOWNGRADED";
      } else if (permissionsChanged && !roleChanged && !departmentChanged) {
        action = "ADMIN_PERMISSIONS_UPDATED";
      }

      // Store the change and audit entry atomically.
      await writeAuditLog({
        adminId: req.user._id,
        action,
        targetType: "AdminProfile",
        targetId: profile._id,
        changes: {
          before,
          after,
        },
        note: note || undefined,
        session,
      });
    });

    const updatedProfile = await populateAdminProfile(
      AdminProfile.findById(id)
    );

    return res.status(200).json({
      message: "Administrator profile updated successfully.",
      profile: updatedProfile,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to update administrator profile."
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// ======================================================
// UPDATE ADMIN PROFILE STATUS
// PATCH /api/admin/profiles/:id/status
// ======================================================

const updateAdminProfileStatus = async (req, res) => {
  let session;

  try {
    if (!ensureSuperAdmin(req, res)) return;

    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      throw new HttpError(
        400,
        "Invalid administrator profile ID."
      );
    }

    if (!ADMIN_STATUSES.includes(status)) {
      throw new HttpError(
        400,
        "Status must be active, suspended or revoked."
      );
    }

    // Suspension and revocation require a reason.
    const note = normalizeAuditNote(
      req.body.note,
      status === "suspended" || status === "revoked"
    );

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const profile = await AdminProfile.findById(id).session(
        session
      );

      if (!profile) {
        throw new HttpError(
          404,
          "Administrator profile not found."
        );
      }

      preventSelfManagement(profile, req);

      if (profile.status === "revoked") {
        throw new HttpError(
          400,
          "A revoked administrator profile cannot be reactivated or changed."
        );
      }

      const user = await User.findById(
        profile.userId
      ).session(session);

      if (!user) {
        throw new HttpError(
          404,
          "The linked user account was not found."
        );
      }

      if (status === profile.status) {
        throw new HttpError(
          400,
          `This administrator profile is already ${status}.`
        );
      }

      // The linked User account must be active before
      // an administrator profile can be reactivated.
      if (status === "active" && user.status !== "active") {
        throw new HttpError(
          400,
          "The linked User account must be active before this administrator profile can be activated."
        );
      }

      // Protect the last active Super Admin.
      if (
        profile.adminRole === "super_admin" &&
        profile.status === "active" &&
        status !== "active"
      ) {
        await ensureAnotherActiveSuperAdminExists(
          profile,
          session
        );
      }

      const before = createAuditSnapshot(profile);
      const previousStatus = profile.status;

      profile.status = status;

      await profile.save({ session });

      const after = createAuditSnapshot(profile);

      let action;

      if (status === "active") {
        action = "ADMIN_PROFILE_ACTIVATED";
      } else if (status === "suspended") {
        action = "ADMIN_PROFILE_SUSPENDED";
      } else {
        action = "ADMIN_PROFILE_REVOKED";
      }

      await writeAuditLog({
        adminId: req.user._id,
        action,
        targetType: "AdminProfile",
        targetId: profile._id,
        changes: {
          before,
          after,
        },
        note: note || undefined,
        session,
      });

      // Previous status is retained in the audit diff.
      void previousStatus;
    });

    const updatedProfile = await populateAdminProfile(
      AdminProfile.findById(id)
    );

    return res.status(200).json({
      message: `Administrator profile ${status} successfully.`,
      profile: updatedProfile,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to update administrator status."
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getAdminProfiles,
  getAdminProfileById,
  createAdminProfile,
  updateAdminProfile,
  updateAdminProfileStatus,
};
