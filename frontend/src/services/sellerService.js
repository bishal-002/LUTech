import axiosClient from "../api/axiosClient";

// Seller dashboard identity and verification status
export const getSellerDashboard = async () => {
  const response = await axiosClient.get("/seller/dashboard");
  return response.data;
};

// Seller orders
export const getSellerOrders = async (config = {}) => {
  const response = await axiosClient.get("/seller/orders", config);
  return response.data;
};

// Single seller order
export const getSellerOrderById = async (orderId) => {
  const response = await axiosClient.get(`/seller/orders/${orderId}`);
  return response.data;
};

// Update seller order status
export const updateSellerOrderStatus = async (orderId, data) => {
  const response = await axiosClient.patch(
    `/seller/orders/${orderId}/status`,
    data
  );
  return response.data;
};

// Seller profile
export const getSellerProfile = async () => {
  const response = await axiosClient.get("/seller/profile");
  return response.data;
};

export const updateSellerProfile = async (data) => {
  const response = await axiosClient.put("/seller/profile", data);
  return response.data;
};

// Seller KYC
export const getSellerKyc = async () => {
  const response = await axiosClient.get("/seller/kyc");
  return response.data;
};

export const saveSellerKycDraft = async (data) => {
  const response = await axiosClient.put("/seller/kyc/draft", data);
  return response.data;
};

export const uploadSellerKycDocument = async (formData) => {
  const response = await axiosClient.post(
    "/seller/kyc/documents",
    formData
  );
  return response.data;
};

export const deleteSellerKycDocument = async (documentType) => {
  const response = await axiosClient.delete(
    `/seller/kyc/documents/${documentType}`
  );
  return response.data;
};

export const downloadSellerKycDocument = async (documentType) => {
  const response = await axiosClient.get(
    `/seller/kyc/documents/${documentType}`,
    { responseType: "blob" }
  );
  return response.data;
};

export const sendSellerPhoneOtp = async () => {
  const response = await axiosClient.post("/seller/kyc/phone/send-otp");
  return response.data;
};

export const verifySellerPhoneOtp = async (otp) => {
  const response = await axiosClient.post(
    "/seller/kyc/phone/verify-otp",
    { otp }
  );
  return response.data;
};

export const submitSellerKyc = async () => {
  const response = await axiosClient.post("/seller/kyc/submit");
  return response.data;
};