
import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  getAdminAuditLogs,
  getAdminAuditLogDetails,
} from "../../services/adminService";

const ACTIONS = [
  "SELLER_KYC_APPROVED",
  "SELLER_KYC_REJECTED",
  "SELLER_TIER_UPGRADED",
  "PAYOUT_CREATED",
  "PAYOUT_RELEASED",
  "SELLER_PAYOUT_DETAILS_UPDATED",
  "PRODUCT_VERIFIED_GENUINE",
  "PRODUCT_SUSPENDED",
  "PRODUCT_APPROVED",
  "PRODUCT_REJECTED",
  "CATEGORY_SCHEMA_UPDATED",
  "REVIEW_APPROVED",
  "REVIEW_REJECTED",
  "DISPUTE_OPENED",
  "DISPUTE_SELLER_RESPONDED",
  "DISPUTE_MESSAGE_ADDED",
  "DISPUTE_STATUS_UPDATED",
  "DISPUTE_RESOLVED",
  "DISPUTE_REJECTED",
  "REFUND_APPROVED",
  "REFUND_DESTINATION_UPDATED",
  "MANUAL_REFUND_ISSUED",
  "REFUND_MARKED_FAILED",
  "SELLER_RECOVERY_CREATED",
  "SELLER_RECOVERY_APPLIED",
  "ADMIN_PROFILE_CREATED",
  "ADMIN_PROFILE_UPDATED",
  "ADMIN_PERMISSIONS_UPDATED",
  "ADMIN_PROFILE_DOWNGRADED",
  "ADMIN_PROFILE_ACTIVATED",
  "ADMIN_PROFILE_SUSPENDED",
  "ADMIN_PROFILE_REVOKED",
  "ADMIN_SECURITY_SETTINGS_UPDATED",
  "ADMIN_2FA_ENABLED",
  "ADMIN_2FA_DISABLED",
  "ADMIN_PASSWORD_CHANGED",
  "PLATFORM_SETTINGS_UPDATED",
];

const TARGET_TYPES = [
  "AdminProfile", "Seller", "Product", "Review", "User", "Order",
  "Payout", "Category", "PlatformSettings", "Dispute", "Refund",
  "SellerRecovery",
];

const pretty = (value) =>
  String(value || "—").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

const dateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

function AuditDetailModal({ log, onClose }) {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-5">
      <div className="my-auto max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Immutable audit record</p>
            <h2 className="mt-1 break-all text-lg font-bold text-slate-900">{pretty(log.action)}</h2>
            <p className="mt-1 text-xs text-slate-500">{log._id}</p>
          </div>
          <button onClick={onClose} className="text-2xl text-slate-400">×</button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["Action", pretty(log.action)],
            ["Target type", log.targetType],
            ["Target ID", log.targetId],
            ["Actor role", pretty(log.actorRole)],
            ["Actor", log.actorId?.name || log.actorId?.email || log.actorId?._id],
            ["Admin", log.adminId?.name || log.adminId?.email || log.adminId?._id],
            ["Created", dateTime(log.createdAt)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 break-all text-sm font-semibold text-slate-800">{value || "—"}</p>
            </div>
          ))}
        </div>

        {log.note && (
          <section className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-bold text-amber-900">Internal note</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-900">{log.note}</p>
          </section>
        )}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <section>
            <h3 className="mb-2 font-bold text-slate-900">Before</h3>
            <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-emerald-100">{JSON.stringify(log.changes?.before ?? null, null, 2)}</pre>
          </section>
          <section>
            <h3 className="mb-2 font-bold text-slate-900">After</h3>
            <pre className="max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-emerald-100">{JSON.stringify(log.changes?.after ?? null, null, 2)}</pre>
          </section>
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-xl bg-[#103633] px-5 py-2.5 text-sm font-bold text-white">Close</button>
        </div>
      </div>
    </div>
  );
}

