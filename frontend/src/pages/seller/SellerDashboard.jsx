
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api/seller";

// Demo data until analytics APIs are implemented.
const DEMO_STATS = [
  {
    label: "Total Sales",
    value: "৳1,28,400",
    detail: "Demo performance data",
    change: "+11.2%",
    icon: "sales",
  },
  {
    label: "Total Products",
    value: "24",
    detail: "Sample product count",
    change: "+3",
    icon: "products",
  },
  {
    label: "Total Orders",
    value: "86",
    detail: "Sample order count",
    change: "+8.4%",
    icon: "orders",
  },
  {
    label: "Customers",
    value: "52",
    detail: "Sample customer count",
    change: "+5.2%",
    icon: "customers",
  },
];

const DEMO_PRODUCTS = [
  { name: "Wireless Headphones", category: "Electronics", price: 2450, stock: 18, sales: 32, status: "Active" },
  { name: "Smart Watch", category: "Electronics", price: 3200, stock: 12, sales: 27, status: "Active" },
  { name: "Casual Backpack", category: "Accessories", price: 1850, stock: 5, sales: 19, status: "Low Stock" },
  { name: "Cotton T-Shirt", category: "Fashion", price: 850, stock: 0, sales: 8, status: "Out of Stock" },
  { name: "Bluetooth Speaker", category: "Electronics", price: 1650, stock: 22, sales: 15, status: "Active" },
];

const DEMO_ACTIVITIES = [
  {
    title: "New order received",
    description: "Order #LUT-2048 was placed.",
    time: "10 minutes ago",
    icon: "order",
  },
  {
    title: "Product stock running low",
    description: "Casual Backpack has only 5 units left.",
    time: "1 hour ago",
    icon: "stock",
  },
  {
    title: "Product added",
    description: "Bluetooth Speaker was added to the catalog.",
    time: "Yesterday",
    icon: "product",
  },
];

function formatPrice(value) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

