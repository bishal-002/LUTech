
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProducts } from "../services/productService";

function AdminDashboard() {
  const navigate = useNavigate();
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      try {
        const data = await getProducts();
        const products = Array.isArray(data)
          ? data
          : data?.products ?? [];

        if (active) setProductCount(products.length);
      } catch {
        if (active) {
          setError("Could not load product statistics.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userInfo");
    navigate("/admin/login", { replace: true });
  };

  const userInfo = (() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo") || "{}");
    } catch {
      return {};
    }
  })();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/admin/dashboard"
            className="text-2xl font-bold tracking-tight text-blue-700"
          >
            LUTech <span className="text-slate-500">Admin</span>
          </Link>

          <Link
            to="/admin/users"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-blue-600"
          >
            User Management
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-600 sm:inline">
              {userInfo.name || userInfo.email || "Administrator"}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-slate-600">
            Manage the LUTech store from one place.
          </p>
        </div>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total products
            </p>
            <div className="mt-4 text-4xl font-bold text-slate-900">
              {loading ? "…" : productCount}
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Products currently returned by the API
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Store management
            </p>
            <h2 className="mt-4 text-xl font-bold">Product catalogue</h2>
            <p className="mt-2 text-sm text-slate-600">
              Review existing products and manage their details.
            </p>
            <Link
              to="/admin/products"
              className="mt-5 inline-flex rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Manage products
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Quick action
            </p>
            <h2 className="mt-4 text-xl font-bold">Add a product</h2>
            <p className="mt-2 text-sm text-slate-600">
              Add a new item to the store catalogue.
            </p>
            <Link
              to="/admin/products/add"
              className="mt-5 inline-flex rounded-lg border border-blue-700 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              Add product
            </Link>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          >
            {error} You can still open product management and try again.
          </div>
        )}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Admin shortcuts</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/admin/products"
              className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold hover:bg-slate-200"
            >
              View all products →
            </Link>
            <Link
              to="/"
              className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold hover:bg-slate-200"
            >
              View storefront →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
