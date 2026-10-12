import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getProductById } from "../services/productService";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Loader from "../components/Loader";

function ProductDetails() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    setProduct(null);

    try {
      const data = await getProductById(id);
      setProduct(data.product || data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load this product. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const loadProduct = async () => {
      await fetchProduct();
    };

    loadProduct();
  }, [fetchProduct]);

  const handleAddToCart = () => {
    if (!product?._id) {
      setError("Product information is unavailable.");
      return;
    }

    try {
      const storedCart = localStorage.getItem("cart");
      const cart = storedCart ? JSON.parse(storedCart) : [];

      if (!Array.isArray(cart)) {
        setError("Your saved cart is invalid. Please clear it and try again.");
        return;
      }

      const existingItem = cart.find(
        (item) => item.productId === product._id
      );

      let updatedCart;

      if (existingItem) {
        updatedCart = cart.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        updatedCart = [
          ...cart,
          {
            productId: product._id,
            name: product.name,
            price: product.price,
            image: product.image || "",
            quantity,
          },
        ];
      }

      localStorage.setItem("cart", JSON.stringify(updatedCart));
      setError("");
      setMessage(`${product.name} added to your cart.`);
    } catch {
      setError("Unable to update your cart. Please try again.");
    }
  };

  const formatPrice = (price) =>
    `৳${Number(price || 0).toLocaleString("en-BD", {
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 transition hover:text-blue-900"
        >
          <span aria-hidden="true">←</span>
          Back to Products
        </Link>

        {loading ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10">
            <Loader message="Loading product details..." />
          </div>
        ) : error && !product ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-700">
              <span className="text-2xl" aria-hidden="true">
                !
              </span>
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-900">
              Product unavailable
            </h1>

            <p role="alert" className="mt-3 text-slate-600">
              {error}
            </p>

            <button
              type="button"
              onClick={fetchProduct}
              className="mt-6 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
            >
              Try Again
            </button>
          </div>
        ) : !product ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              Product not found
            </h1>
            <Link
              to="/products"
              className="mt-5 inline-flex rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="flex min-h-80 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 sm:min-h-[460px] sm:p-10">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name || "Product"}
                  className="max-h-[420px] w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    className="h-20 w-20"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                  <p className="mt-3 text-sm">No product image available</p>
                </div>
              )}
            </div>

            <section className="flex flex-col">
              <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
                LUTech Collection
              </p>

              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {product.name || "Unnamed Product"}
              </h1>

              <p className="mt-5 text-3xl font-extrabold text-blue-700">
                {formatPrice(product.price)}
              </p>

              <div className="my-7 border-t border-slate-200" />

              <h2 className="text-lg font-bold text-slate-900">
                Product Description
              </h2>

              <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">
                {product.description || "No description is available for this product."}
              </p>

              <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
                <label
                  htmlFor="product-quantity"
                  className="mb-3 block text-sm font-semibold text-slate-700"
                >
                  Quantity
                </label>

                <div className="flex items-center gap-4">
                  <div className="flex items-center rounded-lg border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                      className="rounded-l-lg px-4 py-2.5 text-lg font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      −
                    </button>

                    <input
                      id="product-quantity"
                      type="number"
                      min="1"
                      max="99"
                      value={quantity}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (Number.isInteger(value) && value >= 1 && value <= 99) {
                          setQuantity(value);
                        }
                      }}
                      className="w-14 border-x border-slate-300 py-2.5 text-center font-semibold text-slate-900 outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => setQuantity((current) => Math.min(99, current + 1))}
                      disabled={quantity >= 99}
                      aria-label="Increase quantity"
                      className="rounded-r-lg px-4 py-2.5 text-lg font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  <p className="text-sm text-slate-500">
                    Subtotal:{" "}
                    <span className="font-bold text-slate-900">
                      {formatPrice(Number(product.price || 0) * quantity)}
                    </span>
                  </p>
                </div>

                {error && (
                  <p role="alert" className="mt-4 text-sm text-red-700">
                    {error}
                  </p>
                )}

                {message && (
                  <p role="status" className="mt-4 text-sm text-green-700">
                    {message}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-5 py-3.5 font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M3 3h2l2.4 11.4a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6" />
                    <circle cx="10" cy="20" r="1" />
                    <circle cx="18" cy="20" r="1" />
                  </svg>
                  Add to Cart
                </button>

                <Link
                  to="/cart"
                  className="mt-3 flex w-full items-center justify-center rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  View Cart
                </Link>
              </div>

              <div className="mt-6 rounded-xl bg-blue-50 p-5">
                <p className="font-semibold text-slate-900">
                  Shopping with LUTech
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Browse our collection of electronics and accessories for
                  your everyday needs.
                </p>
              </div>
            </section>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default ProductDetails;