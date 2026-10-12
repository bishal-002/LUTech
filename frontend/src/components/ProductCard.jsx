
import { Link } from "react-router-dom";

function ProductCard({ product }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
      <Link
        to={`/product/${product._id}`}
        className="block overflow-hidden bg-slate-100"
      >
        <img
          src={product.image}
          alt={product.name}
          className="h-56 w-full object-cover transition duration-300 hover:scale-105"
          loading="lazy"
        />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-lg font-bold text-slate-900">
          {product.name}
        </h3>

        <p className="mt-3 text-xl font-extrabold text-blue-700">
          ৳ {product.price}
        </p>

        <Link
          to={`/product/${product._id}`}
          className="mt-auto inline-flex w-full items-center justify-center rounded-lg bg-blue-700 px-4 py-3 mt-5 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}

export default ProductCard;
