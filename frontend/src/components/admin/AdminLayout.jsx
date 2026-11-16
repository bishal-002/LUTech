
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-[#062729] text-slate-800">
      <AdminTopbar
        onMenuClick={() => setSidebarOpen(true)}
      />

      <div className="relative min-h-[calc(100vh-68px)]">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeSidebar}
            className="fixed inset-0 z-40 bg-black/50"
          />
        )}

        <AdminSidebar
          open={sidebarOpen}
          onNavigate={closeSidebar}
        />

        <main className="min-h-[calc(100vh-68px)] px-3 py-5 sm:px-5 lg:px-7">
          <div className="mx-auto w-full max-w-[1600px]">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
