
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../context/AuthContext";

import {
  getAdminUserStats,
  getSellerKycQueue,
  getProductsForModeration,
} from "../../services/adminService";

function StatCard({
  title,
  value,
  description,
  icon,
  accent = "emerald",
  loading,
}) {
  const accents = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    rose: "bg-rose-50 text-rose-700",
  };

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            {loading ? (
              <span className="inline-block h-9 w-16 animate-pulse rounded-lg bg-slate-100" />
            ) : value === null || value === undefined ? (
              <span className="text-xl text-slate-400">Unavailable</span>
            ) : (
              Number(value).toLocaleString()
            )}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${accents[accent]}`}
        >
          {icon}
        </div>
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-400">
        {description}
      </p>
    </article>
  );
}

function DashboardAction({
  title,
  description,
  icon,
  to,
  linkText,
  accent = "emerald",
}) {
  const accents = {
    emerald: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${accents[accent]}`}
        >
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900">
            {title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {description}
          </p>

          <Link
            to={to}
            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-900"
          >
            {linkText}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

function formatDate(date) {
  if (!date) return "Not available";

  return new Date(date).toLocaleString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AdminDashboard() {
  const { user, hasPermission } = useAuth();

  const canViewUsers = hasPermission("view_users");
  const canViewSellerApplications = hasPermission(
    "view_seller_applications"
  );
  const canApproveProducts = hasPermission("approve_products");

  const [data, setData] = useState({
    userStats: null,
    sellerQueue: null,
    productQueue: null,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setErrors({});

    const requests = {};

    if (canViewUsers) {
      requests.userStats = getAdminUserStats();
    }

    if (canViewSellerApplications) {
      requests.sellerQueue = getSellerKycQueue();
    }

    if (canApproveProducts) {
      requests.productQueue = getProductsForModeration();
    }

    const keys = Object.keys(requests);
    const results = await Promise.allSettled(
      keys.map((key) => requests[key])
    );

    const nextData = {
      userStats: null,
      sellerQueue: null,
      productQueue: null,
    };

    const nextErrors = {};

    results.forEach((result, index) => {
      const key = keys[index];

      if (result.status === "fulfilled") {
        if (key === "userStats") {
          nextData.userStats = result.value;
        }

        if (key === "sellerQueue") {
          nextData.sellerQueue = result.value;
        }

        if (key === "productQueue") {
          nextData.productQueue = result.value;
        }
      } else {
        nextErrors[key] =
          result.reason?.response?.data?.message ||
          result.reason?.message ||
          "Unable to load this dashboard section.";
      }
    });

    setData(nextData);
    setErrors(nextErrors);
    setLastUpdated(new Date());
    setLoading(false);
  }, [
    canViewUsers,
    canViewSellerApplications,
    canApproveProducts,
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const userStats = data.userStats;
  const sellerCount = data.sellerQueue?.count;
  const productCount =
    data.productQueue?.pagination?.totalProducts;

  const hasAnyPermission =
    canViewUsers ||
    canViewSellerApplications ||
    canApproveProducts;

  return (
    <AdminLayout>
      <div className="space-y-7">
        {/* Header */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#83CDB5]">
              LUTech Administration
            </p>

            <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
              Dashboard
            </h1>

            <p className="mt-2 text-sm text-teal-100/70">
              Welcome back, {user?.name || "Administrator"}.
              Here's your platform overview.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <button
              type="button"
              onClick={fetchDashboardData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#83CDB5]/30 bg-[#103B37] px-4 py-2.5 text-sm font-semibold text-[#B9F4E4] transition hover:bg-[#18554C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden="true">↻</span>
              {loading ? "Refreshing..." : "Refresh dashboard"}
            </button>

            {lastUpdated && (
              <p className="text-xs text-teal-100/50">
                Last updated: {formatDate(lastUpdated)}
              </p>
            )}
          </div>
        </section>

        {!hasAnyPermission && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Your administrator account does not currently have permission
            to view the available dashboard statistics.
          </div>
        )}

        {/* User Statistics */}
        {canViewUsers && (
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white">
                User Overview
              </h2>

              <p className="mt-1 text-sm text-teal-100/60">
                Account statistics retrieved from the admin API.
              </p>
            </div>

            {errors.userStats && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                User statistics: {errors.userStats}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total Accounts"
                value={userStats?.total}
                description="All registered platform accounts."
                icon="👥"
                accent="blue"
                loading={loading && !userStats}
              />

              <StatCard
                title="Customers"
                value={userStats?.customers}
                description="Accounts with the customer role."
                icon="🛍️"
                accent="emerald"
                loading={loading && !userStats}
              />

              <StatCard
                title="Sellers"
                value={userStats?.sellers}
                description="Accounts currently holding the seller role."
                icon="🏪"
                accent="amber"
                loading={loading && !userStats}
              />

              <StatCard
                title="Administrators"
                value={userStats?.admins}
                description="Accounts with administrator access."
                icon="🛡️"
                accent="violet"
                loading={loading && !userStats}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                title="Email Verified"
                value={userStats?.verified}
                description="Accounts with verified email addresses."
                icon="✓"
                accent="emerald"
                loading={loading && !userStats}
              />

              <StatCard
                title="Email Unverified"
                value={userStats?.unverified}
                description="Accounts that have not completed email verification."
                icon="✉"
                accent="rose"
                loading={loading && !userStats}
              />

              <StatCard
                title="Pending Seller Accounts"
                value={userStats?.pendingSellers}
                description="Accounts with pending seller status."
                icon="◷"
                accent="amber"
                loading={loading && !userStats}
              />
            </div>
          </section>
        )}

        {/* Operational Queue */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">
              Platform Operations
            </h2>

            <p className="mt-1 text-sm text-teal-100/60">
              Work requiring administrator attention.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {canViewSellerApplications && (
              <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Seller KYC Queue
                    </p>

                    <p className="mt-3 text-3xl font-extrabold text-slate-900">
                      {loading && sellerCount === undefined
                        ? "..."
                        : sellerCount === undefined
                          ? "Unavailable"
                          : sellerCount.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-xl text-amber-700">
                    🏪
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  Submitted seller applications awaiting KYC review.
                </p>

                {errors.sellerQueue && (
                  <p className="mt-3 text-xs text-red-600">
                    {errors.sellerQueue}
                  </p>
                )}

                <Link
                  to="/admin/seller-applications"
                  className="mt-5 inline-flex text-sm font-bold text-emerald-700 hover:text-emerald-900"
                >
                  Review applications →
                </Link>
              </article>
            )}

            {canApproveProducts && (
              <article className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Product Moderation
                    </p>

                    <p className="mt-3 text-3xl font-extrabold text-slate-900">
                      {loading && productCount === undefined
                        ? "..."
                        : productCount === undefined
                          ? "Unavailable"
                          : productCount.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700">
                    📦
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  Products currently awaiting moderation.
                </p>

                {errors.productQueue && (
                  <p className="mt-3 text-xs text-red-600">
                    {errors.productQueue}
                  </p>
                )}

                <p className="mt-5 text-xs font-semibold text-slate-400">
                  Product moderation page is the next module.
                </p>
              </article>
            )}

            {canViewUsers && (
              <DashboardAction
                title="User Management"
                description="Search registered users, inspect account roles and manage account status."
                icon="👤"
                to="/admin/users"
                linkText="Manage users"
                accent="blue"
              />
            )}
          </div>

          {!canViewSellerApplications &&
            !canApproveProducts &&
            !canViewUsers && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-teal-100/70">
                No operational sections are available for your current
                administrator permissions.
              </div>
            )}
        </section>

        {/* Quick access */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">
              Administration Workspace
            </h2>

            <p className="mt-1 text-sm text-teal-100/60">
              Access the currently implemented administration modules.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {canViewUsers && (
              <DashboardAction
                title="User Management"
                description="View registered customers and sellers, search accounts and inspect their status."
                icon="👥"
                to="/admin/users"
                linkText="Open user management"
                accent="blue"
              />
            )}

            {canViewSellerApplications && (
              <DashboardAction
                title="Seller Applications"
                description="Review seller applications and continue the seller verification workflow."
                icon="🏪"
                to="/admin/seller-applications"
                linkText="Open seller applications"
                accent="amber"
              />
            )}
          </div>
        </section>

        {/* Data transparency */}
        <section className="rounded-2xl border border-[#83CDB5]/20 bg-[#092F30] p-5 sm:p-6">
          <h2 className="font-bold text-[#B9F4E4]">
            Dashboard Data Information
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/65">
            Statistics are loaded from the existing LUTech admin APIs.
            Sections are displayed according to your administrator
            permissions. Revenue and order summary metrics are not shown
            because the current backend does not expose a dashboard
            statistics endpoint for those figures.
          </p>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
