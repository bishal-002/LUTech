
import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import {
  getAdminUsers,
  getAdminUserStats,
  updateAdminUserRole,
  deactivateAdminUser,
} from "../../services/adminService";

// ======================================================
// SMALL UI COMPONENTS
// ======================================================

const StatCard = ({ title, value, icon, description }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#123B35]">
          {value ?? 0}
        </h2>
        <p className="mt-2 text-xs text-slate-400">{description}</p>
      </div>

      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E8F5F0] text-xl text-[#16836B]">
        {icon}
      </div>
    </div>
  </div>
);

const Badge = ({ children, color = "slate" }) => {
  const styles = {
    green: "bg-emerald-50 text-emerald-700",
    yellow: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-sky-50 text-sky-700",
    purple: "bg-violet-50 text-violet-700",
    slate: "bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[color] || styles.slate}`}
    >
      {children}
    </span>
  );
};

const RoleBadge = ({ role }) => {
  const colors = {
    admin: "purple",
    seller: "blue",
    customer: "green",
  };

  return (
    <Badge color={colors[role] || "slate"}>
      {role || "Unknown"}
    </Badge>
  );
};

const AccountStatusBadge = ({ status }) => {
  const colors = {
    active: "green",
    suspended: "red",
    deactivated: "slate",
  };

  return (
    <Badge color={colors[status] || "yellow"}>
      {status || "Unknown"}
    </Badge>
  );
};

const VerificationBadge = ({ verified }) => (
  <Badge color={verified ? "green" : "yellow"}>
    {verified ? "Verified" : "Unverified"}
  </Badge>
);

