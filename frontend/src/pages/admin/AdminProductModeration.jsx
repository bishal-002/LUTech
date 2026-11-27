
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../context/AuthContext";

import {
  getProductsForModeration,
  getProductVerificationProof,
  approveProduct,
  rejectProduct,
  verifyGenuineProduct,
  suspendProduct,
} from "../../services/adminService";

const STATUSES = [
  { value: "pending_review", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
  { value: "all", label: "All statuses" },
];

const money = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  return `৳${Number(value).toLocaleString("en-BD")}`;
};

const date = (value) => {
  if (!value) return "—";

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleString("en-BD", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
};

const text = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
};

const errorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

function Status({ value }) {
  const styles = {
    pending_review: "bg-amber-100 text-amber-800",
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-red-100 text-red-800",
    suspended: "bg-slate-200 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        styles[value] || "bg-slate-100 text-slate-700"
      }`}
    >
      {String(value || "unknown").replaceAll("_", " ")}
    </span>
  );
}

function Info({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {text(value)}
      </p>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-base font-bold text-slate-900">
        {title}
      </h3>
      {children}
    </section>
  );
}

function ProductReview({
  product,
  onClose,
  onUpdated,
  canApprove,
  canVerify,
  canSuspend,
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [proofBusy, setProofBusy] = useState(false);

  const mainImage =
    product.images?.find((image) => image.slot === "main") ||
    product.images?.[0];

  const variants = Array.isArray(product.variants)
    ? product.variants
    : [];

  const specifications = Array.isArray(product.specifications)
    ? product.specifications
    : [];

  const performAction = async (action, successText) => {
    try {
      setBusy(true);
      setError("");
      setMessage("");

      const response = await action();

      setMessage(response?.message || successText);
      onUpdated(response?.message || successText);
    } catch (err) {
      setError(errorMessage(err, "The moderation action failed."));
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = () => {
    if (!canApprove || product.moderationStatus !== "pending_review") {
      return;
    }

    if (!window.confirm(`Approve "${product.title}"?`)) return;

    performAction(
      () => approveProduct(product._id),
      "Product approved successfully."
    );
  };

  const handleReject = () => {
    if (!canApprove) return;

    if (!note.trim()) {
      setError("A rejection reason is required.");
      return;
    }

    if (note.trim().length > 500) {
      setError("The reason cannot exceed 500 characters.");
      return;
    }

    if (!window.confirm(`Reject "${product.title}"?`)) return;

    performAction(
      () => rejectProduct(product._id, note.trim()),
      "Product rejected successfully."
    );
  };

  const handleVerify = () => {
    if (!canVerify || product.moderationStatus !== "approved") return;

    if (
      !window.confirm(
        `Mark "${product.title}" as verified genuine?`
      )
    ) return;

    performAction(
      () => verifyGenuineProduct(product._id, note.trim()),
      "Product verified as genuine."
    );
  };

  const handleSuspend = () => {
    if (!canSuspend) return;

    if (!note.trim()) {
      setError("A suspension reason is required.");
      return;
    }

    if (note.trim().length > 500) {
      setError("The reason cannot exceed 500 characters.");
      return;
    }

    if (!window.confirm(`Suspend "${product.title}"?`)) return;

    performAction(
      () => suspendProduct(product._id, note.trim()),
      "Product suspended successfully."
    );
  };

  const handleProof = async () => {
    try {
      setProofBusy(true);
      setError("");

      const response = await getProductVerificationProof(product._id);

      const blob = new Blob([response.data], {
        type:
          response.headers?.["content-type"] ||
          "application/octet-stream",
      });

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = `product-${product._id}-verification-proof`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (err) {
      setError(
        errorMessage(err, "Unable to download verification proof.")
      );
    } finally {
      setProofBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-3 sm:p-6">
      <div className="mx-auto my-4 max-w-5xl overflow-hidden rounded-2xl bg-slate-50 shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between bg-[#092F30] px-5 py-4 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#83CDB5]">
              Product moderation
            </p>
            <h2 className="mt-1 text-lg font-bold">
              Product review
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-2xl text-white/70 hover:bg-white/10"
            aria-label="Close review"
          >
            ×
          </button>
        </header>

        <div className="space-y-5 p-4 sm:p-6">
          <Panel title="Product overview">
            <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
              <div className="overflow-hidden rounded-xl bg-slate-100">
                {mainImage?.url ? (
                  <img
                    src={mainImage.url}
                    alt={product.title}
                    className="aspect-square w-full object-contain"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center text-sm text-slate-400">
                    No product image
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Status value={product.moderationStatus} />
                  {product.isGenuineVerified && (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                      Genuine verified
                    </span>
                  )}
                </div>

                <h3 className="mt-3 text-xl font-extrabold text-slate-900">
                  {product.title}
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Product ID: {product._id}
                </p>

                <p className="mt-3 text-2xl font-extrabold text-emerald-700">
                  {money(
                    variants.find((variant) => variant.isDefault)
                      ?.salePrice ??
                    variants.find((variant) => variant.isDefault)
                      ?.regularPrice ??
                    product.price
                  )}
                </p>

                <p className="mt-2 text-xs text-slate-400">
                  Submitted {date(product.createdAt)}
                </p>
              </div>
            </div>

            {product.images?.length > 0 && (
              <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {product.images.map((image, index) => (
                  <a
                    key={`${image.url}-${index}`}
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                    title={`Open ${image.slot || "product"} image`}
                  >
                    <img
                      src={image.url}
                      alt={`${product.title} ${image.slot || "image"}`}
                      className="aspect-square w-full object-cover"
                    />
                    <span className="block truncate px-2 py-1 text-center text-xs text-slate-500">
                      {image.slot || "Image"}
                    </span>
                  </a>
                ))}
              </div>
            )}

            {product.videoUrl && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-bold uppercase text-slate-400">
                  Product video
                </p>
                <video
                  src={product.videoUrl}
                  controls
                  preload="metadata"
                  className="max-h-80 w-full rounded-xl bg-black"
                />
              </div>
            )}
          </Panel>

          <Panel title="Product identity">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Product title" value={product.title} />
              <Info label="Brand" value={product.brandId?.name} />
              <Info label="Category" value={product.categoryId?.name} />
              <Info label="Manufacturer part number" value={product.mpn} />
              <Info label="GTIN" value={product.gtin} />
              <Info label="Condition" value={product.condition} />
              <Info label="Region variant" value={product.regionVariant} />
              <Info label="Tags" value={product.tags?.join(", ")} />
              <Info label="Created" value={date(product.createdAt)} />
            </div>
          </Panel>

          <Panel title="Seller information">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Seller name" value={product.sellerId?.name} />
              <Info label="Seller email" value={product.sellerId?.email} />
              <Info label="Seller type" value={product.sellerId?.sellerType} />
              <Info label="Seller ID" value={product.sellerId?._id || product.sellerId} />
            </div>
          </Panel>

          <Panel title="Product description">
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {text(product.description)}
            </p>

            {product.highlights?.length > 0 && (
              <div className="mt-5">
                <h4 className="mb-2 text-sm font-bold text-slate-800">
                  Highlights
                </h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {product.highlights.map((item, index) => (
                    <li key={`${index}-${item}`}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {product.boxContents?.length > 0 && (
              <div className="mt-5">
                <h4 className="mb-2 text-sm font-bold text-slate-800">
                  Box contents
                </h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {product.boxContents.map((item, index) => (
                    <li key={index}>
                      {item.qty} × {item.item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel title="Variants, price and inventory">
            {variants.length === 0 ? (
              <p className="text-sm text-slate-500">
                No variant details are available.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Attributes</th>
                      <th className="p-3">Regular price</th>
                      <th className="p-3">Sale price</th>
                      <th className="p-3">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {variants.map((variant, index) => (
                      <tr key={variant._id || variant.sku || index}>
                        <td className="p-3 font-semibold">{variant.sku}</td>
                        <td className="p-3">
                          {Object.entries(variant.attributes || {})
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(", ") || "—"}
                        </td>
                        <td className="p-3">{money(variant.regularPrice)}</td>
                        <td className="p-3">{money(variant.salePrice)}</td>
                        <td className="p-3">{variant.stockQuantity ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel title="Technical specifications">
            {specifications.length === 0 ? (
              <p className="text-sm text-slate-500">
                No technical specifications supplied.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {specifications.map((spec, index) => (
                  <div
                    key={`${spec.key}-${index}`}
                    className="grid gap-1 py-3 sm:grid-cols-[180px_1fr]"
                  >
                    <div>
                      <p className="text-xs text-slate-400">{spec.group}</p>
                      <p className="text-sm font-semibold text-slate-800">
                        {spec.label}
                      </p>
                    </div>
                    <p className="break-words text-sm text-slate-600">
                      {Array.isArray(spec.value)
                        ? spec.value.join(", ")
                        : typeof spec.value === "object"
                          ? JSON.stringify(spec.value)
                          : String(spec.value ?? "—")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Shipping, warranty and returns">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Info label="Dispatch time" value={product.dispatchTime} />
              <Info label="Warranty type" value={product.warrantyType} />
              <Info
                label="Warranty duration"
                value={
                  product.warrantyDuration?.unit === "Lifetime"
                    ? "Lifetime"
                    : product.warrantyDuration?.value
                      ? `${product.warrantyDuration.value} ${product.warrantyDuration.unit}`
                      : "—"
                }
              />
              <Info label="Warranty policy" value={product.warrantyPolicy} />
              <Info label="Return policy" value={product.returnPolicy} />
              <Info
                label="Shipping weight"
                value={
                  product.shipping?.weightGrams
                    ? `${product.shipping.weightGrams} g`
                    : "—"
                }
              />
              <Info
                label="Shipping dimensions"
                value={
                  product.shipping?.dimensions
                    ? `${product.shipping.dimensions.lengthCm ?? "—"} × ${product.shipping.dimensions.widthCm ?? "—"} × ${product.shipping.dimensions.heightCm ?? "—"} cm`
                    : "—"
                }
              />
            </div>
          </Panel>

          <Panel title="Authenticity verification">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-800">
                  Seller verification proof
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  This file is stored privately and can only be retrieved through the protected admin endpoint.
                </p>
              </div>

              <button
                type="button"
                onClick={handleProof}
                disabled={proofBusy}
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {proofBusy ? "Downloading..." : "Download verification proof"}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  product.isGenuineVerified
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {product.isGenuineVerified
                  ? "Genuine verified"
                  : "Not genuine verified"}
              </span>
            </div>
          </Panel>

          <Panel title="Moderation decision">
            {error && (
              <div role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div role="status" className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                {message}
              </div>
            )}

            <label
              htmlFor="moderation-note"
              className="block text-sm font-bold text-slate-800"
            >
              Moderation / rejection / suspension note
            </label>

            <textarea
              id="moderation-note"
              rows={3}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={busy}
              placeholder="Enter a reason when rejecting or suspending. Optional for genuine verification."
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-emerald-500"
            />

            <p className="mt-1 text-right text-xs text-slate-400">
              {note.length}/500
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {canApprove && product.moderationStatus === "pending_review" && (
                <>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={busy}
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {busy ? "Processing..." : "Approve product"}
                  </button>

                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={busy || !note.trim()}
                    className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject product
                  </button>
                </>
              )}

              {canVerify &&
                product.moderationStatus === "approved" &&
                !product.isGenuineVerified && (
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={busy}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Verify genuine
                  </button>
                )}

              {canSuspend && product.moderationStatus === "approved" && (
                <button
                  type="button"
                  onClick={handleSuspend}
                  disabled={busy || !note.trim()}
                  className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Suspend product
                </button>
              )}

              {!canApprove && !canVerify && !canSuspend && (
                <p className="text-sm text-slate-500">
                  Your administrator account has read-only access to this product.
                </p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export default function AdminProductModeration() {
  const { hasPermission } = useAuth();

  const canApprove = hasPermission("approve_products");
  const canVerify = hasPermission("verify_genuine_badge");
  const canSuspend = hasPermission("suspend_products");

  const canView = canApprove || canVerify || canSuspend;

  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
    limit: 20,
  });

  const [status, setStatus] = useState("pending_review");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const loadProducts = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      setError("Your administrator account does not have product moderation permission.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await getProductsForModeration({
        page,
        limit: 20,
        status,
        ...(search ? { search } : {}),
      });

      setProducts(Array.isArray(response.products) ? response.products : []);

      setPagination(
        response.pagination || {
          currentPage: page,
          totalPages: 1,
          totalProducts: response.products?.length || 0,
          limit: 20,
        }
      );
    } catch (err) {
      setError(errorMessage(err, "Unable to load products for moderation."));
    } finally {
      setLoading(false);
    }
  }, [canView, page, status, search]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const pendingCount = useMemo(
    () => products.filter((item) => item.moderationStatus === "pending_review").length,
    [products]
  );

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleUpdated = (message) => {
    setSelectedProduct(null);
    setNotice(message);
    loadProducts();
  };

  if (!canView) {
    return (
      <AdminLayout>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-xl font-bold">Permission required</h1>
          <p className="mt-2 text-sm">
            You need a product moderation permission to access this workspace.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#83CDB5]">
              Administration / Catalog
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
              Product Moderation
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-100/70">
              Inspect product information, media and authenticity evidence before making moderation decisions.
            </p>
          </div>

          <button
            type="button"
            onClick={loadProducts}
            disabled={loading}
            className="rounded-xl border border-[#83CDB5]/30 bg-[#103B37] px-4 py-2.5 text-sm font-semibold text-[#B9F4E4] hover:bg-[#18554C] disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total matching products</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {loading ? "..." : pagination.totalProducts.toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Pending on this page</p>
            <p className="mt-2 text-3xl font-extrabold text-amber-600">
              {loading ? "..." : pendingCount.toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Current page</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {pagination.currentPage} / {pagination.totalPages}
            </p>
          </div>
        </section>

        {notice && (
          <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {notice}
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <form
            onSubmit={submitSearch}
            className="flex flex-col gap-3 lg:flex-row"
          >
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search product title or MPN..."
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
            >
              {STATUSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-xl bg-[#103B37] px-6 py-3 text-sm font-bold text-white hover:bg-[#18554C]"
            >
              Search
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Product review queue
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a product to inspect its full details and evidence.
              </p>
            </div>
            <Status value={status === "all" ? "pending_review" : status} />
          </div>

          {loading ? (
            <div className="p-14 text-center text-sm text-slate-500">
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="p-14 text-center">
              <h3 className="font-bold text-slate-900">
                No products found
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                There are no products matching the current status and search.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {products.map((product) => {
                const image =
                  product.images?.find((item) => item.slot === "main") ||
                  product.images?.[0];

                const defaultVariant =
                  product.variants?.find((item) => item.isDefault) ||
                  product.variants?.[0];

                return (
                  <article
                    key={product._id}
                    className="flex flex-col gap-4 p-5 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      {image?.url ? (
                        <img
                          src={image.url}
                          alt={product.title}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">
                          {product.title}
                        </h3>
                        <Status value={product.moderationStatus} />
                        {product.isGenuineVerified && (
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                            Genuine
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {product.brandId?.name || "Unknown brand"}
                        {" · "}
                        {product.categoryId?.name || "Unknown category"}
                        {" · MPN: "}
                        {product.mpn || "—"}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                        <span>Seller: {product.sellerId?.name || "—"}</span>
                        <span>
                          Price: {money(
                            defaultVariant?.salePrice ??
                            defaultVariant?.regularPrice ??
                            product.price
                          )}
                        </span>
                        <span>Submitted: {date(product.createdAt)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setNotice("");
                        setSelectedProduct(product);
                      }}
                      className="shrink-0 rounded-xl bg-[#103B37] px-5 py-3 text-sm font-bold text-white hover:bg-[#18554C]"
                    >
                      Review product →
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalProducts} products
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={loading || page <= 1}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                disabled={loading || page >= pagination.totalPages}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>

      {selectedProduct && (
        <ProductReview
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onUpdated={handleUpdated}
          canApprove={canApprove}
          canVerify={canVerify}
          canSuspend={canSuspend}
        />
      )}
    </AdminLayout>
  );
}
