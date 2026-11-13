
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
} from "../../services/userService";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import Loader from "../../components/Loader";

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
        navigate("/login", { replace: true });
        return;
      }

      const userInfo = JSON.parse(storedUser);

      if (!userInfo?._id) {
        localStorage.removeItem("userInfo");
        navigate("/login", { replace: true });
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
    window.scrollTo({ left: 0, top: 0 });
    fetchProfile();
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
        navigate("/login", { replace: true });
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
        localStorage.removeItem("token");
        localStorage.removeItem("userInfo");
        navigate("/login", { replace: true });
        return;
      }

      const userInfo = JSON.parse(storedUser);

      await deleteUserProfile(userInfo._id);

      localStorage.removeItem("token");
      localStorage.removeItem("userInfo");

      window.alert("Account deleted successfully.");
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to delete your account. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userInfo");
    navigate("/login", { replace: true });
  };

  const initial = (user?.name || "U").charAt(0).toUpperCase();

  if (loading) {
    return (
      <div className="flex min-h-screen w-full min-w-0 flex-col bg-[#F4F6F4]">
        <Navbar />
        <main className="flex w-full min-w-0 flex-1 items-center justify-center px-4 py-16">
          <Loader message="Loading your profile..." />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen w-full min-w-0 flex-col bg-[#F4F6F4]">
        <Navbar />

        <main className="mx-auto flex w-full min-w-0 max-w-2xl flex-1 items-center justify-center px-4 py-16">
          <div className="w-full min-w-0 rounded-2xl border border-[#E5E9E5] bg-white p-6 text-center shadow-sm sm:p-8">
            <h1 className="text-xl font-bold text-[#20332B]">
              Unable to load profile
            </h1>

            <p role="alert" className="mt-2 break-words text-sm text-[#68766F]">
              {error || "Your profile could not be found."}
            </p>

            <button
              type="button"
              onClick={() => {
                setError("");
                setLoading(true);
                fetchProfile();
              }}
              className="mt-6 rounded-lg bg-[#1A2E26] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#294438]"
            >
              Try Again
            </button>

            <div className="mt-4">
              <Link
                to="/"
                className="text-sm font-semibold text-[#B9533B] hover:underline"
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
    <div className="profile-page flex min-h-screen w-full min-w-0 flex-col bg-[#F4F6F4]">
      <Navbar />

      <main className="mx-auto box-border w-full max-w-[1440px] min-w-0 flex-1 overflow-x-hidden px-4 py-7 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
        {/* Breadcrumb */}
        <div className="mb-7 flex min-w-0 items-center gap-2 text-xs font-medium text-[#89958D]">
          <Link to="/" className="shrink-0 transition hover:text-[#1A2E26]">
            Home
          </Link>
          <span>/</span>
          <span className="text-[#20332B]">Account</span>
        </div>

        {/* Page Heading */}
        <div className="mb-8 w-full min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B9533B]">
            Customer Account
          </p>

          <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight text-[#20332B] sm:text-4xl">
            My Account
          </h1>

          <p className="mt-2 w-full max-w-xl text-sm leading-6 text-[#68766F]">
            Manage your personal information and account preferences.
          </p>
        </div>

        {/* Account Layout */}
        <div className="grid w-full min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10">
          {/* Sidebar */}
          <aside className="w-full min-w-0">
            {/* Customer Identity and Navigation */}
            <div className="w-full min-w-0 rounded-2xl border border-[#E5E9E5] bg-white p-4 shadow-sm sm:p-6">
              <div className="flex w-full min-w-0 items-center gap-3 border-b border-[#E5E9E5] pb-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#1A2E26] text-lg font-bold text-white">
                  {initial}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#20332B]">
                    {user.name || "Customer"}
                  </p>
                  <p className="truncate text-xs text-[#89958D]">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <div className="mt-5 w-full min-w-0">
                <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#89958D]">
                  Account Navigation
                </p>

                <nav className="flex w-full min-w-0 flex-col gap-2">
                  <div className="flex w-full min-w-0 items-center gap-3 rounded-lg bg-[#E5EDE7] px-3 py-3 text-sm font-semibold text-[#1A2E26]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4 shrink-0" aria-hidden="true">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21a8 8 0 0 1 16 0" />
                    </svg>
                    <span>My Details</span>
                  </div>

                  <Link
                    to="/my-orders"
                    className="flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#68766F] transition hover:bg-[#F4F6F4] hover:text-[#1A2E26]"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4 shrink-0" aria-hidden="true">
                      <path d="M4 5h16v15H4zM8 9h8M8 13h8M8 17h5" />
                    </svg>
                    <span>My Orders</span>
                  </Link>

                  <Link
                    to="/cart"
                    className="flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#68766F] transition hover:bg-[#F4F6F4] hover:text-[#1A2E26]"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4 shrink-0" aria-hidden="true">
                      <path d="M3 3h2l2.5 12h10L21 7H6" />
                      <circle cx="9" cy="19" r="1.5" />
                      <circle cx="17" cy="19" r="1.5" />
                    </svg>
                    <span>Shopping Cart</span>
                  </Link>

                  <Link
                    to="/products"
                    className="flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#68766F] transition hover:bg-[#F4F6F4] hover:text-[#1A2E26]"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4 shrink-0" aria-hidden="true">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m16 16 4 4" />
                    </svg>
                    <span>Browse Products</span>
                  </Link>
                </nav>
              </div>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="mt-6 flex w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-[#C7D5CA] px-4 py-3 text-sm font-semibold text-[#20332B] transition hover:border-[#1A2E26] hover:bg-[#EBF0EB]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0" aria-hidden="true">
                  <path d="M10 17l5-5-5-5M15 12H3" />
                  <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
                </svg>
                <span>Log Out</span>
              </button>
            </div>

            {/* Account Status */}
            <div className="mt-4 w-full min-w-0 rounded-xl border border-[#E5E9E5] bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-[#89958D]">
                Account Status
              </p>

              <div className="mt-3 flex min-w-0 items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                    user.isVerified ? "bg-green-500" : "bg-amber-500"
                  }`}
                />

                <span
                  className={`text-sm font-semibold ${
                    user.isVerified ? "text-green-700" : "text-amber-700"
                  }`}
                >
                  {user.isVerified ? "Verified Account" : "Verification Pending"}
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-[#89958D]">
                Your account verification status is displayed here.
              </p>
            </div>
          </aside>

          {/* Main Profile Content */}
          <div className="w-full min-w-0 space-y-6">
            {/* Profile Form */}
            <section className="w-full min-w-0 rounded-2xl border border-[#E5E9E5] bg-white p-4 shadow-sm sm:p-7 lg:p-9">
              <div className="mb-7 min-w-0 border-b border-[#E5E9E5] pb-5">
                <h2 className="text-xl font-bold text-[#20332B] sm:text-2xl">
                  My Details
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#68766F]">
                  Update your personal information and delivery address.
                </p>
              </div>

              {/* Profile Identity */}
              <div className="mb-7 flex min-w-0 flex-wrap items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#1A2E26] text-2xl font-bold text-white">
                  {initial}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold text-[#20332B]">
                    {user.name || "Customer"}
                  </p>

                  <p className="mt-1 break-all text-sm text-[#68766F]">
                    {user.email}
                  </p>

                  <p className="mt-2 text-xs text-[#89958D]">
                    LUTech Customer Account
                  </p>
                </div>
              </div>

              {message && (
                <div role="status" className="mb-5 w-full break-words rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm leading-5 text-green-800">
                  {message}
                </div>
              )}

              {error && (
                <div role="alert" className="mb-5 w-full break-words rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-5">
                <div className="w-full min-w-0">
                  <label htmlFor="profile-name" className="mb-2 block text-xs font-semibold text-[#20332B]">
                    Full Name
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
                    className="block w-full min-w-0 rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] px-4 py-3 text-sm text-[#20332B] outline-none transition placeholder:text-[#A0AAA3] hover:border-[#C7D5CA] focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10 disabled:bg-[#F4F6F4]"
                  />
                </div>

                <div className="w-full min-w-0">
                  <label htmlFor="profile-email" className="mb-2 block text-xs font-semibold text-[#20332B]">
                    Email Address
                  </label>

                  <input
                    id="profile-email"
                    type="email"
                    value={user.email || ""}
                    disabled
                    readOnly
                    className="block w-full min-w-0 rounded-lg border border-[#E5E9E5] bg-[#F4F6F4] px-4 py-3 text-sm text-[#89958D]"
                  />

                  <p className="mt-2 text-xs text-[#89958D]">
                    Your registered email address cannot be changed here.
                  </p>
                </div>

                <div className="w-full min-w-0">
                  <label className="mb-2 block text-xs font-semibold text-[#20332B]">
                    Email Verification
                  </label>

                  <div className="flex w-full min-w-0 items-center gap-3 rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] px-4 py-3">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      user.isVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {user.isVerified ? "✓" : "!"}
                    </span>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#20332B]">
                        {user.isVerified ? "Verified" : "Not Verified"}
                      </p>

                      <p className="mt-0.5 break-words text-xs text-[#89958D]">
                        {user.isVerified
                          ? "Your email address is verified."
                          : "Your email verification is incomplete."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full min-w-0">
                  <label htmlFor="profile-address" className="mb-2 block text-xs font-semibold text-[#20332B]">
                    Delivery Address
                  </label>

                  <textarea
                    id="profile-address"
                    rows={4}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter your delivery address"
                    autoComplete="street-address"
                    disabled={saving || deleting}
                    className="block w-full min-w-0 resize-y rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] px-4 py-3 text-sm leading-6 text-[#20332B] outline-none transition placeholder:text-[#A0AAA3] hover:border-[#C7D5CA] focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10 disabled:bg-[#F4F6F4]"
                  />
                </div>

                <div className="border-t border-[#E5E9E5] pt-5">
                  <button
                    type="submit"
                    disabled={saving || deleting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1A2E26] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#294438] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9533B] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        Save My Details
                        <span>→</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* Account Information */}
            <section className="w-full min-w-0 rounded-2xl border border-[#E5E9E5] bg-white p-5 shadow-sm sm:p-7">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E5EDE7] text-[#1A2E26]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
                    <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-[#20332B]">
                    Account Information
                  </h2>

                  <p className="mt-1 break-words text-sm leading-6 text-[#68766F]">
                    Keep your details and delivery address updated to make your shopping experience smoother.
                  </p>

                  <Link
                    to="/products"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[#B9533B] transition hover:text-[#1A2E26]"
                  >
                    Browse Products
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </section>

            {/* Delete Account */}
            <section className="w-full min-w-0 rounded-2xl border border-red-200 bg-white p-5 sm:p-7">
              <div className="flex min-w-0 flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <h2 className="font-bold text-red-800">
                    Delete Account
                  </h2>

                  <p className="mt-2 max-w-xl break-words text-sm leading-6 text-[#68766F]">
                    Account deletion may permanently remove your account. Make sure you want to continue before confirming.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving || deleting}
                  className="w-full shrink-0 rounded-lg border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {deleting ? "Deleting..." : "Delete My Account"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default Profile;
