import { useCallback, useEffect, useState } from "react";
import {
  getSellerDisputes,
  getSellerDisputeById,
  respondToSellerDispute,
  getSellerRecoveries,
} from "../../services/sellerService";

const money = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-BD", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

const errorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const disputeStatuses = [
  { value: "", label: "All statuses" },
  { value: "awaiting_seller", label: "Awaiting seller" },
  { value: "under_review", label: "Under review" },
  { value: "awaiting_customer", label: "Awaiting customer" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
];

const recoveryStatuses = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "partially_recovered", label: "Partially recovered" },
  { value: "recovered", label: "Recovered" },
];

const disputeStatusStyles = {
  awaiting_seller: "bg-amber-300/15 text-amber-200",
  under_review: "bg-sky-300/15 text-sky-200",
  awaiting_customer: "bg-violet-300/15 text-violet-200",
  resolved: "bg-emerald-300/15 text-emerald-200",
  rejected: "bg-rose-300/15 text-rose-200",
  closed: "bg-white/10 text-[#C4DAD2]",
};

const disputeStatusLabels = {
  awaiting_seller: "Awaiting seller",
  under_review: "Under review",
  awaiting_customer: "Awaiting customer",
  resolved: "Resolved",
  rejected: "Rejected",
  closed: "Closed",
};

const recoveryStatusStyles = {
  pending: "bg-amber-300/15 text-amber-200",
  partially_recovered: "bg-sky-300/15 text-sky-200",
  recovered: "bg-emerald-300/15 text-emerald-200",
};

const recoveryStatusLabels = {
  pending: "Pending",
  partially_recovered: "Partially recovered",
  recovered: "Recovered",
};

const reasonLabels = {
  item_not_received: "Item not received",
  damaged_item: "Damaged item",
  wrong_item: "Wrong item",
  missing_items: "Missing items",
  not_as_described: "Not as described",
  defective_item: "Defective item",
  suspected_counterfeit: "Suspected counterfeit",
  other: "Other",
};