function DashboardIcon({ type, className = "h-5 w-5" }) {
  const icons = {
    sales: (
      <>
        <path d="M3 17 9 11l4 4 8-9" />
        <path d="M15 6h6v6" />
      </>
    ),
    products: (
      <>
        <path d="m12 2 9 5-9 5-9-5 9-5Z" />
        <path d="m3 7 9 5 9-5M3 7v10l9 5 9-5V7M12 12v10" />
      </>
    ),
    orders: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    customers: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21v-2a7 7 0 0 1 14 0v2M16 4a4 4 0 0 1 0 8m2 2a6 6 0 0 1 4 5v2" />
      </>
    ),
    order: (
      <>
        <path d="M4 4h16v16H4z" />
        <path d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    stock: (
      <>
        <path d="m12 2 10 18H2L12 2Z" />
        <path d="M12 9v5m0 3h.01" />
      </>
    ),
    product: (
      <>
        <path d="m12 2 9 5-9 5-9-5 9-5Z" />
        <path d="M3 7v10l9 5 9-5V7" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {icons[type]}
    </svg>
  );
}

function StatCard({ item }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-[#153B3C] p-4 shadow-sm transition hover:border-[#78CBB5]/40 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-[#B9F4E4]">
          <DashboardIcon type={item.icon} />
        </div>

        <span className="rounded-full bg-[#B9F4E4]/10 px-2 py-1 text-[10px] font-bold text-[#B9F4E4]">
          DEMO
        </span>
      </div>

      <p className="mt-5 text-xs font-medium text-[#A9C4BE]">
        {item.label}
      </p>

      <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
        <h3 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          {item.value}
        </h3>

        <span className="text-xs font-semibold text-[#8BE5CC]">
          ↗ {item.change}
        </span>
      </div>

      <p className="mt-2 text-[10px] text-[#78938C]">
        {item.detail}
      </p>
    </div>
  );
}

function SalesChart() {
  const [period, setPeriod] = useState("Monthly");

  const chartData = {
    Daily: {
      primary: "M20 105 L85 80 L150 90 L215 48 L280 62 L345 28 L410 45 L475 18",
      secondary: "M20 145 L85 132 L150 140 L215 112 L280 120 L345 95 L410 108 L475 90",
      labels: ["9 AM", "11 AM", "1 PM", "3 PM", "5 PM", "7 PM"],
    },
    Weekly: {
      primary: "M20 120 L85 90 L150 105 L215 45 L280 68 L345 32 L410 50 L475 18",
      secondary: "M20 155 L85 140 L150 146 L215 115 L280 125 L345 98 L410 112 L475 85",
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    },
    Monthly: {
      primary: "M20 120 L85 80 L150 96 L215 40 L280 65 L345 28 L410 52 L475 18",
      secondary: "M20 158 L85 135 L150 143 L215 110 L280 126 L345 98 L410 115 L475 88",
      labels: ["1 Jun", "5 Jun", "10 Jun", "15 Jun", "20 Jun", "25 Jun"],
    },
  };

  const active = chartData[period];

  return (
    <section className="min-w-0 rounded-2xl border border-[#E5E9E5] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#20332B]">
            Sales Analytics
          </h2>
          <p className="mt-1 text-xs text-[#89958D]">
            Revenue performance overview
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-[#F0F4F1] p-1">
          {["Daily", "Weekly", "Monthly"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPeriod(item)}
              className={`rounded-md px-2.5 py-2 text-[10px] font-semibold transition sm:px-3 ${
                period === item
                  ? "bg-[#1A2E26] text-white shadow-sm"
                  : "text-[#68766F] hover:text-[#1A2E26]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-[#89958D]">
            Total revenue
            <span className="ml-2 rounded bg-[#FFF0E9] px-1.5 py-0.5 text-[9px] font-bold text-[#B9533B]">
              DEMO
            </span>
          </p>
          <p className="mt-1 text-2xl font-extrabold text-[#20332B]">
            ৳1,28,400
          </p>
        </div>

        <div className="flex flex-wrap gap-4 text-[10px] text-[#68766F]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#1A2E26]" />
            This period
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#E07A5F]" />
            Previous period
          </span>
        </div>
      </div>

      <div className="mt-5 w-full min-w-0 overflow-hidden">
        <svg
          viewBox="0 0 500 190"
          className="h-auto w-full"
          role="img"
          aria-label={`${period} demo sales comparison chart`}
        >
          <defs>
            <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1A2E26" stopOpacity=".18" />
              <stop offset="100%" stopColor="#1A2E26" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[30, 70, 110, 150].map((y) => (
            <line
              key={y}
              x1="20"
              y1={y}
              x2="480"
              y2={y}
              stroke="#E9EEEA"
              strokeDasharray="4 5"
            />
          ))}

          <path
            d={`${active.primary} L475 170 L20 170 Z`}
            fill="url(#salesArea)"
          />

          <path
            d={active.secondary}
            fill="none"
            stroke="#E07A5F"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d={active.primary}
            fill="none"
            stroke="#1A2E26"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {active.primary.match(/-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?/g)?.map(
            (point, index) => {
              const [x, y] = point.split(" ").map(Number);

              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill="white"
                  stroke="#1A2E26"
                  strokeWidth="2"
                />
              );
            }
          )}
        </svg>

        <div className="mt-1 flex justify-between gap-2 text-[9px] text-[#89958D] sm:text-[10px]">
          {active.labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>

      <p className="mt-4 rounded-lg bg-[#F4F6F4] px-3 py-2 text-[10px] leading-5 text-[#68766F]">
        Demo visualization. Live sales analytics will be connected to
        the seller API later.
      </p>
    </section>
  );
}

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
          navigate("/login", { replace: true });
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
          navigate("/login", { replace: true });
        } else {
          setError(
            err.response?.data?.message ||
              "Unable to load your dashboard. Please try again."
          );
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
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-white/10 bg-[#153B3C]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-white/10 border-t-[#B9F4E4]" />
          <p className="mt-4 text-sm text-[#B7CCC7]">
            Loading your seller dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-300/20 bg-[#153B3C] p-6 sm:p-8"
      >
        <h2 className="text-lg font-bold text-white">
          Unable to load dashboard
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#B7CCC7]">
          {error}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-5 rounded-lg bg-[#B9F4E4] px-5 py-2.5 text-sm font-bold text-[#062729]"
        >
          Try Again
        </button>
      </div>
    );
  }

  const sellerName = seller?.name || "Seller";

  return (
    <div className="min-w-0 space-y-6">
      {/* Welcome section */}
      <section className="rounded-2xl border border-white/10 bg-[#103738] p-5 sm:p-6 lg:p-7">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#A9C4BE]">
              Seller workspace
            </p>

            <h2 className="mt-2 break-words text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Hello, {sellerName}!
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#A9C4BE]">
              Here's an overview of your store and business activity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#8BE5CC]/20 bg-[#8BE5CC]/10 px-3 py-2 text-xs font-semibold text-[#B9F4E4]">
              <span className="h-2 w-2 rounded-full bg-[#8BE5CC]" />
              Approved Seller
            </span>

            <Link
              to="/seller/products/add"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B9F4E4] px-4 py-2.5 text-xs font-bold text-[#062729] transition hover:bg-white"
            >
              <span className="text-base">+</span>
              Add Product
            </Link>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-white">
            Business Overview
          </h2>
          <span className="text-[10px] text-[#78938C]">
            Sample analytics · Demo data
          </span>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {DEMO_STATS.map((item) => (
            <StatCard key={item.label} item={item} />
          ))}
        </div>
      </section>

      {/* Analytics and Product Overview */}
      <div className="grid min-w-0 grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <SalesChart />

        {/* Product performance */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#E5E9E5] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E9E5] p-4 sm:p-5">
            <div>
              <h2 className="text-base font-bold text-[#20332B]">
                Product Overview
              </h2>
              <p className="mt-1 text-xs text-[#89958D]">
                Sample product performance
              </p>
            </div>

            <Link
              to="/seller/products"
              className="text-xs font-bold text-[#1A2E26] hover:text-[#B9533B]"
            >
              View All →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[570px] text-left">
              <thead className="bg-[#F4F6F4]">
                <tr className="text-[10px] font-semibold uppercase tracking-wider text-[#89958D]">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Sales</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E5E9E5]">
                {DEMO_PRODUCTS.map((product) => (
                  <tr
                    key={product.name}
                    className="text-xs transition hover:bg-[#F9FAF9]"
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-[#20332B]">
                        {product.name}
                      </p>
                      <p className="mt-1 text-[10px] text-[#89958D]">
                        {product.category}
                      </p>
                    </td>

                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-[#20332B]">
                      {formatPrice(product.price)}
                    </td>

                    <td className="px-4 py-4 text-[#68766F]">
                      {product.stock}
                    </td>

                    <td className="px-4 py-4 text-[#68766F]">
                      {product.sales}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold ${
                          product.status === "Active"
                            ? "bg-green-50 text-green-700"
                            : product.status === "Low Stock"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#E5E9E5] px-4 py-3">
            <p className="text-[10px] text-[#89958D]">
              Sample products and performance figures. Not connected to
              your product database yet.
            </p>
          </div>
        </section>
      </div>

      {/* Bottom panels */}
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Recent activity */}
        <section className="min-w-0 rounded-2xl border border-[#E5E9E5] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#20332B]">
                Recent Activity
              </h2>
              <p className="mt-1 text-xs text-[#89958D]">
                Latest store updates
              </p>
            </div>

            <span className="rounded-full bg-[#FFF0E9] px-2.5 py-1 text-[9px] font-bold text-[#B9533B]">
              DEMO
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {DEMO_ACTIVITIES.map((activity, index) => (
              <div
                key={activity.title}
                className="flex min-w-0 items-start gap-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E5EDE7] text-[#1A2E26]">
                  <DashboardIcon
                    type={activity.icon}
                    className="h-4 w-4"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#20332B]">
                    {activity.title}
                  </p>
                  <p className="mt-1 break-words text-[11px] leading-5 text-[#68766F]">
                    {activity.description}
                  </p>
                  <p className="mt-1 text-[10px] text-[#89958D]">
                    {activity.time}
                  </p>
                </div>

                {index !== DEMO_ACTIVITIES.length - 1 && null}
              </div>
            ))}
          </div>
        </section>

        {/* Account information */}
        <section className="min-w-0 rounded-2xl border border-[#E5E9E5] bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#20332B]">
                Store Account
              </h2>
              <p className="mt-1 text-xs text-[#89958D]">
                Your registered seller information
              </p>
            </div>

            <Link
              to="/seller/store-profile"
              className="text-xs font-bold text-[#1A2E26] hover:text-[#B9533B]"
            >
              Edit Profile →
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#89958D]">
                Seller Name
              </p>
              <p className="mt-1 break-words text-sm font-semibold text-[#20332B]">
                {seller?.name || "Not available"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-[#89958D]">
                Email Address
              </p>
              <p className="mt-1 break-all text-sm font-semibold text-[#20332B]">
                {seller?.email || "Not available"}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E9E5] pt-4">
              <div>
                <p className="text-[10px] text-[#89958D]">
                  Account Status
                </p>
                <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-green-700">
                  <span className="h-2 w-2 rounded-full bg-green-600" />
                  Approved
                </span>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SellerDashboard;
