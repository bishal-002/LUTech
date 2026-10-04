import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { verifyOTP } from "../services/authService";

function VerifyOTP() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    otp: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
      const response = await verifyOTP(formData);

      setMessage(response.message);

      setTimeout(() => {
        navigate("/login");
      }, 2000);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        "OTP verification failed"
      );
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-5">

          <div className="card shadow">
            <div className="card-body">

              <h2 className="text-center mb-4">
                Verify Email
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
                    Email
                  </label>

                  <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    OTP
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    name="otp"
                    value={formData.otp}
                    onChange={handleChange}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                >
                  Verify OTP
                </button>

              </form>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default VerifyOTP;