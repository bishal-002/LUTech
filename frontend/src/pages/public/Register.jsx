
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { registerUser } from "../../services/authService";
import AuthLayout from "../../components/AuthLayout";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });

    setError("");
  };

  const getPasswordStrength = () => {
    const password = formData.password;
    let score = 0;

    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (!password) return { score: 0, label: "", color: "" };
    if (score <= 2) return { score, label: "Weak", color: "#B42318" };
    if (score <= 3) return { score, label: "Fair", color: "#A16207" };

    return { score, label: "Strong", color: "#287A50" };
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("All fields are required.");
      return false;
    }

    if (!emailRegex.test(formData.email.trim())) {
      setError("Please enter a valid email address.");
      return false;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }

    if (!acceptedTerms) {
      setError("Please accept the terms and conditions to continue.");
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
      const response = await registerUser({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      setMessage(
        response.message ||
        "Registration successful. Please verify your email."
      );

      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      setAcceptedTerms(false);

      setTimeout(() => {
        navigate("/verify-otp");
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength();

  const inputClass =
    "w-full min-w-0 rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] py-3 pl-11 pr-4 text-sm text-[#20332B] outline-none transition placeholder:text-[#A0AAA3] hover:border-[#C7D5CA] focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10";

  const passwordInputClass =
    "w-full min-w-0 rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] py-3 pl-11 pr-12 text-sm text-[#20332B] outline-none transition placeholder:text-[#A0AAA3] hover:border-[#C7D5CA] focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10";

  const EyeIcon = ({ visible }) => (
    visible ? (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
        <path d="M3 3 21 21" />
        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.2A11 11 0 0 1 12 5c5.5 0 9 7 9 7a15 15 0 0 1-3.1 3.8M6.2 6.2C4.1 7.6 3 12 3 12s3.5 7 9 7c1.1 0 2.1-.2 3-.6" />
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
        <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  );

  const FieldIcon = ({ type }) => (
    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#89958D]">
      {type === "name" ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      )}
    </span>
  );

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join LUTech and discover a simpler way to shop for technology."
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

      <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-4">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-semibold text-[#20332B]">
            Full Name
          </label>

          <div className="relative">
            <FieldIcon type="name" />
            <input
              id="name"
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[#20332B]">
            Email Address
          </label>

          <div className="relative">
            <FieldIcon type="email" />
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#20332B]">
            Password
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#89958D]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 1 1 8 0v3" />
              </svg>
            </span>

            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={handleChange}
              minLength={6}
              required
              className={passwordInputClass}
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center justify-center px-4 text-[#89958D] transition hover:text-[#1A2E26]"
            >
              <EyeIcon visible={showPassword} />
            </button>
          </div>

          {formData.password && (
            <div className="mt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#68766F]">Password strength</span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: passwordStrength.color }}
                >
                  {passwordStrength.label}
                </span>
              </div>

              <div className="mt-1.5 flex gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className="h-1 flex-1 rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        level <= passwordStrength.score
                          ? passwordStrength.color
                          : "#E5E9E5",
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-[#20332B]">
            Confirm Password
          </label>

          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#89958D]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 1 1 8 0v3" />
              </svg>
            </span>

            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              minLength={6}
              required
              className={passwordInputClass}
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center justify-center px-4 text-[#89958D] transition hover:text-[#1A2E26]"
            >
              <EyeIcon visible={showConfirmPassword} />
            </button>
          </div>

          {formData.confirmPassword && (
            <p className={`mt-1.5 text-xs font-medium ${formData.password === formData.confirmPassword
              ? "text-[#287A50]"
              : "text-red-600"
              }`}>
              {formData.password === formData.confirmPassword
                ? "Passwords match"
                : "Passwords do not match"}
            </p>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-xs leading-5 text-[#68766F]">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#1A2E26]"
          />
          <span>
            I agree to the terms and conditions and understand the LUTech
            account registration process.
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full group flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1A2E26] px-4 py-3 text-sm font-bold text-white shadow-sm transition duration-200 hover:bg-[#294438] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9533B] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Creating Account...
            </>
          ) : (
            <>
              Create Account
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </>
          )}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#E5E9E5]" />
        <span className="text-xs text-[#89958D]">Already registered?</span>
        <div className="h-px flex-1 bg-[#E5E9E5]" />
      </div>

      <Link
        to="/login"
        className="flex min-h-11 w-full items-center justify-center rounded-lg border border-[#D5DED7] px-4 py-2.5 text-sm font-semibold text-[#20332B] transition hover:border-[#1A2E26] hover:bg-[#EBF0EB]"
      >
        Sign In to Your Account
      </Link>

      <Link
        to="/"
        className="mt-5 block text-center text-xs font-medium text-[#89958D] transition hover:text-[#B9533B]"
      >
        ← Back to Marketplace
      </Link>
    </AuthLayout>
  );
}

export default Register;
