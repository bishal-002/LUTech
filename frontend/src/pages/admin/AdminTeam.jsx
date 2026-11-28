
import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import {
  getAdminProfiles,
  createAdminProfile,
  updateAdminProfile,
  updateAdminProfileStatus,
  updateAdminProfileSecurity,
} from "../../services/adminService";

const ROLES = [
  "super_admin",
  "catalog_moderator",
  "kyc_verifier",
  "support_agent",
];

const DEPARTMENTS = [
  "Operations",
  "Trust & Safety",
  "Catalog & Merchandising",
  "Finance",
  "Engineering",
];

const PERMISSIONS = [
  ["Platform administration", [
    "manage_admins",
    "manage_platform_settings",
    "view_audit_logs",
  ]],
  ["User management", ["view_users", "ban_users"]],
  ["Seller verification", [
    "view_seller_applications",
    "view_seller_kyc",
    "approve_sellers",
    "reject_sellers",
    "assign_seller_tiers",
    "verify_genuine_badge",
  ]],
  ["Product and catalog", [
    "approve_products",
    "suspend_products",
    "manage_brands",
    "manage_categories",
    "edit_category_schemas",
  ]],
  ["Customer reviews", ["view_reviews", "moderate_reviews"]],
  ["Customer support", [
    "view_orders",
    "manage_disputes",
    "resolve_disputes",
    "issue_refunds",
    "manage_support_tickets",
  ]],
  ["Finance", ["process_payouts"]],
];

const DEFAULT_PERMISSIONS = {
  super_admin: PERMISSIONS.flatMap(([, values]) => values),
  catalog_moderator: [
    "approve_products", "suspend_products", "manage_brands",
    "manage_categories", "edit_category_schemas", "view_reviews",
    "moderate_reviews",
  ],
  kyc_verifier: [
    "view_seller_applications", "view_seller_kyc", "approve_sellers",
    "reject_sellers", "assign_seller_tiers", "verify_genuine_badge",
  ],
  support_agent: [
    "view_users", "view_orders", "view_reviews", "manage_disputes",
    "resolve_disputes", "issue_refunds", "manage_support_tickets",
  ],
};

const EMPTY_FORM = {
  userId: "",
  fullName: "",
  phone: "",
  adminRole: "support_agent",
  department: "Operations",
  permissions: [...DEFAULT_PERMISSIONS.support_agent],
};

const inputClass =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

const labelClass = "block text-sm font-semibold text-slate-700";

const pretty = (value) =>
  String(value || "—").replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

