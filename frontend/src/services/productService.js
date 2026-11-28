
import axiosClient from "../api/axiosClient";

// Public products
export const getProducts = async (config = {}) => {
  const response = await axiosClient.get("/products", config);
  return response.data;
};

export const getProductById = async (id) => {
  const response = await axiosClient.get(`/products/${id}`);
  return response.data;
};

// Seller products
export const getMyProducts = async (config = {}) => {
  const response = await axiosClient.get("/products/mine", config);
  return response.data;
};

export const createProduct = async (productData) => {
  const response = await axiosClient.post("/products", productData);
  return response.data;
};

export const updateProduct = async (id, productData) => {
  const response = await axiosClient.put(`/products/${id}`, productData);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await axiosClient.delete(`/products/${id}`);
  return response.data;
};

// Product media uploads
export const uploadProductImage = async (file, slot) => {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("slot", slot);

  const response = await axiosClient.post(
    "/products/uploads/image",
    formData
  );

  return response.data;
};

export const uploadProductVideo = async (file) => {
  const formData = new FormData();
  formData.append("video", file);

  const response = await axiosClient.post(
    "/products/uploads/video",
    formData
  );

  return response.data;
};

export const uploadProductVerificationProof = async (id, file) => {
  const formData = new FormData();
  formData.append("proof", file);

  const response = await axiosClient.post(
    `/products/${id}/verification-proof`,
    formData
  );

  return response.data;
};

// Seller catalog
export const getSellerMasterBrands = async () => {
  const response = await axiosClient.get("/catalog/seller/master-brands");
  return response.data;
};

export const getCategories = async () => {
  const response = await axiosClient.get("/catalog/categories");
  return response.data;
};
