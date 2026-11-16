
import { Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";

function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <p className="text-sm font-medium text-[#83CDB5]">
            LUTech Administration
          </p>

          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-teal-100/70">
            Welcome to the LUTech administration workspace.
          </p>
        </div>

        {/* Main Administration Card */}
        <section className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                Platform Administration
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                Manage Users & Sellers
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Manage registered accounts, review seller applications,
                approve or reject applications, and control user roles
                from one central location.
              </p>

              <Link
                to="/admin/users"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#103B37] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#18554C]"
              >
                Open User Management
                <span>→</span>
              </Link>
            </div>

            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-4xl">
              👥
            </div>
          </div>
        </section>

        {/* Administration Responsibilities */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">
              Administration Overview
            </h2>

            <p className="mt-1 text-sm text-teal-100/70">
              Main responsibilities of the LUTech administrator.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
                👤
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                User Management
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                View registered accounts, search users, manage account
                roles and maintain the user community.
              </p>

              <Link
                to="/admin/users"
                className="mt-4 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-900"
              >
                Manage users →
              </Link>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-xl">
                🏪
              </div>

              <h3 className="mt-4 font-bold text-slate-900">
                Seller Applications
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Review seller applications, verify submitted information
                and approve or reject seller requests.
              </p>

              <Link
                to="/admin/users"
                className="mt-4 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-900"
              >
                Review applications →
              </Link>
            </div>
          </div>
        </section>

        {/* Information */}
        <section className="rounded-2xl border border-[#83CDB5]/20 bg-[#092F30] p-5 sm:p-6">
          <h2 className="font-bold text-[#B9F4E4]">
            Admin Panel Information
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/65">
            The administrator is responsible for platform-level
            administration, user account management and seller
            application verification. Product and order operations
            remain within the seller and customer workspaces.
          </p>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminDashboard;
