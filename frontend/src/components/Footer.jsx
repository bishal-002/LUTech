
import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-center sm:flex-row sm:px-6 lg:px-8">
        <Link to="/" className="text-lg font-extrabold text-blue-700">
          LUTech
        </Link>

        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} LUTech. All rights reserved.
        </p>

        <Link
          to="/products"
          className="text-sm font-medium text-slate-600 hover:text-blue-700"
        >
          Browse Products
        </Link>
      </div>
    </footer>
  );
}

export default Footer;
