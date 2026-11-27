
import axiosClient from "../api/axiosClient";

// ======================================================
// CUSTOMER REGISTRATION
// POST /api/users/register
// ======================================================

export const registerUser = async (userData) => {
  const response = await axiosClient.post(
    "/users/register",
    userData
  );

  return response.data;
};

// ======================================================
// LOGIN
// POST /api/users/login
//
// Normal login:
// {
//   token,
//   user
// }
//
// Admin login requiring 2FA:
// {
//   requiresTwoFactor: true,
//   method,
//   challengeToken,
//   expiresIn
// }
// ======================================================

export const loginUser = async (userData) => {
  const response = await axiosClient.post(
    "/users/login",
    userData
  );

  return {
    ...response.data,
    status: response.status,
  };
};

// ======================================================
// CUSTOMER EMAIL OTP VERIFICATION
// POST /api/users/verify-otp
// ======================================================

export const verifyOTP = async (otpData) => {
  const response = await axiosClient.post(
    "/users/verify-otp",
    otpData
  );

  return response.data;
};

// ======================================================
// RESEND CUSTOMER EMAIL OTP
// POST /api/users/resend-otp
// ======================================================

export const resendOTP = async (email) => {
  const response = await axiosClient.post(
    "/users/resend-otp",
    { email }
  );

  return response.data;
};

// ======================================================
// ADMIN LOGIN TWO-FACTOR VERIFICATION
// POST /api/users/admin-2fa/verify
// ======================================================

export const verifyAdminLoginTwoFactor = async (
  challengeToken,
  code
) => {
  const response = await axiosClient.post(
    "/users/admin-2fa/verify",
    {
      challengeToken,
      code,
    }
  );

  return response.data;
};
