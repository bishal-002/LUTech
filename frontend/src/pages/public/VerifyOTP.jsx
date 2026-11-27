
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { resendOTP, verifyOTP } from "../../services/authService";
import AuthLayout from "../../components/AuthLayout";

function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: location.state?.email || "",
    otp: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        name === "otp"
          ? value.replace(/\D/g, "").slice(0, 6)
          : value,
    }));

    setError("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    const email = formData.email.trim().toLowerCase();
    const otp = formData.otp.trim();

    if (!email || otp.length !== 6) {
      setError("Enter your email address and complete 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await verifyOTP({ email, otp });

      setMessage(
        response.message || "Email verified successfully. You can now sign in."
      );

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "OTP verification failed. Check your email and code."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");

    const email = formData.email.trim().toLowerCase();

    if (!email) {
      setError("Enter your email address before requesting another OTP.");
      return;
    }

    setResending(true);

    try {
      const response = await resendOTP(email);

      setMessage(
        response.message || "A new verification code has been requested."
      );

      setFormData((previous) => ({
        ...previous,
        otp: "",
      }));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to resend the verification code. Please try again."
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Enter the 6-digit verification code sent to your email address."
      topText="Already have an account?"
      topLinkText="Sign In"
      topLinkTo="/login"
    >
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
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-[#20332B]"
          >
            Email address
          </label>

          <input
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loading || resending}
            className="w-full rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] px-4 py-3 text-sm text-[#20332B] outline-none transition placeholder:text-[#A0AAA3] focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10 disabled:opacity-60"
          />
        </div>

        <div>
          <label
            htmlFor="otp"
            className="mb-2 block text-sm font-semibold text-[#20332B]"
          >
            One-time password
          </label>

          <input
            id="otp"
            type="text"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="Enter 6-digit OTP"
            value={formData.otp}
            onChange={handleChange}
            required
            disabled={loading}
            className="w-full rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] px-4 py-3 text-center text-xl font-semibold tracking-[0.4em] text-[#20332B] outline-none transition placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-[#A0AAA3] focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10 disabled:opacity-60"
          />

          <p className="mt-2 text-xs leading-5 text-[#89958D]">
            Enter the latest code sent to your email.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || formData.otp.length !== 6}
          className="flex min-h-12 w-full items-center justify-center rounded-lg bg-[#1A2E26] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#294438] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Verifying..." : "Verify Email"}
        </button>
      </form>

      <div className="mt-5 text-center">
        <span className="text-sm text-[#68766F]">
          Didn't receive a code?{" "}
        </span>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending || loading}
          className="text-sm font-semibold text-[#1A2E26] underline underline-offset-4 hover:text-[#B9533B] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resending ? "Sending..." : "Resend OTP"}
        </button>
      </div>

      <Link
        to="/login"
        className="mt-6 flex min-h-11 w-full items-center justify-center rounded-lg border border-[#D5DED7] px-4 py-2.5 text-sm font-semibold text-[#20332B] transition hover:border-[#1A2E26] hover:bg-[#EBF0EB]"
      >
        Back to Sign In
      </Link>
    </AuthLayout>
  );
}

export default VerifyOTP;
