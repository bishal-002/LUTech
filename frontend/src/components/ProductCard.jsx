
import { Link } from "react-router-dom";

function ProductCard({ product }) {
  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#E5E9E5] bg-white transition-all duration-200 hover:-translate-y-1 hover:border-[#C7D5CA] hover:shadow-[0_8px_20px_rgba(26,46,38,0.08)]">
      <Link
        to={`/product/${product._id}`}
        className="block overflow-hidden bg-[#F4F6F4]"
      >
        <div className="flex h-36 items-center justify-center p-3 sm:h-40">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <Link to={`/product/${product._id}`}>
          <h3 className="line-clamp-2 text-sm font-bold leading-5 text-[#20332B] transition-colors group-hover:text-[#B9533B]">
            {product.name}
          </h3>
        </Link>

        <p className="mt-1 line-clamp-2 text-xs leading-4 text-[#68766F]">
          {product.description || "No description available."}
        </p>

        <div className="mt-2">
          <p className="text-[11px] text-[#89958D]">Price</p>
          <p className="mt-0.5 text-lg font-bold leading-6 text-[#1A2E26]">
            ৳ {Number(product.price).toLocaleString("en-BD")}
          </p>
        </div>

        <Link
          to={`/product/${product._id}`}
          className="mt-3 inline-flex min-h-9 w-full items-center justify-center rounded-lg bg-[#1A2E26] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#294438] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9533B]"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}

export default ProductCard;
