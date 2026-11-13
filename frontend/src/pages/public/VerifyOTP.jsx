
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { verifyOTP } from "../../services/authService";
import AuthLayout from "../../components/AuthLayout";

function VerifyOTP() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    otp: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((previousData) => ({
      ...previousData,
      [e.target.name]: e.target.value,
    }));

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!formData.email.trim() || !formData.otp.trim()) {
      setError("Email address and OTP are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await verifyOTP({
        email: formData.email.trim().toLowerCase(),
        otp: formData.otp.trim(),
      });

      setMessage(response.message || "Email verified successfully.");

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "OTP verification failed. Please check your email and OTP."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="One more step! Verify your email address to complete your LUTech registration."
      topText="Already have an account?"
      topLinkText="Sign In"
      topLinkTo="/login"
    >
      {/* Verification Icon */}
      <div className="mb-7 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E5EDE7] text-[#1A2E26]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-8 w-8"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
            <path d="m9 14 2 2 4-4" />
          </svg>
        </div>
      </div>

      {message && (
        <div
          role="status"
          className="mb-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm leading-5 text-green-800"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-5">
        {/* Email Address */}
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-[#20332B]"
          >
            Email address
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#89958D]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            </span>

            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={loading}
              className="w-full min-w-0 rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] py-3 pl-11 pr-4 text-sm text-[#20332B] outline-none transition placeholder:text-[#A0AAA3] hover:border-[#C7D5CA] focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        {/* OTP */}
        <div>
          <label
            htmlFor="otp"
            className="mb-2 block text-sm font-semibold text-[#20332B]"
          >
            One-time password (OTP)
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#89958D]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <path d="M7 9h.01M12 9h.01M17 9h.01M7 14h10" />
              </svg>
            </span>

            <input
              id="otp"
              type="text"
              name="otp"
              value={formData.otp}
              onChange={handleChange}
              placeholder="Enter your OTP"
              autoComplete="one-time-code"
              inputMode="numeric"
              required
              disabled={loading}
              className="w-full min-w-0 rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] py-3 pl-11 pr-4 text-sm tracking-[0.25em] text-[#20332B] outline-none transition placeholder:tracking-normal placeholder:text-[#A0AAA3] hover:border-[#C7D5CA] focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <p className="mt-2 text-xs leading-5 text-[#89958D]">
            Enter the OTP exactly as it appears in your email.
          </p>
        </div>

        {/* Verify Button */}
        <button
          type="submit"
          disabled={loading}
          className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1A2E26] px-4 py-3 text-sm font-bold text-white shadow-sm transition duration-200 hover:bg-[#294438] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9533B] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Verifying...
            </>
          ) : (
            <>
              Verify Email
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </>
          )}
        </button>
      </form>

      {/* Login Link */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#E5E9E5]" />
        <span className="text-xs text-[#89958D]">Already verified?</span>
        <div className="h-px flex-1 bg-[#E5E9E5]" />
      </div>

      <Link
        to="/login"
        className="flex min-h-11 w-full items-center justify-center rounded-lg border border-[#D5DED7] px-4 py-2.5 text-sm font-semibold text-[#20332B] transition hover:border-[#1A2E26] hover:bg-[#EBF0EB]"
      >
        Sign In to LUTech
      </Link>

      <Link
        to="/"
        className="mt-6 block text-center text-xs font-medium text-[#89958D] transition hover:text-[#B9533B]"
      >
        ← Back to Marketplace
      </Link>
    </AuthLayout>
  );
}

export default VerifyOTP;
