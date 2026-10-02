import { Link } from "react-router-dom";

function ProductCard({ product }) {
  return (
    <div className="card h-100 shadow-sm">
      <img
        src={product.image}
        className="card-img-top"
        alt={product.name}
        style={{ height: "220px", objectFit: "cover" }}
      />

      <div className="card-body">
        <h5>{product.name}</h5>

        <p className="fw-bold text-primary">
          ৳ {product.price}
        </p>

        <Link
          to={`/product/${product._id}`}
          className="btn btn-primary w-100"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}

export default ProductCard;