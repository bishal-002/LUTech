
import axiosClient from "../api/axiosClient";

// ======================================================
// ADMIN DASHBOARD
// ======================================================

export const getAdminUserStats = async () => {
  const response = await axiosClient.get("/admin/users/stats");
  return response.data;
};

export const getSellerKycQueue = async () => {
  const response = await axiosClient.get("/admin/sellers/kyc/queue");
  return response.data;
};

export const getAdminUsers = async (params = {}) => {
  const response = await axiosClient.get("/admin/users", {
    params,
  });

  return response.data;
};

// ======================================================
// SELLER KYC MANAGEMENT
// ======================================================

export const getSellerKycDetails = async (sellerId) => {
  const response = await axiosClient.get(
    `/admin/sellers/${sellerId}/kyc`
  );

  return response.data;
};

export const downloadSellerKycDocument = async (
  sellerId,
  documentType
) => {
  const response = await axiosClient.get(
    `/admin/sellers/${sellerId}/kyc/documents/${documentType}`,
    {
      responseType: "blob",
    }
  );

  return response;
};

export const approveSellerApplication = async (
  sellerId,
  sellerType
) => {
  const response = await axiosClient.put(
    `/admin/sellers/${sellerId}/approve`,
    { sellerType }
  );

  return response.data;
};

export const rejectSellerApplication = async (
  sellerId,
  reviewNote
) => {
  const response = await axiosClient.put(
    `/admin/sellers/${sellerId}/reject`,
    { reviewNote }
  );

  return response.data;
};


// ======================================================
// PRODUCT MODERATION
// ======================================================

export const getProductsForModeration = async (params = {}) => {
  const response = await axiosClient.get("/admin/products", {
    params: {
      page: 1,
      limit: 20,
      status: "pending_review",
      ...params,
    },
  });

  return response.data;
};

export const getProductVerificationProof = async (productId) => {
  const response = await axiosClient.get(
    `/admin/products/${productId}/verification-proof`,
    {
      responseType: "blob",
    }
  );

  return response;
};

export const approveProduct = async (productId) => {
  const response = await axiosClient.patch(
    `/admin/products/${productId}/approve`,
    {}
  );

  return response.data;
};

export const rejectProduct = async (productId, note) => {
  const response = await axiosClient.patch(
    `/admin/products/${productId}/reject`,
    { note }
  );

  return response.data;
};

export const verifyGenuineProduct = async (productId, note = "") => {
  const response = await axiosClient.patch(
    `/admin/products/${productId}/verify-genuine`,
    { note }
  );

  return response.data;
};

export const suspendProduct = async (productId, note) => {
  const response = await axiosClient.patch(
    `/admin/products/${productId}/suspend`,
    { note }
  );

  return response.data;
};

// ======================================================
// ADMIN USER MANAGEMENT
// ======================================================

export const updateAdminUserRole = async (userId, role) => {
  const response = await axiosClient.put(
    `/admin/users/${userId}/role`,
    { role }
  );

  return response.data;
};

export const deactivateAdminUser = async (userId) => {
  const response = await axiosClient.delete(
    `/admin/users/${userId}`
  );

  return response.data;
};

// ======================================================
// ADMIN CATALOG MANAGEMENT
// ======================================================

// Brands
export const getAdminBrands = async () => {
  const response = await axiosClient.get("/catalog/admin/brands");
  return response.data;
};

export const createCatalogBrand = async (data) => {
  const response = await axiosClient.post("/catalog/brands", data);
  return response.data;
};

export const updateCatalogBrand = async (brandId, data) => {
  const response = await axiosClient.put(
    `/catalog/brands/${brandId}`,
    data
  );
  return response.data;
};

export const deactivateCatalogBrand = async (brandId) => {
  const response = await axiosClient.delete(
    `/catalog/brands/${brandId}`
  );
  return response.data;
};

// Categories
export const getAdminCategories = async () => {
  const response = await axiosClient.get("/catalog/admin/categories");
  return response.data;
};

export const createCatalogCategory = async (data) => {
  const response = await axiosClient.post("/catalog/categories", data);
  return response.data;
};

export const updateCatalogCategory = async (categoryId, data) => {
  const response = await axiosClient.put(
    `/catalog/categories/${categoryId}`,
    data
  );
  return response.data;
};

export const deactivateCatalogCategory = async (categoryId) => {
  const response = await axiosClient.delete(
    `/catalog/categories/${categoryId}`
  );
  return response.data;
};


