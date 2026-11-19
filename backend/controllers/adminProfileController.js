
const mongoose = require("mongoose");
const net = require("node:net");

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

const MAX_ALLOWED_IPS = 20;

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
      "You cannot modify your own administrator role, permissions or status."
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
// PHONE NUMBER HELPERS
// ======================================================

// Accepted input examples:
// 017XXXXXXXX
// +88017XXXXXXXX
// 88017XXXXXXXX
//
// Stored format:
// +88017XXXXXXXX

const normalizeAdminPhone = (phone) => {
  if (typeof phone !== "string") return "";

  let value = phone.trim().replace(/[\s-]/g, "");

  if (/^01[3-9]\d{8}$/.test(value)) {
    value = `+880${value.slice(1)}`;
  } else if (/^8801[3-9]\d{8}$/.test(value)) {
    value = `+${value}`;
  }

  return value;
};

const isValidAdminPhone = (phone) =>
  /^\+8801[3-9]\d{8}$/.test(phone);

// Mask phone numbers in audit records.
const maskPhone = (phone) => {
  if (typeof phone !== "string" || phone.length < 8) {
    return "";
  }

  return `${phone.slice(0, 6)}******${phone.slice(-3)}`;
};

// ======================================================
// IP ADDRESS AND CIDR HELPERS
// ======================================================

const parseIpAddress = (input) => {
  if (typeof input !== "string" || !input.trim()) {
    return null;
  }

  let address = input.trim();

  if (address.startsWith("[") && address.endsWith("]")) {
    address = address.slice(1, -1);
  }

  address = address.split("%")[0];

  const version = net.isIP(address);

  if (version === 4) {
    const parts = address.split(".").map(Number);

    const value = parts.reduce(
      (result, part) => (result << 8n) | BigInt(part),
      0n
    );

    return {
      version: 4,
      value,
      mapped: false,
    };
  }

  if (version !== 6) {
    return null;
  }

  let normalized = address.toLowerCase();

  // Convert an embedded IPv4 suffix into two IPv6 groups.
  if (normalized.includes(".")) {
    const lastColon = normalized.lastIndexOf(":");

    if (lastColon < 0) return null;

    const ipv4 = normalized.slice(lastColon + 1);

    if (net.isIP(ipv4) !== 4) return null;

    const octets = ipv4.split(".").map(Number);

    const firstGroup = (
      (octets[0] << 8) | octets[1]
    ).toString(16);

    const secondGroup = (
      (octets[2] << 8) | octets[3]
    ).toString(16);

    normalized =
      normalized.slice(0, lastColon + 1) +
      firstGroup +
      ":" +
      secondGroup;
  }

  const halves = normalized.split("::");

  if (halves.length > 2) return null;

  let groups;

  if (halves.length === 2) {
    const left = halves[0] ? halves[0].split(":") : [];
    const right = halves[1] ? halves[1].split(":") : [];

    const missingGroups = 8 - left.length - right.length;

    if (missingGroups < 1) return null;

    groups = [
      ...left,
      ...Array(missingGroups).fill("0"),
      ...right,
    ];
  } else {
    groups = normalized.split(":");

    if (groups.length !== 8) return null;
  }

  if (
    groups.length !== 8 ||
    groups.some(
      (group) => !/^[0-9a-f]{1,4}$/.test(group)
    )
  ) {
    return null;
  }

  const value = groups.reduce(
    (result, group) =>
      (result << 16n) | BigInt(parseInt(group, 16)),
    0n
  );

  // Normalize IPv4-mapped IPv6 addresses.
  const mapped = (value >> 32n) === 0xffffn;

  if (mapped) {
    return {
      version: 4,
      value: value & ((1n << 32n) - 1n),
      mapped: true,
    };
  }

  return {
    version: 6,
    value,
    mapped: false,
  };
};

// Parse a single IP address or CIDR rule.
const parseAllowedIpRule = (rule) => {
  if (typeof rule !== "string") return null;

  const parts = rule.trim().split("/");

  if (parts.length > 2 || !parts[0]) {
    return null;
  }

  const parsedIp = parseIpAddress(parts[0]);

  if (!parsedIp) return null;

  const maxBits = parsedIp.version === 4 ? 32 : 128;

  let prefix;

  if (parts.length === 1) {
    prefix = maxBits;
  } else {
    if (!/^\d+$/.test(parts[1])) {
      return null;
    }

    prefix = Number(parts[1]);

    // Convert mapped IPv6 prefixes to IPv4 prefixes.
    if (parsedIp.mapped) {
      if (prefix < 96) return null;
      prefix -= 96;
    }
  }

  if (
    !Number.isInteger(prefix) ||
    prefix < 0 ||
    prefix > (parsedIp.version === 4 ? 32 : 128)
  ) {
    return null;
  }

  return {
    ...parsedIp,
    prefix,
  };
};

