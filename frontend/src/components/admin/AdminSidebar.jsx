
import { NavLink } from "react-router-dom";

const navigation = [
    {
        label: "Dashboard",
        path: "/admin/dashboard",
        icon: "▦",
    },
    {
        label: "User Management",
        path: "/admin/users",
        icon: "♙",
    },
    {
        label: "Seller Applications",
        path: "/admin/seller-applications",
        icon: "⌂",
    },
];

function AdminSidebar({ open, onNavigate }) {
    return (
        <aside
            className={`fixed left-0 top-[68px] z-50 h-[calc(100vh-68px)] w-[280px] max-w-[85vw] border-r border-[#83CDB5]/15 bg-[#092F30] px-4 py-5 text-white shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"
                }`}
        >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between border-b border-white/15 px-2 pb-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#83CDB5]/15 text-xl text-[#83CDB5]">
                        ◈
                    </div>

                    <h2 className="text-lg font-bold tracking-tight">
                        LUTech Admin
                    </h2>
                </div>

                <button
                    type="button"
                    onClick={onNavigate}
                    aria-label="Close navigation"
                    className="rounded-lg px-2 py-1 text-xl text-white/50 transition hover:bg-white/10 hover:text-white"
                >
                    ×
                </button>
            </div>

            {/* Navigation */}
            <nav className="mt-5 space-y-2">
                {navigation.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end
                        onClick={onNavigate}
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm font-semibold transition-all duration-200 ${isActive
                                ? "bg-[#83CDB5] text-[#062729] shadow-md"
                                : "text-white/75 hover:bg-white/10 hover:text-white"
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span
                                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${isActive
                                            ? "bg-[#062729]/10"
                                            : "bg-[#062729]/60 text-[#B9F4E4]"
                                        }`}
                                >
                                    {item.icon}
                                </span>

                                <span>{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
}

export default AdminSidebar;