const formatDate = (date) => {
  if (!date) return "N/A";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "N/A";

  return parsedDate.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// ======================================================
// MAIN PAGE
// ======================================================

const AdminUsers = () => {
  const { user: currentUser, hasPermission } = useAuth();

  const canViewUsers = hasPermission("view_users");
  const canManageRoles = hasPermission("manage_admins");
  const canDeactivateUsers = hasPermission("ban_users");

  const currentUserId = currentUser?._id || currentUser?.id;

  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
  });

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [savingUserId, setSavingUserId] = useState(null);
  const [deactivatingUser, setDeactivatingUser] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  // ======================================================
  // LOAD USERS
  // ======================================================

  const fetchUsers = useCallback(async () => {
    if (!canViewUsers) {
      setLoading(false);
      setError("You do not have permission to view users.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await getAdminUsers({
        page,
        limit: 10,
        search: search.trim(),
      });

      setUsers(response.users || []);
      setPagination(
        response.pagination || {
          currentPage: page,
          totalPages: 1,
          totalUsers: 0,
        }
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load registered users."
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, canViewUsers]);

  // ======================================================
  // LOAD STATISTICS
  // ======================================================

  const fetchStats = useCallback(async () => {
    if (!canViewUsers) {
      setStatsLoading(false);
      return;
    }

    try {
      setStatsLoading(true);

      const response = await getAdminUserStats();
      setStats(response || {});
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          "Failed to load user statistics."
      );
    } finally {
      setStatsLoading(false);
    }
  }, [canViewUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ======================================================
  // CHANGE SELLER ROLE TO CUSTOMER
  // ======================================================

  const handleConvertToCustomer = async (selectedUser) => {
    const confirmed = window.confirm(
      `Convert ${selectedUser.name || selectedUser.email} from seller to customer?`
    );

    if (!confirmed) return;

    try {
      setSavingUserId(selectedUser._id);
      setActionError("");
      setSuccessMessage("");

      const response = await updateAdminUserRole(
        selectedUser._id,
        "customer"
      );

      setSuccessMessage(
        response.message || "User role updated successfully."
      );

      await Promise.all([fetchUsers(), fetchStats()]);
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          "Failed to update user role."
      );
    } finally {
      setSavingUserId(null);
    }
  };

  // ======================================================
  // DEACTIVATE USER
  // ======================================================

  const handleDeactivateUser = async () => {
    if (!deactivatingUser) return;

    try {
      setDeactivating(true);
      setActionError("");
      setSuccessMessage("");

      const response = await deactivateAdminUser(
        deactivatingUser._id
      );

      setSuccessMessage(
        response.message || "User account deactivated successfully."
      );

      setDeactivatingUser(null);

      if (users.length === 1 && page > 1) {
        setPage((previousPage) => previousPage - 1);
      } else {
        await fetchUsers();
      }

      await fetchStats();
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          "Failed to deactivate user."
      );
    } finally {
      setDeactivating(false);
    }
  };

  const totalPages = Math.max(1, pagination.totalPages || 1);

  // ======================================================
  // PAGE
  // ======================================================

  return (
    <AdminLayout>
      <div className="min-h-full space-y-6">

        {/* HEADER */}

        <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#83CDB5]">
              Administration
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              User Management
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-[#B5C9C1]">
              Monitor registered accounts, verification status,
              account activity and user access.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#D2E5DE]">
            <span className="text-[#83CDB5]">●</span>{" "}
            User administration
          </div>
        </section>

        {/* STATISTICS */}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Users"
            value={statsLoading ? "..." : stats.total}
            icon="👥"
            description="All registered accounts"
          />

          <StatCard
            title="Customers"
            value={statsLoading ? "..." : stats.customers}
            icon="🛍️"
            description="Customer accounts"
          />

          <StatCard
            title="Sellers"
            value={statsLoading ? "..." : stats.sellers}
            icon="🏪"
            description="Seller accounts"
          />

          <StatCard
            title="Administrators"
            value={statsLoading ? "..." : stats.admins}
            icon="🛡️"
            description="Administrator accounts"
          />
        </section>

        {/* FEEDBACK */}

        {actionError && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{actionError}</span>

            <button
              type="button"
              onClick={() => setActionError("")}
              className="font-bold"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            <span>{successMessage}</span>

            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              className="font-bold"
              aria-label="Dismiss success message"
            >
              ×
            </button>
          </div>
        )}

        {/* USERS PANEL */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* SEARCH */}

          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#123B35]">
                Registered Users
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Search and review customer, seller and administrator accounts.
              </p>
            </div>

            <div className="relative w-full lg:max-w-sm">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name or email..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#83CDB5] focus:bg-white focus:ring-4 focus:ring-[#83CDB5]/20"
              />
            </div>
          </div>

          {/* LOADING */}

          {loading && (
            <div className="flex flex-col items-center justify-center px-6 py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#D8EEE6] border-t-[#16836B]" />

              <p className="mt-4 text-sm text-slate-500">
                Loading registered users...
              </p>
            </div>
          )}

          {/* ERROR */}

          {!loading && error && (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl text-red-600">
                !
              </div>

              <p className="mt-3 text-sm font-medium text-red-600">
                {error}
              </p>

              <button
                type="button"
                onClick={fetchUsers}
                className="mt-4 rounded-lg bg-[#123B35] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0B5145]"
              >
                Try Again
              </button>
            </div>
          )}

          {/* EMPTY */}

          {!loading && !error && users.length === 0 && (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8F5F0] text-2xl">
                👥
              </div>

              <h3 className="mt-4 font-semibold text-slate-800">
                No users found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Try changing your search term.
              </p>
            </div>
          )}

          {/* USER TABLE */}

          {!loading && !error && users.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-[#F4F8F6] text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">User</th>
                      <th className="px-6 py-4 font-semibold">Role</th>
                      <th className="px-6 py-4 font-semibold">Verification</th>
                      <th className="px-6 py-4 font-semibold">Account Status</th>
                      <th className="px-6 py-4 font-semibold">Joined Date</th>
                      <th className="px-6 py-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {users.map((item) => {
                      const isCurrentUser =
                        String(item._id) === String(currentUserId);

                      const isAdmin = item.role === "admin";
                      const isDeactivated = item.status === "deactivated";
                      const isSaving = savingUserId === item._id;

                      return (
                        <tr
                          key={item._id}
                          className="transition hover:bg-[#F8FBF9]"
                        >
                          {/* USER */}

                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F5F0] text-sm font-bold uppercase text-[#16836B]">
                                {item.name?.charAt(0) || "U"}
                              </div>

                              <div>
                                <p className="font-semibold text-slate-800">
                                  {item.name || "Unnamed user"}

                                  {isCurrentUser && (
                                    <span className="ml-2 text-xs font-medium text-[#16836B]">
                                      You
                                    </span>
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  {item.email}
                                </p>

                                {item.role === "seller" && (
                                  <p className="mt-1 text-xs text-slate-400">
                                    Seller verification: {item.verificationStatus || "Not submitted"}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* ROLE */}

                          <td className="px-6 py-4">
                            <RoleBadge role={item.role} />
                          </td>

                          {/* EMAIL VERIFICATION */}

                          <td className="px-6 py-4">
                            <VerificationBadge verified={item.isVerified} />
                          </td>

                          {/* ACCOUNT STATUS */}

                          <td className="px-6 py-4">
                            <AccountStatusBadge status={item.status} />
                          </td>

                          {/* JOINED */}

                          <td className="px-6 py-4 text-slate-500">
                            {formatDate(item.createdAt)}
                          </td>

                          {/* ACTIONS */}

                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">

                              {canManageRoles &&
                                item.role === "seller" &&
                                !isCurrentUser &&
                                !isDeactivated && (
                                  <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => handleConvertToCustomer(item)}
                                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                                  >
                                    {isSaving ? "Saving..." : "Convert to Customer"}
                                  </button>
                                )}

                              {canDeactivateUsers &&
                                !isAdmin &&
                                !isCurrentUser &&
                                !isDeactivated && (
                                  <button
                                    type="button"
                                    onClick={() => setDeactivatingUser(item)}
                                    className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-100"
                                  >
                                    Deactivate
                                  </button>
                                )}

                              {isDeactivated && (
                                <span className="text-xs text-slate-400">
                                  Account deactivated
                                </span>
                              )}

                              {!canManageRoles &&
                                !canDeactivateUsers &&
                                !isDeactivated && (
                                  <span className="text-xs text-slate-400">
                                    View only
                                  </span>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}

              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm text-slate-500">
                  Showing page{" "}
                  <span className="font-semibold text-slate-800">
                    {pagination.currentPage || page}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-800">
                    {totalPages}
                  </span>

                  <span className="mx-2 text-slate-300">·</span>

                  {pagination.totalUsers || 0} total users
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((previous) => previous - 1)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((previous) => previous + 1)}
                    className="rounded-lg bg-[#123B35] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0B5145] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* DEACTIVATION CONFIRMATION */}

      {deactivatingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#03191A]/70 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="deactivate-user-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-xl">
              ⚠️
            </div>

            <h2
              id="deactivate-user-title"
              className="mt-4 text-lg font-bold text-slate-900"
            >
              Deactivate User Account
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Are you sure you want to deactivate{" "}
              <strong>
                {deactivatingUser.name || deactivatingUser.email}
              </strong>
              ?
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This will deactivate the account. It will not permanently
              delete the user's database record.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deactivating}
                onClick={() => setDeactivatingUser(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deactivating}
                onClick={handleDeactivateUser}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deactivating ? "Deactivating..." : "Confirm Deactivation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
