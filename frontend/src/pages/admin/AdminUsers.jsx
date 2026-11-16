
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "../../components/admin/AdminLayout";

const API_URL = "http://localhost:5000/api/admin";

const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

const getCurrentUserId = () => {
  try {
    const userInfo = JSON.parse(
      localStorage.getItem("userInfo") || "{}"
    );

    return userInfo._id || userInfo.id || null;
  } catch {
    return null;
  }
};

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

const RoleBadge = ({ role }) => {
  const styles = {
    admin: "bg-violet-50 text-violet-700 ring-violet-200",
    seller: "bg-sky-50 text-sky-700 ring-sky-200",
    customer: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${
        styles[role] || "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {role || "Unknown"}
    </span>
  );
};

const VerificationBadge = ({ verified }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
      verified
        ? "bg-emerald-50 text-emerald-700"
        : "bg-amber-50 text-amber-700"
    }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${
        verified ? "bg-emerald-500" : "bg-amber-500"
      }`}
    />
    {verified ? "Verified" : "Unverified"}
  </span>
);

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingUserId, setSavingUserId] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const currentUserId = getCurrentUserId();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/users`, {
        ...getAuthConfig(),
        params: {
          page,
          limit: 10,
          search,
        },
      });

      setUsers(response.data.users || []);
      setPagination(response.data.pagination || {});
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load users."
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API_URL}/users/stats`,
        getAuthConfig()
      );

      setStats(response.data);
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          "Failed to load user statistics."
      );
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      setSavingUserId(userId);
      setActionError("");

      await axios.put(
        `${API_URL}/users/${userId}/role`,
        { role: newRole },
        getAuthConfig()
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

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    try {
      setDeleting(true);
      setActionError("");

      await axios.delete(
        `${API_URL}/users/${deletingUser._id}`,
        getAuthConfig()
      );

      setDeletingUser(null);

      if (users.length === 1 && page > 1) {
        setPage((previousPage) => previousPage - 1);
      } else {
        await fetchUsers();
      }

      await fetchStats();
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          "Failed to delete user."
      );
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = pagination.totalPages || 1;

  return (
    <AdminLayout>
      <div className="min-h-full space-y-6">
        {/* Page heading */}
        <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#83CDB5]">
              Administration
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              User Management
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#B5C9C1]">
              Manage registered accounts, monitor verification,
              and control user roles.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#D2E5DE]">
            <span className="text-[#83CDB5]">●</span>{" "}
            User administration
          </div>
        </section>

        {/* Statistics */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Users"
            value={stats.total}
            icon="👥"
            description="All registered accounts"
          />
          <StatCard
            title="Customers"
            value={stats.customers}
            icon="🛍️"
            description="Customer accounts"
          />
          <StatCard
            title="Sellers"
            value={stats.sellers}
            icon="🏪"
            description="Seller accounts"
          />
          <StatCard
            title="Administrators"
            value={stats.admins}
            icon="🛡️"
            description="Admin accounts"
          />
        </section>

        {/* Action feedback */}
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

        {/* User management panel */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#123B35]">
                Registered Users
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                View accounts and manage their access levels.
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

          {loading && (
            <div className="flex flex-col items-center justify-center px-6 py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#D8EEE6] border-t-[#16836B]" />
              <p className="mt-4 text-sm text-slate-500">
                Loading registered users...
              </p>
            </div>
          )}

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
                onClick={() => {
                  fetchUsers();
                  fetchStats();
                }}
                className="mt-4 rounded-lg bg-[#123B35] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0B5145]"
              >
                Try Again
              </button>
            </div>
          )}

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

          {!loading && !error && users.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-[#F4F8F6] text-[11px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">User</th>
                      <th className="px-6 py-4 font-semibold">Role</th>
                      <th className="px-6 py-4 font-semibold">
                        Verification
                      </th>
                      <th className="px-6 py-4 font-semibold">
                        Joined Date
                      </th>
                      <th className="px-6 py-4 text-right font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => {
                      const isCurrentUser =
                        String(user._id) === String(currentUserId);

                      return (
                        <tr
                          key={user._id}
                          className="transition hover:bg-[#F8FBF9]"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F5F0] text-sm font-bold uppercase text-[#16836B]">
                                {user.name?.charAt(0) || "U"}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {user.name || "Unnamed user"}
                                  {isCurrentUser && (
                                    <span className="ml-2 text-xs font-medium text-[#16836B]">
                                      You
                                    </span>
                                  )}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex flex-col items-start gap-2">
                              <RoleBadge role={user.role} />
                              <select
                                value={user.role}
                                disabled={
                                  isCurrentUser ||
                                  savingUserId === user._id
                                }
                                onChange={(event) =>
                                  handleRoleChange(
                                    user._id,
                                    event.target.value
                                  )
                                }
                                aria-label={`Change role for ${user.name}`}
                                className="max-w-[130px] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 outline-none transition focus:border-[#83CDB5] focus:ring-2 focus:ring-[#83CDB5]/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="customer">Customer</option>
                                <option value="seller">Seller</option>
                                <option value="admin">Admin</option>
                              </select>
                              {savingUserId === user._id && (
                                <span className="text-xs text-slate-400">
                                  Saving...
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <VerificationBadge
                              verified={user.isVerified}
                            />
                          </td>

                          <td className="px-6 py-4 text-slate-500">
                            {user.createdAt
                              ? new Date(
                                  user.createdAt
                                ).toLocaleDateString()
                              : "N/A"}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setDeletingUser(user)}
                              disabled={isCurrentUser}
                              className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
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
                    onClick={() =>
                      setPage((previousPage) => previousPage - 1)
                    }
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((previousPage) => previousPage + 1)
                    }
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

      {/* Delete confirmation modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#03191A]/70 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-xl">
              🗑️
            </div>

            <h2
              id="delete-user-title"
              className="mt-4 text-lg font-bold text-slate-900"
            >
              Delete User
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Are you sure you want to delete{" "}
              <strong>{deletingUser.name}</strong>? This action cannot
              be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeletingUser(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteUser}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
