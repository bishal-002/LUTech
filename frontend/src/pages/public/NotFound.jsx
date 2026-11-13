
import { Link } from "react-router-dom";

function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F6F4] px-5 py-16">
      <div className="w-full max-w-xl text-center">

        {/* 404 Illustration */}
        <div className="mx-auto mb-8 flex h-36 w-36 items-center justify-center rounded-full bg-[#E5EDE7]">
          <span className="text-6xl font-extrabold tracking-tight text-[#1A2E26]">
            404
          </span>
        </div>

        {/* Message */}
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-[#B9533B]">
          Page Not Found
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-[#20332B] sm:text-4xl">
          Oops! We lost this page.
        </h1>

        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[#68766F]">
          The page you're looking for may have been moved, removed,
          or doesn't exist. Let's get you back to LUTech.
        </p>

        {/* Navigation */}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-[#1A2E26] px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#294438] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9533B]"
          >
            Back to Home
          </Link>

          <Link
            to="/products"
            className="inline-flex items-center justify-center rounded-lg border border-[#D5DED7] bg-white px-7 py-3 text-sm font-semibold text-[#20332B] transition-colors hover:bg-[#EBF0EB]"
          >
            Explore Products
          </Link>
        </div>

      </div>
    </main>
  );
}

export default NotFound;
