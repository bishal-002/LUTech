
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);

  const userInfo = (() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo")) || null;
    } catch {
      return null;
    }
  })();

  const isCustomer = userInfo?.role === "customer";
  const isSeller = userInfo?.role === "seller";
  const isAdmin = userInfo?.role === "admin";

  const isApprovedSeller =
    isSeller && userInfo?.sellerStatus === "approved";

  const isPendingSeller =
    isSeller && userInfo?.sellerStatus === "pending";

  const isRejectedSeller =
    isSeller && userInfo?.sellerStatus === "rejected";

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userInfo");
    setMenuOpen(false);
    navigate("/login", { replace: true });
  };

  const isActive = (path) => location.pathname === path;

  const linkStyle = (path) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive(path)
        ? "bg-[#E5EDE7] text-[#1A2E26]"
        : "text-[#68766F] hover:bg-[#E5EDE7] hover:text-[#1A2E26]"
    }`;

  const actionLinkStyle =
    "rounded-lg bg-[#1A2E26] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#294438]";

  const logoutStyle =
    "rounded-lg border border-[#D8E0D9] px-4 py-2 text-sm font-semibold text-[#1A2E26] transition hover:border-[#E07A5F] hover:text-[#B9533B]";

  return (
    <header className="sticky top-0 z-50 w-full min-w-0 overflow-x-clip border-b border-[#E5E9E5] bg-[#F4F6F4]/95 backdrop-blur-md">
      <nav className="mx-auto flex w-full min-w-0 max-w-7xl flex-wrap items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">

        {/* Brand */}
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="text-2xl font-extrabold tracking-tight text-[#1A2E26]">
            LU<span className="text-[#E07A5F]">Tech</span>
          </span>
          <span className="h-2 w-2 rounded-full bg-[#E07A5F]" />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 lg:flex">
          <Link to="/products" className={linkStyle("/products")}>
            Products
          </Link>

          {!userInfo ? (
            <>
              <Link to="/login" className={linkStyle("/login")}>
                Login
              </Link>

              <Link to="/register" className={actionLinkStyle}>
                Get Started
              </Link>
            </>
          ) : (
            <>
              {/* Customer */}
              {isCustomer && (
                <>
                  <Link to="/my-orders" className={linkStyle("/my-orders")}>
                    My Orders
                  </Link>

                  <Link to="/cart" className={linkStyle("/cart")}>
                    Cart
                  </Link>

                  <Link
                    to="/become-seller"
                    className={linkStyle("/become-seller")}
                  >
                    Become a Seller
                  </Link>

                  <Link to="/profile" className={linkStyle("/profile")}>
                    Profile
                  </Link>
                </>
              )}

              {/* Approved Seller */}
              {isApprovedSeller && (
                <>
                  <Link
                    to="/seller/dashboard"
                    className={linkStyle("/seller/dashboard")}
                  >
                    Dashboard
                  </Link>

                  <Link
                    to="/seller/products"
                    className={linkStyle("/seller/products")}
                  >
                    My Products
                  </Link>

                  <Link
                    to="/seller/orders"
                    className={linkStyle("/seller/orders")}
                  >
                    My Orders
                  </Link>

                  <Link
                    to="/seller/store-profile"
                    className={linkStyle("/seller/store-profile")}
                  >
                    Store Profile
                  </Link>
                </>
              )}

              {/* Application Status */}
              {isPendingSeller && (
                <span className="rounded-lg bg-[#F8EED7] px-3 py-2 text-xs font-semibold text-[#925D12]">
                  Application Pending
                </span>
              )}

              {isRejectedSeller && (
                <span className="rounded-lg bg-[#FCE9E5] px-3 py-2 text-xs font-semibold text-[#A3422D]">
                  Application Rejected
                </span>
              )}

              {/* Admin */}
              {isAdmin && (
                <>
                  <Link
                    to="/admin/dashboard"
                    className={linkStyle("/admin/dashboard")}
                  >
                    Dashboard
                  </Link>

                  <Link
                    to="/admin/users"
                    className={linkStyle("/admin/users")}
                  >
                    User Management
                  </Link>

                  <Link
                    to="/admin/orders"
                    className={linkStyle("/admin/orders")}
                  >
                    Orders
                  </Link>
                </>
              )}

              <span className="mx-2 max-w-32 truncate text-sm text-[#68766F]">
                {userInfo.name}
              </span>

              <button
                type="button"
                onClick={handleLogout}
                className={logoutStyle}
              >
                Logout
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((previous) => !previous)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#E5E9E5] text-[#1A2E26] transition hover:bg-[#E5EDE7] lg:hidden"
        >
          <span className="text-xl leading-none">
            {menuOpen ? "✕" : "☰"}
          </span>
        </button>

        {/* Mobile Navigation */}
        {menuOpen && (
          <div className="order-3 flex w-full flex-col gap-2 border-t border-[#E5E9E5] pt-4 lg:hidden">

            <Link to="/products" className={linkStyle("/products")}>
              Products
            </Link>

            {!userInfo ? (
              <>
                <Link to="/login" className={linkStyle("/login")}>
                  Login
                </Link>

                <Link
                  to="/register"
                  className={`${actionLinkStyle} text-center`}
                >
                  Get Started
                </Link>
              </>
            ) : (
              <>
                <div className="border-b border-[#E5E9E5] px-3 py-2 text-sm text-[#68766F]">
                  Welcome, {userInfo.name}
                </div>

                {/* Customer */}
                {isCustomer && (
                  <>
                    <Link to="/my-orders" className={linkStyle("/my-orders")}>
                      My Orders
                    </Link>

                    <Link to="/cart" className={linkStyle("/cart")}>
                      Cart
                    </Link>

                    <Link
                      to="/become-seller"
                      className={linkStyle("/become-seller")}
                    >
                      Become a Seller
                    </Link>

                    <Link to="/profile" className={linkStyle("/profile")}>
                      Profile
                    </Link>
                  </>
                )}

                {/* Approved Seller */}
                {isApprovedSeller && (
                  <>
                    <Link
                      to="/seller/dashboard"
                      className={linkStyle("/seller/dashboard")}
                    >
                      Dashboard
                    </Link>

                    <Link
                      to="/seller/products"
                      className={linkStyle("/seller/products")}
                    >
                      My Products
                    </Link>

                    <Link
                      to="/seller/orders"
                      className={linkStyle("/seller/orders")}
                    >
                      My Orders
                    </Link>

                    <Link
                      to="/seller/store-profile"
                      className={linkStyle("/seller/store-profile")}
                    >
                      Store Profile
                    </Link>
                  </>
                )}

                {/* Application Status */}
                {isPendingSeller && (
                  <span className="px-3 py-2 text-sm font-semibold text-[#925D12]">
                    Application Pending
                  </span>
                )}

                {isRejectedSeller && (
                  <span className="px-3 py-2 text-sm font-semibold text-[#A3422D]">
                    Application Rejected
                  </span>
                )}

                {/* Admin */}
                {isAdmin && (
                  <>
                    <Link
                      to="/admin/dashboard"
                      className={linkStyle("/admin/dashboard")}
                    >
                      Dashboard
                    </Link>

                    <Link
                      to="/admin/users"
                      className={linkStyle("/admin/users")}
                    >
                      User Management
                    </Link>

                    <Link
                      to="/admin/orders"
                      className={linkStyle("/admin/orders")}
                    >
                      Orders
                    </Link>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 rounded-lg border border-[#E5E9E5] px-4 py-3 text-left text-sm font-semibold text-[#A3422D] transition hover:bg-[#FCE9E5]"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
