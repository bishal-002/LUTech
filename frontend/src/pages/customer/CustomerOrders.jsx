
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

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
  if (!date) return "N/A";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "N/A";

  return parsedDate.toLocaleString("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const STATUS_STYLES = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  confirmed: "border-blue-200 bg-blue-50 text-blue-800",
  processing: "border-purple-200 bg-purple-50 text-purple-800",
  shipped: "border-indigo-200 bg-indigo-50 text-indigo-800",
  delivered: "border-green-200 bg-green-50 text-green-800",
  cancelled: "border-red-200 bg-red-50 text-red-800",
};

function StatusBadge({ status }) {
  const normalizedStatus = status || "pending";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1.5 text-xs font-bold capitalize ${
        STATUS_STYLES[normalizedStatus] ||
        "border-[#E5E9E5] bg-[#F4F6F4] text-[#68766F]"
      }`}
    >
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {normalizedStatus}
    </span>
  );
}

function OrderTracking({ status }) {
  if (status === "cancelled") {
    return (
      <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-red-700">
              Order Cancelled
            </p>
            <p className="mt-1 text-xs leading-5 text-red-600">
              This order will not proceed to delivery.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentIndex = STATUS_STEPS.indexOf(status);

  return (
    <div className="mt-5 rounded-xl border border-[#E5E9E5] bg-[#F9FAF9] p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-[#20332B]">
          Order Tracking
        </h3>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#89958D]">
          Delivery progress
        </span>
      </div>

      <div className="w-full min-w-0 overflow-x-auto pb-2">
        <div className="flex min-w-[420px] items-start">
          {STATUS_STEPS.map((step, index) => {
            const completed =
              currentIndex >= 0 && index <= currentIndex;

            return (
              <div
                key={step}
                className="relative flex min-w-0 flex-1 flex-col items-center"
              >
                {index > 0 && (
                  <div
                    className={`absolute right-1/2 top-3 h-0.5 w-full ${
                      currentIndex >= index
                        ? "bg-[#1A2E26]"
                        : "bg-[#DCE3DC]"
                    }`}
                  />
                )}

                <div
                  className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold sm:h-7 sm:w-7 ${
                    completed
                      ? "border-[#1A2E26] bg-[#1A2E26] text-white"
                      : "border-[#C7D5CA] bg-white text-[#89958D]"
                  }`}
                >
                  {completed ? "✓" : index + 1}
                </div>

                <span
                  className={`mt-2 text-center text-[10px] capitalize sm:text-xs ${
                    completed
                      ? "font-bold text-[#1A2E26]"
                      : "text-[#89958D]"
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent = "primary" }) {
  const accentStyles = {
    primary: {
      value: "text-[#20332B]",
      icon: "bg-[#E5EDE7] text-[#1A2E26]",
    },
    orange: {
      value: "text-[#B9533B]",
      icon: "bg-[#FBECE7] text-[#B9533B]",
    },
    green: {
      value: "text-[#287A50]",
      icon: "bg-green-50 text-green-700",
    },
  };

  const style = accentStyles[accent];

  return (
    <div className="min-w-0 rounded-xl border border-[#E5E9E5] bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#89958D]">
            {label}
          </p>
          <p className={`mt-2 text-3xl font-extrabold ${style.value}`}>
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
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

  const activeOrders = orders.filter(
    (order) =>
      !["delivered", "cancelled"].includes(order.status)
  ).length;

  const deliveredOrders = orders.filter(
    (order) => order.status === "delivered"
  ).length;

  const toggleOrder = (orderId) => {
    setExpandedOrder((current) =>
      current === orderId ? null : orderId
    );
  };

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col bg-[#F4F6F4]">
      <Navbar />

      <main className="mx-auto box-border w-full max-w-[1440px] min-w-0 flex-1 px-4 py-7 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
        {/* Page Heading */}
        <div className="mb-7 flex min-w-0 flex-wrap items-end justify-between gap-4 border-b border-[#DCE3DC] pb-6 sm:mb-9">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-[#89958D]">
              <Link to="/" className="transition hover:text-[#1A2E26]">
                Home
              </Link>
              <span>/</span>
              <span className="text-[#1A2E26]">My Orders</span>
            </div>

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B9533B]">
              Customer Account
            </p>

            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#20332B] sm:text-4xl">
              My Orders
            </h1>

            <p className="mt-2 max-w-lg text-sm leading-6 text-[#68766F]">
              View your purchases and track their delivery progress.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#C7D5CA] bg-white px-4 py-2.5 text-sm font-semibold text-[#1A2E26] transition hover:border-[#1A2E26] hover:bg-[#EBF0EB] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            >
              <path d="M20 7v5h-5M4 17v-5h5" />
              <path d="M5.6 9a7 7 0 0 1 11.7-2L20 12M4 12l2.7 5a7 7 0 0 0 11.7-2" />
            </svg>
            {loading ? "Refreshing..." : "Refresh Orders"}
          </button>
        </div>

        {/* Order Statistics */}
        <section
          aria-label="Order statistics"
          className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
        >
          <StatCard
            label="Total Orders"
            value={orders.length}
            accent="primary"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M4 5h16v15H4zM8 9h8M8 13h8M8 17h5" />
              </svg>
            }
          />

          <StatCard
            label="Active Orders"
            value={activeOrders}
            accent="orange"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
            }
          />

          <StatCard
            label="Delivered Orders"
            value={deliveredOrders}
            accent="green"
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
            }
          />
        </section>

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <span className="min-w-0 flex-1">{error}</span>

            <button
              type="button"
              onClick={fetchOrders}
              className="shrink-0 font-bold underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="rounded-2xl border border-[#E5E9E5] bg-white px-5 py-16 text-center">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#E5EDE7] border-t-[#1A2E26]" />
            <p className="mt-4 text-sm font-medium text-[#68766F]">
              Loading your orders...
            </p>
          </div>
        ) : orders.length === 0 ? (
          /* Empty State */
          <div className="rounded-2xl border border-dashed border-[#C7D5CA] bg-white px-5 py-16 text-center sm:py-20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E5EDE7] text-[#1A2E26]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-8 w-8"
                aria-hidden="true"
              >
                <path d="M4 5h16v15H4zM8 9h8M8 13h5" />
                <path d="M8 2v3M16 2v3" />
              </svg>
            </div>

            <h2 className="mt-5 text-2xl font-bold text-[#20332B]">
              No orders yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68766F]">
              Your purchases will appear here after checkout. Explore
              our collection and find something you love.
            </p>

            <Link
              to="/products"
              className="mt-7 inline-flex items-center justify-center rounded-lg bg-[#1A2E26] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#294438]"
            >
              Browse Products
              <span className="ml-2">→</span>
            </Link>
          </div>
        ) : (
          /* Order List */
          <section className="min-w-0 space-y-5">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-[#20332B]">
                Your Purchase History
              </h2>

              <span className="text-xs text-[#89958D]">
                {orders.length}{" "}
                {orders.length === 1 ? "order" : "orders"}
              </span>
            </div>

            {orders.map((order) => {
              const isExpanded = expandedOrder === order._id;

              const itemCount =
                order.items?.reduce(
                  (total, item) =>
                    total + (Number(item.quantity) || 0),
                  0
                ) || 0;

              return (
                <article
                  key={order._id}
                  className="w-full min-w-0 overflow-hidden rounded-2xl border border-[#E5E9E5] bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="min-w-0 p-4 sm:p-6">
                    {/* Order Header */}
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#89958D]">
                          Order ID
                        </p>

                        <p className="mt-1 break-all text-sm font-bold text-[#20332B] sm:text-base">
                          {order._id}
                        </p>

                        <p className="mt-2 text-xs text-[#89958D]">
                          Placed on {formatDate(order.createdAt)}
                        </p>
                      </div>

                      <StatusBadge status={order.status} />
                    </div>

                    {/* Order Summary */}
                    <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[#E5E9E5] pt-5 sm:grid-cols-3">
                      <div className="min-w-0">
                        <p className="text-[11px] text-[#89958D]">
                          Seller
                        </p>

                        <p className="mt-1 break-words text-sm font-semibold text-[#20332B]">
                          {order.sellerId?.role === "admin"
                            ? "LUTech Admin"
                            : order.sellerId?.storeName ||
                              order.sellerId?.name ||
                              "Seller information unavailable"}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] text-[#89958D]">
                          Products
                        </p>

                        <p className="mt-1 text-sm font-semibold text-[#20332B]">
                          {itemCount} item(s)
                        </p>
                      </div>

                      <div className="col-span-2 min-w-0 sm:col-span-1">
                        <p className="text-[11px] text-[#89958D]">
                          Order Total
                        </p>

                        <p className="mt-1 text-lg font-extrabold text-[#1A2E26]">
                          {formatPrice(order.totalAmount)}
                        </p>
                      </div>
                    </div>

                    {/* Order Tracking */}
                    <OrderTracking status={order.status} />

                    {/* Payment and Details */}
                    <div className="mt-5 flex min-w-0 flex-col items-start justify-between gap-3 border-t border-[#E5E9E5] pt-4 sm:flex-row sm:items-center">
                      <div className="min-w-0 text-xs text-[#68766F]">
                        <span className="font-bold text-[#20332B]">
                          Payment:
                        </span>{" "}
                        Cash on Delivery
                        <span className="ml-1 capitalize text-[#89958D]">
                          ({order.paymentStatus || "pending"})
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleOrder(order._id)}
                        aria-expanded={isExpanded}
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#C7D5CA] px-4 py-2.5 text-xs font-bold text-[#1A2E26] transition hover:border-[#1A2E26] hover:bg-[#EBF0EB]"
                      >
                        {isExpanded ? "Hide Details" : "View Details"}

                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className={`h-4 w-4 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          aria-hidden="true"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    </div>

                    {/* Expanded Order Details */}
                    {isExpanded && (
                      <div className="mt-5 min-w-0 space-y-5 border-t border-[#E5E9E5] pt-5">
                        {/* Ordered Products */}
                        <div className="min-w-0">
                          <h3 className="mb-3 text-sm font-bold text-[#20332B]">
                            Ordered Products
                          </h3>

                          <div className="space-y-3">
                            {order.items?.map((item, index) => (
                              <div
                                key={item._id || index}
                                className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E9E5] bg-[#F9FAF9] p-3"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="break-words text-sm font-semibold text-[#20332B]">
                                    {item.name}
                                  </p>

                                  <p className="mt-1 text-xs text-[#89958D]">
                                    {formatPrice(item.price)} ×{" "}
                                    {item.quantity}
                                  </p>
                                </div>

                                <p className="shrink-0 whitespace-nowrap text-sm font-bold text-[#1A2E26]">
                                  {formatPrice(
                                    item.price * item.quantity
                                  )}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Delivery Information */}
                        <div className="min-w-0 rounded-xl border border-[#E5E9E5] bg-[#F4F6F4] p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#1A2E26]">
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                className="h-5 w-5"
                                aria-hidden="true"
                              >
                                <path d="M3 7h11v11H3zM14 11h4l3 3v4h-7z" />
                                <circle cx="7.5" cy="19" r="1.5" />
                                <circle cx="17.5" cy="19" r="1.5" />
                              </svg>
                            </div>

                            <h3 className="text-sm font-bold text-[#20332B]">
                              Delivery Information
                            </h3>
                          </div>

                          <div className="space-y-2 text-sm">
                            <p className="break-words font-semibold text-[#20332B]">
                              {order.shippingName}
                            </p>

                            <p className="break-words text-[#68766F]">
                              {order.shippingPhone}
                            </p>

                            <p className="break-words leading-6 text-[#68766F]">
                              {order.shippingAddress}
                            </p>
                          </div>
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
