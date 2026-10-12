
import axios from "axios";

const API_URL = "http://localhost:5000/api/products";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};


export const getProducts = async (config = {}) => {
  const response = await axios.get(API_URL, config);
  return response.data;
};

export const getProductById = async (id) => {
  const response = await axios.get(`${API_URL}/${id}`);
  return response.data;
};


export const createProduct = async (productData) => {
  const response = await axios.post(
    API_URL,
    productData,
    getAuthConfig()
  );

  return response.data;
};

export const updateProduct = async (id, productData) => {
  const response = await axios.put(
    `${API_URL}/${id}`,
    productData,
    getAuthConfig()
  );

  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await axios.delete(
    `${API_URL}/${id}`,
    getAuthConfig()
  );

  return response.data;
};
