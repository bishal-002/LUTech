
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import ProductCard from "../../components/ProductCard";
import { getProducts } from "../../services/productService";

import heroBanner from "../../assets/hero-banner.png";
import laptopImage from "../../assets/categories/laptops.webp";
import mobileImage from "../../assets/categories/mobiles.webp";
import audioImage from "../../assets/categories/audio.webp";
import watchImage from "../../assets/categories/watches.webp";
import gamingImage from "../../assets/categories/gaming.webp";
import accessoriesImage from "../../assets/categories/accessories.webp";
import finalShoppingBanner from "../../assets/final-shopping-banner.png";

const benefits = [
  {
    number: "01",
    icon: "🛍️",
    title: "Easy Shopping",
    description:
      "Discover and explore technology products through a simple and convenient shopping experience.",
  },
  {
    number: "02",
    icon: "🤝",
    title: "Multi-Vendor Marketplace",
    description:
      "Explore products from different sellers and discover more choices in one marketplace.",
  },
  {
    number: "03",
    icon: "💳",
    title: "Cash on Delivery",
    description:
      "Enjoy a convenient demo checkout experience with Cash on Delivery.",
  },
  {
    number: "04",
    icon: "📱",
    title: "Responsive Experience",
    description:
      "Browse LUTech comfortably on your desktop, tablet, or mobile device.",
  },
];

function ProductSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-[#E5E9E5] bg-white">
      <div className="h-40 bg-[#E9EEE9] sm:h-48" />

      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 rounded bg-[#E9EEE9]" />
        <div className="h-3 w-full rounded bg-[#E9EEE9]" />
        <div className="h-3 w-1/2 rounded bg-[#E9EEE9]" />
        <div className="h-9 rounded-lg bg-[#E9EEE9]" />
      </div>
    </div>
  );
}

