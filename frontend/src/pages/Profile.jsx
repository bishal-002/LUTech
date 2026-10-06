import { useEffect, useState } from "react";
import {
  getUserProfile,
  updateUserProfile
} from "../services/userService";

function Profile() {
  const [user, setUser] = useState(null);

  const [name, setName] = useState("");

  const [address, setAddress] = useState("");

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const userInfo = JSON.parse(
        localStorage.getItem("userInfo")
      );

      const data = await getUserProfile(
        userInfo._id
      );

      setUser(data);
      setName(data.name);
      setAddress(data.address || "");

    } catch (err) {
      setError("Failed to load profile");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const userInfo = JSON.parse(
        localStorage.getItem("userInfo")
      );

      const response =
        await updateUserProfile(
          userInfo._id,
          { name, address }
        );

      setMessage(response.message);

      localStorage.setItem(
        "userInfo",
        JSON.stringify(response.user)
      );

    } catch (err) {
      setError("Failed to update profile");
    }
  };

  if (!user) {
    return (
      <div className="container mt-5">
        <h3>Loading Profile...</h3>
      </div>
    );
  }

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">

        <div className="col-md-6">

          <div className="card shadow">

            <div className="card-body">

              <h2 className="text-center mb-4">
                My Profile
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
                    Name
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) =>
                      setName(e.target.value)
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Email
                  </label>

                  <input
                    type="email"
                    className="form-control"
                    value={user.email}
                    disabled
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Verification Status
                  </label>

                  <input
                    type="text"
                    className="form-control"
                    value={
                      user.isVerified
                        ? "Verified"
                        : "Not Verified"
                    }
                    disabled
                  />
                </div>

                <div className="mb-3">
                    <label className="form-lable">
                        Address
                    </label>
                    <textarea
                        className="form-control"
                        rows="3"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                >
                  Update Profile
                </button>

              </form>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

export default Profile;