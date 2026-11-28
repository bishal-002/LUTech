
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import {
  getAdminDisputes,
  getAdminDisputeDetails,
  sendAdminDisputeMessage,
  updateAdminDisputeStatus,
  resolveAdminDispute,
  getAdminRefunds,
  getAdminRefundDetails,
  completeAdminRefund,
  failAdminRefund,
} from "../../services/adminService";

const DISPUTE_STATUSES = [
  "awaiting_seller",
  "under_review",
  "awaiting_customer",
  "resolved",
  "rejected",
  "closed",
];

const REFUND_STATUSES = ["approved", "completed", "failed"];

const STATUS_LABELS = {
  awaiting_seller: "Awaiting seller",
  under_review: "Under review",
  awaiting_customer: "Awaiting customer",
  resolved: "Resolved",
  rejected: "Rejected",
  closed: "Closed",
  approved: "Approved",
  completed: "Completed",
  failed: "Failed",
};

const REASON_LABELS = {
  item_not_received: "Item not received",
  damaged_item: "Damaged item",
  wrong_item: "Wrong item",
  missing_items: "Missing items",
  not_as_described: "Not as described",
  defective_item: "Defective item",
  suspected_counterfeit: "Suspected counterfeit",
  other: "Other",
};

const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const LABEL = "mb-1.5 block text-xs font-bold text-slate-600";

