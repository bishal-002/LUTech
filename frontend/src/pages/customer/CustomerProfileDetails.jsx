import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getCustomerProfile,
  updateCustomerProfile,
  deleteUserProfile,
} from "../../services/userService";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import Loader from "../../components/Loader";

const EMPTY_ADDRESS = {
  label: "Home",
  recipientName: "",
  recipientPhone: "",
  division: "",
  district: "",
  area: "",
  streetAddress: "",
  postalCode: "",
  isDefaultShipping: false,
  isDefaultBilling: false,
};

const EMPTY_PREFERENCES = {
  orderUpdatesSms: true,
  priceDropEmails: true,
  warrantyExpiryReminders: true,
};

const inputClass =
  "mt-1 block w-full rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] px-3 py-2.5 text-sm text-[#20332B] outline-none transition focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10 disabled:bg-[#F4F6F4]";

function CustomerProfileDetails() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    avatarUrl: "",
    addresses: [],
    billingProfile: {
      companyName: "",
      binNumber: "",
    },
    preferences: EMPTY_PREFERENCES,
    ownedDevices: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ======================================================
  // LOAD PROFILE
  // ======================================================

  const loadProfile = useCallback(async () => {
    try {
      setError("");

      const response = await getCustomerProfile();
      const customer = response.user;

      if (!customer) {
        throw new Error("Customer profile was not returned.");
      }

      setUser(customer);

      setForm({
        fullName: customer.name || "",
        phone: customer.phone || "",
        avatarUrl: customer.avatarUrl || "",

        addresses: customer.addresses || [],

        billingProfile: {
          companyName:
            customer.billingProfile?.companyName || "",
          binNumber:
            customer.billingProfile?.binNumber || "",
        },

        preferences: {
          ...EMPTY_PREFERENCES,
          ...(customer.preferences || {}),
        },

        ownedDevices: customer.ownedDevices || [],
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load customer profile."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ======================================================
  // BASIC FIELD HANDLER
  // ======================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // ======================================================
  // ADDRESS HANDLERS
  // ======================================================

  const addAddress = () => {
    if (form.addresses.length >= 5) return;

    setForm((current) => ({
      ...current,
      addresses: [
        ...current.addresses,
        {
          ...EMPTY_ADDRESS,
          recipientName: current.fullName,
          recipientPhone: current.phone,
          isDefaultShipping: current.addresses.length === 0,
          isDefaultBilling: current.addresses.length === 0,
        },
      ],
    }));
  };

  const updateAddress = (index, field, value) => {
    setForm((current) => {
      const addresses = current.addresses.map(
        (address) => ({ ...address })
      );

      addresses[index] = {
        ...addresses[index],
        [field]: value,
      };

      // Keep only one default shipping address.
      if (field === "isDefaultShipping" && value === true) {
        addresses.forEach((address, i) => {
          if (i !== index) {
            address.isDefaultShipping = false;
          }
        });
      }

      // Keep only one default billing address.
      if (field === "isDefaultBilling" && value === true) {
        addresses.forEach((address, i) => {
          if (i !== index) {
            address.isDefaultBilling = false;
          }
        });
      }

      return {
        ...current,
        addresses,
      };
    });
  };

  const removeAddress = (index) => {
    setForm((current) => ({
      ...current,
      addresses: current.addresses.filter(
        (_, i) => i !== index
      ),
    }));
  };

  // ======================================================
  // DEVICE HANDLERS
  // ======================================================

  const addDevice = () => {
    if (form.ownedDevices.length >= 20) return;

    setForm((current) => ({
      ...current,
      ownedDevices: [
        ...current.ownedDevices,
        {
          brand: "",
          model: "",
          category: "",
        },
      ],
    }));
  };

  const updateDevice = (index, field, value) => {
    setForm((current) => {
      const ownedDevices = [...current.ownedDevices];

      ownedDevices[index] = {
        ...ownedDevices[index],
        [field]: value,
      };

      return {
        ...current,
        ownedDevices,
      };
    });
  };

  const removeDevice = (index) => {
    setForm((current) => ({
      ...current,
      ownedDevices: current.ownedDevices.filter(
        (_, i) => i !== index
      ),
    }));
  };

  // ======================================================
  // SAVE CUSTOMER PROFILE
  // ======================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (
      !form.fullName.trim() ||
      form.fullName.trim().length < 2 ||
      form.fullName.trim().length > 80
    ) {
      setError("Full name must contain 2–80 characters.");
      return;
    }

    setSaving(true);

    try {
      const response = await updateCustomerProfile(form);

      setMessage(
        response.message ||
          "Customer profile updated successfully."
      );

      if (response.user) {
        setUser(response.user);

        // Keep the existing local user information synchronized.
        const storedUser = localStorage.getItem("userInfo");

        if (storedUser) {
          const currentUser = JSON.parse(storedUser);

          localStorage.setItem(
            "userInfo",
            JSON.stringify({
              ...currentUser,
              name: response.user.name,
              email: response.user.email,
              role: response.user.role,
            })
          );
        }

        setForm((current) => ({
          ...current,
          fullName: response.user.name || "",
          phone: response.user.phone || "",
          avatarUrl: response.user.avatarUrl || "",
          addresses: response.user.addresses || [],
          billingProfile: {
            companyName:
              response.user.billingProfile?.companyName || "",
            binNumber:
              response.user.billingProfile?.binNumber || "",
          },
          preferences: {
            ...EMPTY_PREFERENCES,
            ...(response.user.preferences || {}),
          },
          ownedDevices: response.user.ownedDevices || [],
        }));
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update customer profile."
      );
    } finally {
      setSaving(false);
    }
  };

  // ======================================================
  // DELETE ACCOUNT
  // ======================================================

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your account?"
    );

    if (!confirmed || !user?._id) return;

    setDeleting(true);
    setError("");
    setMessage("");

    try {
      await deleteUserProfile(user._id);

      localStorage.removeItem("token");
      localStorage.removeItem("userInfo");

      window.alert("Account deleted successfully.");

      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to delete your account."
      );
    } finally {
      setDeleting(false);
    }
  };

  // ======================================================
  // LOGOUT
  // ======================================================

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userInfo");

    navigate("/login", { replace: true });
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F4F6F4]">
        <Navbar />

        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <Loader message="Loading your customer profile..." />
        </main>

        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F4F6F4]">
        <Navbar />

        <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-16">
          <section className="w-full rounded-2xl border border-[#E5E9E5] bg-white p-7 text-center">
            <h1 className="text-xl font-bold text-[#20332B]">
              Unable to load your profile
            </h1>

            <p className="mt-3 text-sm text-red-700">
              {error || "Customer profile not found."}
            </p>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                loadProfile();
              }}
              className="mt-5 rounded-lg bg-[#1A2E26] px-5 py-3 text-sm font-semibold text-white"
            >
              Try Again
            </button>
          </section>
        </main>

        <Footer />
      </div>
    );
  }

  const initial = (user.name || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F4]">
      <Navbar />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-7 sm:px-6 sm:py-10 lg:px-10">
        {/* Breadcrumb */}

        <div className="mb-7 flex items-center gap-2 text-xs font-medium text-[#89958D]">
          <Link to="/" className="hover:text-[#1A2E26]">
            Home
          </Link>

          <span>/</span>

          <span className="text-[#20332B]">
            My Account
          </span>
        </div>

        {/* Page heading */}

        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B9533B]">
            Customer Account
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#20332B] sm:text-4xl">
            My Account
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-[#68766F]">
            Manage your personal information, delivery addresses,
            shopping preferences and devices.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-10">
          {/* Sidebar */}

          <aside className="space-y-4">
            <div className="rounded-2xl border border-[#E5E9E5] bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-[#E5E9E5] pb-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1A2E26] text-lg font-bold text-white">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#20332B]">
                    {user.name}
                  </p>

                  <p className="truncate text-xs text-[#89958D]">
                    {user.email}
                  </p>
                </div>
              </div>

              <nav className="mt-5 flex flex-col gap-2">
                <div className="rounded-lg bg-[#E5EDE7] px-3 py-3 text-sm font-semibold text-[#1A2E26]">
                  My Details
                </div>

                <Link
                  to="/my-orders"
                  className="rounded-lg px-3 py-3 text-sm text-[#68766F] transition hover:bg-[#F4F6F4] hover:text-[#1A2E26]"
                >
                  My Orders
                </Link>

                <Link
                  to="/cart"
                  className="rounded-lg px-3 py-3 text-sm text-[#68766F] transition hover:bg-[#F4F6F4] hover:text-[#1A2E26]"
                >
                  Shopping Cart
                </Link>

                <Link
                  to="/products"
                  className="rounded-lg px-3 py-3 text-sm text-[#68766F] transition hover:bg-[#F4F6F4] hover:text-[#1A2E26]"
                >
                  Browse Products
                </Link>
              </nav>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-6 w-full rounded-lg border border-[#C7D5CA] px-4 py-3 text-sm font-semibold text-[#20332B] transition hover:bg-[#EBF0EB]"
              >
                Log Out
              </button>
            </div>

            <div className="rounded-xl border border-[#E5E9E5] bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-[#89958D]">
                Account Status
              </p>

              <p className={`mt-3 text-sm font-semibold ${
                user.isVerified ? "text-green-700" : "text-amber-700"
              }`}>
                {user.isVerified
                  ? "Verified Account"
                  : "Verification Pending"}
              </p>

              <p className="mt-2 text-xs text-[#89958D]">
                Phone: {user.isPhoneVerified ? "Verified" : "Not verified"}
              </p>
            </div>
          </aside>

          {/* Main content */}

          <div className="min-w-0 space-y-6">
            {message && (
              <div
                role="status"
                className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
              >
                {message}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal information */}

              <section className="rounded-2xl border border-[#E5E9E5] bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-bold text-[#20332B]">
                  Personal Information
                </h2>

                <p className="mt-1 text-sm text-[#68766F]">
                  Update your contact and profile details.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-[#20332B]">
                    Full Name

                    <input
                      type="text"
                      name="fullName"
                      value={form.fullName}
                      maxLength={80}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </label>

                  <label className="text-xs font-semibold text-[#20332B]">
                    Email Address

                    <input
                      type="email"
                      value={user.email || ""}
                      disabled
                      readOnly
                      className={inputClass}
                    />
                  </label>

                  <label className="text-xs font-semibold text-[#20332B]">
                    Mobile Number

                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+8801XXXXXXXXX"
                      className={inputClass}
                    />

                    <span className="mt-1 block font-normal text-[#89958D]">
                      Used for courier and COD contact.
                    </span>
                  </label>

                  <label className="text-xs font-semibold text-[#20332B]">
                    Profile Image URL

                    <input
                      type="url"
                      name="avatarUrl"
                      value={form.avatarUrl}
                      onChange={handleChange}
                      placeholder="https://example.com/photo.jpg"
                      className={inputClass}
                    />
                  </label>
                </div>
              </section>

              {/* Saved addresses */}

              <section className="rounded-2xl border border-[#E5E9E5] bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-[#20332B]">
                      Saved Addresses
                    </h2>

                    <p className="mt-1 text-sm text-[#68766F]">
                      Save up to five delivery or billing addresses.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addAddress}
                    disabled={form.addresses.length >= 5 || saving}
                    className="rounded-lg bg-[#1A2E26] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    + Add Address
                  </button>
                </div>

                <div className="mt-5 space-y-5">
                  {form.addresses.map((address, index) => (
                    <div
                      key={address._id || index}
                      className="rounded-xl border border-[#E5E9E5] bg-[#F9FAF9] p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <select
                          value={address.label || "Home"}
                          onChange={(e) =>
                            updateAddress(index, "label", e.target.value)
                          }
                          className="rounded-lg border border-[#E5E9E5] bg-white px-3 py-2 text-sm"
                        >
                          <option>Home</option>
                          <option>Office</option>
                          <option>Campus / Hostel</option>
                          <option>Other</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => removeAddress(index)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
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
                          <label
                            key={field}
                            className="text-xs font-semibold text-[#20332B]"
                          >
                            {label}

                            <input
                              type="text"
                              value={address[field] || ""}
                              onChange={(e) =>
                                updateAddress(index, field, e.target.value)
                              }
                              className={inputClass}
                            />
                          </label>
                        ))}
                      </div>

                      <label className="mt-3 block text-xs font-semibold text-[#20332B]">
                        Street Address

                        <textarea
                          rows={2}
                          maxLength={200}
                          value={address.streetAddress || ""}
                          onChange={(e) =>
                            updateAddress(
                              index,
                              "streetAddress",
                              e.target.value
                            )
                          }
                          className={inputClass}
                        />
                      </label>

                      <div className="mt-4 flex flex-wrap gap-5">
                        <label className="flex items-center gap-2 text-xs text-[#53645A]">
                          <input
                            type="checkbox"
                            checked={Boolean(address.isDefaultShipping)}
                            onChange={(e) =>
                              updateAddress(
                                index,
                                "isDefaultShipping",
                                e.target.checked
                              )
                            }
                          />
                          Default Shipping
                        </label>

                        <label className="flex items-center gap-2 text-xs text-[#53645A]">
                          <input
                            type="checkbox"
                            checked={Boolean(address.isDefaultBilling)}
                            onChange={(e) =>
                              updateAddress(
                                index,
                                "isDefaultBilling",
                                e.target.checked
                              )
                            }
                          />
                          Default Billing
                        </label>
                      </div>
                    </div>
                  ))}

                  {form.addresses.length === 0 && (
                    <p className="rounded-lg bg-[#F9FAF9] p-4 text-sm text-[#89958D]">
                      No saved addresses yet.
                    </p>
                  )}
                </div>
              </section>

              {/* Preferences */}

              <section className="rounded-2xl border border-[#E5E9E5] bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-bold text-[#20332B]">
                  Communication Preferences
                </h2>

                <div className="mt-5 space-y-4">
                  {[
                    ["orderUpdatesSms", "SMS notifications for order updates"],
                    ["priceDropEmails", "Email notifications for price drops"],
                    ["warrantyExpiryReminders", "Warranty expiry reminders"],
                  ].map(([field, label]) => (
                    <label
                      key={field}
                      className="flex items-center gap-3 text-sm text-[#53645A]"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(form.preferences[field])}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            preferences: {
                              ...current.preferences,
                              [field]: e.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4 accent-[#1A2E26]"
                      />

                      {label}
                    </label>
                  ))}
                </div>
              </section>

              {/* Billing profile */}

              <section className="rounded-2xl border border-[#E5E9E5] bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-bold text-[#20332B]">
                  Billing Profile
                </h2>

                <p className="mt-1 text-sm text-[#68766F]">
                  Optional business billing information.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-[#20332B]">
                    Company Name

                    <input
                      type="text"
                      maxLength={120}
                      value={form.billingProfile.companyName}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          billingProfile: {
                            ...current.billingProfile,
                            companyName: e.target.value,
                          },
                        }))
                      }
                      className={inputClass}
                    />
                  </label>

                  <label className="text-xs font-semibold text-[#20332B]">
                    BIN Number

                    <input
                      type="text"
                      maxLength={30}
                      value={form.billingProfile.binNumber}
                      onChange={(e) =>
                        setForm((current) => ({
                          ...current,
                          billingProfile: {
                            ...current.billingProfile,
                            binNumber: e.target.value,
                          },
                        }))
                      }
                      className={inputClass}
                    />
                  </label>
                </div>
              </section>

              {/* Owned devices */}

              <section className="rounded-2xl border border-[#E5E9E5] bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-[#20332B]">
                      My Devices
                    </h2>

                    <p className="mt-1 text-sm text-[#68766F]">
                      Keep track of your current devices.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addDevice}
                    disabled={form.ownedDevices.length >= 20 || saving}
                    className="rounded-lg border border-[#C7D5CA] px-4 py-2 text-xs font-semibold text-[#20332B] disabled:opacity-50"
                  >
                    + Add Device
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {form.ownedDevices.map((device, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                    >
                      {[
                        ["brand", "Brand"],
                        ["model", "Model"],
                        ["category", "Category"],
                      ].map(([field, label]) => (
                        <label
                          key={field}
                          className="text-xs font-semibold text-[#20332B]"
                        >
                          {label}

                          <input
                            type="text"
                            value={device[field] || ""}
                            onChange={(e) =>
                              updateDevice(index, field, e.target.value)
                            }
                            className={inputClass}
                          />
                        </label>
                      ))}

                      <button
                        type="button"
                        onClick={() => removeDevice(index)}
                        className="mb-2 text-xs font-semibold text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  {form.ownedDevices.length === 0 && (
                    <p className="text-sm text-[#89958D]">
                      No devices saved.
                    </p>
                  )}
                </div>
              </section>

              {/* Shopping metrics */}

              <section className="rounded-2xl border border-[#E5E9E5] bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-bold text-[#20332B]">
                  Shopping Statistics
                </h2>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    [
                      "Delivered Orders",
                      user.customerMetrics?.deliveredOrders || 0,
                    ],
                    [
                      "Refused COD Orders",
                      user.customerMetrics?.refusedCodOrders || 0,
                    ],
                    [
                      "Total Spent",
                      `৳ ${Number(
                        user.customerMetrics?.totalSpent || 0
                      ).toLocaleString("en-BD")}`,
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl bg-[#F4F6F4] p-4"
                    >
                      <p className="text-xs text-[#89958D]">
                        {label}
                      </p>

                      <p className="mt-2 text-xl font-bold text-[#20332B]">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Save */}

              <button
                type="submit"
                disabled={saving || deleting}
                className="w-full rounded-lg bg-[#1A2E26] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#294438] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving
                  ? "Saving Changes..."
                  : "Save Customer Information"}
              </button>
            </form>

            {/* Delete account */}

            <section className="rounded-2xl border border-red-200 bg-white p-5 sm:p-7">
              <h2 className="font-bold text-red-800">
                Delete Account
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-[#68766F]">
                Account deletion may permanently remove your account
                and associated information.
              </p>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={saving || deleting}
                className="mt-4 rounded-lg border border-red-200 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Delete My Account"}
              </button>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default CustomerProfileDetails;