import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

function Home() {
  return (
    <>
      <Navbar />

      {/* Hero Section */}
      <div className="bg-light py-5">
        <div className="container text-center">
          <h1 className="display-4 fw-bold">
            Welcome to LUTech
          </h1>

          <p className="lead mt-3">
            Your Trusted Electronics E-Commerce Platform
          </p>

          <p className="text-muted">
            Explore the latest laptops, accessories,
            and technology products at affordable prices.
          </p>

          <Link
            to="/products"
            className="btn btn-primary btn-lg mt-3"
          >
            Shop Now
          </Link>
        </div>
      </div>

      {/* Featured Products */}
      <div className="container my-5">
        <h2 className="text-center mb-4">
          Featured Products
        </h2>

        <div className="row">

          <div className="col-md-4 mb-4">
            <div className="card shadow-sm h-100">
              <div className="card-body text-center">
                <h4>Gaming Laptop</h4>
                <p className="text-muted">
                  High-performance laptops for gaming
                  and professional work.
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-4 mb-4">
            <div className="card shadow-sm h-100">
              <div className="card-body text-center">
                <h4>Mechanical Keyboard</h4>
                <p className="text-muted">
                  Durable keyboards designed for
                  productivity and gaming.
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-4 mb-4">
            <div className="card shadow-sm h-100">
              <div className="card-body text-center">
                <h4>Wireless Mouse</h4>
                <p className="text-muted">
                  Comfortable and responsive wireless
                  mice for everyday use.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Why Choose LUTech */}
      <div className="bg-light py-5">
        <div className="container">
          <h2 className="text-center mb-4">
            Why Choose LUTech?
          </h2>

          <div className="row">

            <div className="col-md-4 mb-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <h4>Quality Products</h4>
                  <p>
                    We provide reliable and high-quality
                    electronic products.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <h4>Fast Delivery</h4>
                  <p>
                    Quick and efficient delivery service
                    for customer satisfaction.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-md-4 mb-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body text-center">
                  <h4>Secure Shopping</h4>
                  <p>
                    Safe and secure shopping experience
                    with verified user accounts.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-dark text-white text-center py-3">
        <p className="mb-0">
          © 2026 LUTech. All Rights Reserved.
        </p>
      </footer>
    </>
  );
}

export default Home;