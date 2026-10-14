
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../services/authService";

function AdminLogin() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((previous) => ({
      ...previous,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.email.trim() || !formData.password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const response = await loginUser({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (response.user?.role !== "admin") {
        setError("Access denied. Administrator privileges are required.");
        return;
      }

      if (!response.token) {
        setError("Login failed: authentication token was not provided.");
        return;
      }

      localStorage.setItem("token", response.token);
      localStorage.setItem(
        "userInfo",
        JSON.stringify(response.user)
      );

      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to sign in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-8 block text-center text-3xl font-extrabold tracking-tight text-white"
        >
          LUTech
          <span className="ml-2 text-blue-400">Admin</span>
        </Link>

        <section className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl shadow-black/20 sm:p-9">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Administrator Sign In
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Sign in with your authorized administrator account.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="admin-email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email address
              </label>

              <input
                id="admin-email"
                type="email"
                name="email"
                autoComplete="username"
                placeholder="admin@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <input
                id="admin-password"
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In to Admin"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <Link
              to="/login"
              className="block text-center text-sm font-semibold text-blue-700 transition hover:text-blue-900"
            >
              Customer login
            </Link>

            <Link
              to="/"
              className="mt-4 block text-center text-sm text-slate-500 transition hover:text-blue-700"
            >
              ← Back to Home
            </Link>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          Authorized personnel only
        </p>
      </div>
    </main>
  );
}

export default AdminLogin;