// Validate, normalize and remove duplicate IP rules.
const normalizeAllowedIps = (allowedIps) => {
  if (!Array.isArray(allowedIps)) {
    throw new HttpError(
      400,
      "Allowed IPs must be provided as an array."
    );
  }

  if (allowedIps.length > MAX_ALLOWED_IPS) {
    throw new HttpError(
      400,
      `A maximum of ${MAX_ALLOWED_IPS} IP or CIDR rules is allowed.`
    );
  }

  const normalized = [];

  for (const item of allowedIps) {
    if (typeof item !== "string" || !item.trim()) {
      throw new HttpError(
        400,
        "Every allowed IP entry must be a non-empty string."
      );
    }

    const rule = item.trim().toLowerCase();

    if (!parseAllowedIpRule(rule)) {
      throw new HttpError(
        400,
        `Invalid IP address or CIDR rule: ${item}`
      );
    }

    if (normalized.includes(rule)) {
      throw new HttpError(
        400,
        `Duplicate IP rule: ${rule}`
      );
    }

    normalized.push(rule);
  }

  return normalized;
};

// Check whether an IP belongs to a whitelist rule.
const ipMatchesRule = (requestIp, rule) => {
  const request = parseIpAddress(requestIp);
  const network = parseAllowedIpRule(rule);

  if (
    !request ||
    !network ||
    request.version !== network.version
  ) {
    return false;
  }

  const bits = network.version === 4 ? 32 : 128;
  const shift = BigInt(bits - network.prefix);

  return (
    (request.value >> shift) ===
    (network.value >> shift)
  );
};

const isIpAllowed = (requestIp, allowedIps) => {
  if (!Array.isArray(allowedIps)) return false;

  return allowedIps.some((rule) =>
    ipMatchesRule(requestIp, rule)
  );
};

// ======================================================
// AUDIT HELPERS
// ======================================================

