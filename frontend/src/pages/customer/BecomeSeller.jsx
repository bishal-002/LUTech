
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const API_URL = "http://localhost:5000/api/users";

const INITIAL_FORM = {
  storeName: "",
  storeDescription: "",
  storePhone: "",
  storeAddress: "",
  reason: "",
};

const inputClass =
  "w-full min-w-0 rounded-xl border border-[#DCE3DC] bg-white px-4 py-3 text-sm text-[#20332B] outline-none transition placeholder:text-[#A0AAA3] focus:border-[#1A2E26] focus:ring-2 focus:ring-[#1A2E26]/10";

const labelClass =
  "mb-2 block text-sm font-semibold text-[#20332B]";

function StatusIcon({ type }) {
  const styles = {
    pending: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
    success: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
        styles[type] || styles.pending
      }`}
    >
      {type === "pending" && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )}

      {type === "rejected" && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      )}

      {type === "success" && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <path d="m5 12 4 4L19 6" />
        </svg>
      )}

      {type === "error" && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-6 w-6"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4m0 4h.01" />
        </svg>
      )}
    </div>
  );
}

function BecomeSeller() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [status, setStatus] = useState("loading");
  const [application, setApplication] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchApplicationStatus = useCallback(async () => {
    try {
      setStatus("loading");
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

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

      // Synchronize the role after admin approval.
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
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("userInfo");
        navigate("/login", { replace: true });
        return;
      }

      setError(
        err.response?.data?.message ||
          "Unable to load application status. Please try again."
      );

      setStatus("error");
    }
  }, [navigate]);

  useEffect(() => {
    fetchApplicationStatus();
  }, [fetchApplicationStatus]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const response = await axios.post(
        `${API_URL}/seller-application`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(
        response.data.message || "Your application has been submitted."
      );

      await fetchApplicationStatus();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to submit your application. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const isPending = status === "pending";
  const isRejected = status === "rejected";
  const showForm = status !== "pending" && status !== "error";

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col bg-[#F4F6F4]">
      <Navbar />

      <main className="mx-auto box-border w-full max-w-[1200px] min-w-0 flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-10 lg:py-14">
        {/* Breadcrumb */}
        <div className="mb-7 flex flex-wrap items-center gap-2 text-xs font-medium text-[#89958D]">
          <Link to="/" className="transition hover:text-[#1A2E26]">
            Home
          </Link>
          <span>/</span>
          <Link
            to="/profile"
            className="transition hover:text-[#1A2E26]"
          >
            My Account
          </Link>
          <span>/</span>
          <span className="text-[#1A2E26]">Become a Seller</span>
        </div>

        {/* Page Heading */}
        <section className="mb-8 overflow-hidden rounded-2xl bg-[#1A2E26] p-6 text-white sm:p-9">
          <div className="flex min-w-0 flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E9A18B]">
                LUTech Marketplace
              </p>

              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Become a Seller
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-6 text-[#D5E0D8]">
                Turn your business into an online store. Apply to
                showcase your products and reach more customers through
                LUTech.
              </p>
            </div>

            <div className="hidden h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 sm:flex">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-10 w-10 text-[#E9A18B]"
                aria-hidden="true"
              >
                <path d="M3 10h18l-1.5 11h-15L3 10Z" />
                <path d="M7 10V7a5 5 0 0 1 10 0v3M9 14h6" />
              </svg>
            </div>
          </div>
        </section>

        {/* Success Message */}
        {message && (
          <div
            role="status"
            className="mb-6 flex min-w-0 items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            <StatusIcon type="success" />
            <p className="min-w-0 flex-1 leading-6">{message}</p>
          </div>
        )}

        {/* Error Message */}
        {error && status !== "error" && (
          <div
            role="alert"
            className="mb-6 flex min-w-0 items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <StatusIcon type="error" />
            <p className="min-w-0 flex-1 leading-6">{error}</p>
          </div>
        )}

        {/* Loading */}
        {status === "loading" && (
          <div className="rounded-2xl border border-[#E5E9E5] bg-white px-5 py-16 text-center shadow-sm">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#E5EDE7] border-t-[#1A2E26]" />
            <p className="mt-4 text-sm font-medium text-[#68766F]">
              Loading application details...
            </p>
          </div>
        )}

        {/* Status Error */}
        {status === "error" && (
          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm sm:p-9">
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              <StatusIcon type="error" />

              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-[#20332B]">
                  Unable to Load Application
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#68766F]">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={fetchApplicationStatus}
                  className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#1A2E26] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#294438]"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pending Application */}
        {status !== "loading" && isPending && (
          <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
            <div className="border-b border-amber-100 bg-amber-50 p-6 sm:p-8">
              <div className="flex min-w-0 items-start gap-4">
                <StatusIcon type="pending" />

                <div className="min-w-0 flex-1">
                  <span className="inline-flex rounded-full border border-amber-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Pending Review
                  </span>

                  <h2 className="mt-3 text-xl font-bold text-[#20332B] sm:text-2xl">
                    Application Under Review
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#68766F]">
                    Your application has been submitted successfully.
                    Our Admin team will review your information. Please
                    wait for the approval decision.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#89958D]">
                  Store Name
                </p>
                <p className="mt-1 break-words text-sm font-bold text-[#20332B]">
                  {formData.storeName || "Not provided"}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-xs font-medium text-[#89958D]">
                  Submitted On
                </p>
                <p className="mt-1 text-sm font-bold text-[#20332B]">
                  {application?.submittedAt
                    ? new Date(
                        application.submittedAt
                      ).toLocaleDateString("en-BD", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Date unavailable"}
                </p>
              </div>
            </div>

            <div className="border-t border-[#E5E9E5] bg-[#F9FAF9] p-5 sm:px-8">
              <p className="text-xs leading-5 text-[#68766F]">
                You can revisit this page later to check your application
                status.
              </p>

              <button
                type="button"
                onClick={fetchApplicationStatus}
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#1A2E26] transition hover:text-[#B9533B]"
              >
                Refresh Application Status
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </section>
        )}

        {/* Rejected Application Notice */}
        {status !== "loading" && isRejected && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex min-w-0 items-start gap-4">
              <StatusIcon type="rejected" />

              <div className="min-w-0 flex-1">
                <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700">
                  Application Rejected
                </span>

                <h2 className="mt-3 text-xl font-bold text-[#20332B]">
                  Previous Application Rejected
                </h2>

                <p className="mt-2 text-sm leading-6 text-[#68766F]">
                  Your previous application was not approved. You can
                  review the feedback and submit a new application with
                  updated information.
                </p>

                {application?.reviewNote && (
                  <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-700">
                      Admin Feedback
                    </p>
                    <p className="mt-2 break-words text-sm leading-6 text-red-800">
                      {application.reviewNote}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Application Form */}
        {status !== "loading" && showForm && (
          <div className="grid w-full min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
            <form
              onSubmit={handleSubmit}
              className="min-w-0 rounded-2xl border border-[#E5E9E5] bg-white p-5 shadow-sm sm:p-8"
            >
              <div className="mb-7 border-b border-[#E5E9E5] pb-5">
                <h2 className="text-xl font-bold text-[#20332B]">
                  Store Application Form
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#68766F]">
                  Provide your business information to get started as a
                  LUTech seller.
                </p>
              </div>

              <div className="space-y-5">
                {/* Store Name */}
                <div>
                  <label htmlFor="storeName" className={labelClass}>
                    Store Name <span className="text-[#B9533B]">*</span>
                  </label>

                  <input
                    id="storeName"
                    type="text"
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Enter your store name"
                    autoComplete="organization"
                    required
                    maxLength={100}
                  />
                </div>

                {/* Store Description */}
                <div>
                  <label
                    htmlFor="storeDescription"
                    className={labelClass}
                  >
                    Store Description
                  </label>

                  <textarea
                    id="storeDescription"
                    name="storeDescription"
                    value={formData.storeDescription}
                    onChange={handleChange}
                    className={`${inputClass} resize-y`}
                    rows={4}
                    placeholder="Describe your business and the products you plan to sell..."
                    maxLength={1000}
                  />

                  <p className="mt-1.5 text-right text-xs text-[#89958D]">
                    {formData.storeDescription.length}/1000
                  </p>
                </div>

                {/* Business Phone */}
                <div>
                  <label htmlFor="storePhone" className={labelClass}>
                    Business Phone <span className="text-[#B9533B]">*</span>
                  </label>

                  <input
                    id="storePhone"
                    type="tel"
                    name="storePhone"
                    value={formData.storePhone}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Enter your business phone number"
                    autoComplete="tel"
                    required
                    maxLength={30}
                  />
                </div>

                {/* Business Address */}
                <div>
                  <label htmlFor="storeAddress" className={labelClass}>
                    Business Address <span className="text-[#B9533B]">*</span>
                  </label>

                  <textarea
                    id="storeAddress"
                    name="storeAddress"
                    value={formData.storeAddress}
                    onChange={handleChange}
                    className={`${inputClass} resize-y`}
                    rows={3}
                    placeholder="Enter your business address"
                    autoComplete="street-address"
                    required
                    maxLength={500}
                  />
                </div>

                {/* Application Reason */}
                <div>
                  <label htmlFor="reason" className={labelClass}>
                    Why do you want to become a seller?{" "}
                    <span className="text-[#B9533B]">*</span>
                  </label>

                  <textarea
                    id="reason"
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    className={`${inputClass} resize-y`}
                    rows={5}
                    placeholder="Tell us about your business, your products and your plans for selling on LUTech..."
                    required
                    maxLength={2000}
                  />

                  <p className="mt-1.5 text-right text-xs text-[#89958D]">
                    {formData.reason.length}/2000
                  </p>
                </div>
              </div>

              {/* Submit */}
              <div className="mt-8 border-t border-[#E5E9E5] pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A2E26] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#294438] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>

                <p className="mt-3 text-xs leading-5 text-[#89958D]">
                  Fields marked with * are required. Your application
                  will be reviewed by the LUTech Admin team.
                </p>
              </div>
            </form>

            {/* Information Sidebar */}
            <aside className="mx-auto w-full min-w-0 max-w-full space-y-5 lg:mx-0">
              <div className="rounded-2xl border border-[#E5E9E5] bg-white p-5 shadow-sm sm:p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5EDE7] text-[#1A2E26]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M12 3 4 7v5c0 5 3.5 8 8 9 4.5-1 8-4 8-9V7l-8-4Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>

                <h3 className="mt-4 text-base font-bold text-[#20332B]">
                  Application Process
                </h3>

                <div className="mt-5 space-y-5">
                  <div className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1A2E26] text-xs font-bold text-white">
                      1
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#20332B]">
                        Submit Application
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#68766F]">
                        Complete the form with your business details.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E5EDE7] text-xs font-bold text-[#1A2E26]">
                      2
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#20332B]">
                        Admin Review
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#68766F]">
                        Our Admin team reviews your application.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E5EDE7] text-xs font-bold text-[#1A2E26]">
                      3
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#20332B]">
                        Start Selling
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#68766F]">
                        After approval, access your seller dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E5E9E5] bg-[#EBF0EB] p-5 sm:p-6">
                <h3 className="text-sm font-bold text-[#20332B]">
                  Need to Know
                </h3>

                <p className="mt-2 text-xs leading-6 text-[#68766F]">
                  Make sure your store details and contact information
                  are accurate. The Admin team will use these details
                  when reviewing your application.
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default BecomeSeller;
