
import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();

  const userInfo = (() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo")) || null;
    } catch {
      return null;
    }
  })();

  const isCustomer = userInfo?.role === "customer";
  const isSeller = userInfo?.role === "seller";
  const isApprovedSeller =
    isSeller && userInfo?.sellerStatus === "approved";
  const isPendingSeller =
    isSeller && userInfo?.sellerStatus === "pending";
  const isRejectedSeller =
    isSeller && userInfo?.sellerStatus === "rejected";
  const isAdmin = userInfo?.role === "admin";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userInfo");
    navigate("/login", { replace: true });
  };

  const linkStyle =
    "rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-blue-700";

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="text-2xl font-extrabold tracking-tight text-blue-700"
        >
          LUTech
        </Link>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Public navigation */}
          <Link to="/products" className={linkStyle}>
            Products
          </Link>

          {!userInfo ? (
            <>
              <Link
                to="/login"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                Register
              </Link>
            </>
          ) : (
            <>
              <span className="hidden text-sm text-slate-600 sm:inline">
                Welcome, {userInfo.name}
              </span>

              {/* Customer navigation */}
              {isCustomer && (
                <>
                  <Link to="/my-orders" className={linkStyle}>
                    My Orders
                  </Link>

                  <Link to="/cart" className={linkStyle}>
                    Cart
                  </Link>

                  <Link
                    to="/profile"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Profile
                  </Link>
                </>
              )}

              {/* Approved seller navigation */}
              {isApprovedSeller && (
                <>
                  <Link to="/seller/dashboard" className={linkStyle}>
                    Dashboard
                  </Link>

                  <Link to="/seller/products" className={linkStyle}>
                    My Products
                  </Link>

                  <Link to="/seller/orders" className={linkStyle}>
                    My Orders
                  </Link>

                  <Link to="/seller/store-profile" className={linkStyle}>
                    Store Profile
                  </Link>
                </>
              )}

              {/* Seller application status */}
              {isPendingSeller && (
                <span className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                  Application Pending
                </span>
              )}

              {isRejectedSeller && (
                <span className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  Application Rejected
                </span>
              )}

              {/* Admin navigation */}
              {isAdmin && (
                <>
                  <Link to="/admin/dashboard" className={linkStyle}>
                    Admin Dashboard
                  </Link>

                  <Link to="/admin/users" className={linkStyle}>
                    User Management
                  </Link>

                  <Link to="/admin/orders" className={linkStyle}>
                    Orders
                  </Link>
                </>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
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