const createAuditSnapshot = (profile) => ({
  userId: profile.userId.toString(),
  adminRole: profile.adminRole,
  permissions: [...profile.permissions],
  department: profile.department || null,
  status: profile.status,
  allowedIps: [
    ...(profile.security?.allowedIps || []),
  ],
});

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
  const defaultPermissions =
    getDefaultPermissions(adminRole);

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

    if (
      typeof req.query.search === "string" &&
      req.query.search.trim()
    ) {
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
      phone,
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
        throw new HttpError(
          404,
          "User account not found."
        );
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

      if (
        typeof user.name !== "string" ||
        user.name.trim().length < 2 ||
        user.name.trim().length > 80
      ) {
        throw new HttpError(
          400,
          "Administrator full name must be between 2 and 80 characters."
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

      // A new phone may be supplied, or the existing User phone
      // will be used. Administrators must have a valid phone.
      const finalPhone = normalizeAdminPhone(
        phone !== undefined ? phone : user.phone
      );

      if (!isValidAdminPhone(finalPhone)) {
        throw new HttpError(
          400,
          "A valid Bangladesh administrator phone number is required. Use +8801XXXXXXXXX."
        );
      }

      if (finalPhone !== user.phone) {
        const duplicatePhone = await User.findOne({
          phone: finalPhone,
          _id: { $ne: user._id },
        })
          .select("_id")
          .session(session);

        if (duplicatePhone) {
          throw new HttpError(
            409,
            "This phone number is already registered."
          );
        }

        user.phone = finalPhone;
        user.isPhoneVerified = false;
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

      await writeAuditLog({
        adminId: req.user._id,
        action: "ADMIN_PROFILE_CREATED",
        targetType: "AdminProfile",
        targetId: profile._id,
        changes: {
          before: null,
          after: {
            ...createAuditSnapshot(profile),
            phone: maskPhone(user.phone),
          },
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

    const hasAdminRole =
      Object.prototype.hasOwnProperty.call(
        req.body,
        "adminRole"
      );

    const hasPermissions =
      Object.prototype.hasOwnProperty.call(
        req.body,
        "permissions"
      );

    const hasDepartment =
      Object.prototype.hasOwnProperty.call(
        req.body,
        "department"
      );

    if (!hasAdminRole && !hasPermissions && !hasDepartment) {
      throw new HttpError(
        400,
        "No valid profile fields were provided for updating."
      );
    }

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

      const roleChanged =
        nextAdminRole !== profile.adminRole;

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

      const isDowngrade =
        profile.adminRole === "super_admin" &&
        nextAdminRole !== "super_admin";

      const note = normalizeAuditNote(
        suppliedNote,
        isDowngrade
      );

      if (
        !roleChanged &&
        !permissionsChanged &&
        !departmentChanged
      ) {
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
      } else if (
        permissionsChanged &&
        !roleChanged &&
        !departmentChanged
      ) {
        action = "ADMIN_PERMISSIONS_UPDATED";
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

      if (status === "active" && user.status !== "active") {
        throw new HttpError(
          400,
          "The linked User account must be active before this administrator profile can be activated."
        );
      }

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
// UPDATE ADMIN SECURITY SETTINGS
// PATCH /api/admin/profiles/:id/security
// ======================================================

const updateAdminSecuritySettings = async (req, res) => {
  let session;

  try {
    if (!ensureSuperAdmin(req, res)) return;

    const { id } = req.params;
    const body = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      throw new HttpError(
        400,
        "Invalid administrator profile ID."
      );
    }

    const allowedBodyFields = [
      "phone",
      "allowedIps",
      "note",
    ];

    const unexpectedFields = Object.keys(body).filter(
      (field) => !allowedBodyFields.includes(field)
    );

    if (unexpectedFields.length > 0) {
      throw new HttpError(
        400,
        `Unsupported security fields: ${unexpectedFields.join(", ")}`
      );
    }

    const hasPhone =
      Object.prototype.hasOwnProperty.call(body, "phone");

    const hasAllowedIps =
      Object.prototype.hasOwnProperty.call(body, "allowedIps");

    if (!hasPhone && !hasAllowedIps) {
      throw new HttpError(
        400,
        "Provide a phone number or an allowed IP list to update."
      );
    }

    const note = normalizeAuditNote(body.note);

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

      if (profile.status === "revoked") {
        throw new HttpError(
          400,
          "Security settings cannot be changed for a revoked administrator."
        );
      }

      const user = await User.findById(
        profile.userId
      ).session(session);

      if (!user) {
        throw new HttpError(
          404,
          "The linked administrator user account was not found."
        );
      }

      const isOwnProfile =
        user._id.toString() === req.user._id.toString();

      const previousPhone = user.phone || "";
      const previousAllowedIps = [
        ...(profile.security?.allowedIps || []),
      ];

      let nextPhone = previousPhone;
      let nextAllowedIps = previousAllowedIps;

      // -----------------------------------------------
      // PHONE NUMBER
      // -----------------------------------------------

      if (hasPhone) {
        if (typeof body.phone !== "string") {
          throw new HttpError(
            400,
            "Administrator phone number must be text."
          );
        }

        nextPhone = normalizeAdminPhone(body.phone);

        if (!isValidAdminPhone(nextPhone)) {
          throw new HttpError(
            400,
            "Enter a valid Bangladesh phone number, such as +8801XXXXXXXXX."
          );
        }

        if (nextPhone !== previousPhone) {
          const duplicatePhone = await User.findOne({
            phone: nextPhone,
            _id: { $ne: user._id },
          })
            .select("_id")
            .session(session);

          if (duplicatePhone) {
            throw new HttpError(
              409,
              "This phone number is already registered."
            );
          }

          user.phone = nextPhone;
          user.isPhoneVerified = false;
        }
      }

      // -----------------------------------------------
      // IP WHITELIST
      // -----------------------------------------------

      if (hasAllowedIps) {
        nextAllowedIps = normalizeAllowedIps(
          body.allowedIps
        );

        const requiresIpRestriction =
          profile.adminRole === "super_admin" ||
          profile.department === "Finance";

        if (!requiresIpRestriction && nextAllowedIps.length > 0) {
          throw new HttpError(
            400,
            "IP restrictions can only be configured for Super Admins and Finance department administrators."
          );
        }

        // Prevent a Super Admin from blocking their own
        // current IP address when configuring their profile.
        if (
          isOwnProfile &&
          requiresIpRestriction &&
          nextAllowedIps.length > 0
        ) {
          const currentIp =
            req.ip || req.socket?.remoteAddress || "";

          if (!isIpAllowed(currentIp, nextAllowedIps)) {
            throw new HttpError(
              400,
              "Your current IP address is not included in the new whitelist. Add your current IP before saving."
            );
          }
        }

        profile.security.allowedIps = nextAllowedIps;
      }

      const phoneChanged = nextPhone !== previousPhone;

      const allowedIpsChanged =
        JSON.stringify([...previousAllowedIps].sort()) !==
        JSON.stringify([...nextAllowedIps].sort());

      if (!phoneChanged && !allowedIpsChanged) {
        throw new HttpError(
          400,
          "No changes were detected in the administrator security settings."
        );
      }

      if (phoneChanged) {
        await user.save({ session });
      }

      if (allowedIpsChanged) {
        await profile.save({ session });
      }

      // Do not include unmasked phone numbers in audit records.
      const before = {
        userId: user._id.toString(),
        phone: maskPhone(previousPhone),
        allowedIps: previousAllowedIps,
      };

      const after = {
        userId: user._id.toString(),
        phone: maskPhone(nextPhone),
        allowedIps: nextAllowedIps,
      };

      await writeAuditLog({
        adminId: req.user._id,
        action: "ADMIN_PROFILE_UPDATED",
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
      message: "Administrator security settings updated successfully.",
      profile: updatedProfile,
    });
  } catch (error) {
    return handleControllerError(
      res,
      error,
      "Unable to update administrator security settings."
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
  updateAdminSecuritySettings,
};
