
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { loginUser } from "../../services/authService";
import AuthLayout from "../../components/AuthLayout";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.email.trim() || !formData.password) {
      setError("Email and password are required.");
      return false;
    }

    if (!emailRegex.test(formData.email.trim())) {
      setError("Please enter a valid email address.");
      return false;
    }

    return true;
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await loginUser({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      localStorage.setItem("token", response.token);

      localStorage.setItem(
        "userInfo",
        JSON.stringify(response.user)
      );

      const loggedInUser = response.user;

      if (loggedInUser.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (loggedInUser.role === "seller") {
        if (loggedInUser.sellerStatus === "approved") {
          navigate("/seller/home", { replace: true });
        } else {
          navigate("/seller/pending", { replace: true });
        }
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <AuthLayout
      title="Welcome back!"
      subtitle="Sign in to your account and continue your shopping journey."
      topText="New to LUTech?"
      topLinkText="Create Account"
      topLinkTo="/register"
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
              autoComplete="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full min-w-0 rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] py-3 pl-11 pr-4 text-sm text-[#20332B] outline-none transition placeholder:text-[#A0AAA3] hover:border-[#C7D5CA] focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-[#20332B]"
            >
              Password
            </label>
          </div>

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
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 1 1 8 0v3" />
              </svg>
            </span>

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full min-w-0 rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] py-3 pl-11 pr-12 text-sm text-[#20332B] outline-none transition placeholder:text-[#A0AAA3] hover:border-[#C7D5CA] focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10"
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center justify-center px-4 text-[#89958D] transition hover:text-[#1A2E26]"
            >
              {showPassword ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M3 3 21 21" />
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.9 5.2A11 11 0 0 1 12 5c5.5 0 9 7 9 7a15 15 0 0 1-3.1 3.8M6.2 6.2C4.1 7.6 3 12 3 12s3.5 7 9 7c1.1 0 2.1-.2 3-.6" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full group flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1A2E26] px-4 py-3 text-sm font-bold text-white shadow-sm transition duration-200 hover:bg-[#294438] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9533B] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Signing in...
            </>
          ) : (
            <>
              Sign In
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </>
          )}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#E5E9E5]" />
        <span className="text-xs text-[#89958D]">New to LUTech?</span>
        <div className="h-px flex-1 bg-[#E5E9E5]" />
      </div>

      <Link
        to="/register"
        className="flex min-h-11 w-full items-center justify-center rounded-lg border border-[#D5DED7] px-4 py-2.5 text-sm font-semibold text-[#20332B] transition hover:border-[#1A2E26] hover:bg-[#EBF0EB]"
      >
        Create an Account
      </Link>

      <Link
        to="/login"
        className="mt-6 block text-center text-xs font-medium text-[#89958D] transition hover:text-[#B9533B]"
      >
        ← Back to Sign In
      </Link>
    </AuthLayout>
  );
}

export default Login;
