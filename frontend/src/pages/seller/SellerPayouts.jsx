import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getSellerPayoutSummary,
  getSellerPayoutHistory,
  getSellerPayoutDetails,
  updateSellerPayoutDetails,
} from "../../services/sellerService";

const initialForm = {
  method: "bank_transfer",
  bankName: "",
  branchName: "",
  routingNumber: "",
  accountHolderName: "",
  accountNumber: "",
  mfsProvider: "bKash",
  mfsAccountType: "Merchant",
  mfsNumber: "",
};

const money = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const dateTime = (value) => {
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

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

function SummaryCard({ label, value, detail, accent = "mint" }) {
  const accents = {
    mint: "border-[#83CDB5]/30",
    amber: "border-amber-300/30",
    blue: "border-sky-300/30",
    violet: "border-violet-300/30",
  };

  return (
    <div className={`rounded-2xl border ${accents[accent]} bg-[#103D3D] p-5`}>
      <p className="text-sm text-[#A9C7BD]">{label}</p>
      <p className="mt-3 break-words text-2xl font-bold text-white sm:text-3xl">
        {money(value)}
      </p>
      <p className="mt-2 text-xs text-[#83A99C]">{detail}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    on_hold: "bg-amber-300/15 text-amber-200",
    available: "bg-emerald-300/15 text-emerald-200",
    paid: "bg-sky-300/15 text-sky-200",
    cancelled: "bg-rose-300/15 text-rose-200",
  };

  const labels = {
    on_hold: "On hold",
    available: "Available",
    paid: "Paid",
    cancelled: "Cancelled",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || "bg-white/10 text-[#D5E5DF]"
      }`}
    >
      {labels[status] || status || "Unknown"}
    </span>
  );
}

function PayoutDestination({ payout }) {
  if (!payout?.configured) {
    return (
      <p className="mt-2 text-sm text-amber-200">
        No payout destination has been configured yet.
      </p>
    );
  }

  if (payout.method === "bank_transfer") {
    return (
      <div className="mt-3 space-y-1 text-sm text-[#C4DAD2]">
        <p className="font-semibold text-white">{payout.bankName}</p>
        <p>Branch: {payout.branchName}</p>
        <p>Account holder: {payout.accountHolderName}</p>
        <p>Routing number: {payout.routingNumber}</p>
        <p>Account: {payout.maskedAccountNumber}</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-1 text-sm text-[#C4DAD2]">
      <p className="font-semibold text-white">{payout.mfsProvider}</p>
      <p>Account type: {payout.mfsAccountType}</p>
      <p>Wallet: {payout.maskedMfsNumber}</p>
    </div>
  );
}

function SellerPayouts() {
  const [summary, setSummary] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPayouts: 0,
    limit: 20,
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [payout, setPayout] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const loadSummaryAndDetails = useCallback(async () => {
    const [summaryResult, detailsResult] = await Promise.all([
      getSellerPayoutSummary(),
      getSellerPayoutDetails(),
    ]);

    setSummary(summaryResult.summary || null);
    const savedPayout = detailsResult.payout || null;
    setPayout(savedPayout);

    if (savedPayout?.method) {
      setForm((current) => ({
        ...current,
        method: savedPayout.method,
        bankName: savedPayout.bankName || "",
        branchName: savedPayout.branchName || "",
        routingNumber: savedPayout.routingNumber || "",
        accountHolderName: savedPayout.accountHolderName || "",
        accountNumber: "",
        mfsProvider: savedPayout.mfsProvider || "bKash",
        mfsAccountType: savedPayout.mfsAccountType || "Merchant",
        mfsNumber: "",
      }));
    }
  }, []);

  const loadHistory = useCallback(async (page = 1, status = statusFilter) => {
    setHistoryLoading(true);

    try {
      const result = await getSellerPayoutHistory({
        page,
        limit: 20,
        ...(status ? { status } : {}),
      });

      setPayouts(result.payouts || []);
      setPagination(
        result.pagination || {
          currentPage: page,
          totalPages: 1,
          totalPayouts: 0,
          limit: 20,
        }
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [statusFilter]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([
        loadSummaryAndDetails(),
        loadHistory(1, statusFilter),
      ]);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [loadHistory, loadSummaryAndDetails, statusFilter]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const totals = useMemo(
    () => ({
      totalEarnings: summary?.totalEarnings || 0,
      onHoldAmount: summary?.onHoldAmount || 0,
      availableAmount: summary?.availableAmount || 0,
      paidAmount: summary?.paidAmount || 0,
    }),
    [summary]
  );

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFilterChange = async (event) => {
    const nextStatus = event.target.value;
    setStatusFilter(nextStatus);
    setError("");

    try {
      await loadHistory(1, nextStatus);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const handlePageChange = async (nextPage) => {
    if (
      nextPage < 1 ||
      nextPage > pagination.totalPages ||
      historyLoading
    ) {
      return;
    }

    try {
      await loadHistory(nextPage, statusFilter);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const handleSavePayout = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload =
      form.method === "bank_transfer"
        ? {
            method: "bank_transfer",
            bankName: form.bankName.trim(),
            branchName: form.branchName.trim(),
            routingNumber: form.routingNumber.trim(),
            accountHolderName: form.accountHolderName.trim(),
            accountNumber: form.accountNumber.replace(/\s+/g, ""),
          }
        : {
            method: "mfs",
            mfsProvider: form.mfsProvider,
            mfsAccountType: form.mfsAccountType,
            mfsNumber: form.mfsNumber.replace(/[\s-]/g, ""),
          };

    try {
      const result = await updateSellerPayoutDetails(payload);
      setPayout(result.payout || null);
      setForm((current) => ({
        ...current,
        accountNumber: "",
        mfsNumber: "",
      }));
      setFormOpen(false);
      setSuccess(result.message || "Payout destination saved securely.");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#103D3D] p-10 text-center text-[#B8D2C8]">
        Loading payout information…
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#83CDB5]">
            Seller finance
          </p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            Payouts & Earnings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A9C7BD]">
            Track your earnings, review payout status, and manage where your
            eligible payouts should be sent.
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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Total recorded earnings"
          value={totals.totalEarnings}
          detail={`${summary?.totalPayouts || 0} payout records`}
          accent="mint"
        />
        <SummaryCard
          label="Currently on hold"
          value={totals.onHoldAmount}
          detail="Waiting for the eligibility date"
          accent="amber"
        />
        <SummaryCard
          label="Available for payout"
          value={totals.availableAmount}
          detail="Eligible, not yet marked as paid"
          accent="blue"
        />
        <SummaryCard
          label="Already paid"
          value={totals.paidAmount}
          detail="Payouts marked as completed"
          accent="violet"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-white/10 bg-[#103D3D] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Payout destination</h2>
              <p className="mt-1 text-sm text-[#A9C7BD]">
                Your saved bank or mobile financial service details.
              </p>
            </div>
            <span className="rounded-full bg-[#83CDB5]/15 px-3 py-1 text-xs font-semibold text-[#A9E8D2]">
              {payout?.configured ? "Configured" : "Not configured"}
            </span>
          </div>

          <PayoutDestination payout={payout} />

          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setFormOpen((open) => !open);
            }}
            className="mt-5 rounded-xl bg-[#83CDB5] px-4 py-2.5 text-sm font-bold text-[#092F30] transition hover:bg-[#A6E5D1]"
          >
            {formOpen
              ? "Close form"
              : payout?.configured
                ? "Change payout destination"
                : "Add payout destination"}
          </button>

          <p className="mt-3 text-xs leading-5 text-[#83A99C]">
            Sensitive account and wallet numbers are encrypted by the backend.
            Only the last four digits are returned for display.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#103D3D] p-5 sm:p-6">
          <h2 className="text-lg font-bold">How payout status works</h2>
          <div className="mt-4 space-y-4">
            <div className="flex gap-3">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-300" />
              <div>
                <p className="text-sm font-semibold text-white">On hold</p>
                <p className="mt-1 text-sm leading-5 text-[#A9C7BD]">
                  Earnings are waiting for the configured payout holding
                  period or another release condition.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-300" />
              <div>
                <p className="text-sm font-semibold text-white">Available</p>
                <p className="mt-1 text-sm leading-5 text-[#A9C7BD]">
                  The holding period has matured and the payout is eligible
                  for administrator processing.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-300" />
              <div>
                <p className="text-sm font-semibold text-white">Paid</p>
                <p className="mt-1 text-sm leading-5 text-[#A9C7BD]">
                  The payout has been marked as paid by the platform.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {formOpen && (
        <section className="rounded-2xl border border-[#83CDB5]/25 bg-[#103D3D] p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold">Payout destination details</h2>
            <p className="mt-1 text-sm text-[#A9C7BD]">
              Enter the complete details for the destination you want to save.
              Saving a new destination replaces the previous one.
            </p>
          </div>

          <form onSubmit={handleSavePayout} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#D5E5DF]">
                Payout method
              </label>
              <select
                name="method"
                value={form.method}
                onChange={updateField}
                className="w-full rounded-xl border border-white/15 bg-[#092F30] px-4 py-3 text-sm text-white outline-none focus:border-[#83CDB5]"
              >
                <option value="bank_transfer">Bank transfer</option>
                <option value="mfs">Mobile financial service</option>
              </select>
            </div>

            {form.method === "bank_transfer" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-[#D5E5DF]">
                    Bank name
                  </label>
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    name="bankName"
                    value={form.bankName}
                    onChange={updateField}
                    placeholder="e.g. Dutch-Bangla Bank"
                    className="w-full rounded-xl border border-white/15 bg-[#092F30] px-4 py-3 text-sm outline-none focus:border-[#83CDB5]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-[#D5E5DF]">
                    Branch name
                  </label>
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    name="branchName"
                    value={form.branchName}
                    onChange={updateField}
                    placeholder="Branch name"
                    className="w-full rounded-xl border border-white/15 bg-[#092F30] px-4 py-3 text-sm outline-none focus:border-[#83CDB5]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-[#D5E5DF]">
                    9-digit routing number
                  </label>
                  <input
                    required
                    pattern="[0-9]{9}"
                    maxLength={9}
                    inputMode="numeric"
                    name="routingNumber"
                    value={form.routingNumber}
                    onChange={updateField}
                    placeholder="123456789"
                    className="w-full rounded-xl border border-white/15 bg-[#092F30] px-4 py-3 text-sm outline-none focus:border-[#83CDB5]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-[#D5E5DF]">
                    Account holder name
                  </label>
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    name="accountHolderName"
                    value={form.accountHolderName}
                    onChange={updateField}
                    placeholder="Name on bank account"
                    className="w-full rounded-xl border border-white/15 bg-[#092F30] px-4 py-3 text-sm outline-none focus:border-[#83CDB5]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm text-[#D5E5DF]">
                    Bank account number
                  </label>
                  <input
                    required
                    minLength={6}
                    maxLength={34}
                    pattern="[A-Za-z0-9-]{6,34}"
                    name="accountNumber"
                    value={form.accountNumber}
                    onChange={updateField}
                    autoComplete="off"
                    placeholder="Enter complete account number"
                    className="w-full rounded-xl border border-white/15 bg-[#092F30] px-4 py-3 text-sm outline-none focus:border-[#83CDB5]"
                  />
                  <p className="mt-1 text-xs text-[#83A99C]">
                    Use only letters, numbers, or hyphens. Spaces are removed
                    before submission.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-[#D5E5DF]">
                    Provider
                  </label>
                  <select
                    name="mfsProvider"
                    value={form.mfsProvider}
                    onChange={updateField}
                    className="w-full rounded-xl border border-white/15 bg-[#092F30] px-4 py-3 text-sm text-white outline-none focus:border-[#83CDB5]"
                  >
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-[#D5E5DF]">
                    Account type
                  </label>
                  <select
                    name="mfsAccountType"
                    value={form.mfsAccountType}
                    onChange={updateField}
                    className="w-full rounded-xl border border-white/15 bg-[#092F30] px-4 py-3 text-sm text-white outline-none focus:border-[#83CDB5]"
                  >
                    <option value="Merchant">Merchant</option>
                    <option value="Personal">Personal</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm text-[#D5E5DF]">
                    Mobile wallet number
                  </label>
                  <input
                    required
                    pattern="(\+?8801|01)[3-9][0-9]{8}"
                    name="mfsNumber"
                    value={form.mfsNumber}
                    onChange={updateField}
                    inputMode="tel"
                    autoComplete="off"
                    placeholder="01XXXXXXXXX"
                    className="w-full rounded-xl border border-white/15 bg-[#092F30] px-4 py-3 text-sm outline-none focus:border-[#83CDB5]"
                  />
                  <p className="mt-1 text-xs text-[#83A99C]">
                    Enter a valid Bangladesh mobile wallet number.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#83CDB5] px-5 py-3 text-sm font-bold text-[#092F30] transition hover:bg-[#A6E5D1] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving securely…" : "Save payout destination"}
              </button>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-[#D5E5DF] hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#103D3D]">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="text-lg font-bold">Payout history</h2>
            <p className="mt-1 text-sm text-[#A9C7BD]">
              Review the earnings generated from your orders.
            </p>
          </div>

          <select
            value={statusFilter}
            onChange={handleFilterChange}
            className="rounded-xl border border-white/15 bg-[#092F30] px-3 py-2.5 text-sm text-white outline-none focus:border-[#83CDB5]"
          >
            <option value="">All statuses</option>
            <option value="on_hold">On hold</option>
            <option value="available">Available</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {historyLoading ? (
          <div className="p-8 text-center text-sm text-[#A9C7BD]">
            Loading payout history…
          </div>
        ) : payouts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-semibold text-white">No payout records found</p>
            <p className="mt-2 text-sm text-[#A9C7BD]">
              Payout records will appear here when they are generated from
              eligible orders.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#092F30]/70 text-xs uppercase tracking-wider text-[#83A99C]">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Order</th>
                    <th className="px-5 py-4 font-semibold">Created</th>
                    <th className="px-5 py-4 font-semibold">Eligible date</th>
                    <th className="px-5 py-4 text-right font-semibold">Gross</th>
                    <th className="px-5 py-4 text-right font-semibold">Commission</th>
                    <th className="px-5 py-4 text-right font-semibold">Net earnings</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {payouts.map((item) => (
                    <tr key={item._id} className="hover:bg-white/[0.03]">
                      <td className="px-5 py-4 font-semibold text-white">
                        {item.orderId?._id
                          ? `#${item.orderId._id.slice(-8).toUpperCase()}`
                          : "—"}
                      </td>
                      <td className="px-5 py-4 text-[#C4DAD2]">
                        {dateTime(item.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-[#C4DAD2]">
                        {dateTime(item.eligibleAt)}
                      </td>
                      <td className="px-5 py-4 text-right text-[#C4DAD2]">
                        {money(item.grossAmount)}
                      </td>
                      <td className="px-5 py-4 text-right text-[#C4DAD2]">
                        {money(item.commissionAmount)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-white">
                        {money(item.netAmount)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={item.status} />
                        {item.disputeHold && (
                          <p className="mt-1 text-xs text-amber-200">
                            Dispute hold
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
              <p className="text-xs text-[#A9C7BD]">
                {pagination.totalPayouts} records · Page{" "}
                {pagination.currentPage} of {pagination.totalPages || 1}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.currentPage <= 1 || historyLoading}
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={
                    pagination.currentPage >= pagination.totalPages ||
                    historyLoading
                  }
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <p className="text-xs leading-5 text-[#83A99C]">
        Payout eligibility and release are controlled by the platform. This
        page does not initiate a bank transfer or mark a payout as paid.
      </p>
    </div>
  );
}

export default SellerPayouts;