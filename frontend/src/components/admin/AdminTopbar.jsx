
import { Link, useNavigate } from "react-router-dom";

function AdminTopbar({ onMenuClick }) {
  const navigate = useNavigate();

  const userInfo = (() => {
    try {
      return JSON.parse(localStorage.getItem("userInfo") || "{}");
    } catch {
      return {};
    }
  })();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userInfo");
    navigate("/admin/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#092F30] text-white shadow-lg">
      <div className="flex h-[68px] items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl transition hover:bg-white/10"
          >
            ☰
          </button>

          <Link to="/admin/dashboard" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#83CDB5] font-black text-[#062729]">
              L
            </span>

            <span className="text-lg font-bold tracking-tight">
              LUTech
              <span className="ml-2 text-xs font-semibold text-[#83CDB5]">
                ADMIN
              </span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold">
              {userInfo.name || "Administrator"}
            </p>
            <p className="text-xs text-[#B9F4E4]/60">
              System Administrator
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#83CDB5] font-bold text-[#062729]">
            {(userInfo.name || "A").charAt(0).toUpperCase()}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white transition hover:border-red-300/40 hover:bg-red-500/10 hover:text-red-200 sm:text-sm"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

export default AdminTopbar;
