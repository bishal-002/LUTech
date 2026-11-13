
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getProductById } from "../../services/productService";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import Loader from "../../components/Loader";

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
    fetchProduct();
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
    `৳ ${Number(price || 0).toLocaleString("en-BD", {
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F4]">
      <Navbar />

      <main className="page-container flex-1 py-6 sm:py-8">
        <nav
          aria-label="Breadcrumb"
          className="mb-6 flex flex-wrap items-center gap-2 text-xs text-[#68766F] sm:text-sm"
        >
          <Link to="/" className="transition hover:text-[#B9533B]">
            Home
          </Link>
          <span>/</span>
          <Link to="/products" className="transition hover:text-[#B9533B]">
            Products
          </Link>
          <span>/</span>
          <span className="max-w-[220px] truncate font-medium text-[#20332B]">
            {product?.name || "Product Details"}
          </span>
        </nav>

        {loading ? (
          <div className="rounded-xl border border-[#E5E9E5] bg-white p-8">
            <Loader message="Loading product details..." />
          </div>
        ) : error && !product ? (
          <div className="rounded-xl border border-[#E5E9E5] bg-white px-5 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl font-bold text-red-600">
              !
            </div>

            <h1 className="mt-4 text-xl font-bold text-[#20332B]">
              Product unavailable
            </h1>

            <p role="alert" className="mt-2 text-sm text-[#68766F]">
              {error}
            </p>

            <button
              type="button"
              onClick={fetchProduct}
              className="mt-5 rounded-lg bg-[#1A2E26] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#294438]"
            >
              Try Again
            </button>

            <div>
              <Link
                to="/products"
                className="mt-4 inline-block text-sm font-semibold text-[#B9533B] hover:text-[#1A2E26]"
              >
                Back to Products
              </Link>
            </div>
          </div>
        ) : !product ? (
          <div className="rounded-xl border border-[#E5E9E5] bg-white p-10 text-center">
            <h1 className="text-xl font-bold text-[#20332B]">
              Product not found
            </h1>

            <Link
              to="/products"
              className="mt-5 inline-flex rounded-lg bg-[#1A2E26] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#294438]"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-10 xl:gap-14">
              <section>
                <div className="flex aspect-square max-h-[560px] items-center justify-center overflow-hidden rounded-xl border border-[#E5E9E5] bg-white p-5 sm:p-8">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name || "Product"}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#89958D]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        className="h-16 w-16"
                        aria-hidden="true"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>

                      <p className="mt-3 text-sm">
                        No product image available
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="flex h-full flex-col">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B9533B]">
                  LUTech Collection
                </p>

                <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-[#20332B] sm:text-3xl lg:text-4xl">
                  {product.name || "Unnamed Product"}
                </h1>

                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#89958D]">
                    Price
                  </p>

                  <p className="mt-1 text-2xl font-extrabold tracking-tight text-[#1A2E26] sm:text-3xl">
                    {formatPrice(product.price)}
                  </p>
                </div>

                <div className="my-5 border-t border-[#E5E9E5]" />

                <div>
                  <h2 className="text-base font-bold text-[#20332B]">
                    Product Description
                  </h2>

                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[#68766F]">
                    {product.description ||
                      "No description is available for this product."}
                  </p>
                </div>

                <div className="mt-6 flex flex-1 flex-col rounded-xl border border-[#E5E9E5] bg-white p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label
                      htmlFor="product-quantity"
                      className="text-sm font-semibold text-[#20332B]"
                    >
                      Quantity
                    </label>

                    <div className="flex items-center overflow-hidden rounded-lg border border-[#E5E9E5]">
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((current) =>
                            Math.max(1, current - 1)
                          )
                        }
                        disabled={quantity <= 1}
                        aria-label="Decrease quantity"
                        className="flex h-10 w-10 items-center justify-center text-lg text-[#20332B] transition hover:bg-[#EBF0EB] disabled:opacity-40"
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

                          if (
                            Number.isInteger(value) &&
                            value >= 1 &&
                            value <= 99
                          ) {
                            setQuantity(value);
                          }
                        }}
                        className="h-10 w-12 border-x border-[#E5E9E5] text-center text-sm font-semibold text-[#20332B] outline-none"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((current) =>
                            Math.min(99, current + 1)
                          )
                        }
                        disabled={quantity >= 99}
                        aria-label="Increase quantity"
                        className="flex h-10 w-10 items-center justify-center text-lg text-[#20332B] transition hover:bg-[#EBF0EB] disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#E5E9E5] pt-4">
                    <span className="text-sm text-[#68766F]">
                      Subtotal
                    </span>

                    <span className="text-lg font-bold text-[#1A2E26]">
                      {formatPrice(
                        Number(product.price || 0) * quantity
                      )}
                    </span>
                  </div>

                  {error && (
                    <p role="alert" className="mt-3 text-sm text-red-700">
                      {error}
                    </p>
                  )}

                  {message && (
                    <p
                      role="status"
                      className="mt-3 text-sm font-medium text-[#287A50]"
                    >
                      {message}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1A2E26] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#294438] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9533B]"
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
                    className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg border border-[#D5DED7] px-5 py-2.5 text-sm font-semibold text-[#20332B] transition hover:bg-[#F4F6F4]"
                  >
                    View Cart
                  </Link>
                </div>
              </section>
            </div>

            <div className="mt-6 flex flex-col gap-4 rounded-xl border border-[#E5E9E5] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EBF0EB] text-lg text-[#1A2E26]">
                  ✓
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#20332B]">
                    Shopping with LUTech
                  </h3>

                  <p className="mt-1 text-xs text-[#68766F]">
                    Explore electronics and accessories for your everyday
                    needs.
                  </p>
                </div>
              </div>

              <Link
                to="/products"
                className="text-sm font-semibold text-[#B9533B] transition hover:text-[#1A2E26]"
              >
                Explore More Products →
              </Link>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default ProductDetails;
