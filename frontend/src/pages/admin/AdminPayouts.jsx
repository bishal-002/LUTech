import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import {
  getAdminPayoutSummary,
  getAdminPayouts,
  getAdminPayoutDetails,
  processAdminPayout,
} from "../../services/adminService";

const STATUSES = [
  { value: "", label: "All payouts" },
  { value: "on_hold", label: "On hold" },
  { value: "available", label: "Available" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

const money = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const dateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const statusStyle = (status) => {
  const styles = {
    on_hold: "bg-amber-100 text-amber-800",
    available: "bg-blue-100 text-blue-800",
    paid: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return styles[status] || "bg-slate-100 text-slate-700";
};

const statusLabel = (status) =>
  String(status || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function SummaryCard({ title, value, description }) {
  return (
    <div className="rounded-2xl border border-[#83CDB5]/15 bg-[#103633] p-5 shadow-lg">
      <p className="text-sm font-medium text-[#A9C7BD]">{title}</p>
      <p className="mt-3 break-words text-2xl font-bold text-white sm:text-3xl">
        {value}
      </p>
      <p className="mt-2 text-xs text-[#83CDB5]/70">{description}</p>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-3 sm:flex-row sm:justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="break-all text-sm font-semibold text-slate-800 sm:max-w-[65%] sm:text-right">
        {value || "—"}
      </span>
    </div>
  );
}

function PayoutDetailsModal({
  payout,
  destination,
  onClose,
  canProcess,
  onProcess,
}) {
  if (!payout) return null;

  const seller = payout.sellerId || {};
  const order = payout.orderId || {};
  const processor = payout.processedBy || {};

  const isAvailable =
    payout.status === "available" && !payout.disputeHold;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-5">
      <div className="my-auto w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 bg-[#103633] p-5 text-white sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#83CDB5]">
              Payout details
            </p>
            <h2 className="mt-1 break-all text-xl font-bold">
              {String(payout._id || "").slice(-12).toUpperCase()}
            </h2>
            <span
              className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStyle(
                payout.status
              )}`}
            >
              {statusLabel(payout.status)}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close payout details"
            className="rounded-lg px-3 py-1 text-2xl text-white/70 hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="max-h-[75vh] space-y-6 overflow-y-auto p-5 sm:p-6">
          <section>
            <h3 className="mb-2 font-bold text-slate-900">
              Payout information
            </h3>

            <DetailRow label="Payout ID" value={payout._id} />
            <DetailRow label="Order ID" value={order._id || payout.orderId} />
            <DetailRow label="Currency" value={payout.currency || "BDT"} />
            <DetailRow label="Gross amount" value={money(payout.grossAmount)} />
            <DetailRow
              label={`Commission (${payout.commissionRate ?? 0}%)`}
              value={money(payout.commissionAmount)}
            />
            <DetailRow
              label="Seller earnings"
              value={money(payout.sellerEarningsAmount)}
            />
            <DetailRow
              label="Recovery deduction"
              value={money(payout.recoveryDeduction)}
            />
            <DetailRow
              label="Refund deduction"
              value={money(payout.refundDeduction)}
            />
            <DetailRow
              label="Net payout"
              value={money(payout.netAmount)}
            />
            <DetailRow label="Hold days" value={payout.holdDays} />
            <DetailRow label="Eligible date" value={dateTime(payout.eligibleAt)} />
            <DetailRow label="Created" value={dateTime(payout.createdAt)} />
          </section>

          <section>
            <h3 className="mb-2 font-bold text-slate-900">
              Seller information
            </h3>

            <DetailRow label="Seller name" value={seller.name} />
            <DetailRow label="Store" value={seller.storeName} />
            <DetailRow label="Email" value={seller.email} />
          </section>

          <section>
            <h3 className="mb-2 font-bold text-slate-900">
              Payout destination
            </h3>

            {destination?.method === "bank_transfer" ? (
              <>
                <DetailRow label="Method" value="Bank transfer" />
                <DetailRow label="Bank" value={destination.bankName} />
                <DetailRow
                  label="Account holder"
                  value={destination.accountHolderName}
                />
                <DetailRow label="Account number" value={destination.accountNumber} />
                <DetailRow label="Branch" value={destination.branchName} />
                <DetailRow
                  label="Routing number"
                  value={destination.routingNumber}
                />
              </>
            ) : destination?.method === "mfs" ? (
              <>
                <DetailRow label="Method" value="Mobile financial service" />
                <DetailRow label="Provider" value={destination.mfsProvider} />
                <DetailRow
                  label="Account type"
                  value={destination.mfsAccountType}
                />
                <DetailRow label="MFS number" value={destination.mfsNumber} />
              </>
            ) : (
              <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                No valid payout destination is configured for this seller.
              </p>
            )}
          </section>

          {payout.status === "paid" && (
            <section>
              <h3 className="mb-2 font-bold text-slate-900">
                Processing record
              </h3>

              <DetailRow
                label="Payment method"
                value={statusLabel(payout.paymentMethod)}
              />
              <DetailRow
                label="Destination last four"
                value={payout.destinationLast4}
              />
              <DetailRow
                label="Transaction reference"
                value={payout.transactionReference}
              />
              <DetailRow label="Paid at" value={dateTime(payout.paidAt)} />
              <DetailRow label="Processed by" value={processor.name} />
              <DetailRow label="Processing note" value={payout.processingNote} />
            </section>
          )}

          {payout.disputeHold && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              This payout has an active dispute hold. It cannot be released
              while the hold remains active.
            </div>
          )}

          {isAvailable && canProcess && (
            <div className="rounded-xl border border-[#83CDB5] bg-[#EAF8F2] p-4">
              <h3 className="font-bold text-[#103633]">
                Process this payout
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                First complete the bank or MFS transfer outside LUTech. Then
                record its transaction reference below.
              </p>

              <button
                type="button"
                onClick={() => onProcess(payout)}
                className="mt-4 w-full rounded-xl bg-[#103633] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#185047] sm:w-auto"
              >
                Record completed transfer
              </button>
            </div>
          )}

          {isAvailable && !canProcess && (
            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
              Your admin account does not have permission to process payouts.
            </p>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ProcessPayoutModal({ payout, onClose, onSubmit, loading }) {
  const [transactionReference, setTransactionReference] = useState("");
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  if (!payout) return null;

  const submit = (event) => {
    event.preventDefault();

    if (!confirmed) return;

    onSubmit({
      transactionReference: transactionReference.trim(),
      note: note.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-5">
      <form
        onSubmit={submit}
        className="my-auto w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Record payout transfer
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {money(payout.netAmount)}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 text-2xl text-slate-400 hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          This action marks the payout as paid in LUTech. It does not send
          money. Only continue after the bank/MFS transfer has actually
          succeeded.
        </div>

        <label className="mt-5 block text-sm font-semibold text-slate-700">
          Bank/MFS transaction reference
          <input
            required
            minLength={3}
            maxLength={120}
            value={transactionReference}
            onChange={(event) => setTransactionReference(event.target.value)}
            placeholder="Enter the actual transaction reference"
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Internal processing note
          <textarea
            required
            minLength={3}
            maxLength={500}
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Record who processed it and any relevant details"
            className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-1 h-4 w-4 accent-emerald-700"
          />
          <span>
            I confirm that the external bank/MFS transfer has already
            succeeded and the transaction reference is genuine.
          </span>
        </label>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              loading ||
              !confirmed ||
              transactionReference.trim().length < 3 ||
              note.trim().length < 3
            }
            className="rounded-xl bg-[#103633] px-5 py-3 text-sm font-bold text-white hover:bg-[#185047] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Recording..." : "Confirm completed transfer"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AdminPayoutsContent() {
  const { hasPermission } = useAuth();
  const canProcess = hasPermission("process_payouts");

  const [summary, setSummary] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalPayouts: 0,
  });

  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [selectedPayout, setSelectedPayout] = useState(null);
  const [destination, setDestination] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [processingPayout, setProcessingPayout] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [summaryResponse, listResponse] = await Promise.all([
        getAdminPayoutSummary(),
        getAdminPayouts({
          page,
          limit: 20,
          ...(status ? { status } : {}),
        }),
      ]);

      setSummary(summaryResponse.summary || {});
      setPayouts(listResponse.payouts || []);
      setPagination(
        listResponse.pagination || {
          currentPage: page,
          totalPages: 1,
          totalPayouts: 0,
        }
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to load payout information."
      );
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openDetails = async (payoutId) => {
    setDetailsLoading(true);
    setError("");

    try {
      const response = await getAdminPayoutDetails(payoutId);
      setSelectedPayout(response.payout);
      setDestination(response.payoutDestination || null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load payout details."
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const submitPayout = async (data) => {
    if (!processingPayout) return;

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const response = await processAdminPayout(
        processingPayout._id,
        data
      );

      setNotice(response.message || "Payout record updated.");
      setProcessingPayout(null);
      setSelectedPayout(null);
      setDestination(null);

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to process this payout."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = (value) => {
    setStatus(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-[#83CDB5]">
            FINANCE / PAYOUTS
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Payout Management
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A9C7BD]">
            Review seller earnings, payout holds, transfer destinations,
            and completed payout records.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="rounded-xl border border-[#83CDB5]/30 px-4 py-2.5 text-sm font-semibold text-[#C5E8DC] hover:bg-white/5 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh data"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-xl border border-emerald-300/30 bg-emerald-950/40 p-4 text-sm text-emerald-200">
          {notice}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total payouts"
          value={summary ? Number(summary.totalPayouts || 0).toLocaleString() : "—"}
          description="All payout records"
        />
        <SummaryCard
          title="Total seller earnings"
          value={summary ? money(summary.totalEarnings) : "—"}
          description="Net payout amount across records"
        />
        <SummaryCard
          title="On-hold amount"
          value={summary ? money(summary.onHoldAmount) : "—"}
          description="Payouts still within their hold period"
        />
        <SummaryCard
          title="Available to process"
          value={summary ? money(summary.availableAmount) : "—"}
          description="Eligible payout amount"
        />
      </div>

      <div className="rounded-2xl border border-[#83CDB5]/15 bg-[#103633] p-4 shadow-lg sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-white">Payout records</h2>
            <p className="mt-1 text-xs text-[#A9C7BD]">
              {Number(pagination.totalPayouts || 0).toLocaleString()} records
            </p>
          </div>

          <select
            value={status}
            onChange={(event) => changeStatus(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#092F30] px-4 py-3 text-sm text-white outline-none focus:border-[#83CDB5] sm:w-56"
          >
            {STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-[#83CDB5]">
                <th className="px-3 py-3">Seller</th>
                <th className="px-3 py-3">Order</th>
                <th className="px-3 py-3">Net amount</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Eligible at</th>
                <th className="px-3 py-3">Created</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-3 py-12 text-center text-sm text-[#A9C7BD]">
                    Loading payout records...
                  </td>
                </tr>
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-3 py-12 text-center text-sm text-[#A9C7BD]">
                    No payout records found for this filter.
                  </td>
                </tr>
              ) : (
                payouts.map((payout) => (
                  <tr key={payout._id} className="text-sm text-white/90 hover:bg-white/[0.03]">
                    <td className="px-3 py-4">
                      <p className="font-semibold">
                        {payout.sellerId?.storeName ||
                          payout.sellerId?.name ||
                          "Unknown seller"}
                      </p>
                      <p className="mt-1 text-xs text-[#A9C7BD]">
                        {payout.sellerId?.email || "—"}
                      </p>
                    </td>

                    <td className="px-3 py-4">
                      <span className="font-mono text-xs">
                        {String(
                          payout.orderId?._id || payout.orderId || "—"
                        ).slice(-10)}
                      </span>
                    </td>

                    <td className="px-3 py-4 font-bold">
                      {money(payout.netAmount)}
                    </td>

                    <td className="px-3 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${statusStyle(
                          payout.status
                        )}`}
                      >
                        {statusLabel(payout.status)}
                      </span>
                      {payout.disputeHold && (
                        <p className="mt-1 text-xs text-red-300">
                          Dispute hold
                        </p>
                      )}
                    </td>

                    <td className="px-3 py-4 text-xs text-[#A9C7BD]">
                      {dateTime(payout.eligibleAt)}
                    </td>

                    <td className="px-3 py-4 text-xs text-[#A9C7BD]">
                      {dateTime(payout.createdAt)}
                    </td>

                    <td className="px-3 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openDetails(payout._id)}
                        className="rounded-lg border border-[#83CDB5]/30 px-3 py-2 text-xs font-bold text-[#BCE7D8] hover:bg-[#83CDB5]/10"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#A9C7BD]">
            Page {pagination.currentPage || page} of {Math.max(1, pagination.totalPages || 1)}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={page >= (pagination.totalPages || 1) || loading}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {detailsLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-xl bg-white px-6 py-4 text-sm font-semibold text-slate-800 shadow-xl">
            Loading payout details...
          </div>
        </div>
      )}

      {selectedPayout && (
        <PayoutDetailsModal
          payout={selectedPayout}
          destination={destination}
          canProcess={canProcess}
          onClose={() => {
            setSelectedPayout(null);
            setDestination(null);
          }}
          onProcess={(payout) => setProcessingPayout(payout)}
        />
      )}

      {processingPayout && (
        <ProcessPayoutModal
          payout={processingPayout}
          loading={submitting}
          onClose={() => {
            if (!submitting) setProcessingPayout(null);
          }}
          onSubmit={submitPayout}
        />
      )}
    </div>
  );
}

export default function AdminPayouts() {
  return (
    <AdminLayout>
      <AdminPayoutsContent />
    </AdminLayout>
  );
}