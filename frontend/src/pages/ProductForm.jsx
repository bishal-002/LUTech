import { useState, useEffect } from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  createProduct,
  getProductById,
  updateProduct,
} from "../services/productService";

function ProductForm() {
  const navigate = useNavigate();

  const { id } = useParams();

  const isEditMode = !!id;

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    image: "",
    description: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEditMode) {
      fetchProduct();
    }
  }, []);

  const fetchProduct = async () => {
    try {
      const product = await getProductById(id);

      setFormData({
        name: product.name,
        price: product.price,
        image: product.image,
        description: product.description || "",
      });

    } catch (err) {
      setError("Failed to load product");
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    try {
      if (isEditMode) {
        const response =
          await updateProduct(id, formData);

        setMessage(response.message);

      } else {
        const response =
          await createProduct(formData);

        setMessage(response.message);

        setFormData({
          name: "",
          price: "",
          image: "",
          description: "",
        });
      }

      setTimeout(() => {
        navigate("/admin/products");
      }, 1000);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Operation failed"
      );
    }
  };

  return (
    <div className="container mt-5">

      <div className="row justify-content-center">

        <div className="col-md-6">

          <div className="card shadow">

            <div className="card-body">

              <h2 className="text-center mb-4">
                {isEditMode
                  ? "Edit Product"
                  : "Add Product"}
              </h2>

              {message && (
                <div className="alert alert-success">
                  {message}
                </div>
              )}

              {error && (
                <div className="alert alert-danger">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>

                <div className="mb-3">
                  <label className="form-label">
                    Product Name
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Price
                  </label>

                  <input
                    type="number"
                    className="form-control"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Image URL
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    name="image"
                    value={formData.image}
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Description
                  </label>

                  <textarea
                    className="form-control"
                    rows="4"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                >
                  {isEditMode
                    ? "Update Product"
                    : "Add Product"}
                </button>

              </form>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default ProductForm;