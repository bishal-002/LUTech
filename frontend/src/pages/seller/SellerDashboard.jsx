
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getMyProducts } from "../../services/productService";
import {
  getSellerDashboard,
  getSellerOrders,
} from "../../services/sellerService";

const formatMoney = (amount) =>
  `৳${Number(amount || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;

const formatDate = (date) => {
  if (!date) return "—";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString("en-BD", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

const getOrderId = (id) => String(id || "").slice(-8).toUpperCase();

const getProductStock = (product) => {
  if (!Array.isArray(product.variants)) return 0;

  return product.variants.reduce(
    (total, variant) =>
      total + Math.max(0, Number(variant.stockQuantity || 0)),
    0
  );
};

const statusStyles = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-sky-100 text-sky-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-violet-100 text-violet-800",
  delivered: "bg-emerald-100 text-emerald-800",
  refused: "bg-rose-100 text-rose-800",
  cancelled: "bg-slate-100 text-slate-700",
};

function MetricCard({ label, value, description, icon }) {
  return (
    <article className="rounded-2xl border border-[#E6ECE8] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#718078]">{label}</p>
          <p className="mt-3 break-words text-2xl font-extrabold tracking-tight text-[#173D36] sm:text-3xl">
            {value}
          </p>
          <p className="mt-1 text-xs text-[#89958F]">{description}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E7F5EF] text-xl text-[#25845F]">
          {icon}
        </div>
      </div>
    </article>
  );
}

function SectionHeading({ title, description, action, to }) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-lg font-bold text-[#173D36]">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-[#839088]">{description}</p>
        )}
      </div>
      {action && (
        <Link
          to={to}
          className="w-fit text-sm font-semibold text-[#1D7055] hover:underline"
        >
          {action} →
        </Link>
      )}
    </div>
  );
}

function SellerDashboard() {
  const [seller, setSeller] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [dashboardResponse, productsResponse, ordersResponse] =
        await Promise.all([
          getSellerDashboard(),
          getMyProducts({ params: { page: 1, limit: 100 } }),
          getSellerOrders(),
        ]);

      setSeller(dashboardResponse.seller || null);
      setProducts(productsResponse.products || []);
      setOrders(ordersResponse.orders || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load your seller dashboard. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const metrics = useMemo(() => {
    const pending = orders.filter(
      (order) => order.status === "pending"
    ).length;

    const activeOrders = orders.filter((order) =>
      ["confirmed", "processing", "shipped"].includes(order.status)
    ).length;

    const deliveredOrders = orders.filter(
      (order) => order.status === "delivered"
    );

    const deliveredOrderValue = deliveredOrders.reduce(
      (total, order) => total + Number(order.totalAmount || 0),
      0
    );

    const lowStock = products.filter((product) => {
      const stock = getProductStock(product);
      return stock > 0 && stock <= 5;
    }).length;

    const outOfStock = products.filter(
      (product) => getProductStock(product) === 0
    ).length;

    const customers = new Set(
      orders
        .map((order) => order.customerId?._id)
        .filter(Boolean)
        .map(String)
    );

    return {
      totalProducts: products.length,
      totalOrders: orders.length,
      pending,
      activeOrders,
      deliveredOrders: deliveredOrders.length,
      deliveredOrderValue,
      lowStock,
      outOfStock,
      customers: customers.size,
    };
  }, [products, orders]);

  const recentOrders = useMemo(
    () =>
      [...orders]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        )
        .slice(0, 5),
    [orders]
  );

  const recentProducts = useMemo(
    () =>
      [...products]
        .sort(
          (a, b) =>
            new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        )
        .slice(0, 5),
    [products]
  );

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#315B53] border-t-[#83CDB5]" />
          <p className="mt-4 text-sm text-[#B5C9C1]">
            Loading your business dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-[#315B53] bg-gradient-to-br from-[#17483F] to-[#0B302E] p-6 sm:p-9">
        <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border-[35px] border-[#83CDB5]/10" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#83CDB5]">
              Seller Business Overview
            </p>
            <h1 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">
              Welcome{seller?.name ? `, ${seller.name}` : " back"}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#B5C9C1]">
              Here's an overview of your products, orders and store activity.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#83CDB5]/30 bg-[#83CDB5]/10 px-3 py-1 text-xs font-semibold text-[#A6E4CD]">
                Seller: {seller?.sellerStatus || "—"}
              </span>
              <span className="rounded-full border border-[#83CDB5]/30 bg-[#83CDB5]/10 px-3 py-1 text-xs font-semibold text-[#A6E4CD]">
                Verification: {seller?.verificationStatus || "—"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/seller/products/add"
              className="rounded-xl bg-[#83CDB5] px-5 py-3 text-sm font-bold text-[#123B35] transition hover:bg-[#A1DEC9]"
            >
              + Add Product
            </Link>
            <Link
              to="/seller/orders"
              className="rounded-xl border border-[#83CDB5]/40 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              View Orders
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:flex-row sm:items-center"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={loadDashboard}
            className="w-fit font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Products"
          value={metrics.totalProducts}
          description="Your product listings"
          icon="◇"
        />
        <MetricCard
          label="Total Orders"
          value={metrics.totalOrders}
          description="Orders containing your products"
          icon="▤"
        />
        <MetricCard
          label="Pending Orders"
          value={metrics.pending}
          description={`${metrics.activeOrders} confirmed, processing or shipped`}
          icon="◷"
        />
        <MetricCard
          label="Delivered Order Value"
          value={formatMoney(metrics.deliveredOrderValue)}
          description={`${metrics.deliveredOrders} delivered orders · COD order value, not payout`}
          icon="৳"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-[#E6ECE8] bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Recent Orders"
            description="The latest orders assigned to your store."
            action="View all orders"
            to="/seller/orders"
          />

          <div className="mt-5 space-y-3">
            {recentOrders.length === 0 ? (
              <div className="rounded-xl bg-[#F7F9F7] p-8 text-center">
                <p className="font-semibold text-[#344B40]">No orders yet</p>
                <p className="mt-1 text-sm text-[#839088]">
                  Customer orders will appear here.
                </p>
              </div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order._id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-[#EDF1ED] p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#173D36]">
                      Order #{getOrderId(order._id)}
                    </p>
                    <p className="mt-1 truncate text-xs text-[#839088]">
                      {order.shippingName ||
                        order.customerId?.name ||
                        "Customer"}
                      {" · "}
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        statusStyles[order.status] ||
                        "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {order.status || "Unknown"}
                    </span>
                    <span className="text-sm font-bold text-[#21845F]">
                      {formatMoney(order.totalAmount)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-[#E6ECE8] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-bold text-[#173D36]">Inventory Overview</h2>
            <p className="mt-1 text-sm text-[#839088]">
              Stock quantities across your product variants.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#F1F8F4] p-4">
                <p className="text-xs text-[#718078]">Low stock</p>
                <p className="mt-2 text-2xl font-extrabold text-amber-700">
                  {metrics.lowStock}
                </p>
              </div>
              <div className="rounded-xl bg-[#FFF3F1] p-4">
                <p className="text-xs text-[#718078]">Out of stock</p>
                <p className="mt-2 text-2xl font-extrabold text-rose-700">
                  {metrics.outOfStock}
                </p>
              </div>
            </div>

            <Link
              to="/seller/products"
              className="mt-4 inline-flex text-sm font-semibold text-[#1D7055] hover:underline"
            >
              Manage inventory →
            </Link>
          </section>

          <section className="rounded-2xl border border-[#E6ECE8] bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-bold text-[#173D36]">Business Snapshot</h2>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-[#839088]">Unique customers</span>
                <strong className="text-[#173D36]">{metrics.customers}</strong>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-[#839088]">Delivered orders</span>
                <strong className="text-[#173D36]">{metrics.deliveredOrders}</strong>
              </div>
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-[#839088]">Active orders</span>
                <strong className="text-[#173D36]">{metrics.activeOrders}</strong>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section className="rounded-2xl border border-[#E6ECE8] bg-white p-5 shadow-sm sm:p-6">
        <SectionHeading
          title="Recently Added Products"
          description="Your latest product listings."
          action="Manage products"
          to="/seller/products"
        />

        {recentProducts.length === 0 ? (
          <div className="mt-5 rounded-xl bg-[#F7F9F7] p-8 text-center">
            <p className="font-semibold text-[#344B40]">No products yet</p>
            <p className="mt-1 text-sm text-[#839088]">
              Add your first product to start building your catalog.
            </p>
            <Link
              to="/seller/products/add"
              className="mt-4 inline-flex rounded-xl bg-[#1D7055] px-4 py-2.5 text-sm font-semibold text-white"
            >
              Add your first product
            </Link>
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="border-b border-[#EAF0EC] text-xs uppercase tracking-wider text-[#839088]">
                  <th className="px-3 py-3">Product</th>
                  <th className="px-3 py-3">Variants</th>
                  <th className="px-3 py-3">Stock</th>
                  <th className="px-3 py-3">Moderation</th>
                  <th className="px-3 py-3">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDF1ED]">
                {recentProducts.map((product) => (
                  <tr key={product._id} className="text-sm text-[#344B40]">
                    <td className="px-3 py-4 font-semibold">
                      {product.title || "Untitled product"}
                    </td>
                    <td className="px-3 py-4">
                      {product.variants?.length || 0}
                    </td>
                    <td className="px-3 py-4">{getProductStock(product)}</td>
                    <td className="px-3 py-4">
                      <span className="rounded-full bg-[#F1F5F2] px-2.5 py-1 text-xs font-semibold capitalize">
                        {(product.moderationStatus || "unknown").replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-4 text-xs text-[#839088]">
                      {formatDate(product.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={loadDashboard}
          className="rounded-xl border border-[#315B53] bg-[#123B38] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1B4B45]"
        >
          ↻ Refresh dashboard
        </button>
      </div>
    </div>
  );
}

export default SellerDashboard;
