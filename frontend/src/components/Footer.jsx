
import { Link } from "react-router-dom";

function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLink =
    "inline-flex text-sm text-[#C1CEC5] transition-colors duration-200 hover:text-[#E07A5F] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E07A5F]";

  const sectionHeading =
    "text-sm font-bold uppercase tracking-wider text-white";

  return (
    <footer className="mt-auto w-full bg-[#1A2E26] text-[#F4F6F4]">
      <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:px-10">

        {/* Main Footer */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">

          {/* Brand */}
          <div className="lg:col-span-2">
            <Link
              to="/"
              aria-label="LUTech home"
              className="inline-flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E07A5F]"
            >
              <span className="text-2xl font-extrabold tracking-tight text-white">
                LU<span className="text-[#E07A5F]">Tech</span>
              </span>

              <span className="h-2 w-2 rounded-full bg-[#E07A5F]" />
            </Link>

            <p className="mt-5 max-w-md text-sm leading-7 text-[#C1CEC5]">
              Your trusted destination for technology and electronics.
              Discover quality products and enjoy a simple, convenient
              shopping experience with LUTech.
            </p>

            <p className="mt-5 text-xs font-medium tracking-wide text-[#A9B9AE]">
              Technology made accessible.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h3 className={sectionHeading}>Explore</h3>

            <ul className="mt-5 space-y-4">
              <li>
                <Link to="/" className={footerLink}>
                  Home
                </Link>
              </li>

              <li>
                <Link to="/products" className={footerLink}>
                  Browse Products
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className={sectionHeading}>Your Account</h3>

            <ul className="mt-5 space-y-4">
              <li>
                <Link to="/login" className={footerLink}>
                  Login
                </Link>
              </li>

              <li>
                <Link to="/register" className={footerLink}>
                  Create Account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="mt-12 flex flex-col gap-5 border-t border-[#385044] pt-7 sm:flex-row sm:items-center sm:justify-between">

          <p className="text-xs leading-6 text-[#A9B9AE]">
            © {currentYear} LUTech. All rights reserved.
          </p>

          <p className="text-xs leading-6 text-[#A9B9AE]">
            Built for a better shopping experience.
          </p>

          <Link
            to="/products"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#E07A5F] transition-colors duration-200 hover:text-[#F3A28C] focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E07A5F]"
          >
            Explore Collection
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
