import axios from "axios";

const API_URL = "http://localhost:5000/api/users";

export const getUserProfile = async (id) => {
  const response = await axios.get(
    `${API_URL}/profile/${id}`
  );

  return response.data;
};

export const updateUserProfile = async (
  id,
  userData
) => {
  const response = await axios.put(
    `${API_URL}/profile/${id}`,
    userData
  );

  return response.data;
};

export const deleteUserProfile = async (id) => {
  const response = await axios.delete(
    `${API_URL}/profile/${id}`
  );

  return response.data;
};