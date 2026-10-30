
import { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5000/api/admin";

const getAuthConfig = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

// Get the currently logged-in Admin ID
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

// Statistics Card
const StatCard = ({ title, value, color, icon }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h2 className={`mt-2 text-3xl font-bold ${color}`}>
          {value ?? 0}
        </h2>
      </div>

      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-xl">
        {icon}
      </div>
    </div>
  </div>
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

  // Fetch users
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

      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load users."
      );
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  // Fetch user statistics
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

  // Update user role
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

  // Delete user
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

      // If the deleted user was the only item on this page,
      // move back one page when possible.
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

  const getRoleStyle = (role) => {
    const styles = {
      admin: "bg-purple-100 text-purple-700",
      seller: "bg-blue-100 text-blue-700",
      customer: "bg-green-100 text-green-700",
    };

    return styles[role] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
            User Management
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Manage registered users, roles, and account information.
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Users"
            value={stats.total}
            color="text-gray-900"
            icon="👥"
          />

          <StatCard
            title="Customers"
            value={stats.customers}
            color="text-green-600"
            icon="🛍️"
          />

          <StatCard
            title="Sellers"
            value={stats.sellers}
            color="text-blue-600"
            icon="🏪"
          />

          <StatCard
            title="Administrators"
            value={stats.admins}
            color="text-purple-600"
            icon="🛡️"
          />
        </div>

        {/* Error Message */}
        {actionError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {actionError}
          </div>
        )}

        {/* Users Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

          {/* Table Header */}
          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Registered Users
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                View and manage all registered accounts.
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name or email..."
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-xs"
            />
          </div>

          {/* Loading */}
          {loading && (
            <div className="p-12 text-center text-gray-500">
              Loading users...
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="p-8 text-center text-red-600">
              <p>{error}</p>

              <button
                onClick={() => {
                  fetchUsers();
                  fetchStats();
                }}
                className="mt-3 font-semibold underline"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && users.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              No users found.
            </div>
          )}

          {/* User Data */}
          {!loading && !error && users.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Verification</th>
                      <th className="px-6 py-4">Joined Date</th>
                      <th className="px-6 py-4">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {users.map((user) => {
                      const isCurrentUser =
                        user._id === currentUserId;

                      return (
                        <tr
                          key={user._id}
                          className="transition hover:bg-gray-50"
                        >
                          {/* User Information */}
                          <td className="px-6 py-4">
                            <p className="font-semibold text-gray-900">
                              {user.name}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-blue-600">
                                  (You)
                                </span>
                              )}
                            </p>

                            <p className="mt-1 text-gray-500">
                              {user.email}
                            </p>
                          </td>

                          {/* Role */}
                          <td className="px-6 py-4">
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
                              className={`rounded-full border-0 px-3 py-2 text-xs font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-60 ${getRoleStyle(user.role)}`}
                            >
                              <option value="customer">
                                Customer
                              </option>

                              <option value="seller">
                                Seller
                              </option>

                              <option value="admin">
                                Admin
                              </option>
                            </select>

                            {savingUserId === user._id && (
                              <p className="mt-1 text-xs text-gray-400">
                                Saving...
                              </p>
                            )}
                          </td>

                          {/* Verification */}
                          <td className="px-6 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                user.isVerified
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {user.isVerified
                                ? "Verified"
                                : "Unverified"}
                            </span>
                          </td>

                          {/* Joined Date */}
                          <td className="px-6 py-4 text-gray-500">
                            {new Date(
                              user.createdAt
                            ).toLocaleDateString()}
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <button
                              onClick={() =>
                                setDeletingUser(user)
                              }
                              disabled={isCurrentUser}
                              className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
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
              <div className="flex flex-col gap-3 border-t border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Page {pagination.currentPage || 1} of{" "}
                  {pagination.totalPages || 1}
                  {" · "}
                  {pagination.totalUsers || 0} users
                </p>

                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((previousPage) => previousPage - 1)
                    }
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    disabled={
                      page >= (pagination.totalPages || 1)
                    }
                    onClick={() =>
                      setPage((previousPage) => previousPage + 1)
                    }
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-xl">
              🗑️
            </div>

            <h2
              id="delete-user-title"
              className="mt-4 text-lg font-bold text-gray-900"
            >
              Delete User
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Are you sure you want to delete{" "}
              <strong>{deletingUser.name}</strong>?
              This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                disabled={deleting}
                onClick={() => setDeletingUser(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                disabled={deleting}
                onClick={handleDeleteUser}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
