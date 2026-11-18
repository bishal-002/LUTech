import axios from "axios";

const API_URL = "http://localhost:5000/api/users";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// ======================================================
// EXISTING USER PROFILE SERVICES
// ======================================================

export const getUserProfile = async (id) => {
  const response = await axios.get(
    `${API_URL}/profile/${id}`,
    getAuthConfig()
  );

  return response.data;
};

export const updateUserProfile = async (id, userData) => {
  const response = await axios.put(
    `${API_URL}/profile/${id}`,
    userData,
    getAuthConfig()
  );

  return response.data;
};

export const deleteUserProfile = async (id) => {
  const response = await axios.delete(
    `${API_URL}/profile/${id}`,
    getAuthConfig()
  );

  return response.data;
};

// ======================================================
// CUSTOMER PROFILE SERVICES
// ======================================================

export const getCustomerProfile = async () => {
  const response = await axios.get(
    `${API_URL}/customer/profile`,
    getAuthConfig()
  );

  return response.data;
};

export const updateCustomerProfile = async (customerData) => {
  const response = await axios.put(
    `${API_URL}/customer/profile`,
    customerData,
    getAuthConfig()
  );

  return response.data;
};

// ======================================================
// WISHLIST SERVICES
// ======================================================

export const addToWishlist = async (
  productId,
  variantSku = ""
) => {
  const response = await axios.post(
    `${API_URL}/customer/wishlist`,
    {
      productId,
      variantSku,
    },
    getAuthConfig()
  );

  return response.data;
};

export const removeFromWishlist = async (productId) => {
  const response = await axios.delete(
    `${API_URL}/customer/wishlist/${productId}`,
    getAuthConfig()
  );

  return response.data;
};

// ======================================================
// PRICE ALERT SERVICES
// ======================================================

export const addPriceAlert = async (alertData) => {
  const response = await axios.post(
    `${API_URL}/customer/price-alerts`,
    alertData,
    getAuthConfig()
  );

  return response.data;
};

export const removePriceAlert = async (productId) => {
  const response = await axios.delete(
    `${API_URL}/customer/price-alerts/${productId}`,
    getAuthConfig()
  );

  return response.data;
};

// ======================================================
// RECENTLY VIEWED SERVICES
// ======================================================

export const addRecentlyViewed = async (productId) => {
  const response = await axios.post(
    `${API_URL}/customer/recently-viewed`,
    { productId },
    getAuthConfig()
  );

  return response.data;
};