function TeamModal({ profile, onClose, onSaved }) {
  const isCreate = !profile;
  const [form, setForm] = useState(() => profile ? {
    userId: profile.userId?._id || "",
    fullName: profile.userId?.fullName || profile.userId?.name || "",
    phone: "",
    adminRole: profile.adminRole,
    department: profile.department || "",
    permissions: [...(profile.permissions || [])],
  } : EMPTY_FORM);

  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const changeRole = (role) => {
    setForm((current) => ({
      ...current,
      adminRole: role,
      permissions: [...DEFAULT_PERMISSIONS[role]],
    }));
  };

  const togglePermission = (permission) => {
    if (form.adminRole === "super_admin") return;

    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (note.trim().length > 500) {
      setError("The internal note cannot exceed 500 characters.");
      return;
    }

    if (isCreate) {
      if (!/^[a-f\d]{24}$/i.test(form.userId.trim())) {
        setError("Enter a valid existing MongoDB user ID.");
        return;
      }
      if (!/^\+8801[3-9]\d{8}$/.test(form.phone.trim())) {
        setError("Enter a valid Bangladesh phone number in +8801XXXXXXXXX format.");
        return;
      }
    }

    if (form.fullName.trim().length < 2 || form.fullName.trim().length > 80) {
      setError("Full name must be between 2 and 80 characters.");
      return;
    }

    setSaving(true);

    try {
      if (isCreate) {
        await createAdminProfile({
          userId: form.userId.trim(),
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          adminRole: form.adminRole,
          department: form.department || null,
          permissions: form.permissions,
        });
      } else {
        await updateAdminProfile(profile._id, {
          fullName: form.fullName.trim(),
          adminRole: form.adminRole,
          department: form.department || null,
          permissions: form.permissions,
          note: note.trim(),
        });
      }

      await onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to save administrator profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-5">
      <form onSubmit={submit} className="my-auto max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Administrator access
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {isCreate ? "Create administrator profile" : "Edit administrator profile"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-2xl text-slate-400">×</button>
        </div>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {isCreate && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Existing user ID
              <input required value={form.userId} onChange={(e) => setField("userId", e.target.value)} className={inputClass} placeholder="24-character MongoDB user ID" />
            </label>
            <label className={labelClass}>
              Bangladesh phone number
              <input required value={form.phone} onChange={(e) => setField("phone", e.target.value)} className={inputClass} placeholder="+8801XXXXXXXXX" />
            </label>
          </div>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Full name
            <input required minLength={2} maxLength={80} value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} className={inputClass} />
          </label>

          <label className={labelClass}>
            Administrator role
            <select value={form.adminRole} onChange={(e) => changeRole(e.target.value)} className={inputClass}>
              {ROLES.map((role) => <option key={role} value={role}>{pretty(role)}</option>)}
            </select>
          </label>

          <label className={labelClass}>
            Department
            <select value={form.department} onChange={(e) => setField("department", e.target.value)} className={inputClass}>
              <option value="">No department</option>
              {DEPARTMENTS.map((department) => <option key={department}>{department}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-slate-900">Permissions</h3>
            <span className="text-xs text-slate-500">{form.permissions.length} selected</span>
          </div>

          {form.adminRole === "super_admin" && (
            <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              Super Admin must retain every permission. The backend enforces this.
            </p>
          )}

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {PERMISSIONS.map(([group, permissions]) => (
              <section key={group} className="rounded-xl border border-slate-200 p-4">
                <h4 className="mb-3 text-sm font-bold text-slate-800">{group}</h4>
                <div className="space-y-2">
                  {permissions.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(permission)}
                        disabled={form.adminRole === "super_admin" || (form.adminRole !== "super_admin" && permission === "manage_admins")}
                        onChange={() => togglePermission(permission)}
                        className="h-4 w-4 accent-emerald-700"
                      />
                      {permission}
                    </label>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {!isCreate && (
          <label className={`${labelClass} mt-5`}>
            Internal note (optional, required for Super Admin downgrade)
            <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </label>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold">Cancel</button>
          <button disabled={saving} className="rounded-xl bg-[#103633] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "Saving..." : isCreate ? "Create profile" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AdminTeamContent() {
  const { user } = useAuth();
  const isSuperAdmin = user?.adminRole === "super_admin";

  const [profiles, setProfiles] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalProfiles: 0 });
  const [filters, setFilters] = useState({ search: "", adminRole: "", status: "" });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalProfile, setModalProfile] = useState(undefined);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusNote, setStatusNote] = useState("");
  const [busy, setBusy] = useState(false);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getAdminProfiles({
        page,
        limit: 10,
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.adminRole ? { adminRole: filters.adminRole } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      });
      setProfiles(response.profiles || []);
      setPagination(response.pagination || { currentPage: page, totalPages: 1, totalProfiles: 0 });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load administrator profiles.");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    if (isSuperAdmin) loadProfiles();
    else setLoading(false);
  }, [isSuperAdmin, loadProfiles]);

  const changeFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const submitStatus = async () => {
    if (!statusTarget) return;
    setBusy(true);
    setError("");
    try {
      await updateAdminProfileStatus(statusTarget._id, {
        status: statusTarget.nextStatus,
        note: statusNote.trim(),
      });
      setStatusTarget(null);
      setStatusNote("");
      await loadProfiles();
    } catch (err) {
      setError(err.response?.data?.message || "Unable to update administrator status.");
    } finally {
      setBusy(false);
    }
  };

  if (!isSuperAdmin) {
    return <div className="rounded-2xl bg-amber-50 p-6 text-sm text-amber-900">Only a Super Admin can manage administrator profiles.</div>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-[#83CDB5]">ADMINISTRATION / ACCESS CONTROL</p>
          <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">Admin Team</h1>
          <p className="mt-2 text-sm text-[#A9C7BD]">Manage administrator profiles, roles, permissions and account access.</p>
        </div>
        <button onClick={() => setModalProfile(null)} className="rounded-xl bg-[#83CDB5] px-5 py-3 text-sm font-bold text-[#062729]">+ Add administrator</button>
      </header>

      {error && <div role="alert" className="rounded-xl bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}

      <section className="rounded-2xl border border-white/10 bg-[#103633] p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <input value={filters.search} onChange={(e) => changeFilter("search", e.target.value)} placeholder="Search name or email" className="rounded-xl border border-white/10 bg-[#092F30] px-4 py-3 text-sm text-white outline-none" />
          <select value={filters.adminRole} onChange={(e) => changeFilter("adminRole", e.target.value)} className="rounded-xl border border-white/10 bg-[#092F30] px-4 py-3 text-sm text-white">
            <option value="">All roles</option>
            {ROLES.map((role) => <option key={role} value={role}>{pretty(role)}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => changeFilter("status", e.target.value)} className="rounded-xl border border-white/10 bg-[#092F30] px-4 py-3 text-sm text-white">
            <option value="">All statuses</option>
            {["active", "suspended", "revoked"].map((status) => <option key={status} value={status}>{pretty(status)}</option>)}
          </select>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead><tr className="border-b border-white/10 text-xs uppercase text-[#83CDB5]">
              <th className="px-3 py-3">Administrator</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Department</th><th className="px-3 py-3">Permissions</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-white/10">
              {loading ? <tr><td colSpan="6" className="p-10 text-center text-sm text-[#A9C7BD]">Loading administrators...</td></tr> :
                profiles.length === 0 ? <tr><td colSpan="6" className="p-10 text-center text-sm text-[#A9C7BD]">No administrator profiles found.</td></tr> :
                profiles.map((profile) => {
                  const linkedUser = profile.userId || {};
                  const isSelf = linkedUser._id === user?._id;
                  return <tr key={profile._id} className="text-sm text-white/90">
                    <td className="px-3 py-4"><p className="font-semibold">{linkedUser.fullName || linkedUser.name || "—"}</p><p className="mt-1 text-xs text-[#A9C7BD]">{linkedUser.email}</p></td>
                    <td className="px-3 py-4">{pretty(profile.adminRole)}</td>
                    <td className="px-3 py-4">{profile.department || "—"}</td>
                    <td className="px-3 py-4">{profile.permissions?.length || 0}</td>
                    <td className="px-3 py-4"><span className={`rounded-full px-3 py-1 text-xs font-bold ${profile.status === "active" ? "bg-emerald-100 text-emerald-800" : profile.status === "suspended" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>{pretty(profile.status)}</span></td>
                    <td className="px-3 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button disabled={isSelf || profile.status === "revoked"} onClick={() => setModalProfile(profile)} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold disabled:opacity-30">Edit</button>
                        {profile.status !== "revoked" && !isSelf && (
                          <button onClick={() => { setStatusTarget({ _id: profile._id, nextStatus: profile.status === "active" ? "suspended" : "active" }); setStatusNote(""); }} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold">
                            {profile.status === "active" ? "Suspend" : "Activate"}
                          </button>
                        )}
                        {profile.status !== "revoked" && !isSelf && (
                          <button onClick={() => { setStatusTarget({ _id: profile._id, nextStatus: "revoked" }); setStatusNote(""); }} className="rounded-lg border border-red-300/30 px-3 py-2 text-xs font-semibold text-red-200">Revoke</button>
                        )}
                      </div>
                    </td>
                  </tr>;
                })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-[#A9C7BD]">
          <span>{pagination.totalProfiles || 0} administrator profiles · Page {pagination.currentPage || page} of {Math.max(1, pagination.totalPages || 1)}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-white/20 px-3 py-2 disabled:opacity-30">Previous</button>
            <button disabled={page >= (pagination.totalPages || 1) || loading} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-white/20 px-3 py-2 disabled:opacity-30">Next</button>
          </div>
        </div>
      </section>

      {modalProfile !== undefined && (
        <TeamModal profile={modalProfile} onClose={() => setModalProfile(undefined)} onSaved={loadProfiles} />
      )}

      {statusTarget && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">{pretty(statusTarget.nextStatus)} administrator</h2>
            <p className="mt-2 text-sm text-slate-600">This changes the administrator's access to the admin workspace.</p>
            {statusTarget.nextStatus !== "active" && (
              <label className={`${labelClass} mt-4`}>
                Internal note (required)
                <textarea required minLength={1} maxLength={500} rows={3} value={statusNote} onChange={(e) => setStatusNote(e.target.value)} className={inputClass} />
              </label>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setStatusTarget(null)} className="rounded-xl border px-4 py-2 text-sm">Cancel</button>
              <button disabled={busy || (statusTarget.nextStatus !== "active" && !statusNote.trim())} onClick={submitStatus} className="rounded-xl bg-[#103633] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy ? "Updating..." : "Confirm"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminTeam() {
  return <AdminLayout><AdminTeamContent /></AdminLayout>;
}