const money = (value) =>
  `৳${Number(value || 0).toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const date = (value) =>
  value ? new Date(value).toLocaleString() : "—";

const getError = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

function StatusBadge({ status }) {
  const styles = {
    awaiting_seller: "bg-amber-100 text-amber-800",
    under_review: "bg-blue-100 text-blue-800",
    awaiting_customer: "bg-violet-100 text-violet-800",
    resolved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
    closed: "bg-slate-100 text-slate-700",
    approved: "bg-blue-100 text-blue-800",
    completed: "bg-emerald-100 text-emerald-800",
    failed: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {STATUS_LABELS[status] || status || "Unknown"}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={`my-auto max-h-[94vh] w-full ${
          wide ? "max-w-4xl" : "max-w-xl"
        } overflow-y-auto rounded-2xl bg-white shadow-2xl`}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <h2 className="text-lg font-extrabold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close dialog"
          >
            ×
          </button>
        </header>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}

function DisputeDetails({
  dispute,
  refund,
  canManage,
  canResolve,
  canRefund,
  onRefresh,
  onClose,
  onError,
  onNotice,
}) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("under_review");
  const [statusNote, setStatusNote] = useState("");
  const [decision, setDecision] = useState("refund");
  const [resolutionNote, setResolutionNote] = useState("");
  const [approvedAmount, setApprovedAmount] = useState(
    String(dispute.requestedRefundAmount || "")
  );
  const [busy, setBusy] = useState(false);

  const active = [
    "awaiting_seller",
    "under_review",
    "awaiting_customer",
  ].includes(dispute.status);

  const submitMessage = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;

    setBusy(true);
    try {
      await sendAdminDisputeMessage(dispute._id, message.trim());
      setMessage("");
      await onRefresh();
      onNotice("Message sent successfully.");
    } catch (error) {
      onError(getError(error, "Unable to send message."));
    } finally {
      setBusy(false);
    }
  };

  const submitStatus = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await updateAdminDisputeStatus(
        dispute._id,
        status,
        statusNote.trim()
      );
      await onRefresh();
      onNotice("Dispute status updated.");
      setStatusNote("");
    } catch (error) {
      onError(getError(error, "Unable to update dispute status."));
    } finally {
      setBusy(false);
    }
  };

  const submitDecision = async (event) => {
    event.preventDefault();

    if (
      decision === "refund" &&
      (!canRefund || !dispute.hasRefundDestination)
    ) {
      onError(
        !canRefund
          ? "You do not have permission to approve refunds."
          : "The customer has not provided a refund destination."
      );
      return;
    }

    if (
      decision === "refund" &&
      (
        !Number.isFinite(Number(approvedAmount)) ||
        Number(approvedAmount) <= 0 ||
        Number(approvedAmount) > Number(dispute.requestedRefundAmount)
      )
    ) {
      onError("Enter a valid refund amount not exceeding the requested amount.");
      return;
    }

    if (resolutionNote.trim().length < 10) {
      onError("The resolution note must contain at least 10 characters.");
      return;
    }

    const confirmed = window.confirm(
      `Confirm final decision: ${decision.replace("_", " ")}? This cannot be undone.`
    );
    if (!confirmed) return;

    setBusy(true);
    try {
      const result = await resolveAdminDispute(
        dispute._id,
        decision,
        resolutionNote.trim(),
        decision === "refund" ? approvedAmount : undefined
      );

      onNotice(
        result.message || "Dispute decision recorded successfully."
      );
      await onRefresh();
    } catch (error) {
      onError(getError(error, "Unable to resolve dispute."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Case number
          </p>
          <h3 className="mt-1 text-xl font-extrabold text-slate-900">
            {dispute.caseNumber}
          </h3>
        </div>
        <StatusBadge status={dispute.status} />
      </div>

      <section className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Reason" value={REASON_LABELS[dispute.reason]} />
        <Detail
          label="Requested resolution"
          value={dispute.requestedResolution}
        />
        <Detail
          label="Requested refund"
          value={money(dispute.requestedRefundAmount)}
        />
        <Detail
          label="Customer"
          value={`${dispute.customerId?.name || "—"} · ${dispute.customerId?.email || ""}`}
        />
        <Detail
          label="Seller"
          value={`${dispute.sellerId?.storeName || dispute.sellerId?.name || "—"} · ${dispute.sellerId?.email || ""}`}
        />
        <Detail
          label="Order"
          value={dispute.orderId?._id || dispute.orderId || "—"}
        />
        <Detail label="Opened" value={date(dispute.createdAt)} />
        <Detail
          label="Seller responded"
          value={date(dispute.sellerRespondedAt)}
        />
      </section>

      <section>
        <h4 className="mb-2 font-extrabold text-slate-900">
          Customer description
        </h4>
        <p className="whitespace-pre-wrap rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-700">
          {dispute.description}
        </p>
      </section>

      <section>
        <h4 className="mb-3 font-extrabold text-slate-900">
          Disputed items
        </h4>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Item</th>
                <th className="px-3 py-3">Quantity</th>
                <th className="px-3 py-3">Unit price</th>
                <th className="px-3 py-3">Refundable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(dispute.items || []).map((item, index) => (
                <tr key={`${item.productId}-${index}`}>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-800">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-400">
                      {item.sku || ""}
                    </p>
                  </td>
                  <td className="px-3 py-3">{item.quantity}</td>
                  <td className="px-3 py-3">{money(item.unitPrice)}</td>
                  <td className="px-3 py-3 font-bold">
                    {money(item.refundableAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h4 className="mb-3 font-extrabold text-slate-900">
          Conversation
        </h4>
        <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
          {(dispute.messages || []).length === 0 ? (
            <p className="p-5 text-center text-sm text-slate-500">
              No messages in this case yet.
            </p>
          ) : (
            dispute.messages.map((item) => (
              <div
                key={item._id}
                className={`max-w-[90%] rounded-xl p-3 ${
                  item.senderRole === "admin"
                    ? "ml-auto bg-[#103B37] text-white"
                    : "bg-white text-slate-800 shadow-sm"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-extrabold">
                    {item.senderId?.name || item.senderRole}
                    {" · "}
                    {item.senderRole}
                  </span>
                  <span className="text-[10px] opacity-60">
                    {date(item.createdAt)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-5">
                  {item.message}
                </p>
              </div>
            ))
          )}
        </div>

        {active && canManage && (
          <form onSubmit={submitMessage} className="mt-3 space-y-2">
            <textarea
              className={INPUT}
              rows={3}
              maxLength={2000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write a message to the customer and seller..."
            />
            <div className="flex justify-end">
              <button
                disabled={busy || !message.trim()}
                className="rounded-xl bg-[#103B37] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy ? "Sending..." : "Send message"}
              </button>
            </div>
          </form>
        )}
      </section>

      {active && canManage && (
        <section className="rounded-xl border border-blue-100 p-4">
          <h4 className="font-extrabold text-slate-900">
            Update case status
          </h4>
          <form onSubmit={submitStatus} className="mt-3 space-y-3">
            <Field label="New status">
              <select
                className={INPUT}
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="under_review">Under review</option>
                <option value="awaiting_customer">Awaiting customer</option>
                <option value="awaiting_seller">Awaiting seller</option>
              </select>
            </Field>
            <Field label="Internal note (5–500 characters)">
              <textarea
                className={INPUT}
                rows={2}
                minLength={5}
                maxLength={500}
                required
                value={statusNote}
                onChange={(event) => setStatusNote(event.target.value)}
              />
            </Field>
            <button
              disabled={busy || statusNote.trim().length < 5}
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-800 disabled:opacity-50"
            >
              Update status
            </button>
          </form>
        </section>
      )}

      {active && canResolve && (
        <section className="rounded-xl border border-amber-200 p-4">
          <h4 className="font-extrabold text-slate-900">
            Final decision
          </h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            A final decision closes the active dispute. Refund approval
            creates a refund record; it does not transfer money automatically.
          </p>
          <form onSubmit={submitDecision} className="mt-3 space-y-3">
            <Field label="Decision">
              <select
                className={INPUT}
                value={decision}
                onChange={(event) => setDecision(event.target.value)}
              >
                <option value="refund" disabled={!canRefund}>
                  Refund
                </option>
                <option value="replacement">Replacement</option>
                <option value="rejected">Reject claim</option>
              </select>
            </Field>

            {decision === "refund" && (
              <>
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p>
                    Requested amount:{" "}
                    <strong>{money(dispute.requestedRefundAmount)}</strong>
                  </p>
                  <p className="mt-1">
                    Refund destination:{" "}
                    <strong>
                      {dispute.hasRefundDestination
                        ? "Provided"
                        : "Not provided"}
                    </strong>
                  </p>
                </div>
                <Field label="Approved amount (BDT)">
                  <input
                    className={INPUT}
                    type="number"
                    min="0.01"
                    max={dispute.requestedRefundAmount}
                    step="0.01"
                    required
                    value={approvedAmount}
                    onChange={(event) =>
                      setApprovedAmount(event.target.value)
                    }
                  />
                </Field>
              </>
            )}

            <Field label="Resolution note (10–500 characters)">
              <textarea
                className={INPUT}
                rows={3}
                minLength={10}
                maxLength={500}
                required
                value={resolutionNote}
                onChange={(event) =>
                  setResolutionNote(event.target.value)
                }
              />
            </Field>

            <button
              disabled={
                busy ||
                resolutionNote.trim().length < 10 ||
                (decision === "refund" &&
                  (!canRefund || !dispute.hasRefundDestination))
              }
              className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {busy ? "Processing..." : "Confirm final decision"}
            </button>
          </form>
        </section>
      )}

      {refund && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h4 className="font-extrabold text-emerald-900">
            Associated refund
          </h4>
          <p className="mt-2 text-sm text-emerald-900">
            {money(refund.approvedAmount)} ·{" "}
            <StatusBadge status={refund.status} />
          </p>
          <p className="mt-2 text-xs text-emerald-800">
            Open the Refunds tab to review transfer details and processing.
          </p>
        </section>
      )}

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function RefundDetails({
  refund,
  destination,
  canProcess,
  onClose,
  onRefresh,
  onError,
  onNotice,
}) {
  const [paymentMethod, setPaymentMethod] = useState(
    destination?.method || "mfs"
  );
  const [transactionReference, setTransactionReference] = useState("");
  const [note, setNote] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [busy, setBusy] = useState(false);

  const canComplete = ["approved", "failed"].includes(refund.status);
  const canFail = refund.status === "approved";

  const complete = async (event) => {
    event.preventDefault();

    if (transactionReference.trim().length < 3) {
      onError("Enter a valid transaction reference.");
      return;
    }
    if (note.trim().length < 5) {
      onError("The completion note must contain at least 5 characters.");
      return;
    }
    if (paymentMethod !== destination?.method) {
      onError("Transfer method must match the customer's saved destination.");
      return;
    }

    if (
      !window.confirm(
        "Confirm that the manual bank/MFS transfer has actually been completed?"
      )
    ) return;

    setBusy(true);
    try {
      const result = await completeAdminRefund(refund._id, {
        paymentMethod,
        transactionReference: transactionReference.trim(),
        note: note.trim(),
      });
      onNotice(result.message || "Refund completion recorded.");
      await onRefresh();
    } catch (error) {
      onError(getError(error, "Unable to complete refund."));
    } finally {
      setBusy(false);
    }
  };

  const fail = async (event) => {
    event.preventDefault();
    if (failureReason.trim().length < 5) {
      onError("Failure reason must contain at least 5 characters.");
      return;
    }

    if (!window.confirm("Mark this refund transfer as failed?")) return;

    setBusy(true);
    try {
      const result = await failAdminRefund(
        refund._id,
        failureReason.trim()
      );
      onNotice(result.message || "Refund marked as failed.");
      await onRefresh();
    } catch (error) {
      onError(getError(error, "Unable to update refund."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Refund record
          </p>
          <h3 className="mt-1 break-all text-lg font-extrabold text-slate-900">
            {refund._id}
          </h3>
        </div>
        <StatusBadge status={refund.status} />
      </div>

      <section className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Approved amount" value={money(refund.approvedAmount)} />
        <Detail label="Requested amount" value={money(refund.requestedAmount)} />
        <Detail label="Currency" value={refund.currency || "BDT"} />
        <Detail
          label="Customer"
          value={`${refund.customerId?.name || "—"} · ${refund.customerId?.email || ""}`}
        />
        <Detail
          label="Seller"
          value={`${refund.sellerId?.storeName || refund.sellerId?.name || "—"} · ${refund.sellerId?.email || ""}`}
        />
        <Detail
          label="Case"
          value={refund.disputeId?.caseNumber || "—"}
        />
        <Detail
          label="Seller recovery"
          value={money(refund.sellerRecoveryAmount)}
        />
        <Detail
          label="Commission reversal"
          value={money(refund.commissionReversalAmount)}
        />
        <Detail label="Created" value={date(refund.createdAt)} />
      </section>

      <section className="rounded-xl border border-slate-200 p-4">
        <h4 className="font-extrabold text-slate-900">
          Customer refund destination
        </h4>

        {!destination ? (
          <p className="mt-2 text-sm text-amber-700">
            No refund destination was returned by the server. Verify the
            customer details before making any transfer.
          </p>
        ) : destination.method === "bank_transfer" ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Detail label="Method" value="Bank transfer" />
            <Detail label="Bank" value={destination.bankName} />
            <Detail
              label="Account holder"
              value={destination.accountHolderName}
            />
            <Detail label="Account number" value={destination.accountNumber} />
            <Detail label="Branch" value={destination.branchName} />
            <Detail label="Routing number" value={destination.routingNumber} />
          </div>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Detail label="Method" value="Mobile financial service" />
            <Detail label="Provider" value={destination.mfsProvider} />
            <Detail
              label="Account type"
              value={destination.mfsAccountType}
            />
            <Detail label="Account number" value={destination.mfsNumber} />
          </div>
        )}
      </section>

      {refund.status === "completed" && (
        <section className="rounded-xl bg-emerald-50 p-4">
          <h4 className="font-extrabold text-emerald-900">
            Transfer recorded
          </h4>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Detail
              label="Payment method"
              value={refund.paymentMethod}
            />
            <Detail
              label="Transaction reference"
              value={refund.transactionReference}
            />
            <Detail label="Processed at" value={date(refund.processedAt)} />
            <Detail
              label="Processing note"
              value={refund.processingNote}
            />
          </div>
        </section>
      )}

      {refund.status === "failed" && (
        <section className="rounded-xl bg-red-50 p-4">
          <h4 className="font-extrabold text-red-900">Previous failure</h4>
          <p className="mt-2 text-sm text-red-800">
            {refund.failureReason || "No failure reason recorded."}
          </p>
        </section>
      )}

      {canProcess && canComplete && (
        <section className="rounded-xl border border-emerald-200 p-4">
          <h4 className="font-extrabold text-slate-900">
            Record manual transfer
          </h4>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Use this only after the actual bank/MFS transfer has been
            completed. The system records the transaction; it does not
            initiate the transfer.
          </p>

          <form onSubmit={complete} className="mt-4 space-y-3">
            <Field label="Transfer method">
              <select
                className={INPUT}
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              >
                <option value="bank_transfer">Bank transfer</option>
                <option value="mfs">MFS</option>
              </select>
            </Field>
            <Field label="Transaction reference">
              <input
                className={INPUT}
                required
                minLength={3}
                maxLength={120}
                value={transactionReference}
                onChange={(event) =>
                  setTransactionReference(event.target.value)
                }
              />
            </Field>
            <Field label="Completion note (5–500 characters)">
              <textarea
                className={INPUT}
                rows={2}
                required
                minLength={5}
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
            <button
              disabled={
                busy ||
                !destination ||
                paymentMethod !== destination.method
              }
              className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? "Saving..." : "Record completed transfer"}
            </button>
          </form>
        </section>
      )}

      {canProcess && canFail && (
        <section className="rounded-xl border border-red-200 p-4">
          <h4 className="font-extrabold text-slate-900">
            Record failed transfer
          </h4>
          <form onSubmit={fail} className="mt-3 space-y-3">
            <Field label="Failure reason (5–500 characters)">
              <textarea
                className={INPUT}
                rows={2}
                minLength={5}
                maxLength={500}
                required
                value={failureReason}
                onChange={(event) =>
                  setFailureReason(event.target.value)
                }
              />
            </Field>
            <button
              disabled={busy || failureReason.trim().length < 5}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50"
            >
              Mark transfer failed
            </button>
          </form>
        </section>
      )}

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function AdminDisputes() {
  const { hasPermission } = useAuth();

  const canManageDisputes = hasPermission("manage_disputes");
  const canResolveDisputes = hasPermission("resolve_disputes");
  const canIssueRefunds = hasPermission("issue_refunds");

  const [tab, setTab] = useState(
    canManageDisputes ? "disputes" : "refunds"
  );

  const [disputes, setDisputes] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [disputeStatus, setDisputeStatus] = useState("");
  const [refundStatus, setRefundStatus] = useState("");
  const [disputePage, setDisputePage] = useState(1);
  const [refundPage, setRefundPage] = useState(1);
  const [disputePagination, setDisputePagination] = useState({});
  const [refundPagination, setRefundPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [refundDestination, setRefundDestination] = useState(null);

  const canAccess =
    canManageDisputes || canIssueRefunds;

  const loadDisputes = useCallback(async () => {
    if (!canManageDisputes) return;

    const result = await getAdminDisputes({
      page: disputePage,
      limit: 20,
      ...(disputeStatus ? { status: disputeStatus } : {}),
    });

    setDisputes(result.disputes || []);
    setDisputePagination(result.pagination || {});
  }, [canManageDisputes, disputePage, disputeStatus]);

  const loadRefunds = useCallback(async () => {
    if (!canIssueRefunds) return;

    const result = await getAdminRefunds({
      page: refundPage,
      limit: 20,
      ...(refundStatus ? { status: refundStatus } : {}),
    });

    setRefunds(result.refunds || []);
    setRefundPagination(result.pagination || {});
  }, [canIssueRefunds, refundPage, refundStatus]);

  const loadLists = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([
        canManageDisputes ? loadDisputes() : Promise.resolve(),
        canIssueRefunds ? loadRefunds() : Promise.resolve(),
      ]);
    } catch (err) {
      setError(getError(err, "Unable to load dispute and refund records."));
    } finally {
      setLoading(false);
    }
  }, [canManageDisputes, canIssueRefunds, loadDisputes, loadRefunds]);

  useEffect(() => {
    if (canAccess) loadLists();
    else setLoading(false);
  }, [canAccess, loadLists]);

  const openDispute = async (item) => {
    setError("");
    setBusy(true);
    try {
      const result = await getAdminDisputeDetails(item._id);
      setSelectedDispute(result.dispute);
    } catch (err) {
      setError(getError(err, "Unable to load dispute details."));
    } finally {
      setBusy(false);
    }
  };

  const refreshSelectedDispute = async () => {
    if (!selectedDispute?._id) return;
    const result = await getAdminDisputeDetails(selectedDispute._id);
    setSelectedDispute(result.dispute);
    await loadDisputes();
  };

  const openRefund = async (item) => {
    setError("");
    setBusy(true);
    try {
      const result = await getAdminRefundDetails(item._id);
      setSelectedRefund(result.refund);
      setRefundDestination(result.refundDestination || null);
    } catch (err) {
      setError(getError(err, "Unable to load refund details."));
    } finally {
      setBusy(false);
    }
  };

  const refreshSelectedRefund = async () => {
    if (!selectedRefund?._id) return;
    const result = await getAdminRefundDetails(selectedRefund._id);
    setSelectedRefund(result.refund);
    setRefundDestination(result.refundDestination || null);
    await loadRefunds();
  };

  const disputeCounts = useMemo(
    () => ({
      total: disputePagination.totalDisputes || 0,
      active: disputes.filter((item) =>
        ["awaiting_seller", "under_review", "awaiting_customer"].includes(
          item.status
        )
      ).length,
    }),
    [disputes, disputePagination]
  );

  if (!canAccess) {
    return (
      <AdminLayout>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-xl font-extrabold">Permission required</h1>
          <p className="mt-2 text-sm">
            Your administrator account does not have dispute or refund
            management permission.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#83CDB5]">
              Administration / Customer support
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
              Disputes & Refunds
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-100/70">
              Review customer claims, communicate with customers and sellers,
              make final decisions and record manual BDT refund transfers.
            </p>
          </div>
          <button
            type="button"
            onClick={loadLists}
            disabled={loading || busy}
            className="rounded-xl border border-[#83CDB5]/30 bg-[#103B37] px-4 py-2.5 text-sm font-semibold text-[#B9F4E4] hover:bg-[#18554C] disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </header>

        {notice && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {notice}
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

        <section className="grid gap-4 sm:grid-cols-2">
          {canManageDisputes && (
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Disputes in current result</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">
                {loading ? "..." : disputeCounts.total.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {disputeCounts.active} active in this page
              </p>
            </div>
          )}
          {canIssueRefunds && (
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Refunds in current result</p>
              <p className="mt-2 text-3xl font-extrabold text-slate-900">
                {loading
                  ? "..."
                  : (refundPagination.totalRefunds || 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {refunds.filter((item) => item.status === "approved").length} approved on this page
              </p>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap gap-2">
            {canManageDisputes && (
              <button
                type="button"
                onClick={() => setTab("disputes")}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
                  tab === "disputes"
                    ? "bg-[#103B37] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Disputes
              </button>
            )}
            {canIssueRefunds && (
              <button
                type="button"
                onClick={() => setTab("refunds")}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
                  tab === "refunds"
                    ? "bg-[#103B37] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Refunds
              </button>
            )}
          </div>

          {tab === "disputes" && canManageDisputes && (
            <>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-extrabold text-slate-900">
                    Customer disputes
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Review cases and manage their workflow.
                  </p>
                </div>
                <select
                  className={`${INPUT} sm:max-w-xs`}
                  value={disputeStatus}
                  onChange={(event) => {
                    setDisputeStatus(event.target.value);
                    setDisputePage(1);
                  }}
                >
                  <option value="">All statuses</option>
                  {DISPUTE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>

              {loading ? (
                <p className="p-12 text-center text-sm text-slate-500">
                  Loading disputes...
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                        <th className="px-3 py-3">Case</th>
                        <th className="px-3 py-3">Customer</th>
                        <th className="px-3 py-3">Reason</th>
                        <th className="px-3 py-3">Requested</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3">Date</th>
                        <th className="px-3 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {disputes.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50">
                          <td className="px-3 py-4">
                            <p className="font-bold text-slate-900">
                              {item.caseNumber}
                            </p>
                            <p className="text-xs text-slate-400">
                              {String(item._id).slice(-8)}
                            </p>
                          </td>
                          <td className="px-3 py-4">
                            <p className="text-sm font-semibold text-slate-800">
                              {item.customerId?.name || "—"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {item.customerId?.email || ""}
                            </p>
                          </td>
                          <td className="px-3 py-4 text-sm text-slate-600">
                            {REASON_LABELS[item.reason] || item.reason}
                          </td>
                          <td className="px-3 py-4 text-sm font-bold text-slate-800">
                            {money(item.requestedRefundAmount)}
                          </td>
                          <td className="px-3 py-4">
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="px-3 py-4 text-xs text-slate-500">
                            {date(item.createdAt)}
                          </td>
                          <td className="px-3 py-4 text-right">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openDispute(item)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Review case
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {disputes.length === 0 && (
                    <p className="p-12 text-center text-sm text-slate-500">
                      No disputes found for this filter.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">
                  Page {disputePagination.currentPage || disputePage} of{" "}
                  {disputePagination.totalPages || 1} ·{" "}
                  {disputePagination.totalDisputes || 0} disputes
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={disputePage <= 1 || loading}
                    onClick={() => setDisputePage((page) => page - 1)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={
                      disputePage >= (disputePagination.totalPages || 1) ||
                      loading
                    }
                    onClick={() => setDisputePage((page) => page + 1)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === "refunds" && canIssueRefunds && (
            <>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-extrabold text-slate-900">
                    Refund records
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Review approved refunds and record manual bank/MFS transfers.
                  </p>
                </div>
                <select
                  className={`${INPUT} sm:max-w-xs`}
                  value={refundStatus}
                  onChange={(event) => {
                    setRefundStatus(event.target.value);
                    setRefundPage(1);
                  }}
                >
                  <option value="">All statuses</option>
                  {REFUND_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>

              {loading ? (
                <p className="p-12 text-center text-sm text-slate-500">
                  Loading refunds...
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                        <th className="px-3 py-3">Refund</th>
                        <th className="px-3 py-3">Case</th>
                        <th className="px-3 py-3">Customer</th>
                        <th className="px-3 py-3">Amount</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3">Created</th>
                        <th className="px-3 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {refunds.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50">
                          <td className="px-3 py-4">
                            <p className="font-bold text-slate-900">
                              {String(item._id).slice(-10)}
                            </p>
                          </td>
                          <td className="px-3 py-4 text-sm text-slate-600">
                            {item.disputeId?.caseNumber || "—"}
                          </td>
                          <td className="px-3 py-4">
                            <p className="text-sm font-semibold text-slate-800">
                              {item.customerId?.name || "—"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {item.customerId?.email || ""}
                            </p>
                          </td>
                          <td className="px-3 py-4 text-sm font-bold text-slate-800">
                            {money(item.approvedAmount)}
                          </td>
                          <td className="px-3 py-4">
                            <StatusBadge status={item.status} />
                          </td>
                          <td className="px-3 py-4 text-xs text-slate-500">
                            {date(item.createdAt)}
                          </td>
                          <td className="px-3 py-4 text-right">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openRefund(item)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              Review refund
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {refunds.length === 0 && (
                    <p className="p-12 text-center text-sm text-slate-500">
                      No refunds found for this filter.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">
                  Page {refundPagination.currentPage || refundPage} of{" "}
                  {refundPagination.totalPages || 1} ·{" "}
                  {refundPagination.totalRefunds || 0} refunds
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={refundPage <= 1 || loading}
                    onClick={() => setRefundPage((page) => page - 1)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={
                      refundPage >= (refundPagination.totalPages || 1) ||
                      loading
                    }
                    onClick={() => setRefundPage((page) => page + 1)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {selectedDispute && (
        <Modal
          title="Dispute case review"
          wide
          onClose={() => setSelectedDispute(null)}
        >
          <DisputeDetails
            dispute={selectedDispute}
            refund={null}
            canManage={canManageDisputes}
            canResolve={canResolveDisputes}
            canRefund={canIssueRefunds}
            onRefresh={refreshSelectedDispute}
            onClose={() => setSelectedDispute(null)}
            onError={setError}
            onNotice={setNotice}
          />
        </Modal>
      )}

      {selectedRefund && (
        <Modal
          title="Refund processing"
          wide
          onClose={() => setSelectedRefund(null)}
        >
          <RefundDetails
            refund={selectedRefund}
            destination={refundDestination}
            canProcess={canIssueRefunds}
            onRefresh={refreshSelectedRefund}
            onClose={() => setSelectedRefund(null)}
            onError={setError}
            onNotice={setNotice}
          />
        </Modal>
      )}
    </AdminLayout>
  );
}
