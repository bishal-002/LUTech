import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

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

  const handleCheckout = () => {
    setMessage("");
    setError("");

    if (cartItems.length === 0) {
      setError("Your cart is empty. Add products before checkout.");
      return;
    }

    setMessage(
      "Demo checkout selected. No order has been placed yet. Cash on Delivery order processing will be connected when the order API is implemented."
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
            Your selections
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Shopping Cart
          </h1>

          <p className="mt-3 text-slate-600">
            Review your products and update quantities before checkout.
          </p>
        </div>

        {message && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-sm leading-6 text-blue-800"
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

        {cartItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
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

            <h2 className="mt-5 text-2xl font-bold text-slate-900">
              Your cart is empty
            </h2>

            <p className="mt-2 text-slate-600">
              Explore our collection and add something you like.
            </p>

            <Link
              to="/products"
              className="mt-6 inline-flex rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  Cart Items
                </h2>

                <span className="text-sm text-slate-500">
                  {cartItems.length}{" "}
                  {cartItems.length === 1 ? "product" : "products"}
                </span>
              </div>

              {cartItems.map((item) => (
                <article
                  key={item.productId}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
                >
                  <div className="flex flex-col gap-5 sm:flex-row">
                    <Link
                      to={`/product/${item.productId}`}
                      className="flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 p-3 sm:w-36"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name || "Product"}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-sm text-slate-400">
                          No image
                        </span>
                      )}
                    </Link>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <Link
                            to={`/product/${item.productId}`}
                            className="font-bold text-slate-900 transition hover:text-blue-700"
                          >
                            {item.name || "Unnamed Product"}
                          </Link>

                          <p className="mt-2 text-sm text-slate-500">
                            Unit price: {formatPrice(item.price)}
                          </p>
                        </div>

                        <p className="shrink-0 font-bold text-slate-900">
                          {formatPrice(
                            (Number(item.price) || 0) *
                              (Number(item.quantity) || 0)
                          )}
                        </p>
                      </div>

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-5">
                        <div>
                          <label
                            htmlFor={`quantity-${item.productId}`}
                            className="mb-2 block text-xs font-semibold text-slate-500"
                          >
                            Quantity
                          </label>

                          <div className="flex items-center rounded-lg border border-slate-300">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.quantity - 1
                                )
                              }
                              disabled={item.quantity <= 1}
                              aria-label={`Decrease quantity of ${item.name}`}
                              className="rounded-l-lg px-3 py-2 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              −
                            </button>

                            <input
                              id={`quantity-${item.productId}`}
                              type="number"
                              min="1"
                              max="99"
                              value={item.quantity}
                              onChange={(e) => {
                                const value = Number(e.target.value);

                                if (
                                  Number.isInteger(value) &&
                                  value >= 1 &&
                                  value <= 99
                                ) {
                                  updateQuantity(item.productId, value);
                                }
                              }}
                              className="w-12 border-x border-slate-300 py-2 text-center text-sm font-semibold text-slate-900 outline-none"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.quantity + 1
                                )
                              }
                              disabled={item.quantity >= 99}
                              aria-label={`Increase quantity of ${item.name}`}
                              className="rounded-r-lg px-3 py-2 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="text-sm font-semibold text-red-600 transition hover:text-red-800 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              <Link
                to="/products"
                className="inline-flex items-center gap-2 pt-2 text-sm font-semibold text-blue-700 hover:text-blue-900"
              >
                <span aria-hidden="true">←</span>
                Continue Shopping
              </Link>
            </section>

            <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Order Summary
              </h2>

              <div className="mt-6 space-y-4">
                <div className="flex justify-between gap-4 text-sm text-slate-600">
                  <span>Items subtotal</span>
                  <span className="font-semibold text-slate-900">
                    {formatPrice(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between gap-4 text-sm text-slate-600">
                  <span>Shipping</span>
                  <span className="font-medium text-slate-500">
                    Calculated later
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-slate-900">
                      Estimated total
                    </span>

                    <span className="text-xl font-extrabold text-blue-700">
                      {formatPrice(subtotal)}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Shipping charges, if applicable, are not included.
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Payment method
                </p>

                <p className="mt-1 text-sm text-slate-600">
                  Cash on Delivery (demo)
                </p>
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                className="mt-6 w-full rounded-lg bg-blue-700 px-5 py-3.5 font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200"
              >
                Proceed to Checkout
              </button>

              <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                Demo checkout only. An order is not created at this stage.
              </p>
            </aside>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default Cart;