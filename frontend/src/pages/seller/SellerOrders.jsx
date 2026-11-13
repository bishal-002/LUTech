
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api/seller/orders";

const statusOptions = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const statusStyles = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-sky-100 text-sky-700",
  processing: "bg-indigo-100 text-indigo-700",
  shipped: "bg-violet-100 text-violet-700",
  delivered: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
};

const formatDate = (date) => {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (amount) =>
  `৳${Number(amount || 0).toLocaleString("en-BD")}`;

function SellerOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedStatuses, setSelectedStatuses] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const getAuthConfig = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await axios.get(API_URL, getAuthConfig());
      const fetchedOrders = response.data.orders || [];

      setOrders(fetchedOrders);

      const initialStatuses = {};

      fetchedOrders.forEach((order) => {
        initialStatuses[order._id] = order.status;
      });

      setSelectedStatuses(initialStatuses);
    } catch (err) {
      if (
        err.response?.status === 401 ||
        err.response?.status === 403
      ) {
        navigate("/login");
      } else {
        setError(
          err.response?.data?.message ||
            "Unable to load orders. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const statistics = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((order) => order.status === "pending").length,
      processing: orders.filter(
        (order) => order.status === "processing"
      ).length,
      delivered: orders.filter(
        (order) => order.status === "delivered"
      ).length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      const matchesSearch =
        !query ||
        String(order._id || "").toLowerCase().includes(query) ||
        String(order.shippingName || "").toLowerCase().includes(query) ||
        String(order.customerId?.email || "")
          .toLowerCase()
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [orders, searchTerm, statusFilter]);

  const handleStatusUpdate = async (orderId) => {
    const newStatus = selectedStatuses[orderId];

    if (!newStatus) return;

    try {
      setUpdatingId(orderId);
      setError("");

      const response = await axios.put(
        `${API_URL}/${orderId}/status`,
        { status: newStatus },
        getAuthConfig()
      );

      const updatedStatus = response.data.order.status;

      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          order._id === orderId
            ? { ...order, status: updatedStatus }
            : order
        )
      );

      setSelectedStatuses((previous) => ({
        ...previous,
        [orderId]: updatedStatus,
      }));
    } catch (err) {
      window.alert(
        err.response?.data?.message ||
          "Failed to update order status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusSelection = (orderId, value) => {
    setSelectedStatuses((previous) => ({
      ...previous,
      [orderId]: value,
    }));
  };

  const isFinalStatus = (status) =>
    status === "delivered" || status === "cancelled";

  const StatCard = ({ label, value, description, icon, accent }) => (
    <div className="rounded-2xl border border-[#E6ECE8] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#718078]">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#173D36]">
            {value}
          </p>
          <p className="mt-1 text-xs text-[#89958F]">{description}</p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg ${accent}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );

  const StatusBadge = ({ status }) => (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${
        statusStyles[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      <span className="mr-2 h-1.5 w-1.5 rounded-full bg-current" />
      {status || "Unknown"}
    </span>
  );

  return (
    <div className="min-h-full space-y-7">
      {/* Page heading */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#83CDB5]">
            Order Management
          </p>

          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            My Orders
          </h1>

          <p className="mt-2 text-sm text-[#A8C0B9]">
            Manage customer orders and keep track of deliveries.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOrders}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#315B53] bg-[#123B38] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1B4B45] disabled:opacity-50"
        >
          <span>↻</span>
          Refresh Orders
        </button>
      </section>

      {/* Statistics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Orders"
          value={statistics.total}
          description="All orders received"
          icon="▤"
          accent="bg-[#E7F5EF] text-[#25845F]"
        />

        <StatCard
          label="Pending"
          value={statistics.pending}
          description="Awaiting confirmation"
          icon="◷"
          accent="bg-[#FFF3D9] text-[#B7791F]"
        />

        <StatCard
          label="Processing"
          value={statistics.processing}
          description="Currently being prepared"
          icon="↗"
          accent="bg-[#EDEBFF] text-[#6658C9]"
        />

        <StatCard
          label="Delivered"
          value={statistics.delivered}
          description="Successfully completed"
          icon="✓"
          accent="bg-[#E2F5EA] text-[#268451]"
        />
      </section>

      {/* Error message */}
      {error && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:flex-row sm:items-center">
          <p>{error}</p>

          <button
            type="button"
            onClick={fetchOrders}
            className="w-fit font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Search and filters */}
      <section className="rounded-2xl border border-[#E6ECE8] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-bold text-[#173D36]">Order List</h2>
            <p className="mt-1 text-xs text-[#839088]">
              Search and filter your store orders.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#87958D]">
                ⌕
              </span>

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search orders or customers..."
                className="w-full rounded-xl border border-[#E3EAE5] bg-[#F8FAF8] py-2.5 pl-9 pr-4 text-sm text-[#24433A] outline-none transition focus:border-[#55A88B] sm:w-64"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-[#E3EAE5] bg-[#F8FAF8] px-4 py-2.5 text-sm text-[#24433A] outline-none focus:border-[#55A88B]"
            >
              <option value="all">All Statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Loading state */}
      {loading && (
        <div className="rounded-2xl border border-[#315B53] bg-[#103633] px-5 py-16 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#426A60] border-t-[#83CDB5]" />
          <p className="mt-4 text-sm text-[#B5C9C1]">
            Loading your orders...
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && orders.length === 0 && (
        <div className="rounded-2xl border border-[#315B53] bg-[#103633] px-5 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1B4B43] text-3xl text-[#83CDB5]">
            ▤
          </div>

          <h2 className="mt-5 text-xl font-bold text-white">
            No orders yet
          </h2>

          <p className="mx-auto mt-2 max-w-sm text-sm text-[#A8C0B9]">
            Orders containing your products will appear here when customers
            place them.
          </p>

          <Link
            to="/seller/products"
            className="mt-6 inline-flex rounded-xl bg-[#83CDB5] px-5 py-2.5 text-sm font-bold text-[#123B35] transition hover:bg-[#A1DEC9]"
          >
            View My Products
          </Link>
        </div>
      )}

      {/* No filter results */}
      {!loading && !error && orders.length > 0 && filteredOrders.length === 0 && (
        <div className="rounded-2xl border border-[#315B53] bg-[#103633] px-5 py-12 text-center">
          <h3 className="font-semibold text-white">No matching orders</h3>
          <p className="mt-2 text-sm text-[#A8C0B9]">
            Try changing your search term or selected status.
          </p>

          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("all");
            }}
            className="mt-4 text-sm font-semibold text-[#83CDB5] hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Order cards */}
      {!loading && !error && filteredOrders.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Showing {filteredOrders.length} of {orders.length} orders
            </h2>
          </div>

          {filteredOrders.map((order) => {
            const finalStatus = isFinalStatus(order.status);
            const selectedStatus =
              selectedStatuses[order._id] || order.status;

            return (
              <article
                key={order._id}
                className="overflow-hidden rounded-2xl border border-[#E6ECE8] bg-white shadow-sm"
              >
                {/* Order header */}
                <div className="flex flex-col justify-between gap-4 border-b border-[#EAF0EC] p-5 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8B9991]">
                      Order ID
                    </p>

                    <p className="mt-1 break-all text-sm font-bold text-[#173D36]">
                      #{order._id}
                    </p>

                    <p className="mt-2 text-xs text-[#89958F]">
                      Placed on {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <StatusBadge status={order.status} />

                    <div className="sm:text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8B9991]">
                        Order Total
                      </p>
                      <p className="mt-1 text-xl font-bold text-[#21845F]">
                        {formatCurrency(order.totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order details */}
                <div className="grid gap-7 p-5 lg:grid-cols-2">
                  {/* Customer information */}
                  <div>
                    <h3 className="mb-4 text-sm font-bold text-[#173D36]">
                      Customer Information
                    </h3>

                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-xs text-[#8B9991]">Customer Name</p>
                        <p className="mt-1 font-medium text-[#344B40]">
                          {order.shippingName || "Not available"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[#8B9991]">Email Address</p>
                        <p className="mt-1 break-all font-medium text-[#344B40]">
                          {order.customerId?.email || "Not available"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[#8B9991]">Phone Number</p>
                        <p className="mt-1 font-medium text-[#344B40]">
                          {order.shippingPhone || "Not available"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-[#8B9991]">Delivery Address</p>
                        <p className="mt-1 leading-relaxed text-[#344B40]">
                          {order.shippingAddress || "Not available"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-xl bg-[#F5F8F5] p-4">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="text-[#839088]">Payment Method</span>
                        <span className="font-semibold text-[#344B40]">
                          Cash on Delivery
                        </span>
                      </div>

                      <div className="mt-3 flex justify-between gap-3 text-sm">
                        <span className="text-[#839088]">Payment Status</span>
                        <span className="font-semibold capitalize text-[#344B40]">
                          {order.paymentStatus || "Not available"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Products */}
                  <div>
                    <h3 className="mb-4 text-sm font-bold text-[#173D36]">
                      Ordered Products
                    </h3>

                    <div className="space-y-3">
                      {(order.items || []).map((item, index) => (
                        <div
                          key={`${order._id}-${index}`}
                          className="flex min-w-0 items-center gap-3 rounded-xl border border-[#EDF1ED] bg-[#FAFBFA] p-3"
                        >
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#EDF2EE]">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name || "Product"}
                                className="h-full w-full object-cover"
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xl text-[#91A49A]">
                                ◇
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#344B40]">
                              {item.name || "Unnamed product"}
                            </p>
                            <p className="mt-1 text-xs text-[#89958F]">
                              Quantity: {item.quantity}
                            </p>
                          </div>

                          <p className="shrink-0 text-sm font-bold text-[#21845F]">
                            {formatCurrency(
                              Number(item.price) * Number(item.quantity)
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status update */}
                <div className="flex flex-col justify-between gap-4 border-t border-[#EAF0EC] bg-[#F7F9F7] p-5 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="text-sm font-bold text-[#173D36]">
                      Order Status
                    </h3>

                    <p className="mt-1 text-xs text-[#89958F]">
                      {finalStatus
                        ? "This order has reached its final status."
                        : "Update the status as you process this order."}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <select
                      value={selectedStatus}
                      onChange={(event) =>
                        handleStatusSelection(order._id, event.target.value)
                      }
                      disabled={finalStatus || updatingId === order._id}
                      className="min-w-0 rounded-xl border border-[#DCE6DF] bg-white px-4 py-2.5 text-sm text-[#344B40] outline-none focus:border-[#55A88B] disabled:cursor-not-allowed disabled:bg-gray-100 sm:min-w-[160px]"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(order._id)}
                      disabled={
                        finalStatus ||
                        updatingId === order._id ||
                        selectedStatus === order.status
                      }
                      className="rounded-xl bg-[#1D7055] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#175A44] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {updatingId === order._id
                        ? "Updating..."
                        : "Update Status"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

export default SellerOrders;
