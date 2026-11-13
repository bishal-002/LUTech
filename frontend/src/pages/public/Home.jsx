
import { Link } from "react-router-dom";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

const featuredProducts = [
  {
    title: "Gaming Laptop",
    description:
      "High-performance laptops for gaming and professional work.",
    icon: "💻",
    category: "Computing",
    number: "01",
  },
  {
    title: "Mechanical Keyboard",
    description:
      "Durable keyboards designed for productivity and gaming.",
    icon: "⌨️",
    category: "Accessories",
    number: "02",
  },
  {
    title: "Wireless Mouse",
    description:
      "Comfortable and responsive wireless mice for everyday use.",
    icon: "🖱️",
    category: "Accessories",
    number: "03",
  },
];

const benefits = [
  {
    title: "Quality Products",
    description:
      "We provide reliable and high-quality electronic products.",
    icon: "✦",
  },
  {
    title: "Fast Delivery",
    description:
      "Quick and efficient delivery service for customer satisfaction.",
    icon: "↗",
  },
  {
    title: "Secure Shopping",
    description:
      "Safe and secure shopping experience with verified user accounts.",
    icon: "✓",
  },
];

function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F4]">
      <Navbar />

      <main className="flex-1">

        {/* Hero Section */}
        <section className="px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12 lg:px-8">
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 overflow-hidden rounded-3xl bg-[#1A2E26] px-7 py-14 text-white sm:px-12 sm:py-16 lg:grid-cols-2 lg:px-16 lg:py-20">

            {/* Decorative Background */}
            <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -bottom-36 right-1/4 h-96 w-96 rounded-full border border-white/10" />

            {/* Hero Content */}
            <div className="relative z-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2">
                <span className="h-2 w-2 rounded-full bg-[#E07A5F]" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#DCE8DF]">
                  Technology for Everyone
                </span>
              </div>

              <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Technology that
                <span className="block text-[#E99A80]">
                  moves you forward.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-8 text-[#C1CEC5] sm:text-lg">
                Discover laptops, accessories, and everyday technology
                designed to make work, creativity, and entertainment better.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#E07A5F] px-7 py-3.5 text-sm font-bold text-[#18181B] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#F09A80] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E07A5F]"
                >
                  Explore Products
                  <span aria-hidden="true">→</span>
                </Link>

                <Link
                  to="/products"
                  className="inline-flex items-center justify-center rounded-lg border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  View Collection
                </Link>
              </div>

              <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/15 pt-7">
                <div>
                  <p className="text-sm font-bold text-white">
                    Quality First
                  </p>
                  <p className="mt-1 text-xs text-[#AFC0B4]">
                    Products you can trust
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-white">
                    Easy Shopping
                  </p>
                  <p className="mt-1 text-xs text-[#AFC0B4]">
                    A simpler experience
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-white">
                    Multi-Vendor
                  </p>
                  <p className="mt-1 text-xs text-[#AFC0B4]">
                    More choices in one place
                  </p>
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative z-10 mx-auto w-full max-w-md">
              <div className="relative rounded-3xl border border-white/15 bg-[#294438] p-5 shadow-2xl shadow-black/20 sm:p-7">

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#C1CEC5]">
                    Discover Technology
                  </span>
                  <span className="rounded-full bg-[#E07A5F] px-3 py-1 text-xs font-bold text-[#18181B]">
                    LUTech
                  </span>
                </div>

                <div className="my-8 flex min-h-52 items-center justify-center rounded-2xl bg-[#F4F6F4]">
                  <span className="text-8xl drop-shadow-md sm:text-9xl">
                    💻
                  </span>
                </div>

                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#AFC0B4]">
                      Technology Collection
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-white">
                      Find Your Next Favorite
                    </h3>
                  </div>

                  <Link
                    to="/products"
                    aria-label="Browse technology products"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E07A5F] text-xl font-bold text-[#18181B] transition hover:bg-[#F09A80]"
                  >
                    →
                  </Link>
                </div>
              </div>

              <div className="absolute -bottom-5 -left-4 rounded-xl border border-[#E5E9E5] bg-white px-4 py-3 shadow-lg sm:-left-8">
                <p className="text-xs font-semibold text-[#68766F]">
                  Your destination
                </p>
                <p className="mt-1 text-sm font-bold text-[#1A2E26]">
                  For Everyday Tech
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Products */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">

          <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B9533B]">
                Explore Our Collection
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#20332B] sm:text-4xl">
                Technology for every day.
              </h2>

              <p className="mt-3 max-w-xl leading-7 text-[#68766F]">
                Discover technology designed for work, gaming, and everyday
                life.
              </p>
            </div>

            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#1A2E26] transition hover:text-[#B9533B]"
            >
              View all products
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {featuredProducts.map((product) => (
              <article
                key={product.title}
                className="group overflow-hidden rounded-2xl border border-[#E5E9E5] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(26,46,38,0.08)]"
              >
                <div className="relative flex h-52 items-center justify-center bg-[#F4F6F4]">
                  <span className="text-7xl transition duration-300 group-hover:scale-110">
                    {product.icon}
                  </span>

                  <span className="absolute left-5 top-5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#68766F]">
                    {product.category}
                  </span>

                  <span className="absolute right-5 top-5 text-sm font-bold text-[#A7B2AA]">
                    {product.number}
                  </span>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-[#20332B]">
                    {product.title}
                  </h3>

                  <p className="mt-3 min-h-14 text-sm leading-7 text-[#68766F]">
                    {product.description}
                  </p>

                  <Link
                    to="/products"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#1A2E26] transition group-hover:text-[#B9533B]"
                  >
                    Explore products
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Why Choose LUTech */}
        <section className="border-y border-[#E5E9E5] bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">

            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B9533B]">
                The LUTech Difference
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#20332B] sm:text-4xl">
                A better way to shop for technology.
              </h2>

              <p className="mt-4 leading-7 text-[#68766F]">
                We make discovering and purchasing your favorite technology
                products straightforward and convenient.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {benefits.map((benefit) => (
                <article
                  key={benefit.title}
                  className="rounded-2xl border border-[#E5E9E5] bg-[#F4F6F4] p-7 transition duration-300 hover:-translate-y-1 hover:border-[#C7D5CA] hover:shadow-md"
                >
                  <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1A2E26] text-xl font-bold text-[#E99A80]">
                    {benefit.icon}
                  </div>

                  <h3 className="text-lg font-bold text-[#20332B]">
                    {benefit.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-[#68766F]">
                    {benefit.description}
                  </p>
                </article>
              ))}
            </div>

            {/* Final CTA */}
            <div className="mt-14 rounded-2xl bg-[#1A2E26] px-6 py-10 text-center sm:px-10">
              <h3 className="text-2xl font-bold text-white sm:text-3xl">
                Ready to explore something new?
              </h3>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#C1CEC5]">
                Browse our collection and discover technology for your
                everyday needs.
              </p>

              <Link
                to="/products"
                className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#E07A5F] px-7 py-3.5 text-sm font-bold text-[#18181B] transition hover:bg-[#F09A80]"
              >
                Browse All Products
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default Home;
