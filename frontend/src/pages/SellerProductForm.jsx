
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api/products";

function SellerProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    image: "",
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getAuthConfig = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  // Fetch product when editing
  useEffect(() => {
    if (!isEditing) return;

    const fetchProduct = async () => {
      try {
        const response = await axios.get(
          `${API_URL}/${id}`
        );

        const product = response.data;

        setFormData({
          name: product.name || "",
          price: product.price ?? "",
          image: product.image || "",
          description: product.description || "",
        });
      } catch (err) {
        setError(
          err.response?.data?.message || "Unable to load product."
        );
      } finally {
        setFetching(false);
      }
    };

    fetchProduct();
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      !formData.name.trim() ||
      !formData.price ||
      !formData.image.trim()
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (!Number.isFinite(Number(formData.price)) ||
        Number(formData.price) <= 0) {
      setError("Please enter a valid price greater than zero.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...formData,
        name: formData.name.trim(),
        price: Number(formData.price),
      };

      if (isEditing) {
        await axios.put(
          `${API_URL}/${id}`,
          payload,
          getAuthConfig()
        );

        setSuccess("Product updated successfully!");
      } else {
        await axios.post(
          API_URL,
          payload,
          getAuthConfig()
        );

        setSuccess("Product added successfully!");
      }

      setTimeout(() => {
        navigate("/seller/products");
      }, 1000);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        Loading product...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {isEditing ? "Edit Product" : "Add New Product"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEditing
                ? "Update your product information."
                : "Add a new product to your store."}
            </p>
          </div>

          <Link
            to="/seller/products"
            className="rounded-lg border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl bg-white p-6 shadow-sm sm:p-8"
        >

          {error && (
            <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-100 p-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {/* Product Name */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Product Name *
            </label>

            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter product name"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Price */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Price (BDT) *
            </label>

            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="Enter product price"
              min="0.01"
              step="0.01"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Image URL */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Product Image URL *
            </label>

            <input
              type="url"
              name="image"
              value={formData.image}
              onChange={handleChange}
              placeholder="https://example.com/product.jpg"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Image Preview */}
          {formData.image && (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">
                Image Preview
              </p>

              <img
                src={formData.image}
                alt="Product preview"
                className="h-48 w-full rounded-lg border object-contain"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Description
            </label>

            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="5"
              placeholder="Describe your product..."
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Saving..."
              : isEditing
                ? "Update Product"
                : "Add Product"}
          </button>

        </form>
      </div>
    </div>
  );
}

export default SellerProductForm;
