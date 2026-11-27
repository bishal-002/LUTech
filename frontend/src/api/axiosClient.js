import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 20000,
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || "";

      const isAuthenticationRequest =
        requestUrl.includes("/users/login") ||
        requestUrl.includes("/users/register") ||
        requestUrl.includes("/users/verify-otp") ||
        requestUrl.includes("/users/admin-2fa/verify");

      if (!isAuthenticationRequest && localStorage.getItem("token")) {
        localStorage.removeItem("token");
        localStorage.removeItem("userInfo");

        window.dispatchEvent(
          new Event("lutech:auth-changed")
        );
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;