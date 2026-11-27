
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
