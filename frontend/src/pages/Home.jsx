
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const featuredProducts = [
  {
    title: "Gaming Laptop",
    description:
      "High-performance laptops for gaming and professional work.",
  },
  {
    title: "Mechanical Keyboard",
    description:
      "Durable keyboards designed for productivity and gaming.",
  },
  {
    title: "Wireless Mouse",
    description:
      "Comfortable and responsive wireless mice for everyday use.",
  },
];

const benefits = [
  {
    title: "Quality Products",
    description:
      "We provide reliable and high-quality electronic products.",
  },
  {
    title: "Fast Delivery",
    description:
      "Quick and efficient delivery service for customer satisfaction.",
  },
  {
    title: "Secure Shopping",
    description:
      "Safe and secure shopping experience with verified user accounts.",
  },
];

function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 px-4 py-20 text-center text-white sm:py-28">
          <div className="relative mx-auto max-w-4xl">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-blue-200">
              Technology for Everyone
            </p>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Welcome to LUTech
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg text-blue-100 sm:text-xl">
              Your Trusted Electronics E-Commerce Platform
            </p>

            <p className="mx-auto mt-4 max-w-2xl leading-7 text-blue-100/90">
              Explore the latest laptops, accessories, and technology
              products at affordable prices.
            </p>

            <Link
              to="/products"
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 font-bold text-blue-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/40"
            >
              Shop Now
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </section>

        {/* Featured Products */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
              Explore Our Collection
            </p>

            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Featured Products
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Discover technology designed for work, gaming, and everyday
              life.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {featuredProducts.map((product) => (
              <article
                key={product.title}
                className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl text-blue-700">
                  <span aria-hidden="true">
                    {product.title === "Gaming Laptop"
                      ? "💻"
                      : product.title === "Mechanical Keyboard"
                        ? "⌨️"
                        : "🖱️"}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900">
                  {product.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {product.description}
                </p>

                <Link
                  to="/products"
                  className="mt-5 inline-flex font-semibold text-blue-700 hover:text-blue-900"
                >
                  Explore products →
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* Why Choose LUTech */}
        <section className="border-y border-slate-200 bg-white px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-blue-700">
                The LUTech Difference
              </p>

              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                Why Choose LUTech?
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {benefits.map((benefit, index) => (
                <article
                  key={benefit.title}
                  className="rounded-2xl bg-slate-50 p-7 text-center transition hover:bg-blue-50"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-extrabold text-blue-800">
                    {index + 1}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">
                    {benefit.title}
                  </h3>

                  <p className="mt-3 leading-7 text-slate-600">
                    {benefit.description}
                  </p>
                </article>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link
                to="/products"
                className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-7 py-3 font-bold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Browse All Products
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
