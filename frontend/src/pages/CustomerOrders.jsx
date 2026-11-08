
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const API_URL = "http://localhost:5000/api/orders";

const STATUS_STEPS = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

function formatPrice(price) {
  return `৳${Number(price || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date) {
  return date
    ? new Date(date).toLocaleString("en-BD", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "N/A";
}

function CustomerOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedOrder, setExpandedOrder] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const response = await axios.get(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setOrders(response.data.orders || []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("userInfo");
        navigate("/login", { replace: true });
        return;
      }

      setError(
        err.response?.data?.message ||
          "Unable to load your orders. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const getStatusStyle = (status) => {
    const styles = {
      pending: "bg-amber-100 text-amber-800",
      confirmed: "bg-blue-100 text-blue-800",
      processing: "bg-purple-100 text-purple-800",
      shipped: "bg-indigo-100 text-indigo-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };

    return styles[status] || "bg-slate-100 text-slate-700";
  };

  const renderTracking = (status) => {
    if (status === "cancelled") {
      return (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-700">Order Cancelled</p>
          <p className="mt-1 text-sm text-red-600">
            This order will not proceed to delivery.
          </p>
        </div>
      );
    }

    const currentIndex = STATUS_STEPS.indexOf(status);

    return (
      <div className="mt-6">
        <h4 className="mb-5 text-sm font-bold text-slate-800">
          Order Tracking
        </h4>

        <div className="flex items-start">
          {STATUS_STEPS.map((step, index) => {
            const completed = index <= currentIndex;

            return (
              <div
                key={step}
                className="relative flex flex-1 flex-col items-center"
              >
                {index > 0 && (
                  <div
                    className={`absolute right-1/2 top-3 h-1 w-full ${
                      completed ? "bg-blue-600" : "bg-slate-200"
                    }`}
                  />
                )}

                <div
                  className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    completed
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  {completed ? "✓" : index + 1}
                </div>

                <span
                  className={`mt-2 text-center text-[10px] capitalize sm:text-xs ${
                    completed
                      ? "font-semibold text-blue-700"
                      : "text-slate-400"
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
              Customer Account
            </p>

            <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
              My Orders
            </h1>

            <p className="mt-2 text-slate-600">
              View your purchases and track their delivery progress.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Orders"}
          </button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total orders</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {orders.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active orders</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {orders.filter(
                (order) =>
                  !["delivered", "cancelled"].includes(order.status)
              ).length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Delivered orders</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {orders.filter((order) => order.status === "delivered").length}
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            Loading your orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <h2 className="text-2xl font-bold text-slate-900">
              No orders yet
            </h2>

            <p className="mt-2 text-slate-600">
              Your purchases will appear here after checkout.
            </p>

            <Link
              to="/products"
              className="mt-6 inline-flex rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <section className="space-y-5">
            {orders.map((order) => {
              const isExpanded = expandedOrder === order._id;

              return (
                <article
                  key={order._id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Order ID
                        </p>

                        <p className="mt-1 break-all font-bold text-slate-900">
                          {order._id}
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
                          Placed on {formatDate(order.createdAt)}
                        </p>
                      </div>

                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-bold capitalize ${getStatusStyle(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-slate-500">Seller</p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {order.sellerId?.role === "admin"
                            ? "LUTech Admin"
                            : order.sellerId?.storeName ||
                              order.sellerId?.name ||
                              "Seller information unavailable"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Products</p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {order.items?.reduce(
                            (total, item) => total + item.quantity,
                            0
                          ) || 0}{" "}
                          item(s)
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Order total</p>
                        <p className="mt-1 text-xl font-extrabold text-blue-700">
                          {formatPrice(order.totalAmount)}
                        </p>
                      </div>
                    </div>

                    {renderTracking(order.status)}

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
                      <div className="text-sm text-slate-600">
                        <span className="font-semibold">Payment:</span>{" "}
                        Cash on Delivery
                        <span className="ml-2 capitalize">
                          ({order.paymentStatus || "pending"})
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedOrder(isExpanded ? null : order._id)
                        }
                        className="rounded-lg border border-blue-700 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        {isExpanded ? "Hide Details" : "View Details"}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="mt-5 space-y-5 border-t border-slate-100 pt-5">
                        <div>
                          <h3 className="mb-3 font-bold text-slate-900">
                            Ordered Products
                          </h3>

                          <div className="space-y-3">
                            {order.items?.map((item, index) => (
                              <div
                                key={item._id || index}
                                className="flex flex-wrap justify-between gap-3 rounded-lg bg-slate-50 p-3"
                              >
                                <div>
                                  <p className="font-semibold text-slate-800">
                                    {item.name}
                                  </p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {formatPrice(item.price)} ×{" "}
                                    {item.quantity}
                                  </p>
                                </div>

                                <p className="font-bold text-slate-900">
                                  {formatPrice(item.price * item.quantity)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-4">
                          <h3 className="font-bold text-slate-900">
                            Delivery Information
                          </h3>

                          <p className="mt-2 text-sm text-slate-700">
                            {order.shippingName}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            {order.shippingPhone}
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            {order.shippingAddress}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default CustomerOrders;
