
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api/seller";

function SellerDashboard() {
  const navigate = useNavigate();

  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get(`${API_URL}/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setSeller(response.data.seller);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate("/login");
        } else {
          setError("Unable to load your dashboard. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userInfo");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading Seller Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* Sidebar */}
      <aside className="hidden w-64 flex-col bg-slate-900 text-white md:flex">
        <div className="border-b border-slate-700 px-6 py-6">
          <h1 className="text-2xl font-bold text-white">LUTech</h1>
          <p className="mt-1 text-sm text-slate-400">Seller Portal</p>
        </div>

        <nav className="flex-1 space-y-2 px-4 py-6">
          <Link
            to="/seller/dashboard"
            className="block rounded-lg bg-blue-600 px-4 py-3 font-medium"
          >
            Dashboard
          </Link>

          <Link
            to="/seller/products"
            className="block rounded-lg px-4 py-3 text-slate-300 hover:bg-slate-800"
          >
            My Products
          </Link>

          <Link
            to="/seller/products/add"
            className="block rounded-lg px-4 py-3 text-slate-300 hover:bg-slate-800"
          >
            Add Product
          </Link>

          <Link
            to="/seller/orders"
            className="block rounded-lg px-4 py-3 text-slate-300 hover:bg-slate-800"
          >
            My Orders
          </Link>

          <Link
            to="/seller/profile"
            className="block rounded-lg px-4 py-3 text-slate-300 hover:bg-slate-800"
          >
            Store Profile
          </Link>
        </nav>

        <div className="border-t border-slate-700 p-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-4 py-3 text-left text-red-400 hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1">

        {/* Top navigation */}
        <header className="flex items-center justify-between border-b bg-white px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              Seller Dashboard
            </h2>
            <p className="text-sm text-gray-500">
              Manage your store and business.
            </p>
          </div>

          <div className="text-right">
            <p className="font-semibold text-gray-800">{seller?.name}</p>
            <p className="text-sm text-gray-500">Seller Account</p>
          </div>
        </header>

        <div className="p-6">

          {/* Welcome section */}
          <div className="rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 p-8 text-white shadow">
            <p className="text-sm text-blue-100">Welcome back,</p>
            <h1 className="mt-2 text-3xl font-bold">
              {seller?.name}!
            </h1>
            <p className="mt-3 text-blue-100">
              Manage your products and keep track of your store.
            </p>
          </div>

          {/* Account information */}
          <div className="mt-8">
            <h3 className="mb-4 text-lg font-bold text-gray-800">
              Account Overview
            </h3>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

              <div className="rounded-xl bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-500">Seller Name</p>
                <h3 className="mt-2 text-lg font-semibold text-gray-800">
                  {seller?.name}
                </h3>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-500">Email Address</p>
                <h3 className="mt-2 break-all text-lg font-semibold text-gray-800">
                  {seller?.email}
                </h3>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-500">Account Status</p>
                <span className="mt-3 inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                  Approved Seller
                </span>
              </div>

            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-8">
            <h3 className="mb-4 text-lg font-bold text-gray-800">
              Quick Actions
            </h3>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">

              <Link
                to="/seller/products"
                className="rounded-xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <h4 className="text-lg font-bold text-gray-800">
                  My Products
                </h4>
                <p className="mt-2 text-sm text-gray-500">
                  View and manage your listed products.
                </p>
              </Link>

              <Link
                to="/seller/products/add"
                className="rounded-xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <h4 className="text-lg font-bold text-gray-800">
                  Add Product
                </h4>
                <p className="mt-2 text-sm text-gray-500">
                  Add a new product to your store.
                </p>
              </Link>

              <Link
                to="/seller/orders"
                className="rounded-xl border bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <h4 className="text-lg font-bold text-gray-800">
                  My Orders
                </h4>
                <p className="mt-2 text-sm text-gray-500">
                  View and manage customer orders.
                </p>
              </Link>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default SellerDashboard;
