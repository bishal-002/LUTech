
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyProducts, deleteProduct } from "../../services/productService";

const money = (value) =>
  `৳${Number(value || 0).toLocaleString("en-BD")}`;

const getDefaultVariant = (product) =>
  product.variants?.find((item) => item.isDefault) ||
  product.variants?.[0] ||
  {};

const getStock = (product) =>
  (product.variants || []).reduce(
    (total, variant) => total + Number(variant.stockQuantity || 0),
    0
  );

const moderationStyles = {
  approved: "bg-green-100 text-green-700",
  pending_review: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-gray-200 text-gray-700",
};

function StatusBadge({ status }) {
  const label = {
    approved: "Approved",
    pending_review: "Pending Review",
    rejected: "Rejected",
    suspended: "Suspended",
  }[status] || "Unknown";

  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${
      moderationStyles[status] || "bg-gray-100 text-gray-600"
    }`}>
      {label}
    </span>
  );
}

function SellerProducts() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState("");

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getMyProducts({
        params: { page: 1, limit: 100 },
      });

      setProducts(response.products || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load your products."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        product.title?.toLowerCase().includes(term) ||
        product.mpn?.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "all" ||
        product.moderationStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  const stats = useMemo(() => ({
    total: products.length,
    approved: products.filter(
      (p) => p.moderationStatus === "approved"
    ).length,
    pending: products.filter(
      (p) => p.moderationStatus === "pending_review"
    ).length,
    rejected: products.filter(
      (p) => p.moderationStatus === "rejected"
    ).length,
  }), [products]);

  const handleDelete = async (product) => {
    const confirmed = window.confirm(
      `Delete "${product.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(product._id);
      await deleteProduct(product._id);

      setProducts((previous) =>
        previous.filter((item) => item._id !== product._id)
      );
    } catch (err) {
      window.alert(
        err.response?.data?.message ||
        "Unable to delete this product."
      );
    } finally {
      setDeletingId("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center rounded-2xl bg-[#153B3C]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-white/20 border-t-[#B9F4E4]" />
          <p className="mt-4 text-sm text-[#B7CCC7]">
            Loading products...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#8FB8AB]">
            INVENTORY MANAGEMENT
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
            My Products
          </h1>
          <p className="mt-2 text-sm text-[#A9C4BE]">
            Manage your catalog, inventory and product approval status.
          </p>
        </div>

        <Link
          to="/seller/products/add"
          className="rounded-xl bg-[#B9F4E4] px-5 py-3 text-sm font-bold text-[#062729] hover:bg-white"
        >
          + Add Product
        </Link>
      </section>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-300/20 bg-red-950/30 p-4 text-sm text-red-200">
          {error}
          <button onClick={fetchProducts} className="font-bold underline">
            Retry
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Products", stats.total],
          ["Approved", stats.approved],
          ["Pending Review", stats.pending],
          ["Rejected", stats.rejected],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-[#153B3C] p-5">
            <p className="text-xs text-[#A9C4BE]">{label}</p>
            <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#E5E9E5] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E9E5] p-4">
          <div>
            <h2 className="font-bold text-[#20332B]">Product Catalog</h2>
            <p className="mt-1 text-xs text-[#89958D]">
              {filteredProducts.length} products shown
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or MPN"
              className="h-10 min-w-0 flex-1 rounded-lg border border-[#DCE5DD] px-3 text-sm sm:w-56"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-[#DCE5DD] bg-white px-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending_review">Pending Review</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <h3 className="font-bold text-[#20332B]">
              {products.length ? "No matching products" : "No products yet"}
            </h3>
            <p className="mt-2 text-sm text-[#89958D]">
              {products.length
                ? "Try another search or status filter."
                : "Add your first product to start building your catalog."}
            </p>
            {!products.length && (
              <Link
                to="/seller/products/add"
                className="mt-5 inline-block rounded-xl bg-[#1A2E26] px-5 py-3 text-sm font-bold text-white"
              >
                Add Your First Product
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-[#F4F6F4] text-[10px] uppercase tracking-wider text-[#89958D]">
                <tr>
                  <th className="px-5 py-4">Product</th>
                  <th className="px-4 py-4">Brand / Category</th>
                  <th className="px-4 py-4">Price</th>
                  <th className="px-4 py-4">Stock</th>
                  <th className="px-4 py-4">Moderation</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E5E9E5]">
                {filteredProducts.map((product) => {
                  const variant = getDefaultVariant(product);
                  const mainImage = product.images?.find(
                    (image) => image.slot === "main"
                  )?.url;

                  return (
                    <tr key={product._id} className="hover:bg-[#F9FAF9]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#F0F3F0]">
                            {mainImage && (
                              <img
                                src={mainImage}
                                alt={product.title}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          <div>
                            <p className="max-w-[230px] truncate text-sm font-bold text-[#20332B]">
                              {product.title}
                            </p>
                            <p className="mt-1 text-[10px] text-[#89958D]">
                              MPN: {product.mpn || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-xs text-[#68766F]">
                        <p>{product.brandId?.name || "—"}</p>
                        <p className="mt-1">{product.categoryId?.name || "—"}</p>
                      </td>

                      <td className="px-4 py-4 text-sm font-bold text-[#20332B]">
                        {money(variant.salePrice ?? variant.regularPrice)}
                      </td>

                      <td className="px-4 py-4 text-sm text-[#68766F]">
                        {getStock(product)}
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge status={product.moderationStatus} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => navigate(`/seller/products/edit/${product._id}`)}
                            className="rounded-lg border border-[#DCE5DD] px-3 py-2 text-xs font-bold text-[#20332B] hover:bg-[#F4F6F4]"
                          >
                            Edit
                          </button>

                          <button
                            disabled={deletingId === product._id}
                            onClick={() => handleDelete(product)}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingId === product._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default SellerProducts;
