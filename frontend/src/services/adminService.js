
import axiosClient from "../api/axiosClient";

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
