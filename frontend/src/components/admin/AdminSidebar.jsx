
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function AdminSidebar({ open, onNavigate }) {
    const { hasPermission } = useAuth();

    const navigation = [
        {
            label: "Dashboard",
            path: "/admin/dashboard",
            icon: "▦",
            permission: null,
        },
        {
            label: "User Management",
            path: "/admin/users",
            icon: "♙",
            permission: "view_users",
        },
        {
            label: "Seller Applications",
            path: "/admin/seller-applications",
            icon: "⌂",
            permission: "view_seller_applications",
        },
        {
            label: "Product Moderation",
            path: "/admin/product-moderation",
            icon: "▣",
            permission: "approve_products",
        },
        {
            label: "Catalog Management",
            path: "/admin/catalog",
            icon: "▤",
            permission: null,
            anyPermissions: ["manage_brands", "manage_categories"],
        },
        {
            label: "Disputes & Refunds",
            path: "/admin/disputes",
            icon: "⚖",
            permission: null,
            anyPermissions: ["manage_disputes", "issue_refunds"],
        },
        {
            label: "Payout Management",
            path: "/admin/payouts",
            icon: "৳",
            permission: "process_payouts",
        },
        {
            label: "Platform Settings",
            path: "/admin/settings",
            icon: "⚙",
            permission: "manage_platform_settings",
        },
        {
            label: "Admin Team",
            path: "/admin/team",
            icon: "♟",
            permission: "manage_admins",
        },
        {
            label: "Audit Logs",
            path: "/admin/audit-logs",
            icon: "▤",
            permission: "view_audit_logs",
        },
    ];

    const visibleNavigation = navigation.filter((item) => {
        if (item.permission && !hasPermission(item.permission)) {
            return false;
        }

        if (
            item.anyPermissions &&
            !item.anyPermissions.some((permission) =>
                hasPermission(permission)
            )
        ) {
            return false;
        }

        return true;
    });

    return (
        <aside
            className={`fixed left-0 top-[68px] z-50 flex h-[calc(100dvh-68px)] w-[280px] max-w-[85vw] flex-col overflow-hidden border-r border-[#83CDB5]/15 bg-[#092F30] px-4 py-5 text-white shadow-2xl transition-transform duration-300 ${
                open ? "translate-x-0" : "-translate-x-full"
            }`}
        >
            {/* Sidebar header */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/15 px-2 pb-5">
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

            {/* Scrollable navigation */}
            <nav
                aria-label="Admin navigation"
                className="mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-6 pr-1 [scrollbar-color:rgba(131,205,181,0.45)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#83CDB5]/40 [&::-webkit-scrollbar-track]:bg-transparent"
            >
                {visibleNavigation.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end
                        onClick={onNavigate}
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-xl px-3 py-3.5 text-sm font-semibold transition-all duration-200 ${
                                isActive
                                    ? "bg-[#83CDB5] text-[#062729] shadow-md"
                                    : "text-white/75 hover:bg-white/10 hover:text-white"
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${
                                        isActive
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
