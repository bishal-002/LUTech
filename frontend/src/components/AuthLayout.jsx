
import { Link } from "react-router-dom";

function AuthLayout({
  title,
  subtitle,
  children,
  topText,
  topLinkText,
  topLinkTo,
}) {
  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#F4F6F4] p-0 sm:p-4 lg:flex lg:items-center lg:justify-center lg:p-8">
      <div className="mx-auto grid min-h-screen w-full min-w-0 max-w-6xl grid-cols-1 overflow-hidden bg-white sm:min-h-[680px] sm:rounded-2xl sm:border sm:border-[#E5E9E5] sm:shadow-[0_20px_60px_rgba(26,46,38,0.10)] lg:grid-cols-2">

        {/* Promotional Panel */}
        <section className="relative hidden min-h-[680px] flex-col justify-center overflow-hidden bg-[#1A2E26] px-12 py-14 text-white lg:flex">

          {/* Decorative Background */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[#294438]/70 blur-3xl" />

          {/* Centered Content */}
          <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-8">

            {/* Brand */}
            <Link
              to="/"
              className="inline-flex w-fit items-center gap-1 text-2xl font-extrabold tracking-tight"
            >
              <span className="text-white">LU</span>
              <span className="text-[#E07A5F]">Tech</span>
              <span className="ml-1 h-2 w-2 rounded-full bg-[#E07A5F]" />
            </Link>

            {/* Main Content */}
            <div>
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#E9B5A6]">
                Your Tech Destination
              </span>

              <h1 className="mt-5 max-w-lg text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Everything you need.
                <span className="mt-1 block text-[#E07A5F]">
                  All in one place.
                </span>
              </h1>

              <p className="mt-5 max-w-md text-sm leading-7 text-[#D0DCD4] sm:text-base">
                Discover quality electronics, explore new technology,
                and enjoy a simpler shopping experience with LUTech.
              </p>

              {/* Product Showcase */}
              <div className="mt-8 max-w-md rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:bg-white/[0.10]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#D0DCD4]">
                    DISCOVER LUTech
                  </span>
                  <span className="rounded-full bg-[#E07A5F]/15 px-2.5 py-1 text-[10px] font-semibold text-[#F2B6A5]">
                    Explore More
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { icon: "💻", label: "Laptops" },
                    { icon: "⌨️", label: "Accessories" },
                    { icon: "🎧", label: "Electronics" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.08] px-2 py-4 transition duration-200 hover:bg-white/[0.15]"
                    >
                      <span className="text-3xl">{item.icon}</span>
                      <span className="text-center text-[10px] font-medium text-[#D0DCD4]">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  to="/products"
                  className="mt-4 flex items-center justify-between rounded-lg bg-[#294438] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#365646]"
                >
                  Explore the marketplace
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            {/* Trust Indicator */}
            <div className="flex items-center gap-3 border-t border-white/10 pt-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E07A5F]/15 text-[#E07A5F]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>

              <div>
                <p className="text-xs font-semibold text-white">
                  Shopping with confidence
                </p>
                <p className="mt-0.5 text-[11px] text-[#AABBB0]">
                  Your LUTech shopping experience starts here.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Form Panel */}
        <section className="flex min-h-screen w-full min-w-0 flex-col bg-white px-4 py-6 sm:min-h-[680px] sm:px-8 sm:py-10 lg:px-14 lg:py-12">

          {/* Top Navigation */}
          <div className="flex items-center justify-end gap-2 text-xs sm:text-sm">
            <span className="text-[#68766F]">
              {topText}
            </span>

            {topLinkText && topLinkTo && (
              <Link
                to={topLinkTo}
                className="rounded-full border border-[#C7D5CA] px-4 py-2 font-semibold text-[#1A2E26] transition hover:border-[#1A2E26] hover:bg-[#EBF0EB]"
              >
                {topLinkText}
              </Link>
            )}
          </div>

          {/* Form Content */}
          <div className="my-auto mx-auto w-full min-w-0 max-w-md py-8 sm:py-10 animate-[fadeIn_0.45s_ease-out]">
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B9533B]">
                Welcome to LUTech
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#20332B] sm:text-4xl">
                {title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#68766F]">
                {subtitle}
              </p>
            </div>

            {children}
          </div>

          {/* Bottom Note */}
          <div className="border-t border-[#E5E9E5] pt-5 text-center">
            <p className="text-[11px] text-[#89958D]">
              © {new Date().getFullYear()} LUTech. All rights reserved.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default AuthLayout;
