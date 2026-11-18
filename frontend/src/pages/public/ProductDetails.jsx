import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

import { getProductById } from "../../services/productService";

import {
  addToWishlist,
  addRecentlyViewed,
  addPriceAlert,
} from "../../services/userService";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import Loader from "../../components/Loader";

function ProductDetails() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState("");

  const [loading, setLoading] = useState(true);
  const [cartLoading, setCartLoading] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);

  const [targetPrice, setTargetPrice] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ======================================================
  // FETCH PRODUCT
  // ======================================================

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    setProduct(null);

    try {
      const data = await getProductById(id);
      const fetchedProduct = data.product || data;
      setProduct(fetchedProduct);

      const fetchedVariants = Array.isArray(fetchedProduct.variants)
        ? fetchedProduct.variants
        : [];
      const defaultVariant =
        fetchedVariants.find((variant) => variant.isDefault) ||
        fetchedVariants[0];
      setSelectedVariantId(defaultVariant?._id || "");
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

  // ======================================================
  // TRACK RECENTLY VIEWED
  // ======================================================

  useEffect(() => {
    if (!product?._id) return;

    try {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("userInfo");

      const currentUser = storedUser
        ? JSON.parse(storedUser)
        : null;

      if (
        token &&
        currentUser?.role === "customer"
      ) {
        addRecentlyViewed(product._id).catch((err) => {
          console.warn(
            "Recently viewed update failed:",
            err
          );
        });
      }
    } catch (err) {
      console.warn("Unable to read customer session:", err);
    }
  }, [product?._id]);

  // ======================================================
  // ADD TO CART (BACKEND / MONGODB)
  // ======================================================

  const handleAddToCart = async () => {
    if (!product?._id) {
      setError("Product information is unavailable.");
      return;
    }

    const token = localStorage.getItem("token");

    let currentUser = null;
    try {
      const storedUser = localStorage.getItem("userInfo");
      currentUser = storedUser ? JSON.parse(storedUser) : null;
    } catch {
      currentUser = null;
    }

    if (!token || currentUser?.role !== "customer") {
      setError("Please sign in with a customer account to add products to your cart.");
      return;
    }

    const variants = Array.isArray(product.variants)
      ? product.variants
      : [];
    const selectedVariant =
      variants.find((variant) => String(variant._id) === String(selectedVariantId)) ||
      variants.find((variant) => variant.isDefault) ||
      variants[0];

    if (!selectedVariant?._id) {
      setError("This product does not have an available variant.");
      return;
    }

    const availableStock = Number(selectedVariant.stockQuantity ?? 0);
    const maxOrderQuantity = Number(selectedVariant.maxOrderQuantity || 99);
    const allowedQuantity = Math.min(availableStock, maxOrderQuantity, 99);

    if (availableStock < 1) {
      setError("This product is currently out of stock.");
      return;
    }

    if (quantity > allowedQuantity) {
      setError(`Only ${allowedQuantity} item(s) can be added for this variant.`);
      return;
    }

    try {
      setCartLoading(true);
      setError("");
      setMessage("");

      await axios.post(
        "http://localhost:5000/api/cart",
        {
          productId: product._id,
          variantId: selectedVariant._id,
          quantity,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setMessage(`${product.name || product.title || "Product"} added to your cart.`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to add this product to your cart. Please try again."
      );
    } finally {
      setCartLoading(false);
    }
  };

  // ======================================================
  // ADD TO WISHLIST
  // ======================================================

  const handleAddToWishlist = async () => {
    if (!product?._id) return;

    try {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("userInfo");

      const currentUser = storedUser
        ? JSON.parse(storedUser)
        : null;

      if (!token || currentUser?.role !== "customer") {
        setError(
          "Please sign in with a customer account to use your wishlist."
        );
        return;
      }

      setWishlistLoading(true);
      setError("");
      setMessage("");

      await addToWishlist(product._id);

      setMessage("Product added to your wishlist.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to add this product to your wishlist."
      );
    } finally {
      setWishlistLoading(false);
    }
  };

  // ======================================================
  // CREATE PRICE ALERT
  // ======================================================

  const handleCreatePriceAlert = async (event) => {
    event.preventDefault();

    if (!product?._id) return;

    const price = Number(targetPrice);

    if (
      !targetPrice ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setError("Enter a valid target price.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("userInfo");

      const currentUser = storedUser
        ? JSON.parse(storedUser)
        : null;

      if (!token || currentUser?.role !== "customer") {
        setError(
          "Please sign in with a customer account to set a price alert."
        );
        return;
      }

      setAlertLoading(true);
      setError("");
      setMessage("");

      await addPriceAlert({
        productId: product._id,
        targetPrice: price,
        notifyOnRestock: true,
      });

      setTargetPrice("");
      setMessage("Price alert saved successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save price alert."
      );
    } finally {
      setAlertLoading(false);
    }
  };

  const productVariants = Array.isArray(product?.variants)
    ? product.variants
    : [];

  const selectedVariant =
    productVariants.find(
      (variant) => String(variant._id) === String(selectedVariantId)
    ) ||
    productVariants.find((variant) => variant.isDefault) ||
    productVariants[0] ||
    null;

  const currentPrice = selectedVariant
    ? selectedVariant.salePrice ?? selectedVariant.regularPrice
    : product?.price ?? 0;

  const availableStock = Number(selectedVariant?.stockQuantity ?? 0);
  const maxAllowedQuantity = selectedVariant
    ? Math.min(availableStock, Number(selectedVariant.maxOrderQuantity || 99), 99)
    : 99;

  const formatPrice = (price) =>
    `৳ ${Number(price || 0).toLocaleString("en-BD", {
      maximumFractionDigits: 2,
    })}`;

  // ======================================================
  // RENDER
  // ======================================================

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

          <Link
            to="/products"
            className="transition hover:text-[#B9533B]"
          >
            Products
          </Link>

          <span>/</span>

          <span className="max-w-[220px] truncate font-medium text-[#20332B]">
            {product?.name || product?.title || "Product Details"}
          </span>
        </nav>

        {loading ? (
          <div className="rounded-xl border border-[#E5E9E5] bg-white p-8">
            <Loader message="Loading product details..." />
          </div>
        ) : error && !product ? (
          <div className="rounded-xl border border-[#E5E9E5] bg-white px-5 py-14 text-center">
            <h1 className="text-xl font-bold text-[#20332B]">
              Product unavailable
            </h1>

            <p role="alert" className="mt-2 text-sm text-[#68766F]">
              {error}
            </p>

            <button
              type="button"
              onClick={fetchProduct}
              className="mt-5 rounded-lg bg-[#1A2E26] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Try Again
            </button>

            <div>
              <Link
                to="/products"
                className="mt-4 inline-block text-sm font-semibold text-[#B9533B]"
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
              className="mt-5 inline-flex rounded-lg bg-[#1A2E26] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2 lg:gap-10 xl:gap-14">
              {/* Product image */}

              <section>
                <div className="flex aspect-square max-h-[560px] items-center justify-center overflow-hidden rounded-xl border border-[#E5E9E5] bg-white p-5 sm:p-8">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name || product.title || "Product"}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[#89958D]">
                      <span className="text-5xl">▧</span>

                      <p className="mt-3 text-sm">
                        No product image available
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Product information */}

              <section className="flex h-full flex-col">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B9533B]">
                  LUTech Collection
                </p>

                <h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight text-[#20332B] sm:text-3xl lg:text-4xl">
                  {product.name || product.title || "Unnamed Product"}
                </h1>

                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-[#89958D]">
                    Price
                  </p>

                  <p className="mt-1 text-2xl font-extrabold tracking-tight text-[#1A2E26] sm:text-3xl">
                    {formatPrice(currentPrice)}
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

                {/* Purchase controls */}

                <div className="mt-6 flex flex-1 flex-col rounded-xl border border-[#E5E9E5] bg-white p-4 sm:p-5">
                  {productVariants.length > 1 && (
                    <div className="mb-4">
                      <label
                        htmlFor="product-variant"
                        className="mb-2 block text-sm font-semibold text-[#20332B]"
                      >
                        Choose an option
                      </label>
                      <select
                        id="product-variant"
                        value={selectedVariantId}
                        onChange={(event) => {
                          setSelectedVariantId(event.target.value);
                          setQuantity(1);
                          setError("");
                          setMessage("");
                        }}
                        className="w-full rounded-lg border border-[#E5E9E5] bg-white px-3 py-2.5 text-sm text-[#20332B] outline-none focus:border-[#1A2E26]"
                      >
                        {productVariants.map((variant) => {
                          const attributeText = variant.attributes
                            ? Object.entries(variant.attributes)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(" / ")
                            : "";
                          return (
                            <option key={variant._id} value={variant._id}>
                              {attributeText || variant.sku || "Default option"}
                              {Number(variant.stockQuantity) < 1 ? " — Out of stock" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  <div className="mb-3 flex items-center justify-between text-xs text-[#68766F]">
                    <span>Availability</span>
                    <span className={availableStock > 0 ? "font-semibold text-[#287A50]" : "font-semibold text-red-600"}>
                      {availableStock > 0 ? `${availableStock} in stock` : "Out of stock"}
                    </span>
                  </div>

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
                        className="flex h-10 w-10 items-center justify-center text-lg text-[#20332B] hover:bg-[#EBF0EB] disabled:opacity-40"
                      >
                        −
                      </button>

                      <input
                        id="product-quantity"
                        type="number"
                        min="1"
                        max={maxAllowedQuantity}
                        value={quantity}
                        onChange={(e) => {
                          const value = Number(e.target.value);

                          if (
                            Number.isInteger(value) &&
                            value >= 1 &&
                            value <= maxAllowedQuantity
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
                            Math.min(maxAllowedQuantity, current + 1)
                          )
                        }
                        disabled={quantity >= maxAllowedQuantity || maxAllowedQuantity < 1}
                        aria-label="Increase quantity"
                        className="flex h-10 w-10 items-center justify-center text-lg text-[#20332B] hover:bg-[#EBF0EB] disabled:opacity-40"
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
                        Number(currentPrice || 0) * quantity
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
                    disabled={cartLoading || !selectedVariant || availableStock < 1}
                    className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1A2E26] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#294438] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cartLoading ? "Adding..." : availableStock < 1 ? "Out of Stock" : "Add to Cart"}
                  </button>

                  <button
                    type="button"
                    onClick={handleAddToWishlist}
                    disabled={wishlistLoading}
                    className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg border border-[#D5DED7] px-5 py-2.5 text-sm font-semibold text-[#20332B] transition hover:bg-[#F4F6F4] disabled:opacity-60"
                  >
                    {wishlistLoading
                      ? "Saving..."
                      : "♡ Add to Wishlist"}
                  </button>

                  <Link
                    to="/cart"
                    className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg border border-[#D5DED7] px-5 py-2.5 text-sm font-semibold text-[#20332B] transition hover:bg-[#F4F6F4]"
                  >
                    View Cart
                  </Link>
                </div>

                {/* Price alert */}

                <form
                  onSubmit={handleCreatePriceAlert}
                  className="mt-4 rounded-xl border border-[#E5E9E5] bg-white p-4 sm:p-5"
                >
                  <h2 className="text-sm font-bold text-[#20332B]">
                    Set a Price Alert
                  </h2>

                  <p className="mt-1 text-xs text-[#68766F]">
                    Save your target price for this product.
                  </p>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      placeholder="Your target price (৳)"
                      className="min-w-0 flex-1 rounded-lg border border-[#E5E9E5] px-3 py-2.5 text-sm outline-none focus:border-[#1A2E26]"
                    />

                    <button
                      type="submit"
                      disabled={alertLoading}
                      className="rounded-lg border border-[#C7D5CA] px-4 py-2.5 text-sm font-semibold text-[#20332B] hover:bg-[#EBF0EB] disabled:opacity-60"
                    >
                      {alertLoading ? "Saving..." : "Save Alert"}
                    </button>
                  </div>
                </form>
              </section>
            </div>

            <div className="mt-6 flex flex-col gap-4 rounded-xl border border-[#E5E9E5] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#20332B]">
                  Shopping with LUTech
                </h3>

                <p className="mt-1 text-xs text-[#68766F]">
                  Explore electronics and accessories for your everyday needs.
                </p>
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