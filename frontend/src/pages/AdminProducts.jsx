import { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import {
  getProducts,
  deleteProduct,
} from "../services/productService";

function AdminProducts() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const data = await getProducts();
    setProducts(data);
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Delete this product?"
    );

    if (!confirmDelete) return;

    await deleteProduct(id);

    fetchProducts();
  };

  return (
    <div className="container mt-5">

      <div className="d-flex justify-content-between mb-4">

        <h2>Admin Products</h2>

        <Link
          to="/admin/products/add"
          className="btn btn-success"
        >
          Add Product
        </Link>

      </div>

      <table className="table table-bordered">

        <thead>
          <tr>
            <th>Name</th>
            <th>Price</th>
            <th width="200">Action</th>
          </tr>
        </thead>

        <tbody>

          {products.length === 0 ? (
            <tr>
              <td
                colSpan="3"
                className="text-center"
              >
                No products found
              </td>
            </tr>
          ) : (
            products.map((product) => (
              <tr key={product._id}>

                <td>{product.name}</td>

                <td>৳ {product.price}</td>

                <td>

                  <Link
                    to={`/admin/products/edit/${product._id}`}
                    className="btn btn-primary btn-sm me-2"
                  >
                    Edit
                  </Link>

                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() =>
                      handleDelete(product._id)
                    }
                  >
                    Delete
                  </button>

                </td>

              </tr>
            ))
          )}

        </tbody>

      </table>
    </div>
  );
}

export default AdminProducts;