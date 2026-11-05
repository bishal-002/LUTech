
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api/products/mine";

function SellerProducts() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const getAuthConfig = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  // Fetch seller products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await axios.get(API_URL, getAuthConfig());

      setProducts(response.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate("/login");
      } else {
        setError("Failed to load your products. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Delete product
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);

      await axios.delete(`${API_URL}/${id}`, getAuthConfig());

      setProducts((prevProducts) =>
        prevProducts.filter((product) => product._id !== id)
      );
    } catch (err) {
      alert(
        err.response?.data?.message || "Failed to delete product."
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading your products...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              My Products
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage the products listed in your store.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/seller/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              Dashboard
            </Link>

            <Link
              to="/seller/products/add"
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              + Add Product
            </Link>
          </div>
        </div>

        {/* Product count */}
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total My Products</p>
          <h2 className="mt-1 text-3xl font-bold text-gray-800">
            {products.length}
          </h2>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-100 p-4 text-red-700">
            {error}
            <button
              onClick={fetchProducts}
              className="ml-3 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!error && products.length === 0 && (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <h3 className="text-xl font-semibold text-gray-800">
              No products yet
            </h3>
            <p className="mt-2 text-gray-500">
              Start adding products to your store.
            </p>
            <Link
              to="/seller/products/add"
              className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
            >
              Add Your First Product
            </Link>
          </div>
        )}

        {/* Product grid */}
        {products.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <div
                key={product._id}
                className="overflow-hidden rounded-xl bg-white shadow-sm transition hover:shadow-md"
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-48 w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />

                <div className="p-5">
                  <h3 className="truncate text-lg font-semibold text-gray-800">
                    {product.name}
                  </h3>

                  <p className="mt-2 text-xl font-bold text-blue-600">
                    ৳{Number(product.price).toLocaleString("en-BD")}
                  </p>

                  <p className="mt-2 line-clamp-2 text-sm text-gray-500">
                    {product.description || "No description available."}
                  </p>

                  <div className="mt-5 flex gap-3">
                    <Link
                      to={`/seller/products/edit/${product._id}`}
                      className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Edit
                    </Link>

                    <button
                      onClick={() => handleDelete(product._id)}
                      disabled={deletingId === product._id}
                      className="flex-1 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-200 disabled:opacity-50"
                    >
                      {deletingId === product._id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default SellerProducts;
