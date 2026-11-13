
import { useState } from "react";
import { NavLink } from "react-router-dom";

const navigation = [
  { label: "Home", path: "/seller/home", icon: "⌂" },
  { label: "Dashboard", path: "/seller/dashboard", icon: "▦" },
  { label: "Products", path: "/seller/products", icon: "◇" },
  { label: "Add Product", path: "/seller/products/add", icon: "+" },
  { label: "Orders", path: "/seller/orders", icon: "▤" },
  { label: "Store Profile", path: "/seller/store-profile", icon: "▣" },
];

function SellerSidebar({ open, onClose }) {
  const [search, setSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [demoMessage, setDemoMessage] = useState("");

  let userInfo = {};

  try {
    userInfo = JSON.parse(localStorage.getItem("userInfo") || "{}");
  } catch {
    userInfo = {};
  }

  const sellerName =
    userInfo.storeName || userInfo.name || "Seller";

  const showDemoMessage = (feature) => {
    setDemoMessage(
      `${feature} is a demo feature. Backend integration will be added later.`
    );

    window.setTimeout(() => setDemoMessage(""), 3000);
  };

  const linkClass = ({ isActive }) =>
    `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
      isActive
        ? "bg-[#83CDB5] text-[#092F30]"
        : "text-[#B5C9C1] hover:bg-white/10 hover:text-white"
    }`;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <button
          type="button"
          aria-label="Close seller navigation"
          onClick={onClose}
          className="fixed inset-0 z-[60] bg-black/50"
        />
      )}

      {/* Drawer */}
      <aside
        aria-hidden={!open}
        className={`fixed bottom-0 left-0 top-0 z-[70] flex w-[280px] max-w-[calc(100vw-40px)] flex-col border-r border-white/10 bg-[#062729] text-white shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#83CDB5] text-xl font-black text-[#092F30]">
              L
            </div>
            <div>
              <p className="font-bold">LUTech</p>
              <p className="text-[10px] uppercase tracking-wider text-[#83CDB5]">
                Seller Center
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl text-[#B5C9C1] hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          {/* Workspace */}
          <section>
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#789A91]">
              Workspace
            </p>

            <nav className="space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/seller/products"}
                  onClick={onClose}
                  className={linkClass}
                >
                  <span className="flex h-6 w-6 items-center justify-center text-lg">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </section>

          {/* Business tools */}
          <section>
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#789A91]">
              Business Tools
            </p>

            {["Analytics", "Reports"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => showDemoMessage(item)}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-[#B5C9C1] hover:bg-white/10 hover:text-white"
              >
                <span className="flex h-6 w-6 items-center justify-center text-lg">
                  {item === "Analytics" ? "⌁" : "▤"}
                </span>
                <span className="flex-1">{item}</span>
                <span className="rounded bg-[#315D55] px-1.5 py-0.5 text-[9px] text-[#C7F8E9]">
                  DEMO
                </span>
              </button>
            ))}
          </section>

          {/* Search */}
          <section>
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#789A91]">
              Search
            </p>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                showDemoMessage(
                  search.trim() ? `Search: ${search}` : "Search"
                );
              }}
              className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3"
            >
              <span className="text-[#83A79A]">⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search or ask with AI"
                className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-[#78938C]"
              />
            </form>
            <p className="mt-1 px-3 text-[10px] text-[#789A91]">
              Demo search
            </p>
          </section>

          {/* More */}
          <section>
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#789A91]">
              More
            </p>

            <button
              type="button"
              onClick={() => setNotificationsOpen((value) => !value)}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-[#B5C9C1] hover:bg-white/10 hover:text-white"
            >
              <span className="text-lg">♧</span>
              <span>Notifications</span>
              <span className="ml-auto h-2 w-2 rounded-full bg-[#83CDB5]" />
            </button>

            {notificationsOpen && (
              <div className="mx-2 mt-2 rounded-xl border border-white/10 bg-white/[0.06] p-3">
                <p className="text-xs font-semibold text-white">
                  Notification Center
                </p>
                <p className="mt-1 text-xs leading-5 text-[#A8C0B9]">
                  Demo notification center. Real order and store alerts will
                  be connected later.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => showDemoMessage("Seller Support")}
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-[#B5C9C1] hover:bg-white/10 hover:text-white"
            >
              <span className="text-lg">?</span>
              <span>Support</span>
            </button>

            <NavLink
              to="/seller/store-profile"
              onClick={onClose}
              className={linkClass}
            >
              <span className="text-lg">⚙</span>
              <span>Settings</span>
            </NavLink>
          </section>
        </div>

        {/* Seller account */}
        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#A7EBD8] bg-[#315D55] text-sm font-bold">
              {sellerName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{sellerName}</p>
              <p className="text-[10px] text-[#A8C0B9]">
                Seller Account
              </p>
            </div>
          </div>
        </div>

        {demoMessage && (
          <div
            role="status"
            className="absolute bottom-24 left-3 right-3 rounded-xl border border-[#B9F4E4] bg-[#E5FFF6] p-3 text-xs font-medium text-[#16483D] shadow-xl"
          >
            {demoMessage}
          </div>
        )}
      </aside>
    </>
  );
}

export default SellerSidebar;