function ProductSection({
  eyebrow,
  title,
  description,
  products,
  loading,
  emptyMessage,
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B9533B]">
            {eyebrow}
          </p>

          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-[#20332B] sm:text-3xl">
            {title}
          </h2>

          <p className="mt-3 max-w-xl text-sm leading-7 text-[#68766F]">
            {description}
          </p>
        </div>

        <Link
          to="/products"
          className="inline-flex w-fit items-center gap-2 text-sm font-bold text-[#1A2E26] transition hover:text-[#B9533B]"
        >
          View all products
          <span aria-hidden="true">→</span>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProductSkeleton key={index} />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {products.map((product, index) => (
            <ProductCard
              key={product._id}
              product={product}
              showDetailsButton={false}
              variant="category"
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#D5DED6] bg-white px-5 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F0F4F0] text-2xl">
            🛍️
          </div>

          <h3 className="mt-4 text-lg font-bold text-[#20332B]">
            No products available yet
          </h3>

          <p className="mt-2 text-sm text-[#68766F]">
            {emptyMessage}
          </p>

          <Link
            to="/products"
            className="mt-5 inline-flex items-center rounded-lg bg-[#1A2E26] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#294438]"
          >
            Explore products
          </Link>
        </div>
      )}
    </section>
  );
}

const categories = [
  {
    name: "Laptops",
    description: "Power your work and creativity.",
    image: laptopImage,
    number: "01",
  },
  {
    name: "Smartphones",
    description: "Stay connected wherever you go.",
    image: mobileImage,
    number: "02",
  },
  {
    name: "Audio & Headphones",
    description: "Experience sound differently.",
    image: audioImage,
    number: "03",
  },
  {
    name: "Smartwatches",
    description: "Technology right on your wrist.",
    image: watchImage,
    number: "04",
  },
  {
    name: "Gaming",
    description: "Level up your experience.",
    image: gamingImage,
    number: "05",
  },
  {
    name: "Accessories",
    description: "Complete your tech setup.",
    image: accessoriesImage,
    number: "06",
  },
];

function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getProducts();

        const productList = Array.isArray(response)
          ? response
          : Array.isArray(response?.products)
            ? response.products
            : [];

        if (isMounted) {
          setProducts(productList);
        }
      } catch (err) {
        console.error("Failed to load homepage products:", err);

        if (isMounted) {
          setError(
            err.response?.data?.message ||
            "Unable to load products. Please check your connection and try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [retryCount]);

  const featuredProducts = useMemo(() => {
    return products.slice(0, 4);
  }, [products]);

  const latestProducts = useMemo(() => {
    return [...products]
      .sort((a, b) => {
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      })
      .slice(0, 4);
  }, [products]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F4]">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full px-0 pb-10 pt-0 sm:pb-14">
          <div
            className="relative isolate flex min-h-[650px] w-full items-center overflow-hidden rounded-b-3xl bg-[#1A2E26] bg-cover bg-center shadow-xl sm:min-h-[620px] lg:min-h-[680px]"
            style={{
              backgroundImage: `url(${heroBanner})`,
              backgroundPosition: "center center",
            }}
          >
            {/* Background overlays for readable text */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#10251D]/95 via-[#10251D]/85 to-[#10251D]/10" />

            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#10251D]/45 via-transparent to-transparent lg:hidden" />

            {/* Hero Content */}
            <div className="relative z-10 w-full max-w-2xl px-6 py-16 text-white sm:px-10 sm:py-20 lg:px-16 lg:py-24">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-[#E07A5F]" />

                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#E1EBE3]">
                  Technology for Everyone
                </span>
              </div>

              <h1 className="max-w-xl text-4xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
                Technology that
                <span className="mt-1 block text-[#F09A80]">
                  moves you forward.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-8 text-[#E0E8E2] sm:text-lg">
                Discover laptops, smartphones, accessories and more.
                Find the technology you need, all in one reliable
                marketplace.
              </p>

              {/* Hero Buttons */}
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link
                  to="/products"
                  className="inline-flex items-center justify-center gap-3 rounded-full bg-[#E07A5F] px-7 py-3.5 text-sm font-bold text-[#18251E] shadow-lg transition duration-300 hover:-translate-y-1 hover:bg-[#F09A80] hover:shadow-xl"
                >
                  Explore Products
                  <span aria-hidden="true" className="text-lg">
                    →
                  </span>
                </Link>

                <Link
                  to="/products"
                  className="inline-flex items-center justify-center rounded-full border border-white/60 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:bg-white/20"
                >
                  Start Shopping
                </Link>
              </div>

              {/* Marketplace Statistics */}
              <div className="mt-12 grid max-w-lg grid-cols-2 gap-x-6 gap-y-5 border-t border-white/25 pt-7 sm:grid-cols-3">
                <div>
                  <p className="text-2xl font-extrabold text-white sm:text-3xl">
                    {loading ? "..." : products.length}
                  </p>

                  <p className="mt-1 text-xs font-medium text-[#D0DDD3]">
                    Available Products
                  </p>
                </div>

                <div>
                  <p className="text-base font-bold text-white sm:text-lg">
                    Multi-Vendor
                  </p>

                  <p className="mt-1 text-xs font-medium text-[#D0DDD3]">
                    Multiple Sellers
                  </p>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <p className="text-base font-bold text-white sm:text-lg">
                    Easy Shopping
                  </p>

                  <p className="mt-1 text-xs font-medium text-[#D0DDD3]">
                    Simple Experience
                  </p>
                </div>
              </div>
            </div>

            {/* Subtle decorative border */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10" />
          </div>
        </section>


        {/* Shop by Category */}
        <section className="bg-[#F4F6F4] py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

            {/* Section Heading */}
            <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B9533B]">
                  Find What You Need
                </p>

                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#20332B] sm:text-4xl">
                  Shop by Category
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-7 text-[#68766F]">
                  Explore our range of technology products and find the
                  right devices and accessories for your everyday needs.
                </p>
              </div>

              <Link
                to="/products"
                className="inline-flex w-fit items-center gap-2 text-sm font-bold text-[#1A2E26] transition hover:text-[#B9533B]"
              >
                Explore all products
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            {/* Category Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {categories.map((category) => (
                <Link
                  key={category.name}
                  to="/products"
                  className="group overflow-hidden rounded-2xl border border-[#E5E9E5] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#C7D5CA] hover:shadow-xl"
                >
                  {/* Category Image */}
                  <div className="h-40 overflow-hidden bg-[#E9EDE8] sm:h-44">
                    <img
                      src={category.image}
                      alt={category.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                    />
                  </div>

                  {/* Category Information */}
                  <div className="p-3 sm:p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-widest text-[#B9533B]">
                        {category.number}
                      </span>

                      <span className="text-lg text-[#68766F] transition duration-300 group-hover:translate-x-1 group-hover:text-[#B9533B]">
                        →
                      </span>
                    </div>

                    <h3 className="text-sm font-bold leading-5 text-[#20332B] sm:text-base">
                      {category.name}
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-[#68766F]">
                      {category.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>


        {/* Product Loading Error */}
        {error && (
          <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-bold text-red-800">
                  Unable to load products
                </h3>

                <p className="mt-1 text-sm text-red-700">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
              >
                Try Again
              </button>
            </div>
          </section>
        )}

        {/* Explore Our Collection */}
        <section className="bg-[#F4F6F4] py-14 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

            {/* Section Header */}
            <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B9533B]">
                  Handpicked for You
                </p>

                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#20332B] sm:text-4xl">
                  Explore Our Collection
                </h2>

                <p className="mt-3 max-w-xl text-sm leading-7 text-[#68766F]">
                  Discover technology products for work, entertainment,
                  creativity and everything in between.
                </p>
              </div>

              <Link
                to="/products"
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#1A2E26] px-5 py-3 text-sm font-bold text-[#1A2E26] transition duration-300 hover:bg-[#1A2E26] hover:text-white"
              >
                View All Products
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            {/* Product Grid */}
            {loading ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <ProductSkeleton key={index} />
                ))}
              </div>
            ) : featuredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    showDetailsButton={false}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#D5DED6] bg-white px-5 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F0F4F0] text-2xl">
                  🛍️
                </div>

                <h3 className="mt-4 text-lg font-bold text-[#20332B]">
                  Products coming soon
                </h3>

                <p className="mt-2 text-sm text-[#68766F]">
                  We're preparing our collection. Check back soon!
                </p>

                <Link
                  to="/products"
                  className="mt-5 inline-flex rounded-lg bg-[#1A2E26] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#294438]"
                >
                  Browse Marketplace
                </Link>
              </div>
            )}
          </div>
        </section>


        {/* LATEST PRODUCTS SECTION */}
        {(loading || latestProducts.length > 0) && (
          <section className="bg-[#F4F6F4] px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
            <div className="mx-auto max-w-[1600px]">

              {/* Section Header */}
              <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
                <div className="max-w-2xl">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#B9533B]">
                    JUST ARRIVED
                  </p>

                  <h2 className="text-3xl font-extrabold tracking-tight text-[#20332B] sm:text-4xl">
                    Latest Products
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-[#68766F] sm:text-base">
                    Discover the newest additions to our collection.
                    Find the latest technology and accessories at LUTech.
                  </p>
                </div>

                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 self-start whitespace-nowrap text-sm font-bold text-[#1A2E26] no-underline transition-colors hover:text-[#B9533B] sm:self-auto"
                >
                  View All Products
                  <span aria-hidden="true">→</span>
                </Link>
              </div>

              {/* Latest Products Grid */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {latestProducts.slice(0, 4).map((product, index) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    variant="category"
                    index={index}
                    showDetailsButton={false}
                  />
                ))}
              </div>

              {/* Bottom Link */}
              <div className="mt-10 text-center">
                <Link
                  to="/products"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#1A2E26] px-7 py-3 text-sm font-bold text-[#1A2E26] no-underline transition-all duration-300 hover:bg-[#1A2E26] hover:text-white"
                >
                  Explore All Products
                  <span aria-hidden="true">→</span>
                </Link>
              </div>

            </div>
          </section>
        )}




        {/* WHY CHOOSE LUTECH */}
        <section className="bg-[#F4F6F4] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B9533B]">
                THE LUTECH ADVANTAGE
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-[#20332B] sm:text-4xl">
                Why Choose LUTech?
              </h2>

              <p className="mt-4 text-sm leading-7 text-[#68766F] sm:text-base">
                More than just a marketplace. We make discovering and shopping
                for technology products simple and convenient.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((benefit) => (
                <article
                  key={benefit.number}
                  className="group rounded-2xl border border-[#E5E9E5] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#C7D5CA] hover:shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#F4F6F4] text-2xl transition-colors duration-300 group-hover:bg-[#FCE9E5]">
                      {benefit.icon}
                    </div>

                    <span className="text-xs font-bold tracking-widest text-[#B9533B]">
                      {benefit.number}
                    </span>
                  </div>

                  <h3 className="mt-6 text-lg font-bold text-[#20332B]">
                    {benefit.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-[#68766F]">
                    {benefit.description}
                  </p>

                  <div className="mt-6 h-1 w-10 rounded-full bg-[#E07A5F] transition-all duration-300 group-hover:w-16" />
                </article>
              ))}
            </div>
          </div>
        </section>



        {/* FINAL SHOPPING CTA */}
        <section className="bg-[#F4F6F4] px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div
              className="relative isolate overflow-hidden rounded-3xl bg-cover bg-center bg-no-repeat px-6 py-16 shadow-xl sm:px-12 sm:py-20 lg:px-20"
              style={{
                backgroundImage: `url(${finalShoppingBanner})`,
              }}
            >
              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#14251E]/95 via-[#14251E]/80 to-[#14251E]/20" />

              <div className="relative z-10 max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#E9A18D]">
                  YOUR NEXT TECH FIND IS HERE
                </p>

                <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Ready to Upgrade Your Tech?
                </h2>

                <p className="mt-5 max-w-xl text-sm leading-7 text-[#E5EBE6] sm:text-base">
                  Explore our collection and discover technology
                  that fits your everyday needs. Your next favourite
                  gadget might be just a click away.
                </p>

                <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                  <Link
                    to="/products"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#E07A5F] px-8 py-4 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-[#B9533B] hover:shadow-xl"
                  >
                    Explore Products
                    <span aria-hidden="true">→</span>
                  </Link>

                  <Link
                    to="/"
                    className="inline-flex items-center justify-center rounded-xl border border-white/40 bg-white/10 px-8 py-4 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>



      </main>

      <Footer />
    </div>
  );
}

export default Home;
