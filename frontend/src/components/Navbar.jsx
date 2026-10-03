import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  const userInfo = JSON.parse(
    localStorage.getItem("userInfo")
  );

  const handleLogout = () => {
    localStorage.removeItem("userInfo");
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">

        <Link className="navbar-brand" to="/">
          LUTech
        </Link>

        <div className="ms-auto">

          {!userInfo ? (
            <>
              <Link
                to="/login"
                className="btn btn-light me-2"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="btn btn-warning"
              >
                Register
              </Link>
            </>
          ) : (
            <>
              <span className="text-white me-3">
                Welcome User
              </span>

              <button
                onClick={handleLogout}
                className="btn btn-danger"
              >
                Logout
              </button>
            </>
          )}

        </div>
      </div>
    </nav>
  );
}

export default Navbar;