
function SellerTopbar({ onMenuClick, title = "Seller Workspace" }) {
  return (
    <header className="sticky top-0 z-50 flex min-h-[68px] shrink-0 items-center gap-4 border-b border-white/10 bg-[#062729]/95 px-4 text-white backdrop-blur-md sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open seller navigation"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 text-[#C5E8DE] transition hover:bg-white/10"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="h-5 w-5"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white sm:text-base">
          {title}
        </p>
        <p className="text-[11px] text-[#83A79A]">
          LUTech Seller Center
        </p>
      </div>
    </header>
  );
}

export default SellerTopbar;
