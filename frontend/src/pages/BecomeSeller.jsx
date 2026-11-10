
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_URL = "http://localhost:5000/api/users";

function BecomeSeller() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    storeName: "",
    storeDescription: "",
    storePhone: "",
    storeAddress: "",
    reason: "",
  });

  const [status, setStatus] = useState("loading");
  const [application, setApplication] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");

  const fetchApplicationStatus = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/seller-application`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = response.data;

      setStatus(data.sellerStatus);
      setApplication(data.application);

      setFormData((previous) => ({
        ...previous,
        storeName: data.store?.storeName || "",
        storeDescription: data.store?.storeDescription || "",
        storePhone: data.store?.storePhone || "",
        storeAddress: data.store?.storeAddress || "",
        reason: data.application?.reason || "",
      }));

      // Sync the updated role after Admin approval.
      if (data.role === "seller" && data.sellerStatus === "approved") {
        const userInfo = JSON.parse(
          localStorage.getItem("userInfo") || "{}"
        );

        localStorage.setItem(
          "userInfo",
          JSON.stringify({
            ...userInfo,
            role: "seller",
            sellerStatus: "approved",
          })
        );

        navigate("/seller/dashboard", { replace: true });
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load application status."
      );
      setStatus("error");
    }
  };

  useEffect(() => {
    fetchApplicationStatus();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await axios.post(
        `${API_URL}/seller-application`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(response.data.message);
      setStatus(response.data.sellerStatus);

      await fetchApplicationStatus();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to submit your application."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

  if (status === "loading") {
    return (
      <>
        <Navbar />
        <div className="py-20 text-center text-slate-600">
          Loading application details...
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900">
              Become a Seller
            </h1>
            <p className="mt-2 text-slate-600">
              Apply to start selling your products on LUTech.
            </p>
          </div>

          {message && (
            <div className="mb-5 rounded-lg bg-green-100 p-4 text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-lg bg-red-100 p-4 text-red-700">
              {error}
            </div>
          )}

          {status === "pending" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-xl font-semibold text-amber-800">
                Application Under Review
              </h2>
              <p className="mt-2 text-amber-700">
                Your application has been submitted successfully.
                Please wait while our Admin team reviews it.
              </p>
              <p className="mt-4 text-sm text-amber-700">
                Store: {formData.storeName}
              </p>
              {application?.submittedAt && (
                <p className="mt-1 text-sm text-amber-700">
                  Submitted:{" "}
                  {new Date(application.submittedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {status === "rejected" && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
              <h2 className="text-xl font-semibold text-red-800">
                Previous Application Rejected
              </h2>
              <p className="mt-2 text-red-700">
                Your previous application was not approved. You can
                submit a new application with updated information.
              </p>
              {application?.reviewNote && (
                <p className="mt-2 text-sm text-red-700">
                  Admin feedback: {application.reviewNote}
                </p>
              )}
            </div>
          )}

          {status !== "pending" && status !== "error" && (
            <form
              onSubmit={handleSubmit}
              className="space-y-5 rounded-xl bg-white p-6 shadow-sm sm:p-8"
            >
              <div>
                <label className="mb-2 block font-medium text-slate-700">
                  Store Name *
                </label>
                <input
                  type="text"
                  name="storeName"
                  value={formData.storeName}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Enter your store name"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-700">
                  Store Description
                </label>
                <textarea
                  name="storeDescription"
                  value={formData.storeDescription}
                  onChange={handleChange}
                  className={inputClass}
                  rows="3"
                  placeholder="Describe the products you plan to sell"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-700">
                  Business Phone *
                </label>
                <input
                  type="tel"
                  name="storePhone"
                  value={formData.storePhone}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Enter business phone number"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-700">
                  Business Address *
                </label>
                <textarea
                  name="storeAddress"
                  value={formData.storeAddress}
                  onChange={handleChange}
                  className={inputClass}
                  rows="2"
                  placeholder="Enter your business address"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-slate-700">
                  Why do you want to become a seller? *
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  className={inputClass}
                  rows="4"
                  placeholder="Tell us about your business and your plans"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit Application"}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

export default BecomeSeller;
