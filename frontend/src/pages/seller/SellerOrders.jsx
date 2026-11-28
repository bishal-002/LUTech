
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getSellerOrders,
  updateSellerOrderStatus,
} from "../../services/sellerService";

const STATUS_LABELS = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  refused: "Refused",
  cancelled: "Cancelled",
};

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  refused: "bg-orange-100 text-orange-800",
  cancelled: "bg-rose-100 text-rose-800",
};

// Must match the backend changeOrderStatus() transition map.
const NEXT_STATUSES = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "refused"],
  delivered: [],
  refused: [],
  cancelled: [],
};

const formatCurrency = (value) =>
  `৳${Number(value || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value, includeTime = false) => {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? { hour: "numeric", minute: "2-digit" }
      : {}),
  });
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold ${
        STATUS_STYLES[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      <span className="mr-2 h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status] || status || "Unknown"}
    </span>
  );
}

function StatCard({ label, value, description, icon }) {
  return (
    <div className="rounded-2xl border border-[#E6ECE8] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#718078]">{label}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-[#173D36]">
            {value}
          </p>
          <p className="mt-1 text-xs text-[#89958F]">{description}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E7F5EF] text-lg text-[#25845F]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 text-sm">
      <span className="text-[#839088]">{label}</span>
      <span className="max-w-[65%] break-words text-right font-semibold text-[#344B40]">
        {value || "Not available"}
      </span>
    </div>
  );
}

function OrderItem({ item }) {
  const snapshot = item.snapshot || {};
  const title = snapshot.title || item.name || "Unnamed product";
  const image = snapshot.image || item.image;
  const unitPrice = item.unitPrice ?? item.price;
  const lineTotal = item.subtotal ?? Number(unitPrice || 0) * Number(item.quantity || 0);

  return (
    <div className="flex min-w-0 gap-3 rounded-xl border border-[#EDF1ED] bg-[#FAFBFA] p-3">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#EDF2EE]">
        {image ? (
          <img
            src={image}
            alt={title}
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
        <p className="break-words text-sm font-semibold text-[#344B40]">
          {title}
        </p>

        <p className="mt-1 text-xs text-[#89958F]">
          SKU: {snapshot.sku || "Not available"}
        </p>

        {snapshot.brand && (
          <p className="mt-1 text-xs text-[#89958F]">
            Brand: {snapshot.brand}
          </p>
        )}

        <p className="mt-1 text-xs text-[#89958F]">
          Quantity: {item.quantity} × {formatCurrency(unitPrice)}
        </p>
      </div>

      <p className="shrink-0 text-sm font-bold text-[#21845F]">
        {formatCurrency(lineTotal)}
      </p>
    </div>
  );
}

function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refusalNotes, setRefusalNotes] = useState({});
  const [expandedOrders, setExpandedOrders] = useState({});

  const fetchOrders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await getSellerOrders();
      setOrders(response.orders || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load your orders. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const statistics = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((order) => order.status === "pending").length,
    processing: orders.filter((order) =>
      ["confirmed", "processing"].includes(order.status)
    ).length,
    shipped: orders.filter((order) => order.status === "shipped").length,
    delivered: orders.filter((order) => order.status === "delivered").length,
    refused: orders.filter((order) => order.status === "refused").length,
  }), [orders]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      const customerName =
        order.customerId?.name ||
        order.shippingName ||
        "";

      const customerEmail = order.customerId?.email || "";

      const matchesSearch =
        !query ||
        String(order._id || "").toLowerCase().includes(query) ||
        customerName.toLowerCase().includes(query) ||
        customerEmail.toLowerCase().includes(query) ||
        String(order.shippingPhone || "").toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [orders, searchTerm, statusFilter]);

  const handleStatusUpdate = async (order, newStatus) => {
    if (!NEXT_STATUSES[order.status]?.includes(newStatus)) {
      setError("That status transition is not allowed.");
      return;
    }

    const refusalNote = refusalNotes[order._id] || "";

    if (newStatus === "refused" && refusalNote.length > 500) {
      setError("The refusal note cannot exceed 500 characters.");
      return;
    }

    const confirmationMessages = {
      confirmed: "Confirm this order?",
      processing: "Move this order to processing?",
      shipped: "Mark this order as shipped?",
      delivered: "Confirm that this order has been delivered?",
      refused: "Record this COD delivery as refused?",
      cancelled: "Cancel this order? The backend will attempt to restore inventory.",
    };

    if (!window.confirm(confirmationMessages[newStatus])) return;

    try {
      setUpdatingId(order._id);
      setError("");

      const response = await updateSellerOrderStatus(order._id, {
        status: newStatus,
        ...(newStatus === "refused" ? { refusalNote } : {}),
      });

      const updatedOrder = response.order;

      setOrders((previous) =>
        previous.map((item) =>
          item._id === order._id
            ? { ...item, ...updatedOrder }
            : item
        )
      );

      setRefusalNotes((previous) => ({
        ...previous,
        [order._id]: "",
      }));
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to update this order."
      );
    } finally {
      setUpdatingId("");
    }
  };

  const toggleExpanded = (orderId) => {
    setExpandedOrders((previous) => ({
      ...previous,
      [orderId]: !previous[orderId],
    }));
  };

  if (loading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-[#315B53] bg-[#103633]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#426A60] border-t-[#83CDB5]" />
          <p className="mt-4 text-sm text-[#B5C9C1]">
            Loading your orders...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-7">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#83CDB5]">
            Order Management
          </p>

          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            My Orders
          </h1>

          <p className="mt-2 text-sm text-[#A8C0B9]">
            Review customer orders and manage their fulfilment lifecycle.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchOrders(true)}
          disabled={refreshing}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#315B53] bg-[#123B38] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1B4B45] disabled:opacity-50"
        >
          <span>↻</span>
          {refreshing ? "Refreshing..." : "Refresh Orders"}
        </button>
      </section>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => fetchOrders(true)}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Orders"
          value={statistics.total}
          description="All orders received"
          icon="▤"
        />
        <StatCard
          label="Pending"
          value={statistics.pending}
          description="Awaiting confirmation"
          icon="◷"
        />
        <StatCard
          label="In Progress"
          value={statistics.processing}
          description="Confirmed or processing"
          icon="↗"
        />
        <StatCard
          label="Delivered"
          value={statistics.delivered}
          description="Successfully completed"
          icon="✓"
        />
      </section>

      <section className="rounded-2xl border border-[#E6ECE8] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-bold text-[#173D36]">Order List</h2>
            <p className="mt-1 text-xs text-[#839088]">
              {filteredOrders.length} of {orders.length} orders
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search order or customer..."
              className="w-full rounded-xl border border-[#E3EAE5] bg-[#F8FAF8] px-4 py-2.5 text-sm text-[#24433A] outline-none focus:border-[#55A88B] sm:w-64"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-[#E3EAE5] bg-[#F8FAF8] px-4 py-2.5 text-sm text-[#24433A] outline-none focus:border-[#55A88B]"
            >
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {!error && orders.length === 0 && (
        <div className="rounded-2xl border border-[#315B53] bg-[#103633] px-5 py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1B4B43] text-3xl text-[#83CDB5]">
            ▤
          </div>

          <h2 className="mt-5 text-xl font-bold text-white">No orders yet</h2>

          <p className="mx-auto mt-2 max-w-sm text-sm text-[#A8C0B9]">
            Orders containing your products will appear here after customers
            place them.
          </p>

          <Link
            to="/seller/products"
            className="mt-6 inline-flex rounded-xl bg-[#83CDB5] px-5 py-2.5 text-sm font-bold text-[#123B35] hover:bg-[#A1DEC9]"
          >
            View My Products
          </Link>
        </div>
      )}

      {orders.length > 0 && filteredOrders.length === 0 && (
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

      {filteredOrders.length > 0 && (
        <section className="space-y-5">
          {filteredOrders.map((order) => {
            const nextStatuses = NEXT_STATUSES[order.status] || [];
            const isUpdating = updatingId === order._id;
            const isExpanded = Boolean(expandedOrders[order._id]);

            return (
              <article
                key={order._id}
                className="overflow-hidden rounded-2xl border border-[#E6ECE8] bg-white shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 border-b border-[#EAF0EC] p-5 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#8B9991]">
                      Order ID
                    </p>

                    <p className="mt-1 break-all text-sm font-bold text-[#173D36]">
                      #{order._id}
                    </p>

                    <p className="mt-2 text-xs text-[#89958F]">
                      Placed on {formatDate(order.createdAt, true)}
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

                <div className="grid gap-7 p-5 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-4 text-sm font-bold text-[#173D36]">
                      Customer & Delivery
                    </h3>

                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-xs text-[#8B9991]">Customer Name</p>
                        <p className="mt-1 font-medium text-[#344B40]">
                          {order.shippingName || order.customerId?.name || "Not available"}
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

                    <div className="mt-5 space-y-3 rounded-xl bg-[#F5F8F5] p-4">
                      <DetailRow
                        label="Payment Method"
                        value={order.paymentMethod || "COD"}
                      />
                      <DetailRow
                        label="Payment Status"
                        value={order.paymentStatus}
                      />
                      <DetailRow
                        label="Subtotal"
                        value={formatCurrency(order.subtotal)}
                      />
                      <DetailRow
                        label="Shipping Fee"
                        value={formatCurrency(order.shippingFee)}
                      />
                      <DetailRow
                        label="Discount"
                        value={formatCurrency(order.discount)}
                      />
                      <div className="border-t border-[#DCE7DF] pt-3">
                        <DetailRow
                          label="Total"
                          value={formatCurrency(order.totalAmount)}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-4 text-sm font-bold text-[#173D36]">
                      Ordered Products ({order.items?.length || 0})
                    </h3>

                    <div className="space-y-3">
                      {(order.items || []).map((item, index) => (
                        <OrderItem
                          key={`${order._id}-${index}`}
                          item={item}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpanded(order._id)}
                      className="mt-4 text-xs font-bold text-[#1D7055] hover:underline"
                    >
                      {isExpanded ? "Hide order timeline" : "View order timeline"}
                    </button>

                    {isExpanded && (
                      <div className="mt-4 space-y-3 rounded-xl bg-[#F5F8F5] p-4">
                        {[
                          ["Order placed", order.createdAt],
                          ["Confirmed", order.confirmedAt],
                          ["Shipped", order.shippedAt],
                          ["Delivered", order.deliveredAt],
                          ["Refused", order.refusedAt],
                          ["Cancelled", order.cancelledAt],
                        ].map(([label, date]) => (
                          <div key={label} className="flex justify-between gap-3 text-xs">
                            <span className="text-[#839088]">{label}</span>
                            <span className="font-semibold text-[#344B40]">
                              {date ? formatDate(date, true) : "—"}
                            </span>
                          </div>
                        ))}

                        {order.refusalNote && (
                          <div className="border-t border-[#DCE7DF] pt-3">
                            <p className="text-xs font-bold text-[#344B40]">
                              Refusal note
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[#68766F]">
                              {order.refusalNote}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-[#EAF0EC] bg-[#F7F9F7] p-5">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div>
                      <h3 className="text-sm font-bold text-[#173D36]">
                        Order Status
                      </h3>

                      <p className="mt-1 text-xs text-[#89958F]">
                        {nextStatuses.length
                          ? "Choose one of the permitted next steps."
                          : "This order has reached its final status."}
                      </p>
                    </div>

                    {nextStatuses.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {nextStatuses.map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleStatusUpdate(order, status)}
                            className={`rounded-xl px-4 py-2.5 text-xs font-bold transition disabled:opacity-50 ${
                              status === "cancelled" || status === "refused"
                                ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                                : "bg-[#1D7055] text-white hover:bg-[#175A44]"
                            }`}
                          >
                            {isUpdating
                              ? "Updating..."
                              : `Mark ${STATUS_LABELS[status]}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {order.status === "shipped" &&
                    nextStatuses.includes("refused") && (
                      <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
                        <label className="block text-xs font-bold text-orange-900">
                          COD refusal note (optional)
                          <textarea
                            rows={2}
                            maxLength={500}
                            value={refusalNotes[order._id] || ""}
                            onChange={(event) =>
                              setRefusalNotes((previous) => ({
                                ...previous,
                                [order._id]: event.target.value,
                              }))
                            }
                            placeholder="Record any relevant delivery/refusal information..."
                            className="mt-2 w-full rounded-lg border border-orange-200 bg-white p-3 text-sm text-[#344B40] outline-none focus:border-orange-400"
                          />
                        </label>

                        <p className="mt-1 text-right text-[10px] text-orange-800">
                          {(refusalNotes[order._id] || "").length}/500
                        </p>
                      </div>
                    )}
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
