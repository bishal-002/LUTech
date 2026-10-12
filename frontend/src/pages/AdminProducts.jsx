
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getProducts,
  deleteProduct,
} from "../services/productService";

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Failed to load products. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadProducts = async () => {
      setError("");

      try {
        const data = await getProducts({
          signal: controller.signal,
        });

        setProducts(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== "CanceledError") {
          setError(
            err.response?.data?.message ||
            "Failed to load products. Please try again."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => controller.abort();
  }, []);

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product? This action cannot be undone."
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setDeletingId(id);

    try {
      await deleteProduct(id);

      setProducts((previous) =>
        previous.filter((product) => product._id !== id)
      );

      setMessage("Product deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Failed to delete the product. Please try again."
      );
    } finally {
      setDeletingId("");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div>
            <Link
              to="/"
              className="text-sm font-bold tracking-wide text-blue-700"
            >
              LUTech
            </Link>

            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Product Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage your store catalogue and product details.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View Store
            </Link>

            <Link
              to="/admin/products/add"
              className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              + Add Product
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Products
            </p>

            <p className="mt-2 text-3xl font-extrabold text-slate-900">
              {products.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Admin Status
            </p>

            <p className="mt-2 inline-flex items-center gap-2 text-lg font-bold text-emerald-700">
              <span
                className="h-2.5 w-2.5 rounded-full bg-emerald-500"
                aria-hidden="true"
              />
              Product management
            </p>
          </div>
        </div>

        {message && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <p>{error}</p>

            <button
              type="button"
              onClick={fetchProducts}
              className="self-start rounded-lg border border-red-300 px-3 py-2 font-semibold transition hover:bg-red-100 sm:self-auto"
            >
              Retry
            </button>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-bold text-slate-900">
              Store Catalogue
            </h2>

            <p className="text-sm text-slate-500">
              View, edit, or remove existing products.
            </p>
          </div>

          {loading ? (
            <div
              role="status"
              className="flex flex-col items-center justify-center px-6 py-16 text-center"
            >
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />

              <p className="mt-4 text-sm font-medium text-slate-600">
                Loading products...
              </p>
            </div>
          ) : error && products.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">
              Products could not be loaded. Use the Retry button above.
            </div>
          ) : products.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h3 className="text-lg font-bold text-slate-900">
                No products found
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Add your first product to populate the catalogue.
              </p>

              <Link
                to="/admin/products/add"
                className="mt-5 inline-flex rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800"
              >
                Add First Product
              </Link>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100 md:hidden">
                {products.map((product) => (
                  <article
                    key={product._id}
                    className="p-4 sm:p-5"
                  >
                    <div className="flex gap-4">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 bg-slate-50 object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
                          No image
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="break-words font-bold text-slate-900">
                          {product.name}
                        </h3>

                        <p className="mt-1 font-semibold text-blue-700">
                          ৳{product.price}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            to={`/admin/products/edit/${product._id}`}
                            className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                          >
                            Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDelete(product._id)}
                            disabled={deletingId === product._id}
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === product._id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-6 py-4 font-semibold">
                        Product
                      </th>

                      <th scope="col" className="px-6 py-4 font-semibold">
                        Price
                      </th>

                      <th
                        scope="col"
                        className="px-6 py-4 text-right font-semibold"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {products.map((product) => (
                      <tr
                        key={product._id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-12 w-12 rounded-lg border border-slate-200 bg-white object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">
                                N/A
                              </div>
                            )}

                            <span className="font-semibold text-slate-900">
                              {product.name}
                            </span>
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 font-semibold text-slate-700">
                          ৳{product.price}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              to={`/admin/products/edit/${product._id}`}
                              className="rounded-lg border border-blue-200 px-3 py-2 font-semibold text-blue-700 transition hover:bg-blue-50"
                            >
                              Edit
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleDelete(product._id)}
                              disabled={deletingId === product._id}
                              className="rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingId === product._id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Product changes are saved through the backend API.
        </p>
      </section>
    </main>
  );
}

export default AdminProducts;