// ======================================================
// ADMIN DISPUTE MANAGEMENT
// ======================================================

export const getAdminDisputes = async (params = {}) => {
  const response = await axiosClient.get("/admin/disputes", {
    params,
  });
  return response.data;
};

export const getAdminDisputeDetails = async (disputeId) => {
  const response = await axiosClient.get(
    `/admin/disputes/${disputeId}`
  );
  return response.data;
};

export const sendAdminDisputeMessage = async (disputeId, message) => {
  const response = await axiosClient.post(
    `/admin/disputes/${disputeId}/messages`,
    { message }
  );
  return response.data;
};

export const updateAdminDisputeStatus = async (
  disputeId,
  status,
  note
) => {
  const response = await axiosClient.patch(
    `/admin/disputes/${disputeId}/status`,
    { status, note }
  );
  return response.data;
};

export const resolveAdminDispute = async (
  disputeId,
  decision,
  note,
  approvedAmount
) => {
  const payload = { decision, note };

  if (decision === "refund" && approvedAmount !== undefined) {
    payload.approvedAmount = Number(approvedAmount);
  }

  const response = await axiosClient.post(
    `/admin/disputes/${disputeId}/resolve`,
    payload
  );
  return response.data;
};

// ======================================================
// ADMIN REFUND MANAGEMENT
// ======================================================

export const getAdminRefunds = async (params = {}) => {
  const response = await axiosClient.get("/admin/refunds", {
    params,
  });
  return response.data;
};

export const getAdminRefundDetails = async (refundId) => {
  const response = await axiosClient.get(
    `/admin/refunds/${refundId}`
  );
  return response.data;
};

export const completeAdminRefund = async (refundId, data) => {
  const response = await axiosClient.patch(
    `/admin/refunds/${refundId}/complete`,
    data
  );
  return response.data;
};

export const failAdminRefund = async (refundId, failureReason) => {
  const response = await axiosClient.patch(
    `/admin/refunds/${refundId}/fail`,
    { failureReason }
  );
  return response.data;
};

// ======================================================
// ADMIN PAYOUT MANAGEMENT
// ======================================================

export const getAdminPayoutSummary = async () => {
  const response = await axiosClient.get("/admin/payouts/summary");
  return response.data;
};

export const getAdminPayouts = async (params = {}) => {
  const response = await axiosClient.get("/admin/payouts", {
    params,
  });
  return response.data;
};

export const getAdminPayoutDetails = async (payoutId) => {
  const response = await axiosClient.get(`/admin/payouts/${payoutId}`);
  return response.data;
};

export const processAdminPayout = async (payoutId, data) => {
  const response = await axiosClient.put(
    `/admin/payouts/${payoutId}/process`,
    data
  );
  return response.data;
};

// ======================================================
// ADMIN PLATFORM SETTINGS
// ======================================================

export const getPlatformSettings = async () => {
  const response = await axiosClient.get("/admin/platform-settings");
  return response.data;
};

export const updatePlatformSettings = async (data) => {
  const response = await axiosClient.patch(
    "/admin/platform-settings",
    data
  );
  return response.data;
};


// ======================================================
// ADMIN TEAM MANAGEMENT
// ======================================================

export const getAdminProfiles = async (params = {}) => {
  const response = await axiosClient.get("/admin/profiles", { params });
  return response.data;
};

export const getAdminProfileDetails = async (profileId) => {
  const response = await axiosClient.get(`/admin/profiles/${profileId}`);
  return response.data;
};

export const createAdminProfile = async (data) => {
  const response = await axiosClient.post("/admin/profiles", data);
  return response.data;
};

export const updateAdminProfile = async (profileId, data) => {
  const response = await axiosClient.patch(
    `/admin/profiles/${profileId}`,
    data
  );
  return response.data;
};

export const updateAdminProfileStatus = async (profileId, data) => {
  const response = await axiosClient.patch(
    `/admin/profiles/${profileId}/status`,
    data
  );
  return response.data;
};

export const updateAdminProfileSecurity = async (profileId, data) => {
  const response = await axiosClient.patch(
    `/admin/profiles/${profileId}/security`,
    data
  );
  return response.data;
};

// ======================================================
// ADMIN AUDIT LOGS
// ======================================================

export const getAdminAuditLogs = async (params = {}) => {
  const response = await axiosClient.get("/admin/audit-logs", { params });
  return response.data;
};

export const getAdminAuditLogDetails = async (logId) => {
  const response = await axiosClient.get(`/admin/audit-logs/${logId}`);
  return response.data;
};
