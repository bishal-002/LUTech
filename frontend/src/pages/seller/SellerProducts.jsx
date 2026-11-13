
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api/products/mine";

function getStock(product) {
  return Number(
    product.stock ??
    product.stockQuantity ??
    product.quantity ??
    0
  );
}

function getStockStatus(product) {
  const stock = getStock(product);

  if (stock <= 0) return "Out of Stock";
  if (stock <= 5) return "Low Stock";

  return "Active";
}

function formatPrice(value) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

function ProductIcon({ name, className = "h-5 w-5" }) {
  const icons = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m16 16 4 4" />
      </>
    ),
    package: (
      <>
        <path d="m12 2 9 5-9 5-9-5 9-5Z" />
        <path d="m3 7 9 5 9-5M3 7v10l9 5 9-5V7M12 12v10" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    warning: (
      <>
        <path d="m12 2 10 18H2L12 2Z" />
        <path d="M12 9v4m0 3h.01" />
      </>
    ),
    plus: <path d="M12 5v14m-7-7h14" />,
    filter: (
      <>
        <path d="M4 7h16M7 12h10m-7 5h4" />
        <circle cx="8" cy="7" r="1.5" fill="currentColor" />
        <circle cx="15" cy="12" r="1.5" fill="currentColor" />
      </>
    ),
    sort: (
      <>
        <path d="M8 5v14m0 0-4-4m4 4 4-4M16 19V5m0 0-4 4m4-4 4 4" />
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
      {icons[name]}
    </svg>
  );
}

function StatCard({ title, value, description, icon, accent }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-[#153B3C] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}
        >
          <ProductIcon name={icon} />
        </div>

        <span className="text-[10px] font-medium text-[#78938C]">
          LIVE COUNT
        </span>
      </div>

      <p className="mt-4 text-xs text-[#A9C4BE]">{title}</p>

      <h3 className="mt-1 text-2xl font-extrabold text-white">
        {value}
      </h3>

      <p className="mt-1 text-[10px] text-[#78938C]">
        {description}
      </p>
    </div>
  );
}

