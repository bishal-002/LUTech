
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function ProductCard({
  product,
  showDetailsButton = true,
  variant = "default",
  index = 0,
}) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const productUrl = `/product/${product._id}`;
  const price = Number(product.price);

  const formattedPrice = Number.isFinite(price)
    ? price.toLocaleString("en-BD", {
        maximumFractionDigits: 2,
      })
    : "Price unavailable";

  // Close Quick View modal using Escape
  useEffect(() => {
    if (!quickViewOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setQuickViewOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [quickViewOpen]);

  return (
    <>
      {/* CATEGORY STYLE CARD */}
      {variant === "category" ? (
        <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E5E9E5] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#C7D5CA] hover:shadow-xl">

          {/* Product Image */}
          <Link
            to={productUrl}
            aria-label={`View ${product.name}`}
            className="block h-44 overflow-hidden bg-[#E9EDE8] sm:h-52"
          >
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[#89958D]">
                Image unavailable
              </div>
            )}
          </Link>

          {/* Product Information */}
          <div className="flex flex-1 flex-col p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest text-[#B9533B]">
                {String(index + 1).padStart(2, "0")}
              </span>

              <button
                type="button"
                onClick={() => setQuickViewOpen(true)}
                aria-label={`Quick view ${product.name}`}
                className="text-lg text-[#68766F] transition duration-300 hover:translate-x-1 hover:text-[#B9533B]"
              >
                →
              </button>
            </div>

            <Link to={productUrl} className="no-underline">
              <h3 className="line-clamp-2 text-base font-bold leading-6 text-[#20332B] transition-colors group-hover:text-[#B9533B]">
                {product.name}
              </h3>
            </Link>

            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#68766F]">
              {product.description || "Discover this product at LUTech."}
            </p>

            <div className="mt-auto flex items-center justify-between gap-2 pt-4">
              <p className="text-base font-extrabold text-[#1A2E26]">
                {Number.isFinite(price) ? "৳ " : ""}
                {formattedPrice}
              </p>

              <Link
                to={productUrl}
                className="text-xs font-bold text-[#1A2E26] no-underline transition hover:text-[#B9533B]"
              >
                Details →
              </Link>
            </div>
          </div>
        </article>
      ) : (

        /* ORIGINAL DEFAULT PRODUCT CARD */
        <article className="group flex w-full min-w-0 flex-col gap-3 rounded-xl border border-[#E5E9E5] bg-white p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C7D5CA] hover:shadow-[0_8px_22px_rgba(26,46,38,0.09)] sm:gap-4 sm:p-4">

          {/* FIRST ROW: Image + Product Information */}
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">

            {/* Product Image */}
            <Link
              to={productUrl}
              aria-label={`View ${product.name}`}
              className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-[#E9EDE8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E07A5F] sm:h-32 sm:w-32"
            >
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-1 text-[#89958D]">
                  <span className="text-3xl" aria-hidden="true">
                    ▧
                  </span>
                  <span className="text-[10px]">No image</span>
                </div>
              )}
            </Link>

            {/* Product Information */}
            <div className="flex min-w-0 flex-1 flex-col gap-2">

              <Link
                to={productUrl}
                className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E07A5F]"
              >
                <h3 className="line-clamp-2 text-sm font-bold leading-5 text-[#20332B] transition-colors duration-200 group-hover:text-[#B9533B] sm:text-base">
                  {product.name}
                </h3>
              </Link>

              <p className="line-clamp-2 text-xs leading-4 text-[#68766F] sm:leading-5">
                {product.description || "No description available."}
              </p>

              {/* Price */}
              <div className="mt-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-[#89958D]">
                  Price
                </p>

                <p className="mt-0.5 text-base font-extrabold text-[#1A2E26] sm:text-lg">
                  {Number.isFinite(price) ? "৳ " : ""}
                  {formattedPrice}
                </p>
              </div>
            </div>
          </div>

          {/* SECOND ROW: Action Buttons */}
          <div className="grid grid-cols-2 gap-2 border-t border-[#E5E9E5] pt-3">

            {showDetailsButton && (
              <Link
                to={productUrl}
                className="inline-flex min-h-10 items-center justify-center gap-1 whitespace-nowrap rounded-lg bg-[#1A2E26] px-2 py-2 text-xs font-semibold text-white no-underline transition-colors duration-200 hover:bg-[#294438] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E07A5F] sm:text-sm"
              >
                View Details
                <span aria-hidden="true">→</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setQuickViewOpen(true)}
              className={`inline-flex min-h-10 items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-[#E07A5F] bg-white px-2 py-2 text-xs font-semibold text-[#B9533B] transition-colors duration-200 hover:bg-[#FCE9E5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A2E26] ${
                showDetailsButton ? "" : "col-span-2"
              }`}
            >
              Quick View
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </article>
      )}

      {/* QUICK VIEW MODAL - SHARED BY BOTH CARD VARIANTS */}
      {quickViewOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#14251E]/65 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setQuickViewOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`quick-view-${product._id}`}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setQuickViewOpen(false)}
              aria-label="Close quick view"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl text-[#1A2E26] shadow-md transition-colors hover:bg-[#FCE9E5] hover:text-[#B9533B] focus-visible:outline-2 focus-visible:outline-[#E07A5F]"
            >
              ×
            </button>

            {/* Modal Image */}
            <div className="flex h-56 items-center justify-center bg-[#F4F6F4] p-6 sm:h-64">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-sm text-[#89958D]">
                  Image unavailable
                </span>
              )}
            </div>

            {/* Modal Information */}
            <div className="p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-[#E07A5F]">
                Product Preview
              </p>

              <h2
                id={`quick-view-${product._id}`}
                className="mt-2 text-xl font-extrabold leading-7 text-[#1A2E26]"
              >
                {product.name}
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#68766F]">
                {product.description || "No description available."}
              </p>

              {/* Modal Price */}
              <div className="mt-5 border-t border-[#E5E9E5] pt-4">
                <p className="text-xs font-medium text-[#89958D]">
                  Price
                </p>

                <p className="mt-1 text-2xl font-extrabold text-[#1A2E26]">
                  {Number.isFinite(price) ? "৳ " : ""}
                  {formattedPrice}
                </p>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={productUrl}
                  onClick={() => setQuickViewOpen(false)}
                  className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[#1A2E26] px-5 py-3 text-sm font-bold text-white no-underline transition-colors hover:bg-[#294438] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E07A5F]"
                >
                  View Full Details →
                </Link>

                <button
                  type="button"
                  onClick={() => setQuickViewOpen(false)}
                  className="min-h-11 rounded-xl border border-[#D8E0D9] px-5 py-3 text-sm font-semibold text-[#1A2E26] transition-colors hover:bg-[#F4F6F4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E07A5F]"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default ProductCard;
