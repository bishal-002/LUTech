
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const CART_KEY = "cart";

function readCart() {
  try {
    const storedCart = localStorage.getItem(CART_KEY);
    const parsedCart = storedCart ? JSON.parse(storedCart) : [];

    return Array.isArray(parsedCart) ? parsedCart : [];
  } catch {
    return [];
  }
}

function formatPrice(price) {
  return `৳${Number(price || 0).toLocaleString("en-BD", {
    maximumFractionDigits: 2,
  })}`;
}

function Cart() {
  const [cartItems, setCartItems] = useState(readCart);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  const updateQuantity = (productId, quantity) => {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return;
    }

    setCartItems((items) =>
      items.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );

    setMessage("");
    setError("");
  };

  const removeItem = (productId) => {
    setCartItems((items) =>
      items.filter((item) => item.productId !== productId)
    );

    setMessage("");
    setError("");
  };

  const subtotal = cartItems.reduce((total, item) => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 0;

    return total + price * quantity;
  }, 0);

  const totalQuantity = cartItems.reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0
  );

  const handleCheckout = async (e) => {
    e.preventDefault();

    if (submitting) return;

    setMessage("");
    setError("");
    setOrderResult(null);

    if (cartItems.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (
      !shippingName.trim() ||
      !shippingPhone.trim() ||
      !shippingAddress.trim()
    ) {
      setError("Please complete all shipping details.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please log in as a customer before checkout.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await axios.post(
        "http://localhost:5000/api/orders/checkout",
        {
          items: cartItems.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
          })),
          shippingName: shippingName.trim(),
          shippingPhone: shippingPhone.trim(),
          shippingAddress: shippingAddress.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setOrderResult(response.data);

      // Clear cart only after successful order creation.
      setCartItems([]);
      localStorage.removeItem(CART_KEY);

      setMessage("Your order has been placed successfully!");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to place your order. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col overflow-x-clip bg-[#F4F6F4]">
      <Navbar />

      <main className="mx-auto w-full min-w-0 max-w-[1440px] flex-1 px-3 py-6 sm:px-6 sm:py-10 lg:px-10 lg:py-12">

        {/* Page Heading */}
        <div className="mb-7 border-b border-[#DCE3DC] pb-5 sm:mb-10 sm:pb-6">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-medium text-[#89958D]">
            <Link to="/" className="transition hover:text-[#1A2E26]">
              Home
            </Link>
            <span>/</span>
            <span className="text-[#1A2E26]">Shopping Cart</span>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B9533B]">
                Your selections
              </p>

              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#20332B] sm:text-4xl">
                Shopping Cart
              </h1>

              <p className="mt-2 text-sm text-[#68766F]">
                Review your items before placing your order.
              </p>
            </div>

            {cartItems.length > 0 && (
              <div className="shrink-0 rounded-full border border-[#D5DED7] bg-white px-4 py-2 text-xs font-semibold text-[#20332B] sm:text-sm">
                {totalQuantity} {totalQuantity === 1 ? "item" : "items"}
              </div>
            )}
          </div>
        </div>

        {/* Feedback Messages */}
        {message && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-sm leading-6 text-green-800"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {/* Successful Order */}
        {orderResult && (
          <div className="mb-8 rounded-2xl border border-green-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </div>

              <div className="min-w-0">
                <h2 className="text-xl font-bold text-[#20332B]">
                  Order placed successfully!
                </h2>

                <p className="mt-1 text-sm text-[#68766F]">
                  Your Cash on Delivery order has been confirmed.
                </p>

                <p className="mt-3 text-sm font-semibold text-green-700">
                  Total Orders: {orderResult.count}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {orderResult.orders?.map((order) => (
                <div
                  key={order._id}
                  className="rounded-xl border border-[#E5E9E5] bg-[#F9FAF9] p-4 text-sm"
                >
                  <p className="break-all font-semibold text-[#20332B]">
                    Order ID: {order._id}
                  </p>

                  <p className="mt-2 text-[#68766F]">
                    Total: {formatPrice(order.totalAmount)}
                  </p>

                  <p className="text-[#68766F]">
                    Payment: Cash on Delivery
                  </p>
                </div>
              ))}
            </div>

            <Link
              to="/products"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#1A2E26] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#294438]"
            >
              Continue Shopping
            </Link>
          </div>
        )}

        {/* Empty Cart */}
        {cartItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#C7D5CA] bg-white px-5 py-16 text-center sm:py-20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E5EDE7] text-[#1A2E26]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                className="h-8 w-8"
                aria-hidden="true"
              >
                <path d="M3 3h2l2.4 11.4a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 8H6" />
                <circle cx="10" cy="20" r="1" />
                <circle cx="18" cy="20" r="1" />
              </svg>
            </div>

            <h2 className="mt-5 text-2xl font-bold text-[#20332B]">
              Your cart is empty
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68766F]">
              Looks like you haven't added anything yet. Explore our
              collection and discover something you love.
            </p>

            <Link
              to="/products"
              className="mt-7 inline-flex items-center justify-center rounded-lg bg-[#1A2E26] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#294438]"
            >
              Explore Products
              <span className="ml-2">→</span>
            </Link>
          </div>
        ) : (
          <div className="grid w-full min-w-0 grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-10">

            {/* Cart Items */}
            <section className="w-full min-w-0">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-[#20332B]">
                  Your Cart Items
                </h2>

                <span className="shrink-0 whitespace-nowrap text-xs font-medium text-[#89958D]">
                  {cartItems.length}{" "}
                  {cartItems.length === 1 ? "product" : "products"}
                </span>
              </div>

              <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-[#E5E9E5] bg-white">
                {cartItems.map((item, index) => (
                  <article
                    key={item.productId}
                    className={`grid w-full min-w-0 grid-cols-[56px_minmax(0,1fr)] gap-2 overflow-hidden p-3 sm:flex sm:items-center sm:gap-5 sm:p-5 ${index !== cartItems.length - 1
                      ? "border-b border-[#E5E9E5]"
                      : ""
                      }`}
                  >
                    {/* Product Image */}
                    <Link
                      to={`/product/${item.productId}`}
                      className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#F4F6F4] p-2 sm:h-32 sm:w-32"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name || "Product"}
                          className="h-full w-full object-contain transition duration-300 hover:scale-105"
                        />
                      ) : (
                        <span className="text-xs text-[#89958D]">
                          No image
                        </span>
                      )}
                    </Link>

                    {/* Product Information */}
                    <div className="flex w-full min-w-0 flex-1 flex-col justify-between gap-3">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="mb-1 hidden text-[10px] font-bold uppercase tracking-[0.14em] text-[#B9533B] sm:block">
                            LUTech Collection
                          </p>

                          <Link
                            to={`/product/${item.productId}`}
                            className="break-words text-sm font-bold text-[#20332B] transition hover:text-[#B9533B] sm:text-base"
                          >
                            {item.name || "Unnamed Product"}
                          </Link>

                          <p className="mt-1 text-xs text-[#89958D]">
                            Unit price: {formatPrice(item.price)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          aria-label={`Remove ${item.name} from cart`}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#89958D] transition hover:bg-red-50 hover:text-red-600"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-4 w-4"
                            aria-hidden="true"
                          >
                            <path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
                          </svg>
                        </button>
                      </div>

                      {/* Quantity and Item Total */}

                      {/* Quantity and Item Total */}
                      <div className="flex w-full min-w-0 flex-wrap items-end justify-between gap-x-3 gap-y-3">
                        {/* Quantity */}
                        <div className="min-w-0 flex-1">
                          <span className="mb-1 hidden text-[10px] font-bold uppercase tracking-wider text-[#89958D] sm:block">
                            Quantity
                          </span>

                          <div className="inline-flex shrink-0 items-center rounded-full border border-[#E5E9E5] bg-[#F9FAF9]">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.productId, item.quantity - 1)
                              }
                              disabled={item.quantity <= 1}
                              aria-label={`Decrease quantity of ${item.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-l-full text-[#20332B] hover:bg-[#EBF0EB] disabled:opacity-40 sm:h-9 sm:w-9"
                            >
                              −
                            </button>

                            <span className="flex h-8 min-w-9 items-center justify-center border-x border-[#E5E9E5] px-2 text-xs font-semibold text-[#20332B] sm:h-9 sm:text-sm">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.productId, item.quantity + 1)
                              }
                              disabled={item.quantity >= 99}
                              aria-label={`Increase quantity of ${item.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-r-full text-[#20332B] hover:bg-[#EBF0EB] disabled:opacity-40 sm:h-9 sm:w-9"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Item Total */}
                        <div className="ml-auto w-max min-w-[100px] shrink-0 text-right">
                          <p className="text-[9px] font-bold uppercase tracking-wide text-[#89958D] sm:text-[10px]">
                            Item Total
                          </p>

                          <p className="mt-1 whitespace-nowrap text-sm font-extrabold text-[#1A2E26] sm:text-lg">
                            {formatPrice(
                              (Number(item.price) || 0) *
                              (Number(item.quantity) || 0)
                            )}
                          </p>
                        </div>
                      </div>

                    </div>
                  </article>
                ))}
              </div>

              <Link
                to="/products"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1A2E26] transition hover:text-[#B9533B]"
              >
                <span aria-hidden="true">←</span>
                Continue Shopping
              </Link>
            </section>

            {/* Order Summary */}
            <aside className="w-full min-w-0 overflow-hidden rounded-2xl border border-[#E5E9E5] bg-white shadow-sm lg:sticky lg:top-6">
              <div className="bg-[#1A2E26] px-5 py-5 text-white sm:px-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#E9B5A6]">
                  Your order
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Order Summary
                </h2>

                <p className="mt-1 text-xs text-[#D0DCD4]">
                  Review your order details below.
                </p>
              </div>

              <div className="p-4 sm:p-6">
                {/* Price Details */}
                <h3 className="text-sm font-bold text-[#20332B]">
                  Price Details
                </h3>

                <div className="mt-5 space-y-4">
                  <div className="flex min-w-0 items-center justify-between gap-2 text-sm text-[#68766F]">
                    <span>Products ({totalQuantity} items)</span>

                    <span className="shrink-0 font-semibold text-[#20332B]">
                      {formatPrice(subtotal)}
                    </span>
                  </div>

                  <div className="flex min-w-0 items-center justify-between gap-2 text-sm text-[#68766F]">
                    <span>Shipping</span>

                    <span className="shrink-0 text-xs font-medium text-[#89958D] sm:text-sm">
                      Calculated later
                    </span>
                  </div>

                  <div className="border-t border-[#E5E9E5] pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-[#20332B] sm:text-base">
                        Estimated Total
                      </span>

                      <span className="shrink-0 text-lg font-extrabold text-[#1A2E26] sm:text-xl">
                        {formatPrice(subtotal)}
                      </span>
                    </div>

                    <p className="mt-2 text-[11px] leading-5 text-[#89958D]">
                      Shipping charges, if applicable, are not included.
                    </p>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mt-6 rounded-xl border border-[#E5E9E5] bg-[#F4F6F4] p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#1A2E26]">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        className="h-5 w-5"
                        aria-hidden="true"
                      >
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <path d="M2 10h20M6 15h4" />
                      </svg>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#20332B]">
                        Payment Method
                      </p>

                      <p className="mt-0.5 text-xs text-[#68766F]">
                        Cash on Delivery
                      </p>
                    </div>
                  </div>
                </div>

                {/* Delivery Information */}
                <form
                  onSubmit={handleCheckout}
                  className="mt-7 space-y-4"
                >
                  <div className="border-b border-[#E5E9E5] pb-3">
                    <h3 className="text-base font-bold text-[#20332B]">
                      Delivery Information
                    </h3>

                    <p className="mt-1 text-xs text-[#89958D]">
                      Where should we deliver your order?
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="shippingName"
                      className="mb-2 block text-xs font-semibold text-[#20332B]"
                    >
                      Full Name *
                    </label>

                    <input
                      id="shippingName"
                      type="text"
                      value={shippingName}
                      onChange={(e) => setShippingName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                      maxLength={100}
                      disabled={submitting}
                      className="w-full min-w-0 rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] px-3 py-3 text-sm text-[#20332B] outline-none transition placeholder:text-[#A0AAA3] focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="shippingPhone"
                      className="mb-2 block text-xs font-semibold text-[#20332B]"
                    >
                      Phone Number *
                    </label>

                    <input
                      id="shippingPhone"
                      type="tel"
                      value={shippingPhone}
                      onChange={(e) => setShippingPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      required
                      maxLength={20}
                      disabled={submitting}
                      className="w-full min-w-0 rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] px-3 py-3 text-sm text-[#20332B] outline-none transition placeholder:text-[#A0AAA3] focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10 disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="shippingAddress"
                      className="mb-2 block text-xs font-semibold text-[#20332B]"
                    >
                      Delivery Address *
                    </label>

                    <textarea
                      id="shippingAddress"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Enter your complete delivery address"
                      rows={3}
                      required
                      maxLength={500}
                      disabled={submitting}
                      className="w-full min-w-0 resize-y rounded-lg border border-[#E5E9E5] bg-[#F9FAF9] px-3 py-3 text-sm text-[#20332B] outline-none transition placeholder:text-[#A0AAA3] focus:border-[#1A2E26] focus:bg-white focus:ring-4 focus:ring-[#1A2E26]/10 disabled:opacity-60"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || cartItems.length === 0}
                    className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#1A2E26] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#294438] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9533B] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Placing Order...
                      </>
                    ) : (
                      <>
                        Place Order
                        <span className="transition-transform group-hover:translate-x-1">
                          →
                        </span>
                      </>
                    )}
                  </button>

                  <p className="text-center text-[11px] leading-5 text-[#89958D]">
                    Payment will be collected upon delivery.
                  </p>
                </form>
              </div>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default Cart;