function StockBadge({ status }) {
  const styles = {
    Active: "bg-green-50 text-green-700",
    "Low Stock": "bg-amber-50 text-amber-700",
    "Out of Stock": "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${
        styles[status] || styles.Active
      }`}
    >
      {status}
    </span>
  );
}

function SellerProducts() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stockFilter, setStockFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");

  const getAuthConfig = useCallback(() => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  }), []);

  // Fetch products from the existing seller API.
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      const response = await axios.get(API_URL, getAuthConfig());

      setProducts(
        Array.isArray(response.data)
          ? response.data
          : response.data.products || []
      );
    } catch (err) {
      if (
        err.response?.status === 401 ||
        err.response?.status === 403
      ) {
        navigate("/login", { replace: true });
      } else {
        setError(
          err.response?.data?.message ||
            "Failed to load your products. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthConfig, navigate]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Delete a product using the existing API.
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);

      await axios.delete(`${API_URL}/${id}`, getAuthConfig());

      setProducts((previous) =>
        previous.filter((product) => product._id !== id)
      );
    } catch (err) {
      window.alert(
        err.response?.data?.message ||
          "Failed to delete product. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Get unique categories from the actual product data.
  const categories = useMemo(() => {
    const values = products
      .map((product) =>
        typeof product.category === "object"
          ? product.category?.name
          : product.category
      )
      .filter(Boolean);

    return ["All", ...new Set(values)];
  }, [products]);

  // Calculate actual product statistics.
  const statistics = useMemo(() => {
    return {
      total: products.length,
      active: products.filter(
        (product) => getStockStatus(product) === "Active"
      ).length,
      lowStock: products.filter(
        (product) => getStockStatus(product) === "Low Stock"
      ).length,
      outOfStock: products.filter(
        (product) => getStockStatus(product) === "Out of Stock"
      ).length,
    };
  }, [products]);

  // Search, filter and sort products locally.
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const term = search.toLowerCase();

      result = result.filter((product) => {
        const name = product.name?.toLowerCase() || "";
        const description =
          product.description?.toLowerCase() || "";

        const category =
          typeof product.category === "object"
            ? product.category?.name?.toLowerCase() || ""
            : product.category?.toLowerCase() || "";

        return (
          name.includes(term) ||
          description.includes(term) ||
          category.includes(term)
        );
      });
    }

    if (categoryFilter !== "All") {
      result = result.filter((product) => {
        const category =
          typeof product.category === "object"
            ? product.category?.name
            : product.category;

        return category === categoryFilter;
      });
    }

    if (stockFilter !== "All") {
      result = result.filter(
        (product) => getStockStatus(product) === stockFilter
      );
    }

    switch (sortBy) {
      case "price-low":
        result.sort(
          (a, b) => Number(a.price || 0) - Number(b.price || 0)
        );
        break;

      case "price-high":
        result.sort(
          (a, b) => Number(b.price || 0) - Number(a.price || 0)
        );
        break;

      case "stock":
        result.sort((a, b) => getStock(a) - getStock(b));
        break;

      case "name":
        result.sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        );
        break;

      default:
        result.sort(
          (a, b) =>
            new Date(b.createdAt || 0) -
            new Date(a.createdAt || 0)
        );
    }

    return result;
  }, [products, search, categoryFilter, stockFilter, sortBy]);

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("All");
    setStockFilter("All");
    setSortBy("newest");
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-white/10 bg-[#153B3C]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-white/10 border-t-[#B9F4E4]" />
          <p className="mt-4 text-sm text-[#B7CCC7]">
            Loading your products...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      {/* Page heading */}
      <section className="flex min-w-0 flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#8FB8AB]">
            INVENTORY MANAGEMENT
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
            My Products
          </h1>

          <p className="mt-2 text-sm text-[#A9C4BE]">
            Manage your product catalog, pricing and inventory.
          </p>
        </div>

        <Link
          to="/seller/products/add"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#B9F4E4] px-4 py-3 text-sm font-bold text-[#062729] transition hover:bg-white"
        >
          <ProductIcon name="plus" className="h-4 w-4" />
          Add Product
        </Link>
      </section>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300/20 bg-red-950/30 p-4 text-sm text-red-200"
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={fetchProducts}
            className="font-bold underline underline-offset-4"
          >
            Retry
          </button>
        </div>
      )}

      {/* Statistics */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-white">
            Inventory Overview
          </h2>
          <span className="text-[10px] text-[#78938C]">
            Based on your actual product data
          </span>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Products"
            value={statistics.total}
            description="All listed products"
            icon="package"
            accent="bg-[#B9F4E4]/10 text-[#B9F4E4]"
          />

          <StatCard
            title="Active Products"
            value={statistics.active}
            description="More than 5 units in stock"
            icon="check"
            accent="bg-green-400/10 text-green-300"
          />

          <StatCard
            title="Low Stock"
            value={statistics.lowStock}
            description="5 units or fewer remaining"
            icon="warning"
            accent="bg-amber-400/10 text-amber-300"
          />

          <StatCard
            title="Out of Stock"
            value={statistics.outOfStock}
            description="No available units"
            icon="warning"
            accent="bg-red-400/10 text-red-300"
          />
        </div>
      </section>

      {/* Product management panel */}
      <section className="min-w-0 overflow-hidden rounded-2xl border border-[#E5E9E5] bg-white shadow-sm">
        {/* Toolbar */}
        <div className="border-b border-[#E5E9E5] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#20332B]">
                Product Catalog
              </h2>

              <p className="mt-1 text-xs text-[#89958D]">
                Showing {filteredProducts.length} of {products.length} products
              </p>
            </div>

            <span className="rounded-full bg-[#E5EDE7] px-3 py-1.5 text-[10px] font-bold text-[#1A2E26]">
              {products.length} TOTAL
            </span>
          </div>

          {/* Search and filters */}
          <div className="mt-5 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
            <div className="flex min-w-0 h-11 items-center gap-2 rounded-xl border border-[#E5E9E5] px-3 focus-within:border-[#1A2E26]">
              <ProductIcon
                name="search"
                className="h-4 w-4 shrink-0 text-[#89958D]"
              />

              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="min-w-0 flex-1 bg-transparent text-sm text-[#20332B] outline-none placeholder:text-[#A4ADA7]"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-11 min-w-0 rounded-xl border border-[#E5E9E5] bg-white px-3 text-sm text-[#20332B] outline-none focus:border-[#1A2E26]"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category === "All" ? "All Categories" : category}
                </option>
              ))}
            </select>

            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="h-11 min-w-0 rounded-xl border border-[#E5E9E5] bg-white px-3 text-sm text-[#20332B] outline-none focus:border-[#1A2E26]"
            >
              <option value="All">All Stock Status</option>
              <option value="Active">Active</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-11 min-w-0 rounded-xl border border-[#E5E9E5] bg-white px-3 text-sm text-[#20332B] outline-none focus:border-[#1A2E26]"
            >
              <option value="newest">Newest First</option>
              <option value="name">Name: A to Z</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="stock">Lowest Stock First</option>
            </select>
          </div>

          {(search || categoryFilter !== "All" || stockFilter !== "All" || sortBy !== "newest") && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 text-xs font-semibold text-[#B9533B] hover:underline"
            >
              Clear filters and sorting
            </button>
          )}
        </div>

        {/* Empty state */}
        {products.length === 0 && !error && (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E5EDE7] text-[#1A2E26]">
              <ProductIcon name="package" className="h-8 w-8" />
            </div>

            <h3 className="mt-5 text-lg font-bold text-[#20332B]">
              No products yet
            </h3>

            <p className="mt-2 text-sm text-[#89958D]">
              Start building your store catalog by adding your first product.
            </p>

            <Link
              to="/seller/products/add"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1A2E26] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#29483A]"
            >
              <ProductIcon name="plus" className="h-4 w-4" />
              Add Your First Product
            </Link>
          </div>
        )}

        {/* No filter results */}
        {products.length > 0 && filteredProducts.length === 0 && (
          <div className="px-5 py-14 text-center">
            <h3 className="text-base font-bold text-[#20332B]">
              No matching products
            </h3>

            <p className="mt-2 text-sm text-[#89958D]">
              Try changing your search or filters.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 text-sm font-bold text-[#1A2E26] underline underline-offset-4"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Desktop product table */}
        {filteredProducts.length > 0 && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-[#F4F6F4]">
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-[#89958D]">
                    <th className="px-5 py-4">Product</th>
                    <th className="px-4 py-4">Category</th>
                    <th className="px-4 py-4">Price</th>
                    <th className="px-4 py-4">Stock</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E5E9E5]">
                  {filteredProducts.map((product) => {
                    const status = getStockStatus(product);

                    const category =
                      typeof product.category === "object"
                        ? product.category?.name
                        : product.category;

                    return (
                      <tr
                        key={product._id}
                        className="transition hover:bg-[#F9FAF9]"
                      >
                        <td className="px-5 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F0F3F0]">
                              {product.image ? (
                                <img
                                  src={product.image}
                                  alt={product.name || "Product"}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <ProductIcon
                                  name="package"
                                  className="h-5 w-5 text-[#89958D]"
                                />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-[200px] truncate text-sm font-bold text-[#20332B]">
                                {product.name}
                              </p>

                              <p className="mt-1 text-[10px] text-[#89958D]">
                                ID: {product._id?.slice(-8)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-xs text-[#68766F]">
                          {category || "Uncategorized"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-[#20332B]">
                          {formatPrice(product.price)}
                        </td>

                        <td className="px-4 py-4 text-sm font-semibold text-[#20332B]">
                          {getStock(product)}
                        </td>

                        <td className="px-4 py-4">
                          <StockBadge status={status} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              to={`/seller/products/edit/${product._id}`}
                              className="rounded-lg border border-[#DCE5DD] px-3 py-2 text-xs font-bold text-[#1A2E26] transition hover:bg-[#E5EDE7]"
                            >
                              Edit
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleDelete(product._id)}
                              disabled={deletingId === product._id}
                              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId === product._id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile product cards */}
            <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
              {filteredProducts.map((product) => {
                const status = getStockStatus(product);

                const category =
                  typeof product.category === "object"
                    ? product.category?.name
                    : product.category;

                return (
                  <article
                    key={product._id}
                    className="min-w-0 rounded-xl border border-[#E5E9E5] bg-white p-3"
                  >
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F0F3F0]">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name || "Product"}
                            loading="lazy"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <ProductIcon
                            name="package"
                            className="h-7 w-7 text-[#89958D]"
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-sm font-bold text-[#20332B]">
                          {product.name}
                        </h3>

                        <p className="mt-1 text-[10px] text-[#89958D]">
                          {category || "Uncategorized"}
                        </p>

                        <p className="mt-2 text-sm font-extrabold text-[#1A2E26]">
                          {formatPrice(product.price)}
                        </p>

                        <div className="mt-2">
                          <StockBadge status={status} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#E5E9E5] pt-3">
                      <p className="text-xs text-[#68766F]">
                        Stock:{" "}
                        <span className="font-bold text-[#20332B]">
                          {getStock(product)}
                        </span>
                      </p>

                      <div className="flex gap-2">
                        <Link
                          to={`/seller/products/edit/${product._id}`}
                          className="rounded-lg bg-[#1A2E26] px-3 py-2 text-xs font-bold text-white"
                        >
                          Edit
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDelete(product._id)}
                          disabled={deletingId === product._id}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50"
                        >
                          {deletingId === product._id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {/* Footer */}
        {filteredProducts.length > 0 && (
          <div className="border-t border-[#E5E9E5] bg-[#FAFBFA] px-4 py-3 sm:px-5">
            <p className="text-[10px] text-[#89958D]">
              Displaying {filteredProducts.length} product
              {filteredProducts.length !== 1 ? "s" : ""}.
              Search, filters and sorting are applied locally.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default SellerProducts;
