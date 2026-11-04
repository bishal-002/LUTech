
import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api/seller/profile";

const SellerStoreProfile = () => {
  const [formData, setFormData] = useState({
    storeName: "",
    storeDescription: "",
    storePhone: "",
    storeAddress: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const seller = response.data.seller;

        setFormData({
          storeName: seller.storeName || "",
          storeDescription: seller.storeDescription || "",
          storePhone: seller.storePhone || "",
          storeAddress: seller.storeAddress || "",
        });
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load store profile."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!formData.storeName.trim()) {
      setError("Store name is required.");
      return;
    }

    try {
      setSaving(true);

      const response = await axios.put(API_URL, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const seller = response.data.seller;

      setFormData({
        storeName: seller.storeName || "",
        storeDescription: seller.storeDescription || "",
        storePhone: seller.storePhone || "",
        storeAddress: seller.storeAddress || "",
      });

      setMessage("Store profile updated successfully!");
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to update store profile."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-600">Loading store profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">
            Store Profile
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your store information and contact details.
          </p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          {message && (
            <div className="mb-5 rounded-lg bg-green-100 p-3 text-sm text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-lg bg-red-100 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Store Name *
              </label>
              <input
                type="text"
                name="storeName"
                value={formData.storeName}
                onChange={handleChange}
                placeholder="Enter your store name"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Store Description
              </label>
              <textarea
                name="storeDescription"
                value={formData.storeDescription}
                onChange={handleChange}
                rows="4"
                placeholder="Describe your store..."
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Store Phone
              </label>
              <input
                type="tel"
                name="storePhone"
                value={formData.storePhone}
                onChange={handleChange}
                placeholder="Enter contact number"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Store Address
              </label>
              <textarea
                name="storeAddress"
                value={formData.storeAddress}
                onChange={handleChange}
                rows="3"
                placeholder="Enter your store address"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex justify-end border-t border-gray-100 pt-5">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SellerStoreProfile;
