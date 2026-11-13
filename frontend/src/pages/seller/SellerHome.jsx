
import { Link } from "react-router-dom";

const SellerHome = () => {
  const actions = [
    {
      title: "Business Dashboard",
      description: "View your store performance and business overview.",
      icon: "▥",
      link: "/seller/dashboard",
      label: "Open Dashboard",
    },
    {
      title: "Manage Products",
      description: "Add new products, edit listings, and manage inventory.",
      icon: "◇",
      link: "/seller/products",
      label: "Manage Products",
    },
    {
      title: "Manage Orders",
      description: "Review customer orders and update their status.",
      icon: "▤",
      link: "/seller/orders",
      label: "View Orders",
    },
    {
      title: "Store Profile",
      description: "Update your store name, description, and contact details.",
      icon: "◎",
      link: "/seller/store-profile",
      label: "Edit Profile",
    },
  ];

  return (
    <div className="min-h-full space-y-8">
      {/* Welcome section */}
      <section className="relative overflow-hidden rounded-3xl border border-[#315B53] bg-gradient-to-br from-[#17483F] to-[#0B302E] p-6 sm:p-9">
        <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border-[35px] border-[#83CDB5]/10" />
        <div className="pointer-events-none absolute -bottom-24 right-40 h-56 w-56 rounded-full bg-[#83CDB5]/5 blur-2xl" />

        <div className="relative max-w-2xl">
          <span className="inline-flex rounded-full border border-[#83CDB5]/30 bg-[#83CDB5]/10 px-3 py-1.5 text-xs font-semibold text-[#A6E4CD]">
            LUTech Seller Workspace
          </span>

          <h1 className="mt-5 text-3xl font-bold leading-tight text-white sm:text-4xl">
            Welcome to your
            <span className="block text-[#83CDB5]">
              Seller Workspace.
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-7 text-[#B5C9C1] sm:text-base">
            Manage your products, keep track of customer orders, and
            maintain your store information from one place.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/seller/dashboard"
              className="rounded-xl bg-[#83CDB5] px-5 py-3 text-sm font-bold text-[#123B35] transition hover:bg-[#A1DEC9]"
            >
              View Dashboard →
            </Link>

            <Link
              to="/seller/products/add"
              className="rounded-xl border border-[#83CDB5]/40 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              + Add Product
            </Link>
          </div>
        </div>
      </section>

      {/* Quick access */}
      <section>
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#83CDB5]">
            Workspace
          </p>

          <h2 className="mt-2 text-xl font-bold text-white">
            Manage Your Store
          </h2>

          <p className="mt-1 text-sm text-[#A8C0B9]">
            Quick access to your seller tools.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {actions.map((action) => (
            <Link
              key={action.title}
              to={action.link}
              className="group rounded-2xl border border-[#315B53] bg-[#103633] p-5 transition duration-200 hover:-translate-y-1 hover:border-[#83CDB5]/60 hover:bg-[#14413B] sm:p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1B4B43] text-2xl text-[#83CDB5] transition group-hover:bg-[#83CDB5] group-hover:text-[#123B35]">
                  {action.icon}
                </div>

                <span className="text-lg text-[#83CDB5] transition group-hover:translate-x-1">
                  →
                </span>
              </div>

              <h3 className="mt-5 text-lg font-bold text-white">
                {action.title}
              </h3>

              <p className="mt-2 min-h-12 text-sm leading-6 text-[#A8C0B9]">
                {action.description}
              </p>

              <p className="mt-5 text-sm font-semibold text-[#83CDB5]">
                {action.label} →
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Seller guidance */}
      <section className="rounded-2xl border border-[#315B53] bg-[#103633] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1B4B43] text-xl text-[#83CDB5]">
            ✦
          </div>

          <div>
            <h3 className="font-bold text-white">
              Make your store stand out
            </h3>

            <p className="mt-1 text-sm leading-6 text-[#A8C0B9]">
              Keep your product listings accurate, update your store
              information, and process customer orders promptly to
              maintain a good shopping experience.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SellerHome;
