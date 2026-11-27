import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { loginUser } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import AuthLayout from "../../components/AuthLayout";

function getDestination(user) {
  if (user?.role === "admin") return "/admin/dashboard";

  if (user?.role === "seller") {
    const approved =
      user.sellerStatus === "approved" ||
      user.verificationStatus === "approved";

    return approved ? "/seller/home" : "/seller/pending";
  }

  return "/";
}

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    setFormData((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const email = formData.email.trim().toLowerCase();

    if (!email || !formData.password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await loginUser({
        email,
        password: formData.password,
      });

      if (response.requiresTwoFactor) {
        if (!response.challengeToken) {
          throw new Error("The admin security challenge was not provided.");
        }

        sessionStorage.setItem(
          "lutech_admin_2fa",
          JSON.stringify({
            challengeToken: response.challengeToken,
            method: response.method,
            expiresAt: Date.now() + (response.expiresIn || 300) * 1000,
          })
        );

        navigate("/admin/2fa", {
          replace: true,
          state: {
            method: response.method,
            expiresIn: response.expiresIn,
          },
        });

        return;
      }

      if (!response.token || !response.user) {
        throw new Error("The server did not return a valid login session.");
      }

      setSession(response.token, response.user);

      const destination = getDestination(response.user);

      navigate(
        location.state?.from?.pathname || destination,
        { replace: true }
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
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
            disabled={loading}
            className="w-full rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] px-4 py-3 text-sm text-[#20332B] outline-none transition placeholder:text-[#A0AAA3] focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10 disabled:opacity-60"
          />
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
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] py-3 pl-4 pr-12 text-sm text-[#20332B] outline-none transition placeholder:text-[#A0AAA3] focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10 disabled:opacity-60"
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 px-4 text-sm text-[#89958D] hover:text-[#1A2E26]"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1A2E26] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#294438] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign In"}
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
        to="/admin/login"
        className="mt-5 block text-center text-xs font-medium text-[#89958D] transition hover:text-[#B9533B]"
      >
        Administrator sign in
      </Link>
    </AuthLayout>
  );
}

export default Login;