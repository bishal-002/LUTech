
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { TopNav, TopNavItem } from "@astryxdesign/core/TopNav";
import { Avatar } from "@astryxdesign/core/Avatar";
import { DropdownMenu } from "@astryxdesign/core/DropdownMenu";

function RouterLink({ href, ...props }) {
  return <Link to={href} {...props} />;
}

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);

  const userInfo = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo")) || null;
    } catch {
      return null;
    }
  }, [location.pathname]);

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

  const isActive = (path) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(`${path}/`));

  const navItems = [
    { label: "Products", path: "/products" },
  ];

  if (!userInfo) {
    navItems.push(
      { label: "Login", path: "/login" },
      { label: "Get Started", path: "/register" }
    );
  }

  if (isCustomer) {
    navItems.push(
      { label: "My Orders", path: "/my-orders" },
      { label: "Cart", path: "/cart" },
      { label: "Become a Seller", path: "/become-seller" },
      { label: "Profile", path: "/profile" }
    );
  }

  if (isApprovedSeller) {
    navItems.push(
      { label: "Dashboard", path: "/seller/dashboard" },
      { label: "My Products", path: "/seller/products" },
      { label: "My Orders", path: "/seller/orders" },
      { label: "Store Profile", path: "/seller/store-profile" }
    );
  }

  if (isAdmin) {
    navItems.push(
      { label: "Dashboard", path: "/admin/dashboard" },
      { label: "User Management", path: "/admin/users" },
      { label: "Orders", path: "/admin/orders" }
    );
  }

  const applicationStatus = isPendingSeller
    ? "Application Pending"
    : isRejectedSeller
      ? "Application Rejected"
      : null;

  const statusStyle = isPendingSeller
    ? "bg-[#F8EED7] text-[#925D12]"
    : "bg-[#FCE9E5] text-[#A3422D]";

  const accountItems = [
    ...(isCustomer
      ? [{ label: "Profile", onClick: () => navigate("/profile") }]
      : []),
    ...(isSeller
      ? [{ label: "Store Profile", onClick: () => navigate("/seller/store-profile") }]
      : []),
    ...(isAdmin
      ? [{ label: "Dashboard", onClick: () => navigate("/admin/dashboard") }]
      : []),
    { type: "divider" },
    {
      label: "Logout",
      variant: "destructive",
      onClick: handleLogout,
    },
  ];

  const brand = (
    <Link
      to="/"
      className="flex shrink-0 items-center gap-2 no-underline"
      aria-label="LUTech home"
    >
      <span className="text-2xl font-extrabold tracking-tight text-[#1A2E26]">
        LU<span className="text-[#E07A5F]">Tech</span>
      </span>
      <span className="h-2 w-2 rounded-full bg-[#E07A5F]" />
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E5E9E5] bg-[#F4F6F4]/95 backdrop-blur-md">
      {/* Desktop Navigation */}
      <div className="mx-auto hidden w-full max-w-7xl px-4 lg:block lg:px-8">
        <TopNav
          label="LUTech main navigation"
          heading={brand}
          startContent={
            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <TopNavItem
                  key={item.path}
                  label={item.label}
                  href={item.path}
                  as={RouterLink}
                  isSelected={isActive(item.path)}
                />
              ))}
            </div>
          }
          endContent={
            userInfo ? (
              <div className="flex items-center gap-3">
                {applicationStatus && (
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusStyle}`}
                  >
                    {applicationStatus}
                  </span>
                )}

                <span className="max-w-32 truncate text-sm font-medium text-[#68766F]">
                  {userInfo.name || "Account"}
                </span>

                <DropdownMenu
                  placement="below"
                  alignment="end"
                  menuWidth={190}
                  items={accountItems}
                  renderTrigger={(triggerProps) => (
                    <button
                      type="button"
                      {...triggerProps}
                      className="flex items-center rounded-full outline-none transition hover:ring-2 hover:ring-[#E5EDE7]"
                      aria-label="Open account menu"
                    >
                      <Avatar
                        name={userInfo.name || "Account"}
                        src={userInfo.profileImage || undefined}
                        size="md"
                      />
                    </button>
                  )}
                />
              </div>
            ) : null
          }
        />
      </div>

      {/* Mobile Header */}
      <div className="flex items-center justify-between px-4 py-3 lg:hidden">
        {brand}

        <button
          type="button"
          onClick={() => setMenuOpen((previous) => !previous)}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="lutech-mobile-navigation"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E9E5] text-xl text-[#1A2E26] transition hover:bg-[#E5EDE7]"
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Navigation */}
      {menuOpen && (
        <nav
          id="lutech-mobile-navigation"
          aria-label="Mobile navigation"
          className="max-h-[calc(100vh-65px)] overflow-y-auto border-t border-[#E5E9E5] bg-[#F4F6F4] px-4 py-4 lg:hidden"
        >
          {userInfo && (
            <div className="mb-3 flex items-center gap-3 border-b border-[#E5E9E5] px-2 pb-4">
              <Avatar
                name={userInfo.name || "Account"}
                src={userInfo.profileImage || undefined}
                size="lg"
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1A2E26]">
                  {userInfo.name || "Welcome"}
                </p>
                <p className="text-xs capitalize text-[#68766F]">
                  {userInfo.role || "User"}
                </p>
              </div>
            </div>
          )}

          {applicationStatus && (
            <div className="mb-3">
              <span
                className={`inline-flex rounded-full px-3 py-2 text-xs font-semibold ${statusStyle}`}
              >
                {applicationStatus}
              </span>
            </div>
          )}

          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                aria-current={isActive(item.path) ? "page" : undefined}
                className={`rounded-lg px-3 py-3 text-sm font-medium no-underline transition-colors ${
                  isActive(item.path)
                    ? "bg-[#E5EDE7] text-[#1A2E26]"
                    : "text-[#68766F] hover:bg-[#E5EDE7] hover:text-[#1A2E26]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {userInfo && (
            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 w-full rounded-lg border border-[#E5E9E5] px-4 py-3 text-left text-sm font-semibold text-[#A3422D] transition hover:bg-[#FCE9E5]"
            >
              Logout
            </button>
          )}
        </nav>
      )}
    </header>
  );
}

export default Navbar;
