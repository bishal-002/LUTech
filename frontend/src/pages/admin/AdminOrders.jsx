
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api/admin/orders";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
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

function AdminOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);

  const userInfo = (() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo") || "{}");
    } catch {
      return {};
    }
  })();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userInfo");
    navigate("/admin/login", { replace: true });
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/admin/login", { replace: true });
        return;
      }

      const response = await axios.get(API_URL, {
        params: { status: selectedStatus },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setOrders(response.data.orders || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load orders. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, navigate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateOrderStatus = async (orderId, status) => {
    try {
      setUpdatingId(orderId);
      setError("");

      const token = localStorage.getItem("token");

      await axios.put(
        `${API_URL}/${orderId}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await fetchOrders();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update order status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      {/* Navigation */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/admin/dashboard"
            className="text-2xl font-bold tracking-tight text-blue-700"
          >
            LUTech <span className="text-slate-500">Admin</span>
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              to="/admin/users"
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-600"
            >
              User Management
            </Link>

            <Link
              to="/admin/orders"
              className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
            >
              Orders
            </Link>
          </nav>

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
        {/* Page heading */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
              Administration
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Order Management
            </h1>

            <p className="mt-2 text-slate-600">
              Monitor and manage all customer orders across LUTech.
            </p>
          </div>

          <button
            onClick={fetchOrders}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Orders"}
          </button>
        </div>

        {/* Summary */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Orders displayed</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {orders.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pending orders displayed</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {orders.filter((order) => order.status === "pending").length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Delivered orders displayed</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {orders.filter((order) => order.status === "delivered").length}
            </p>
          </div>
        </section>

        {/* Filter */}
        <section className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">All Orders</h2>
            <p className="mt-1 text-sm text-slate-500">
              Filter orders by their current status.
            </p>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="all">All Orders</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </section>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {/* Orders */}
        <section className="space-y-5">
          {loading ? (
            <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
              Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <h3 className="text-xl font-bold text-slate-900">
                No orders found
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                No orders match the selected filter.
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const isFinal = ["delivered", "cancelled"].includes(
                order.status
              );

              return (
                <article
                  key={order._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Order ID
                      </p>
                      <p className="mt-1 break-all font-bold text-slate-900">
                        {order._id}
                      </p>
                      <p className="mt-2 text-sm text-slate-500">
                        {formatDate(order.createdAt)}
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

                  <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Customer
                      </p>
                      <p className="mt-2 font-semibold text-slate-900">
                        {order.customerId?.name || order.shippingName}
                      </p>
                      <p className="mt-1 break-all text-sm text-slate-500">
                        {order.customerId?.email || "N/A"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Seller
                      </p>
                      <p className="mt-2 font-semibold text-slate-900">
                        {order.sellerId?.role === "admin"
                          ? "LUTech Admin"
                          : order.sellerId?.storeName ||
                            order.sellerId?.name ||
                            "Seller information unavailable"}
                      </p>
                      <p className="mt-1 break-all text-sm text-slate-500">
                        {order.sellerId?.email || "N/A"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Order total
                      </p>
                      <p className="mt-2 text-xl font-bold text-blue-700">
                        {formatPrice(order.totalAmount)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {order.items?.length || 0} product types
                      </p>
                    </div>
                  </div>

                  {/* Products */}
                  <div className="mt-5 rounded-xl bg-slate-50 p-4">
                    <h3 className="mb-3 text-sm font-bold text-slate-800">
                      Ordered Products
                    </h3>

                    <div className="space-y-3">
                      {order.items?.map((item, index) => (
                        <div
                          key={item._id || index}
                          className="flex flex-wrap justify-between gap-2 text-sm"
                        >
                          <span className="text-slate-700">
                            {item.name} × {item.quantity}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shipping and payment */}
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Delivery Information
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {order.shippingName}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {order.shippingPhone}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {order.shippingAddress}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">
                        Payment
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        Method:{" "}
                        <span className="font-semibold">
                          {order.paymentMethod || "COD"}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        Payment status:{" "}
                        <span className="font-semibold capitalize">
                          {order.paymentStatus || "pending"}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Status update */}
                  <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        Update Order Status
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {isFinal
                          ? "This order has reached a final status."
                          : "Choose a new status and save your changes."}
                      </p>
                    </div>

                    <select
                      value={order.status}
                      disabled={isFinal || updatingId === order._id}
                      onChange={(e) =>
                        updateOrderStatus(order._id, e.target.value)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium capitalize outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      {ORDER_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>

                    {updatingId === order._id && (
                      <span className="text-sm text-blue-700">
                        Updating...
                      </span>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}

export default AdminOrders;
