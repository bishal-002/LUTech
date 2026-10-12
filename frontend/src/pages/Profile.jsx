import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
} from "../services/userService";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Loader from "../components/Loader";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const storedUser = localStorage.getItem("userInfo");

      if (!storedUser) {
        navigate("/login");
        return;
      }

      const userInfo = JSON.parse(storedUser);

      if (!userInfo?._id) {
        localStorage.removeItem("userInfo");
        navigate("/login");
        return;
      }

      const data = await getUserProfile(userInfo._id);

      setUser(data);
      setName(data.name || "");
      setAddress(data.address || "");
    } catch {
      setError("Failed to load your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const loadProfile = async () => {
      await fetchProfile();
    };

    loadProfile();
  }, [fetchProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setSaving(true);

    try {
      const storedUser = localStorage.getItem("userInfo");

      if (!storedUser) {
        navigate("/login");
        return;
      }

      const userInfo = JSON.parse(storedUser);

      const response = await updateUserProfile(userInfo._id, {
        name: name.trim(),
        address: address.trim(),
      });

      setMessage(response.message || "Profile updated successfully.");

      if (response.user) {
        setUser(response.user);
        setName(response.user.name || "");
        setAddress(response.user.address || "");

        localStorage.setItem(
          "userInfo",
          JSON.stringify(response.user)
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to update your profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action may be permanent."
    );

    if (!confirmed) return;

    setMessage("");
    setError("");
    setDeleting(true);

    try {
      const storedUser = localStorage.getItem("userInfo");

      if (!storedUser) {
        localStorage.removeItem("userInfo");
        navigate("/login");
        return;
      }

      const userInfo = JSON.parse(storedUser);

      await deleteUserProfile(userInfo._id);

      localStorage.removeItem("userInfo");

      window.alert("Account deleted successfully.");

      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to delete your account. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <Loader message="Loading your profile..." />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <Navbar />
        <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-16">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-7 w-7"
                aria-hidden="true"
              >
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>

            <h1 className="mt-4 text-xl font-bold text-slate-900">
              Unable to load profile
            </h1>

            <p role="alert" className="mt-2 text-sm text-slate-600">
              {error || "Your profile could not be found."}
            </p>

            <button
              type="button"
              onClick={() => {
                setError("");
                setLoading(true);
                fetchProfile();
              }}
              className="mt-6 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
            >
              Try Again
            </button>

            <div className="mt-4">
              <Link
                to="/"
                className="text-sm font-semibold text-blue-700 hover:underline"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
            Account settings
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            My Profile
          </h1>

          <p className="mt-3 max-w-2xl text-slate-600">
            View and update your personal information and manage your account.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7 flex items-center gap-4 border-b border-slate-100 pb-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                {(user.name || "U").charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-slate-900">
                  {user.name || "User"}
                </h2>

                <p className="truncate text-sm text-slate-500">
                  {user.email}
                </p>
              </div>
            </div>

            {message && (
              <div
                role="status"
                className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
              >
                {message}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="profile-name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Full name
                </label>

                <input
                  id="profile-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                  disabled={saving || deleting}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>

                <input
                  id="profile-email"
                  type="email"
                  value={user.email || ""}
                  disabled
                  readOnly
                  className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Your registered email address cannot be changed here.
                </p>
              </div>

              <div>
                <label
                  htmlFor="profile-verification"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email verification status
                </label>

                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      user.isVerified ? "bg-green-500" : "bg-amber-500"
                    }`}
                  />

                  <span
                    id="profile-verification"
                    className={`text-sm font-semibold ${
                      user.isVerified ? "text-green-700" : "text-amber-700"
                    }`}
                  >
                    {user.isVerified ? "Verified" : "Not verified"}
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="profile-address"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Address
                </label>

                <textarea
                  id="profile-address"
                  rows={4}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your delivery address"
                  autoComplete="street-address"
                  disabled={saving || deleting}
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={saving || deleting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving ? "Saving Changes..." : "Save Changes"}
              </button>
            </form>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="font-bold text-slate-900">Account overview</h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Keep your personal details and delivery address up to date for
                a smoother shopping experience.
              </p>

              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email status
                </p>

                <p className="mt-1 font-semibold text-slate-800">
                  {user.isVerified ? "Verified account" : "Verification pending"}
                </p>
              </div>

              <Link
                to="/products"
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Browse Products
              </Link>
            </div>

            <div className="rounded-2xl border border-red-200 bg-white p-6">
              <h2 className="font-bold text-red-800">Delete account</h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Account deletion may permanently remove your account. Make
                sure you want to continue before confirming.
              </p>

              <button
                type="button"
                onClick={handleDelete}
                disabled={saving || deleting}
                className="mt-5 w-full rounded-lg border border-red-300 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting Account..." : "Delete My Account"}
              </button>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Profile;
