
import axios from "axios";

const API_URL = "http://localhost:5000/api/users";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");

  return {
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : {},
  };
};

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