function AdminAuditLogsContent() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalLogs: 0 });
  const [filters, setFilters] = useState({
    action: "",
    targetType: "",
    actorRole: "",
    adminId: "",
    targetId: "",
    actorId: "",
    startDate: "",
    endDate: "",
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");

    const params = { page, limit: 20 };
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });

    try {
      const response = await getAdminAuditLogs(params);
      setLogs(response.logs || []);
      setPagination(response.pagination || { currentPage: page, totalPages: 1, totalLogs: 0 });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const openDetails = async (id) => {
    setDetailLoading(true);
    setError("");
    try {
      const response = await getAdminAuditLogDetails(id);
      setSelectedLog(response.log);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load audit record.");
    } finally {
      setDetailLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      action: "", targetType: "", actorRole: "", adminId: "",
      targetId: "", actorId: "", startDate: "", endDate: "",
    });
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-[#83CDB5]">ADMINISTRATION / COMPLIANCE</p>
          <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">Audit Logs</h1>
          <p className="mt-2 text-sm text-[#A9C7BD]">Review immutable records of administrative and platform activity.</p>
        </div>
        <button onClick={loadLogs} disabled={loading} className="rounded-xl border border-[#83CDB5]/30 px-4 py-2.5 text-sm font-semibold text-[#C5E8DC] disabled:opacity-50">{loading ? "Refreshing..." : "Refresh logs"}</button>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-300/30 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}

      <section className="rounded-2xl border border-white/10 bg-[#103633] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-white">Filter audit records</h2>
            <p className="mt-1 text-xs text-[#A9C7BD]">Use MongoDB IDs for actor, admin and target filters.</p>
          </div>
          <button onClick={clearFilters} className="text-xs font-semibold text-[#83CDB5] hover:underline">Clear filters</button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select value={filters.action} onChange={(e) => updateFilter("action", e.target.value)} className="rounded-xl border border-white/10 bg-[#092F30] px-3 py-3 text-sm text-white">
            <option value="">All actions</option>
            {ACTIONS.map((action) => <option key={action} value={action}>{pretty(action)}</option>)}
          </select>

          <select value={filters.targetType} onChange={(e) => updateFilter("targetType", e.target.value)} className="rounded-xl border border-white/10 bg-[#092F30] px-3 py-3 text-sm text-white">
            <option value="">All target types</option>
            {TARGET_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>

          <select value={filters.actorRole} onChange={(e) => updateFilter("actorRole", e.target.value)} className="rounded-xl border border-white/10 bg-[#092F30] px-3 py-3 text-sm text-white">
            <option value="">All actor roles</option>
            {["admin", "seller", "system"].map((role) => <option key={role} value={role}>{pretty(role)}</option>)}
          </select>

          <input type="date" value={filters.startDate} onChange={(e) => updateFilter("startDate", e.target.value ? new Date(`${e.target.value}T00:00:00`).toISOString() : "")} className="rounded-xl border border-white/10 bg-[#092F30] px-3 py-3 text-sm text-white" />
          <input type="date" value={filters.endDate} onChange={(e) => updateFilter("endDate", e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : "")} className="rounded-xl border border-white/10 bg-[#092F30] px-3 py-3 text-sm text-white" />
          <input value={filters.adminId} onChange={(e) => updateFilter("adminId", e.target.value)} placeholder="Admin ID" className="rounded-xl border border-white/10 bg-[#092F30] px-3 py-3 text-sm text-white placeholder:text-white/40" />
          <input value={filters.actorId} onChange={(e) => updateFilter("actorId", e.target.value)} placeholder="Actor ID" className="rounded-xl border border-white/10 bg-[#092F30] px-3 py-3 text-sm text-white placeholder:text-white/40" />
          <input value={filters.targetId} onChange={(e) => updateFilter("targetId", e.target.value)} placeholder="Target ID" className="rounded-xl border border-white/10 bg-[#092F30] px-3 py-3 text-sm text-white placeholder:text-white/40" />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#103633] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-white">Activity records</h2>
          <span className="text-xs text-[#A9C7BD]">{pagination.totalLogs || 0} records</span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead><tr className="border-b border-white/10 text-xs uppercase text-[#83CDB5]">
              <th className="px-3 py-3">Action</th><th className="px-3 py-3">Actor</th><th className="px-3 py-3">Target</th><th className="px-3 py-3">Date</th><th className="px-3 py-3 text-right">Details</th>
            </tr></thead>
            <tbody className="divide-y divide-white/10">
              {loading ? <tr><td colSpan="5" className="p-10 text-center text-sm text-[#A9C7BD]">Loading audit logs...</td></tr> :
                logs.length === 0 ? <tr><td colSpan="5" className="p-10 text-center text-sm text-[#A9C7BD]">No audit records found.</td></tr> :
                logs.map((log) => (
                  <tr key={log._id} className="text-sm text-white/90">
                    <td className="px-3 py-4"><p className="font-semibold">{pretty(log.action)}</p>{log.note && <p className="mt-1 max-w-xs truncate text-xs text-[#A9C7BD]">{log.note}</p>}</td>
                    <td className="px-3 py-4"><p>{log.actorId?.name || log.actorId?.email || "—"}</p><p className="mt-1 text-xs text-[#A9C7BD]">{pretty(log.actorRole)}</p></td>
                    <td className="px-3 py-4"><p>{log.targetType}</p><p className="mt-1 font-mono text-xs text-[#A9C7BD]">{String(log.targetId || "").slice(-10)}</p></td>
                    <td className="px-3 py-4 text-xs text-[#A9C7BD]">{dateTime(log.createdAt)}</td>
                    <td className="px-3 py-4 text-right"><button onClick={() => openDetails(log._id)} className="rounded-lg border border-[#83CDB5]/30 px-3 py-2 text-xs font-bold text-[#BCE7D8]">View</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-[#A9C7BD]">
          <span>Page {pagination.currentPage || page} of {Math.max(1, pagination.totalPages || 1)}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-white/20 px-3 py-2 disabled:opacity-30">Previous</button>
            <button disabled={page >= (pagination.totalPages || 1) || loading} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-white/20 px-3 py-2 disabled:opacity-30">Next</button>
          </div>
        </div>
      </section>

      {detailLoading && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50"><div className="rounded-xl bg-white px-5 py-4 text-sm font-semibold">Loading audit record...</div></div>}
      {selectedLog && <AuditDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}

export default function AdminAuditLogs() {
  return <AdminLayout><AdminAuditLogsContent /></AdminLayout>;
}
