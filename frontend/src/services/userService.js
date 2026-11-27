
import axiosClient from "../api/axiosClient";

// ======================================================
// GET USER PROFILE
// GET /api/users/profile/:id
// ======================================================

export const getUserProfile = async (id) => {
  const response = await axiosClient.get(
    `/users/profile/${id}`
  );

  return response.data;
};

// ======================================================
// UPDATE USER PROFILE
// PUT /api/users/profile/:id
// ======================================================

export const updateUserProfile = async (
  id,
  userData
) => {
  const response = await axiosClient.put(
    `/users/profile/${id}`,
    userData
  );

  return response.data;
};

// ======================================================
// DELETE USER PROFILE
// DELETE /api/users/profile/:id
// ======================================================

export const deleteUserProfile = async (id) => {
  const response = await axiosClient.delete(
    `/users/profile/${id}`
  );

  return response.data;
};

// ======================================================
// GET CUSTOMER PROFILE
// GET /api/users/customer/profile
// ======================================================

export const getCustomerProfile = async () => {
  const response = await axiosClient.get(
    "/users/customer/profile"
  );

  return response.data;
};

// ======================================================
// UPDATE CUSTOMER PROFILE
// PUT /api/users/customer/profile
// ======================================================

export const updateCustomerProfile = async (
  profileData
) => {
  const response = await axiosClient.put(
    "/users/customer/profile",
    profileData
  );

  return response.data;
};

// ======================================================
// ADD PRODUCT TO WISHLIST
// POST /api/users/customer/wishlist
// ======================================================

export const addToWishlist = async (productId) => {
  const response = await axiosClient.post(
    "/users/customer/wishlist",
    { productId }
  );

  return response.data;
};

// ======================================================
// REMOVE PRODUCT FROM WISHLIST
// DELETE /api/users/customer/wishlist/:productId
// ======================================================

export const removeFromWishlist = async (productId) => {
  const response = await axiosClient.delete(
    `/users/customer/wishlist/${productId}`
  );

  return response.data;
};

// ======================================================
// ADD PRICE ALERT
// POST /api/users/customer/price-alerts
// ======================================================

export const addPriceAlert = async (alertData) => {
  const response = await axiosClient.post(
    "/users/customer/price-alerts",
    alertData
  );

  return response.data;
};

// ======================================================
// REMOVE PRICE ALERT
// DELETE /api/users/customer/price-alerts/:productId
// ======================================================

export const removePriceAlert = async (productId) => {
  const response = await axiosClient.delete(
    `/users/customer/price-alerts/${productId}`
  );

  return response.data;
};

// ======================================================
// ADD RECENTLY VIEWED PRODUCT
// POST /api/users/customer/recently-viewed
// ======================================================

export const addRecentlyViewed = async (productId) => {
  const response = await axiosClient.post(
    "/users/customer/recently-viewed",
    { productId }
  );

  return response.data;
};
