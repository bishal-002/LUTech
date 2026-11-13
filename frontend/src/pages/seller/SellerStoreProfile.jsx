
import { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api/seller/profile";

const initialFormData = {
  storeName: "",
  storeDescription: "",
  storePhone: "",
  storeAddress: "",
};

const SellerStoreProfile = () => {
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const getAuthConfig = () => ({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      if (!token) {
        setError("Your session has expired. Please log in again.");
        return;
      }

      const response = await axios.get(API_URL, getAuthConfig());
      const seller = response.data.seller;

      setFormData({
        storeName: seller.storeName || "",
        storeDescription: seller.storeDescription || "",
        storePhone: seller.storePhone || "",
        storeAddress: seller.storeAddress || "",
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load store profile. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!formData.storeName.trim()) {
      setError("Store name is required.");
      return;
    }

    try {
      setSaving(true);

      const response = await axios.put(
        API_URL,
        {
          ...formData,
          storeName: formData.storeName.trim(),
          storeDescription: formData.storeDescription.trim(),
          storePhone: formData.storePhone.trim(),
          storeAddress: formData.storeAddress.trim(),
        },
        getAuthConfig()
      );

      const seller = response.data.seller;

      setFormData({
        storeName: seller.storeName || "",
        storeDescription: seller.storeDescription || "",
        storePhone: seller.storePhone || "",
        storeAddress: seller.storeAddress || "",
      });

      setMessage("Your store profile has been updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to update store profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-[#DDE7E0] bg-[#FAFCFA] px-4 py-3 text-sm text-[#29473C] outline-none transition placeholder:text-[#A0ACA4] focus:border-[#55A88B] focus:bg-white focus:ring-2 focus:ring-[#55A88B]/10";

  const labelClass =
    "mb-2 block text-sm font-semibold text-[#29473C]";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#315B53] border-t-[#83CDB5]" />
          <p className="mt-4 text-sm text-[#B5C9C1]">
            Loading store profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-7">
      {/* Page heading */}
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#83CDB5]">
          Store Management
        </p>

        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          Store Profile
        </h1>

        <p className="mt-2 text-sm text-[#A8C0B9]">
          Manage your store identity, contact information, and description.
        </p>
      </section>

      {/* Error and success messages */}
      {message && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <span className="text-lg">✓</span>
          <p>{message}</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:flex-row sm:items-center">
          <p>{error}</p>

          <button
            type="button"
            onClick={fetchProfile}
            className="w-fit font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        {/* Profile form */}
        <section className="overflow-hidden rounded-2xl border border-[#E6ECE8] bg-white shadow-sm">
          <div className="border-b border-[#EAF0EC] px-5 py-5 sm:px-7">
            <h2 className="text-lg font-bold text-[#173D36]">
              Store Information
            </h2>
            <p className="mt-1 text-sm text-[#839088]">
              Keep your store details accurate and up to date.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-7">
            {/* Store name */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label htmlFor="storeName" className={labelClass}>
                  Store Name <span className="text-rose-500">*</span>
                </label>

                <span className="text-xs text-[#98A49C]">
                  {formData.storeName.length}/100
                </span>
              </div>

              <input
                id="storeName"
                type="text"
                name="storeName"
                value={formData.storeName}
                onChange={handleChange}
                placeholder="Enter your store name"
                maxLength={100}
                className={inputClass}
                required
              />

              <p className="mt-2 text-xs text-[#89958F]">
                This is the name customers will associate with your store.
              </p>
            </div>

            {/* Store description */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <label htmlFor="storeDescription" className={labelClass}>
                  Store Description
                </label>

                <span className="text-xs text-[#98A49C]">
                  {formData.storeDescription.length}/1000
                </span>
              </div>

              <textarea
                id="storeDescription"
                name="storeDescription"
                value={formData.storeDescription}
                onChange={handleChange}
                rows={5}
                maxLength={1000}
                placeholder="Tell customers about your store, products, and what makes your business special..."
                className={`${inputClass} resize-y`}
              />

              <p className="mt-2 text-xs text-[#89958F]">
                A clear description helps customers understand your business.
              </p>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="storePhone" className={labelClass}>
                Store Phone Number
              </label>

              <input
                id="storePhone"
                type="tel"
                name="storePhone"
                value={formData.storePhone}
                onChange={handleChange}
                placeholder="e.g. 01XXXXXXXXX"
                maxLength={20}
                className={inputClass}
              />
            </div>

            {/* Address */}
            <div>
              <label htmlFor="storeAddress" className={labelClass}>
                Store Address
              </label>

              <textarea
                id="storeAddress"
                name="storeAddress"
                value={formData.storeAddress}
                onChange={handleChange}
                rows={3}
                maxLength={300}
                placeholder="Enter your store's business address"
                className={`${inputClass} resize-y`}
              />
            </div>

            {/* Form actions */}
            <div className="flex flex-col-reverse justify-between gap-3 border-t border-[#EAF0EC] pt-6 sm:flex-row sm:items-center">
              <p className="text-xs text-[#89958F]">
                Fields marked with * are required.
              </p>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1D7055] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#175A44] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Store preview */}
        <aside className="space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[#315B53] bg-[#103633]">
            <div className="border-b border-[#315B53] px-5 py-5">
              <h2 className="font-bold text-white">Store Preview</h2>
              <p className="mt-1 text-xs text-[#A8C0B9]">
                A preview of your current store information.
              </p>
            </div>

            <div className="p-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#83CDB5] text-2xl font-bold text-[#123B35]">
                {formData.storeName.trim()
                  ? formData.storeName.trim().charAt(0).toUpperCase()
                  : "S"}
              </div>

              <h3 className="mt-5 break-words text-xl font-bold text-white">
                {formData.storeName.trim() || "Your Store Name"}
              </h3>

              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#B5C9C1]">
                {formData.storeDescription.trim() ||
                  "Your store description will appear here once you add it."}
              </p>

              <div className="mt-6 space-y-4 border-t border-[#315B53] pt-5">
                <div className="flex items-start gap-3">
                  <span className="text-[#83CDB5]">☎</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#83A79A]">
                      Contact Number
                    </p>
                    <p className="mt-1 break-all text-sm text-white">
                      {formData.storePhone || "Not provided"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-[#83CDB5]">⌖</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#83A79A]">
                      Store Address
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-white">
                      {formData.storeAddress || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-[#315B53] bg-[#17443D] p-3">
                <p className="text-xs leading-relaxed text-[#B5C9C1]">
                  Preview updates as you type. Save your changes to update
                  your store profile on the server.
                </p>
              </div>
            </div>
          </section>

          {/* Helpful information */}
          <section className="rounded-2xl border border-[#315B53] bg-[#103633] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B4B43] text-lg text-[#83CDB5]">
                i
              </div>

              <h3 className="font-bold text-white">Profile Tips</h3>
            </div>

            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-[#B5C9C1]">
              <li className="flex gap-2">
                <span className="text-[#83CDB5]">✓</span>
                Choose a recognizable store name.
              </li>

              <li className="flex gap-2">
                <span className="text-[#83CDB5]">✓</span>
                Write a clear description of your products.
              </li>

              <li className="flex gap-2">
                <span className="text-[#83CDB5]">✓</span>
                Provide an active contact number.
              </li>

              <li className="flex gap-2">
                <span className="text-[#83CDB5]">✓</span>
                Keep your delivery address accurate.
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default SellerStoreProfile;
