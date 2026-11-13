
import { Link } from "react-router-dom";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto bg-[#1A2E26] text-[#F4F6F4]">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 xl:px-16">

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="text-2xl font-extrabold tracking-tight text-white">
                LU<span className="text-[#E07A5F]">Tech</span>
              </span>
              <span className="h-2 w-2 rounded-full bg-[#E07A5F]" />
            </Link>

            <p className="mt-4 max-w-md text-sm leading-7 text-[#C1CEC5]">
              Your trusted destination for technology and electronics.
              Discover quality products and enjoy a simple, convenient
              shopping experience with LUTech.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Explore
            </h3>

            <ul className="mt-5 space-y-3 text-sm text-[#C1CEC5]">
              <li>
                <Link
                  to="/"
                  className="transition hover:text-[#E07A5F]"
                >
                  Home
                </Link>
              </li>

              <li>
                <Link
                  to="/products"
                  className="transition hover:text-[#E07A5F]"
                >
                  Browse Products
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
              Your Account
            </h3>

            <ul className="mt-5 space-y-3 text-sm text-[#C1CEC5]">
              <li>
                <Link
                  to="/login"
                  className="transition hover:text-[#E07A5F]"
                >
                  Login
                </Link>
              </li>

              <li>
                <Link
                  to="/register"
                  className="transition hover:text-[#E07A5F]"
                >
                  Create Account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#385044] pt-6 text-center sm:flex-row sm:text-left">

          <p className="text-xs text-[#A9B9AE]">
            © {currentYear} LUTech. All rights reserved.
          </p>

          <p className="text-xs text-[#A9B9AE]">
            Built for a better shopping experience.
          </p>

          <Link
            to="/products"
            className="text-sm font-semibold text-[#E07A5F] transition hover:text-[#F3A28C]"
          >
            Explore Collection →
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
