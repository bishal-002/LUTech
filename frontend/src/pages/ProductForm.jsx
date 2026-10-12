
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createProduct,
  getProductById,
  updateProduct,
} from "../services/productService";

const initialFormData = {
  name: "",
  price: "",
  image: "",
  description: "",
};

function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState(initialFormData);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loadingProduct, setLoadingProduct] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);

  const fetchProduct = useCallback(async () => {
    setLoadingProduct(true);
    setError("");

    try {
      const product = await getProductById(id);

      setFormData({
        name: product.name || "",
        price: product.price ?? "",
        image: product.image || "",
        description: product.description || "",
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load product details."
      );
    } finally {
      setLoadingProduct(false);
    }
  }, [id]);

  useEffect(() => {
    const loadProduct = async () => {
      if (isEditMode) {
        await fetchProduct();
      }
    };

    loadProduct();
  }, [isEditMode, fetchProduct]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const name = formData.name.trim();
    const image = formData.image.trim();
    const price = Number(formData.price);

    if (!name || !formData.price || !image) {
      setError("Product name, price, and image URL are required.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setError("Please enter a valid price greater than zero.");
      return;
    }

    setSubmitting(true);

    try {
      const productData = {
        name,
        price,
        image,
        description: formData.description.trim(),
      };

      const response = isEditMode
        ? await updateProduct(id, productData)
        : await createProduct(productData);

      setMessage(
        response.message ||
          (isEditMode
            ? "Product updated successfully."
            : "Product created successfully.")
      );

      if (!isEditMode) {
        setFormData(initialFormData);
      }

      setTimeout(() => {
        navigate("/admin/products");
      }, 1000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "The operation failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProduct) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
          <p className="mt-4 text-sm font-medium text-slate-600">
            Loading product details...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-900"
        >
          <span aria-hidden="true">←</span>
          Back to Product Management
        </Link>

        <header className="mb-7 mt-5">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
            LUTech Admin
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {isEditMode ? "Edit Product" : "Add New Product"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            {isEditMode
              ? "Update the product information in your store catalogue."
              : "Enter the details below to add a product to your store."}
          </p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
            <h2 className="font-bold text-slate-900">
              Product Information
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Fields marked with * are required.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 p-6 sm:p-8"
          >
            {message && (
              <div
                role="status"
                className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800"
              >
                {message}
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Product Name *
              </label>

              <input
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter product name"
                required
                maxLength={150}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div>
              <label
                htmlFor="price"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Price (BDT) *
              </label>

              <div className="flex overflow-hidden rounded-xl border border-slate-300 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-100">
                <span className="flex items-center border-r border-slate-200 bg-slate-50 px-4 font-semibold text-slate-600">
                  ৳
                </span>

                <input
                  id="price"
                  type="number"
                  name="price"
                  min="0.01"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                  disabled={submitting}
                  className="min-w-0 flex-1 px-4 py-3 text-slate-900 outline-none disabled:bg-slate-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="image"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Image URL *
              </label>

              <input
                id="image"
                type="url"
                name="image"
                value={formData.image}
                onChange={handleChange}
                placeholder="https://example.com/product-image.jpg"
                required
                disabled={submitting}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                Enter a publicly accessible image URL.
              </p>

              {formData.image.trim() && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Image Preview
                  </p>

                  <img
                    src={formData.image.trim()}
                    alt="Product preview"
                    className="h-40 w-full rounded-lg object-contain"
                    onError={(e) => {
                      e.currentTarget.style.visibility = "hidden";
                    }}
                    onLoad={(e) => {
                      e.currentTarget.style.visibility = "visible";
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                rows={5}
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the product, its features, and specifications..."
                disabled={submitting}
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
              <Link
                to="/admin/products"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Saving..."
                  : isEditMode
                    ? "Save Changes"
                    : "Create Product"}
              </button>
            </div>
          </form>
        </section>

        <p className="mt-5 text-center text-xs text-slate-500">
          Changes are saved to the LUTech product database.
        </p>
      </div>
    </main>
  );
}

export default ProductForm;