function StatusBadge({ status, type = "dispute" }) {
  const styles =
    type === "recovery" ? recoveryStatusStyles : disputeStatusStyles;
  const labels =
    type === "recovery" ? recoveryStatusLabels : disputeStatusLabels;

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-white/10 text-[#D5E5DF]"
      }`}
    >
      {labels[status] || status || "Unknown"}
    </span>
  );
}

function MetricCard({ label, value, detail, accent = "mint", currency = true }) {
  const borderStyles = {
    mint: "border-[#83CDB5]/30",
    amber: "border-amber-300/30",
    blue: "border-sky-300/30",
    violet: "border-violet-300/30",
  };

  return (
    <div
      className={`rounded-2xl border ${borderStyles[accent]} bg-[#103D3D] p-5`}
    >
      <p className="text-sm text-[#A9C7BD]">{label}</p>
      <p className="mt-3 break-words text-2xl font-bold text-white">
        {currency ? money(value) : Number(value || 0).toLocaleString("en-BD")}
      </p>
      <p className="mt-2 text-xs text-[#83A99C]">{detail}</p>
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 px-5 py-12 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-xl text-[#83CDB5]">
        ✓
      </div>
      <h3 className="mt-4 font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#A9C7BD]">
        {description}
      </p>
    </div>
  );
}

function SellerDisputes() {
  const [activeTab, setActiveTab] = useState("disputes");

  const [disputes, setDisputes] = useState([]);
  const [disputePagination, setDisputePagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalDisputes: 0,
    limit: 20,
  });
  const [disputeFilter, setDisputeFilter] = useState("");

  const [selectedDispute, setSelectedDispute] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const [recoveries, setRecoveries] = useState([]);
  const [recoverySummary, setRecoverySummary] = useState(null);
  const [recoveryPagination, setRecoveryPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecoveries: 0,
    limit: 20,
  });
  const [recoveryFilter, setRecoveryFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadDisputes = useCallback(
    async (page = 1, status = disputeFilter) => {
      setListLoading(true);

      try {
        const result = await getSellerDisputes({
          page,
          limit: 20,
          ...(status ? { status } : {}),
        });

        setDisputes(result.disputes || []);
        setDisputePagination(
          result.pagination || {
            currentPage: page,
            totalPages: 1,
            totalDisputes: 0,
            limit: 20,
          }
        );
      } finally {
        setListLoading(false);
      }
    },
    [disputeFilter]
  );

  const loadRecoveries = useCallback(
    async (page = 1, status = recoveryFilter) => {
      setListLoading(true);

      try {
        const result = await getSellerRecoveries({
          page,
          limit: 20,
          ...(status ? { status } : {}),
        });

        setRecoveries(result.recoveries || []);
        setRecoverySummary(result.summary || null);
        setRecoveryPagination(
          result.pagination || {
            currentPage: page,
            totalPages: 1,
            totalRecoveries: 0,
            limit: 20,
          }
        );
      } finally {
        setListLoading(false);
      }
    },
    [recoveryFilter]
  );

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([loadDisputes(1), loadRecoveries(1)]);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [loadDisputes, loadRecoveries]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const openDispute = async (disputeId) => {
    setDetailLoading(true);
    setError("");
    setSuccess("");
    setSelectedDispute(null);
    setMessage("");

    try {
      const result = await getSellerDisputeById(disputeId);
      setSelectedDispute(result.dispute || null);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    const cleanMessage = message.trim();

    if (!selectedDispute || !cleanMessage) return;

    if (cleanMessage.length > 2000) {
      setError("Your response cannot exceed 2,000 characters.");
      return;
    }

    setSendingMessage(true);
    setError("");
    setSuccess("");

    try {
      await respondToSellerDispute(selectedDispute._id, {
        message: cleanMessage,
      });

      const refreshed = await getSellerDisputeById(
        selectedDispute._id
      );

      setSelectedDispute(refreshed.dispute || null);
      setMessage("");
      setSuccess("Your response was added to the dispute conversation.");

      await loadDisputes(disputePagination.currentPage);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDisputeFilter = async (event) => {
    const status = event.target.value;
    setDisputeFilter(status);
    setError("");

    try {
      await loadDisputes(1, status);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const handleRecoveryFilter = async (event) => {
    const status = event.target.value;
    setRecoveryFilter(status);
    setError("");

    try {
      await loadRecoveries(1, status);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const handleDisputePage = async (page) => {
    if (
      page < 1 ||
      page > disputePagination.totalPages ||
      listLoading
    ) {
      return;
    }

    try {
      await loadDisputes(page, disputeFilter);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const handleRecoveryPage = async (page) => {
    if (
      page < 1 ||
      page > recoveryPagination.totalPages ||
      listLoading
    ) {
      return;
    }

    try {
      await loadRecoveries(page, recoveryFilter);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const closeDisputeDetail = () => {
    setSelectedDispute(null);
    setMessage("");
    setError("");
    setSuccess("");
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#103D3D] p-10 text-center text-[#B8D2C8]">
        Loading disputes and recovery information…
      </div>
    );
  }

  const recoveryTotals = recoverySummary || {
    totalCases: 0,
    originalAmount: 0,
    recoveredAmount: 0,
    outstandingAmount: 0,
    pendingCases: 0,
  };

  const isDisputeActive = [
    "awaiting_seller",
    "under_review",
    "awaiting_customer",
  ].includes(selectedDispute?.status);

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#83CDB5]">
            Seller support & finance
          </p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            Disputes & Recoveries
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A9C7BD]">
            Review customer disputes, respond to active cases, and track
            refund-related recovery deductions from your earnings.
          </p>
        </div>

        <button
          type="button"
          onClick={loadPage}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-[#D5E5DF] transition hover:bg-white/10"
        >
          Refresh data
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-300/30 bg-rose-300/10 px-4 py-3 text-sm text-rose-100"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100"
        >
          {success}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={() => {
            setActiveTab("disputes");
            setSelectedDispute(null);
            setError("");
            setSuccess("");
          }}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === "disputes"
              ? "bg-[#83CDB5] text-[#092F30]"
              : "bg-white/[0.06] text-[#B5C9C1] hover:bg-white/10"
          }`}
        >
          Customer disputes
          <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">
            {disputePagination.totalDisputes}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("recoveries");
            setSelectedDispute(null);
            setError("");
            setSuccess("");
          }}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            activeTab === "recoveries"
              ? "bg-[#83CDB5] text-[#092F30]"
              : "bg-white/[0.06] text-[#B5C9C1] hover:bg-white/10"
          }`}
        >
          Refund recoveries
          <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs">
            {recoveryPagination.totalRecoveries}
          </span>
        </button>
      </div>

      {activeTab === "disputes" && (
        <>
          {selectedDispute ? (
            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closeDisputeDetail}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-[#D5E5DF] hover:bg-white/10"
                >
                  ← Back to disputes
                </button>
                <StatusBadge status={selectedDispute.status} />
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#103D3D] p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-3 sm:flex-row">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#83A99C]">
                      Case number
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-white">
                      {selectedDispute.caseNumber || "Dispute"}
                    </h2>
                    <p className="mt-1 text-sm text-[#A9C7BD]">
                      Opened {formatDate(selectedDispute.createdAt)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs text-[#83A99C]">Requested resolution</p>
                    <p className="mt-1 font-semibold capitalize text-white">
                      {selectedDispute.requestedResolution || "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl bg-[#092F30] p-4">
                    <p className="text-xs text-[#83A99C]">Customer</p>
                    <p className="mt-2 font-semibold text-white">
                      {selectedDispute.customerId?.name || "Customer"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#092F30] p-4">
                    <p className="text-xs text-[#83A99C]">Order</p>
                    <p className="mt-2 font-semibold text-white">
                      {selectedDispute.orderId?._id
                        ? `#${selectedDispute.orderId._id
                            .slice(-8)
                            .toUpperCase()}`
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#092F30] p-4">
                    <p className="text-xs text-[#83A99C]">Reason</p>
                    <p className="mt-2 font-semibold text-white">
                      {reasonLabels[selectedDispute.reason] ||
                        selectedDispute.reason ||
                        "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#092F30] p-4">
                    <p className="text-xs text-[#83A99C]">Requested refund</p>
                    <p className="mt-2 font-semibold text-white">
                      {money(selectedDispute.requestedRefundAmount)}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-white">
                    Customer description
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap rounded-xl bg-[#092F30] p-4 text-sm leading-6 text-[#C4DAD2]">
                    {selectedDispute.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-white">
                    Disputed items
                  </h3>
                  <div className="mt-3 space-y-2">
                    {(selectedDispute.items || []).map((item, index) => (
                      <div
                        key={`${item.productId}-${item.variantId}-${index}`}
                        className="flex flex-col justify-between gap-2 rounded-xl bg-[#092F30] p-4 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-white">
                            {item.title || "Product"}
                          </p>
                          <p className="mt-1 text-xs text-[#83A99C]">
                            SKU: {item.sku || "—"} · Quantity: {item.quantity}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          <p className="text-sm font-semibold text-white">
                            {money(item.refundableAmount)}
                          </p>
                          <p className="text-xs text-[#83A99C]">
                            Requested item refund
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedDispute.resolution && (
                  <div className="mt-5 rounded-xl border border-[#83CDB5]/20 bg-[#092F30] p-4">
                    <h3 className="font-semibold text-white">Admin resolution</h3>
                    <p className="mt-2 text-sm text-[#C4DAD2]">
                      Decision:{" "}
                      <span className="font-semibold capitalize">
                        {selectedDispute.resolution.decision}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-[#C4DAD2]">
                      Approved refund:{" "}
                      {money(selectedDispute.resolution.approvedRefundAmount)}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#A9C7BD]">
                      {selectedDispute.resolution.note}
                    </p>
                    <p className="mt-2 text-xs text-[#83A99C]">
                      Resolved: {formatDate(selectedDispute.resolution.resolvedAt)}
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#103D3D] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">Case conversation</h3>
                    <p className="mt-1 text-sm text-[#A9C7BD]">
                      Messages between the customer, seller, and platform team.
                    </p>
                  </div>
                  <span className="text-xs text-[#83A99C]">
                    {(selectedDispute.messages || []).length} / 200 messages
                  </span>
                </div>

                <div className="mt-5 max-h-[480px] space-y-3 overflow-y-auto pr-1">
                  {(selectedDispute.messages || []).length === 0 ? (
                    <p className="rounded-xl bg-[#092F30] p-4 text-sm text-[#A9C7BD]">
                      No messages in this case yet.
                    </p>
                  ) : (
                    selectedDispute.messages.map((item) => (
                      <div
                        key={item._id}
                        className={`rounded-xl p-4 ${
                          item.senderRole === "seller"
                            ? "border border-[#83CDB5]/20 bg-[#174A42]"
                            : "bg-[#092F30]"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold capitalize text-white">
                            {item.senderRole === "seller"
                              ? "You (Seller)"
                              : item.senderRole === "admin"
                                ? "LUTech Admin"
                                : item.senderId?.name || "Customer"}
                          </p>
                          <p className="text-xs text-[#83A99C]">
                            {formatDate(item.createdAt)}
                          </p>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#C4DAD2]">
                          {item.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {isDisputeActive ? (
                  <form onSubmit={handleSendMessage} className="mt-5">
                    <label className="mb-2 block text-sm font-semibold text-white">
                      Your response
                    </label>
                    <textarea
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      rows={4}
                      maxLength={2000}
                      required
                      placeholder="Write a clear, professional response to the customer or admin…"
                      className="w-full resize-y rounded-xl border border-white/15 bg-[#092F30] px-4 py-3 text-sm text-white outline-none placeholder:text-[#789A91] focus:border-[#83CDB5]"
                    />
                    <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <p className="text-xs text-[#83A99C]">
                        {message.length}/2000 characters. Messages are
                        recorded in the case history.
                      </p>
                      <button
                        type="submit"
                        disabled={sendingMessage || !message.trim()}
                        className="rounded-xl bg-[#83CDB5] px-5 py-2.5 text-sm font-bold text-[#092F30] hover:bg-[#A6E5D1] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {sendingMessage ? "Sending…" : "Send response"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="mt-5 rounded-xl border border-white/10 bg-[#092F30] p-4 text-sm text-[#A9C7BD]">
                    This dispute is no longer accepting new messages.
                  </p>
                )}
              </div>
            </section>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#103D3D]">
              <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:px-6">
                <div>
                  <h2 className="text-lg font-bold">Customer disputes</h2>
                  <p className="mt-1 text-sm text-[#A9C7BD]">
                    Cases opened against orders associated with your store.
                  </p>
                </div>
                <select
                  value={disputeFilter}
                  onChange={handleDisputeFilter}
                  className="rounded-xl border border-white/15 bg-[#092F30] px-3 py-2.5 text-sm text-white outline-none focus:border-[#83CDB5]"
                >
                  {disputeStatuses.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              {listLoading ? (
                <div className="p-8 text-center text-sm text-[#A9C7BD]">
                  Loading disputes…
                </div>
              ) : disputes.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    title="No disputes found"
                    description="Customer disputes concerning your orders will appear here."
                  />
                </div>
              ) : (
                <>
                  <div className="divide-y divide-white/10">
                    {disputes.map((item) => (
                      <div
                        key={item._id}
                        className="flex flex-col justify-between gap-4 p-5 transition hover:bg-white/[0.025] sm:flex-row sm:items-center sm:px-6"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-white">
                              {item.caseNumber || "Dispute"}
                            </p>
                            <StatusBadge status={item.status} />
                          </div>
                          <p className="mt-2 text-sm text-[#C4DAD2]">
                            {reasonLabels[item.reason] || item.reason}
                          </p>
                          <p className="mt-1 text-xs text-[#83A99C]">
                            Customer: {item.customerId?.name || "Customer"} ·
                            Order:{" "}
                            {item.orderId?._id
                              ? `#${item.orderId._id.slice(-8).toUpperCase()}`
                              : "—"}
                          </p>
                          <p className="mt-1 text-xs text-[#83A99C]">
                            Opened: {formatDate(item.createdAt)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                          <div className="sm:text-right">
                            <p className="text-xs text-[#83A99C]">
                              Requested refund
                            </p>
                            <p className="mt-1 font-semibold text-white">
                              {money(item.requestedRefundAmount)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openDispute(item._id)}
                            className="rounded-xl bg-[#83CDB5] px-4 py-2.5 text-xs font-bold text-[#092F30] hover:bg-[#A6E5D1]"
                          >
                            View case
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col justify-between gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                    <p className="text-xs text-[#A9C7BD]">
                      {disputePagination.totalDisputes} disputes · Page{" "}
                      {disputePagination.currentPage} of{" "}
                      {disputePagination.totalPages || 1}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={
                          disputePagination.currentPage <= 1 || listLoading
                        }
                        onClick={() =>
                          handleDisputePage(
                            disputePagination.currentPage - 1
                          )
                        }
                        className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={
                          disputePagination.currentPage >=
                            disputePagination.totalPages || listLoading
                        }
                        onClick={() =>
                          handleDisputePage(
                            disputePagination.currentPage + 1
                          )
                        }
                        className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}

      {activeTab === "recoveries" && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total recovery cases"
              value={recoveryTotals.totalCases}
              detail="All refund recovery records"
              currency={false}
              accent="mint"
            />
            <MetricCard
              label="Original recovery amount"
              value={recoveryTotals.originalAmount}
              detail="Total amount assigned for recovery"
              accent="violet"
            />
            <MetricCard
              label="Recovered so far"
              value={recoveryTotals.recoveredAmount}
              detail="Already deducted from payouts"
              accent="blue"
            />
            <MetricCard
              label="Outstanding balance"
              value={recoveryTotals.outstandingAmount}
              detail={`${recoveryTotals.pendingCases || 0} pending or partial cases`}
              accent="amber"
            />
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#103D3D]">
            <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:px-6">
              <div>
                <h2 className="text-lg font-bold">Recovery history</h2>
                <p className="mt-1 text-sm text-[#A9C7BD]">
                  Refund-related amounts recovered or scheduled to be
                  deducted from your future payouts.
                </p>
              </div>
              <select
                value={recoveryFilter}
                onChange={handleRecoveryFilter}
                className="rounded-xl border border-white/15 bg-[#092F30] px-3 py-2.5 text-sm text-white outline-none focus:border-[#83CDB5]"
              >
                {recoveryStatuses.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {listLoading ? (
              <div className="p-8 text-center text-sm text-[#A9C7BD]">
                Loading recovery records…
              </div>
            ) : recoveries.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No recovery records found"
                  description="If a refund requires recovery from your earnings, the record and outstanding balance will appear here."
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-[#092F30]/70 text-xs uppercase tracking-wider text-[#83A99C]">
                      <tr>
                        <th className="px-5 py-4 font-semibold">Order</th>
                        <th className="px-5 py-4 font-semibold">Refund</th>
                        <th className="px-5 py-4 font-semibold">Created</th>
                        <th className="px-5 py-4 text-right font-semibold">
                          Original
                        </th>
                        <th className="px-5 py-4 text-right font-semibold">
                          Recovered
                        </th>
                        <th className="px-5 py-4 text-right font-semibold">
                          Remaining
                        </th>
                        <th className="px-5 py-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {recoveries.map((item) => (
                        <tr key={item._id} className="hover:bg-white/[0.03]">
                          <td className="px-5 py-4 font-semibold text-white">
                            {item.orderId?._id
                              ? `#${item.orderId._id.slice(-8).toUpperCase()}`
                              : "—"}
                          </td>
                          <td className="px-5 py-4 text-[#C4DAD2]">
                            {item.refundId?._id
                              ? `#${item.refundId._id.slice(-8).toUpperCase()}`
                              : "—"}
                          </td>
                          <td className="px-5 py-4 text-[#C4DAD2]">
                            {formatDate(item.createdAt)}
                          </td>
                          <td className="px-5 py-4 text-right text-[#C4DAD2]">
                            {money(item.originalAmount)}
                          </td>
                          <td className="px-5 py-4 text-right text-emerald-200">
                            {money(item.recoveredAmount)}
                          </td>
                          <td className="px-5 py-4 text-right font-semibold text-white">
                            {money(item.remainingAmount)}
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge
                              status={item.status}
                              type="recovery"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col justify-between gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                  <p className="text-xs text-[#A9C7BD]">
                    {recoveryPagination.totalRecoveries} records · Page{" "}
                    {recoveryPagination.currentPage} of{" "}
                    {recoveryPagination.totalPages || 1}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={
                        recoveryPagination.currentPage <= 1 || listLoading
                      }
                      onClick={() =>
                        handleRecoveryPage(
                          recoveryPagination.currentPage - 1
                        )
                      }
                      className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={
                        recoveryPagination.currentPage >=
                          recoveryPagination.totalPages || listLoading
                      }
                      onClick={() =>
                        handleRecoveryPage(
                          recoveryPagination.currentPage + 1
                        )
                      }
                      className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </>
      )}

      <p className="text-xs leading-5 text-[#83A99C]">
        Sellers can review and respond to active disputes. Refund decisions,
        refund transfers, and recovery calculations are managed by the
        platform administrator. Recovery amounts shown here are read-only.
      </p>

      {detailLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5">
          <div className="rounded-2xl border border-white/10 bg-[#103D3D] px-6 py-5 text-sm text-[#D5E5DF] shadow-2xl">
            Loading dispute details…
          </div>
        </div>
      )}
    </div>
  );
}

export default SellerDisputes;