
import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import SellerSidebar from "./SellerSidebar";
import SellerTopbar from "./SellerTopbar";

const PAGE_TITLES = [
  { path: "/seller/home", title: "Home" },
  { path: "/seller/dashboard", title: "Dashboard" },
  { path: "/seller/products", title: "Products" },
  { path: "/seller/products/add", title: "Add New Product" },
  { path: "/seller/orders", title: "Orders" },
  { path: "/seller/store-profile", title: "Store Profile" },
];

function getPageTitle(pathname) {
  if (/^\/seller\/products\/edit\/[^/]+\/?$/.test(pathname)) {
    return "Edit Product";
  }

  const page = PAGE_TITLES.find(
    (item) => item.path === pathname
  );

  return page?.title || "Seller Center";
}

function SellerLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const title = getPageTitle(location.pathname);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen w-full min-w-0 bg-[#092F30]">

      <SellerSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-h-screen min-w-0 flex-col">

        <SellerTopbar
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <main className="min-w-0 flex-1 bg-[#092F30] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1800px] min-w-0">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  );
}

export default SellerLayout;
