
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api/seller/orders";

const statusOptions = [
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

function SellerOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedStatuses, setSelectedStatuses] = useState({});

  const getAuthConfig = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  // Fetch seller orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await axios.get(API_URL, getAuthConfig());

      setOrders(response.data.orders || []);

      const initialStatuses = {};
      (response.data.orders || []).forEach((order) => {
        initialStatuses[order._id] = order.status;
      });

      setSelectedStatuses(initialStatuses);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate("/login");
      } else {
        setError("Unable to load orders. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Update order status
  const handleStatusUpdate = async (orderId) => {
    const newStatus = selectedStatuses[orderId];

    try {
      setUpdatingId(orderId);
      setError("");

      const response = await axios.put(
        `${API_URL}/${orderId}/status`,
        { status: newStatus },
        getAuthConfig()
      );

      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId
            ? { ...order, status: response.data.order.status }
            : order
        )
      );

      setSelectedStatuses((prev) => ({
        ...prev,
        [orderId]: response.data.order.status,
      }));

      alert("Order status updated successfully!");
    } catch (err) {
      alert(
        err.response?.data?.message ||
        "Failed to update order status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-700",
      confirmed: "bg-blue-100 text-blue-700",
      processing: "bg-indigo-100 text-indigo-700",
      shipped: "bg-purple-100 text-purple-700",
      delivered: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
    };

    return styles[status] || "bg-gray-100 text-gray-700";
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-BD", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              My Orders
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage orders received by your store.
            </p>
          </div>

          <Link
            to="/seller/dashboard"
            className="w-fit rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Statistics */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Orders</p>
            <h2 className="mt-2 text-3xl font-bold text-gray-800">
              {orders.length}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Pending</p>
            <h2 className="mt-2 text-3xl font-bold text-yellow-600">
              {orders.filter((o) => o.status === "pending").length}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Processing</p>
            <h2 className="mt-2 text-3xl font-bold text-indigo-600">
              {orders.filter((o) => o.status === "processing").length}
            </h2>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Delivered</p>
            <h2 className="mt-2 text-3xl font-bold text-green-600">
              {orders.filter((o) => o.status === "delivered").length}
            </h2>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-100 p-4 text-red-700">
            {error}
            <button
              onClick={fetchOrders}
              className="ml-3 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!error && orders.length === 0 && (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <h2 className="text-xl font-bold text-gray-800">
              No orders yet
            </h2>
            <p className="mt-2 text-gray-500">
              Orders containing your products will appear here.
            </p>
            <Link
              to="/seller/products"
              className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
            >
              View My Products
            </Link>
          </div>
        )}

        {/* Orders */}
        <div className="space-y-6">
          {orders.map((order) => {
            const isFinal =
              order.status === "delivered" ||
              order.status === "cancelled";

            return (
              <div
                key={order._id}
                className="overflow-hidden rounded-xl bg-white shadow-sm"
              >
                {/* Order header */}
                <div className="flex flex-col justify-between gap-4 border-b p-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-medium uppercase text-gray-400">
                      Order ID
                    </p>
                    <p className="mt-1 break-all font-semibold text-gray-800">
                      {order._id}
                    </p>
                    <p className="mt-2 text-sm text-gray-500">
                      Placed on {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${getStatusStyle(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>

                    <span className="text-lg font-bold text-blue-600">
                      ৳{Number(order.totalAmount).toLocaleString("en-BD")}
                    </span>
                  </div>
                </div>

                <div className="grid gap-6 p-5 lg:grid-cols-2">

                  {/* Customer details */}
                  <div>
                    <h3 className="mb-3 font-semibold text-gray-800">
                      Customer Information
                    </h3>

                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        <strong>Name:</strong>{" "}
                        {order.shippingName}
                      </p>

                      <p>
                        <strong>Email:</strong>{" "}
                        {order.customerId?.email || "Not available"}
                      </p>

                      <p>
                        <strong>Phone:</strong>{" "}
                        {order.shippingPhone}
                      </p>

                      <p>
                        <strong>Address:</strong>{" "}
                        {order.shippingAddress}
                      </p>
                    </div>

                    <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">
                      <p>
                        <strong>Payment:</strong> Cash on Delivery
                      </p>
                      <p className="mt-1">
                        <strong>Payment Status:</strong>{" "}
                        <span className="capitalize">
                          {order.paymentStatus}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Ordered products */}
                  <div>
                    <h3 className="mb-3 font-semibold text-gray-800">
                      Ordered Products
                    </h3>

                    <div className="space-y-3">
                      {order.items.map((item, index) => (
                        <div
                          key={`${order._id}-${index}`}
                          className="flex items-center gap-3 rounded-lg bg-gray-50 p-3"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-14 w-14 rounded-lg object-cover"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-gray-800">
                              {item.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              Quantity: {item.quantity}
                            </p>
                          </div>

                          <p className="whitespace-nowrap font-semibold text-gray-800">
                            ৳{(
                              Number(item.price) *
                              Number(item.quantity)
                            ).toLocaleString("en-BD")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status update */}
                <div className="flex flex-col justify-between gap-4 border-t bg-gray-50 p-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-semibold text-gray-800">
                      Update Order Status
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {isFinal
                        ? "This order has reached its final status."
                        : "Choose the next status for this order."}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={selectedStatuses[order._id] || order.status}
                      onChange={(e) =>
                        setSelectedStatuses((prev) => ({
                          ...prev,
                          [order._id]: e.target.value,
                        }))
                      }
                      disabled={isFinal || updatingId === order._id}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100"
                    >
                      {order.status === "pending" && (
                        <option value="pending">Pending</option>
                      )}

                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleStatusUpdate(order._id)}
                      disabled={
                        isFinal ||
                        updatingId === order._id ||
                        selectedStatuses[order._id] === order.status
                      }
                      className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingId === order._id
                        ? "Updating..."
                        : "Update Status"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default SellerOrders;
