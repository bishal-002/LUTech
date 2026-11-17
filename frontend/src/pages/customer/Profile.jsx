
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
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [addresses, setAddresses] = useState([]);
  const [preferences, setPreferences] = useState({
    orderUpdatesSms: true,
    priceDropEmails: true,
    warrantyExpiryReminders: true,
  });
  const [billingProfile, setBillingProfile] = useState({
    companyName: "",
    binNumber: "",
  });
  const [ownedDevices, setOwnedDevices] = useState([]);
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
      const profile = data.user || data;

      setUser(profile);
      setName(profile.name || profile.fullName || "");
      setAddress(profile.address || "");
      setPhone(profile.phone || "");
      setAvatarUrl(profile.avatarUrl || "");
      setAddresses(profile.addresses || []);
      setPreferences({
        orderUpdatesSms: true,
        priceDropEmails: true,
        warrantyExpiryReminders: true,
        ...(profile.preferences || {}),
      });
      setBillingProfile({
        companyName: profile.billingProfile?.companyName || "",
        binNumber: profile.billingProfile?.binNumber || "",
      });
      setOwnedDevices(profile.ownedDevices || []);
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
        phone: phone.trim(),
        avatarUrl: avatarUrl.trim(),
        addresses,
        preferences,
        billingProfile,
        ownedDevices,
      });

      setMessage(response.message || "Profile updated successfully.");

      if (response.user) {
        setUser(response.user);
        setName(response.user.name || "");
        setAddress(response.user.address || "");
        setPhone(response.user.phone || "");
        setAvatarUrl(response.user.avatarUrl || "");
        setAddresses(response.user.addresses || []);
        setPreferences({
          orderUpdatesSms: true,
          priceDropEmails: true,
          warrantyExpiryReminders: true,
          ...(response.user.preferences || {}),
        });
        setBillingProfile({
          companyName: response.user.billingProfile?.companyName || "",
          binNumber: response.user.billingProfile?.binNumber || "",
        });
        setOwnedDevices(response.user.ownedDevices || []);

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
                    maxLength={80}
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
                  <label htmlFor="profile-phone" className="mb-2 block text-xs font-semibold text-[#20332B]">
                    Mobile Number
                  </label>
                  <input
                    id="profile-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+8801XXXXXXXXX"
                    autoComplete="tel"
                    disabled={saving || deleting}
                    className="block w-full min-w-0 rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] px-4 py-3 text-sm text-[#20332B] outline-none focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10 disabled:bg-[#F4F6F4]"
                  />
                  <p className="mt-2 text-xs text-[#89958D]">
                    Used for cash-on-delivery confirmation and courier delivery. Use a Bangladesh number.
                    {user.isPhoneVerified ? " Phone verified." : " Phone not yet verified."}
                  </p>
                </div>

                <div className="w-full min-w-0">
                  <label htmlFor="profile-avatar" className="mb-2 block text-xs font-semibold text-[#20332B]">
                    Profile Image URL
                  </label>
                  <input
                    id="profile-avatar"
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/profile.jpg"
                    disabled={saving || deleting}
                    className="block w-full min-w-0 rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] px-4 py-3 text-sm text-[#20332B] outline-none focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10 disabled:bg-[#F4F6F4]"
                  />
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

                {/* Saved delivery addresses */}
                <section className="space-y-4 rounded-xl border border-[#E5E9E5] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-[#20332B]">Saved Addresses</h3>
                      <p className="mt-1 text-xs text-[#89958D]">Save up to five addresses for faster checkout.</p>
                    </div>
                    <button
                      type="button"
                      disabled={addresses.length >= 5 || saving || deleting}
                      onClick={() => setAddresses((items) => [...items, {
                        label: "Home", recipientName: name, recipientPhone: phone,
                        division: "", district: "", area: "", streetAddress: "",
                        postalCode: "", isDefaultShipping: items.length === 0,
                        isDefaultBilling: items.length === 0,
                      }])}
                      className="rounded-lg border border-[#C7D5CA] px-3 py-2 text-xs font-semibold text-[#20332B] hover:bg-[#EBF0EB] disabled:opacity-50"
                    >
                      + Add Address
                    </button>
                  </div>

                  {addresses.length === 0 && (
                    <p className="rounded-lg bg-[#F9FAF9] p-3 text-sm text-[#89958D]">
                      No saved addresses yet. You can still use the delivery address above.
                    </p>
                  )}

                  {addresses.map((item, index) => (
                    <div key={item._id || index} className="space-y-3 rounded-lg bg-[#F9FAF9] p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-3">
                        <select
                          value={item.label || "Home"}
                          onChange={(e) => setAddresses((items) => items.map((entry, i) => i === index ? { ...entry, label: e.target.value } : entry))}
                          className="rounded-lg border border-[#E5E9E5] bg-white px-3 py-2 text-sm"
                        >
                          <option>Home</option>
                          <option>Office</option>
                          <option>Campus / Hostel</option>
                          <option>Other</option>
                        </select>
                        <button type="button" onClick={() => setAddresses((items) => items.filter((_, i) => i !== index))} className="text-xs font-semibold text-red-600 hover:underline">
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {[
                          ["recipientName", "Recipient Name"],
                          ["recipientPhone", "Recipient Phone"],
                          ["division", "Division"],
                          ["district", "District"],
                          ["area", "Area / Upazila"],
                          ["postalCode", "Postal Code"],
                        ].map(([field, label]) => (
                          <label key={field} className="block text-xs font-semibold text-[#20332B]">
                            {label}
                            <input
                              value={item[field] || ""}
                              onChange={(e) => setAddresses((items) => items.map((entry, i) => i === index ? { ...entry, [field]: e.target.value } : entry))}
                              className="mt-1 block w-full rounded-lg border border-[#E5E9E5] bg-white px-3 py-2.5 text-sm font-normal"
                            />
                          </label>
                        ))}
                      </div>
                      <label className="block text-xs font-semibold text-[#20332B]">
                        Street Address
                        <textarea
                          rows={2}
                          maxLength={200}
                          value={item.streetAddress || ""}
                          onChange={(e) => setAddresses((items) => items.map((entry, i) => i === index ? { ...entry, streetAddress: e.target.value } : entry))}
                          className="mt-1 block w-full rounded-lg border border-[#E5E9E5] bg-white px-3 py-2.5 text-sm font-normal"
                        />
                      </label>

                      <div className="flex flex-wrap gap-4 text-xs text-[#53645A]">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={Boolean(item.isDefaultShipping)} onChange={(e) => setAddresses((items) => items.map((entry, i) => ({ ...entry, isDefaultShipping: i === index ? e.target.checked : false })))} />
                          Default shipping
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={Boolean(item.isDefaultBilling)} onChange={(e) => setAddresses((items) => items.map((entry, i) => ({ ...entry, isDefaultBilling: i === index ? e.target.checked : false })))} />
                          Default billing
                        </label>
                      </div>
                    </div>
                  ))}
                </section>

                {/* Customer preferences */}
                <section className="space-y-3 rounded-xl border border-[#E5E9E5] p-4 sm:p-5">
                  <h3 className="font-bold text-[#20332B]">Communication Preferences</h3>
                  {[
                    ["orderUpdatesSms", "SMS notifications for order updates"],
                    ["priceDropEmails", "Email notifications for price drops"],
                    ["warrantyExpiryReminders", "Warranty expiry reminders"],
                  ].map(([field, label]) => (
                    <label key={field} className="flex items-center gap-3 text-sm text-[#53645A]">
                      <input
                        type="checkbox"
                        checked={Boolean(preferences[field])}
                        onChange={(e) => setPreferences((current) => ({ ...current, [field]: e.target.checked }))}
                        className="h-4 w-4 accent-[#1A2E26]"
                      />
                      {label}
                    </label>
                  ))}
                </section>

                {/* Billing profile */}
                <section className="space-y-3 rounded-xl border border-[#E5E9E5] p-4 sm:p-5">
                  <h3 className="font-bold text-[#20332B]">Billing Profile (Optional)</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-[#20332B]">
                      Company Name
                      <input
                        value={billingProfile.companyName}
                        onChange={(e) => setBillingProfile((current) => ({ ...current, companyName: e.target.value }))}
                        maxLength={120}
                        className="mt-1 block w-full rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] px-3 py-2.5 text-sm font-normal"
                      />
                    </label>
                    <label className="text-xs font-semibold text-[#20332B]">
                      BIN Number
                      <input
                        value={billingProfile.binNumber}
                        onChange={(e) => setBillingProfile((current) => ({ ...current, binNumber: e.target.value }))}
                        maxLength={30}
                        className="mt-1 block w-full rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] px-3 py-2.5 text-sm font-normal"
                      />
                    </label>
                  </div>
                </section>

                {/* Owned devices */}
                <section className="space-y-3 rounded-xl border border-[#E5E9E5] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-[#20332B]">My Devices</h3>
                      <p className="mt-1 text-xs text-[#89958D]">Optional device details for more relevant product discovery.</p>
                    </div>
                    <button
                      type="button"
                      disabled={ownedDevices.length >= 20}
                      onClick={() => setOwnedDevices((items) => [...items, { brand: "", model: "", category: "" }])}
                      className="rounded-lg border border-[#C7D5CA] px-3 py-2 text-xs font-semibold text-[#20332B] hover:bg-[#EBF0EB] disabled:opacity-50"
                    >
                      + Add Device
                    </button>
                  </div>
                  {ownedDevices.map((device, index) => (
                    <div key={index} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                      {[
                        ["brand", "Brand"],
                        ["model", "Model"],
                        ["category", "Category"],
                      ].map(([field, label]) => (
                        <label key={field} className="text-xs font-semibold text-[#20332B]">
                          {label}
                          <input
                            value={device[field] || ""}
                            onChange={(e) => setOwnedDevices((items) => items.map((entry, i) => i === index ? { ...entry, [field]: e.target.value } : entry))}
                            className="mt-1 block w-full rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] px-3 py-2.5 text-sm font-normal"
                          />
                        </label>
                      ))}
                      <button type="button" onClick={() => setOwnedDevices((items) => items.filter((_, i) => i !== index))} className="mb-2 text-xs font-semibold text-red-600 hover:underline">
                        Remove
                      </button>
                    </div>
                  ))}
                </section>

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
