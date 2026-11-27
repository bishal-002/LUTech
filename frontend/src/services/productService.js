
import axiosClient from "../api/axiosClient";

// ======================================================
// GET PUBLIC PRODUCTS
// GET /api/products
// ======================================================

export const getProducts = async (config = {}) => {
  const response = await axiosClient.get(
    "/products",
    config
  );

  return response.data;
};

// ======================================================
// GET SINGLE PRODUCT
// GET /api/products/:id
// ======================================================

export const getProductById = async (id) => {
  const response = await axiosClient.get(
    `/products/${id}`
  );

  return response.data;
};

// ======================================================
// GET LOGGED-IN SELLER'S PRODUCTS
// GET /api/products/mine
// ======================================================

export const getMyProducts = async (config = {}) => {
  const response = await axiosClient.get(
    "/products/mine",
    config
  );

  return response.data;
};

// ======================================================
// CREATE PRODUCT
// POST /api/products
// ======================================================

export const createProduct = async (productData) => {
  const response = await axiosClient.post(
    "/products",
    productData
  );

  return response.data;
};

// ======================================================
// UPDATE PRODUCT
// PUT /api/products/:id
// ======================================================

export const updateProduct = async (
  id,
  productData
) => {
  const response = await axiosClient.put(
    `/products/${id}`,
    productData
  );

  return response.data;
};

// ======================================================
// DELETE SELLER PRODUCT
// DELETE /api/products/:id
// ======================================================

export const deleteProduct = async (id) => {
  const response = await axiosClient.delete(
    `/products/${id}`
  );

  return response.data;
};
