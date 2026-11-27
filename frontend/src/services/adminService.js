
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

export const getProductsForModeration = async (params = {}) => {
  const response = await axiosClient.get("/admin/products", {
    params: {
      page: 1,
      limit: 1,
      status: "pending_review",
      ...params,
    },
  });

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
