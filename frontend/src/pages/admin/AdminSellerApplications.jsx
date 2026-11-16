
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "../../components/admin/AdminLayout";

const API_URL = "http://localhost:5000/api/admin";

const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

function formatDate(date) {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function AdminSellerApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_URL}/sellers`,
        getAuthConfig()
      );

      setApplications(
        response.data.applicants || response.data.sellers || []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load seller applications."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleApprove = async (applicant) => {
    if (!applicant.isVerified) {
      setError("The applicant must verify their email before approval.");
      return;
    }

    try {
      setProcessingId(applicant._id);
      setError("");
      setActionMessage("");

      await axios.put(
        `${API_URL}/sellers/${applicant._id}/approve`,
        {},
        getAuthConfig()
      );

      setApplications((previous) =>
        previous.filter((item) => item._id !== applicant._id)
      );

      setActionMessage(
        `${applicant.name || "Applicant"} has been approved as a seller.`
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to approve seller application."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (applicant) => {
    const confirmed = window.confirm(
      `Are you sure you want to reject the seller application from ${
        applicant.name || "this applicant"
      }?`
    );

    if (!confirmed) return;

    try {
      setProcessingId(applicant._id);
      setError("");
      setActionMessage("");

      await axios.put(
        `${API_URL}/sellers/${applicant._id}/reject`,
        {},
        getAuthConfig()
      );

      setApplications((previous) =>
        previous.filter((item) => item._id !== applicant._id)
      );

      setActionMessage(
        `${applicant.name || "Applicant"}'s application has been rejected.`
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to reject seller application."
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-[#83CDB5]">
              Administration
            </p>

            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              Seller Applications
            </h1>

            <p className="mt-2 text-sm text-teal-100/70">
              Review applications and manage requests to become sellers.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchApplications}
            disabled={loading}
            className="rounded-xl border border-[#83CDB5]/30 bg-[#103B37] px-4 py-2.5 text-sm font-semibold text-[#B9F4E4] transition hover:bg-[#18554C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Pending Applications
            </p>

            <div className="mt-3 flex items-center justify-between">
              <h2 className="text-3xl font-bold text-slate-900">
                {loading ? "..." : applications.length}
              </h2>

              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-xl">
                🏪
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Applications returned by the admin API
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Email Verification
            </p>

            <div className="mt-3 flex items-center justify-between">
              <h2 className="text-3xl font-bold text-emerald-700">
                {loading
                  ? "..."
                  : applications.filter((item) => item.isVerified).length}
              </h2>

              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                ✓
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-400">
              Applicants eligible for approval
            </p>
          </div>
        </div>

        {/* Feedback */}
        {actionMessage && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {actionMessage}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Applications */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Applications to Review
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Check applicant and store information before making a decision.
              </p>
            </div>

            <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              {applications.length} Pending
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading seller applications...
            </div>
          ) : error && applications.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-600">
                Unable to display applications.
              </p>

              <button
                type="button"
                onClick={fetchApplications}
                className="mt-3 text-sm font-semibold text-emerald-700 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl">
                ✓
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                No pending applications
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                New seller applications will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {applications.map((applicant) => {
                const isProcessing = processingId === applicant._id;

                return (
                  <article
                    key={applicant._id}
                    className="p-5 transition hover:bg-slate-50/70 sm:p-6"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">
                      {/* Applicant details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">
                            {applicant.name || "Unnamed applicant"}
                          </h3>

                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            Pending
                          </span>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              applicant.isVerified
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {applicant.isVerified
                              ? "Email Verified"
                              : "Email Not Verified"}
                          </span>
                        </div>

                        <p className="mt-1 break-all text-sm text-slate-500">
                          {applicant.email || "No email provided"}
                        </p>

                        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Store Name
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {applicant.storeName || "Not provided"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Business Phone
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {applicant.storePhone || "Not provided"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Submitted
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {formatDate(
                                applicant.sellerApplication?.submittedAt ||
                                  applicant.createdAt
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Business Address
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-700">
                            {applicant.storeAddress || "Not provided"}
                          </p>
                        </div>

                        {applicant.storeDescription && (
                          <div className="mt-4 rounded-xl bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Store Description
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {applicant.storeDescription}
                            </p>
                          </div>
                        )}

                        {applicant.sellerApplication?.reason && (
                          <div className="mt-4 rounded-xl border border-slate-200 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Application Reason
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {applicant.sellerApplication.reason}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 flex-row gap-3 xl:w-36 xl:flex-col">
                        <button
                          type="button"
                          onClick={() => handleApprove(applicant)}
                          disabled={isProcessing || !applicant.isVerified}
                          title={
                            !applicant.isVerified
                              ? "Applicant must verify their email first"
                              : "Approve seller application"
                          }
                          className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 xl:flex-none"
                        >
                          {isProcessing ? "Processing..." : "Approve"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReject(applicant)}
                          disabled={isProcessing}
                          className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 xl:flex-none"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminSellerApplications;
