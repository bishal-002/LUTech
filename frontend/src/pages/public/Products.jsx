
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { getProducts } from "../../services/productService";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import Loader from "../../components/Loader";
import ProductCard from "../../components/ProductCard";
import SearchBar from "../../components/SearchBar";

function Products() {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProducts = useCallback(async () => {
    try {
      setError("");
      const data = await getProducts();
      setProducts(data);
    } catch {
      setError("Failed to load products. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.toLowerCase();

    if (!query) return products;

    return products.filter((product) => {
      const name = product.name?.toLowerCase() || "";
      const description = product.description?.toLowerCase() || "";

      return name.includes(query) || description.includes(query);
    });
  }, [products, searchTerm]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6F4]">
      <Navbar />

      <main className="page-container flex-1 py-7 sm:py-9">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B9533B]">
            Explore Our Collection
          </p>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#20332B] sm:text-3xl lg:text-4xl">
            Find Your Next Favorite.
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#68766F] sm:text-base">
            Discover laptops, electronics, and accessories for work,
            entertainment, and everyday life.
          </p>
        </div>

        <section className="mb-7 rounded-xl border border-[#E5E9E5] bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="shrink-0">
              <h2 className="text-sm font-bold text-[#20332B] sm:text-base">
                Browse Products
              </h2>

              <p className="mt-1 text-xs text-[#68766F] sm:text-sm">
                Search our available collection.
              </p>
            </div>

            <div className="w-full sm:max-w-xl">
              <SearchBar
                onSearch={setSearchTerm}
                placeholder="Search products..."
              />
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-xl border border-[#E5E9E5] bg-white p-6">
            <Loader message="Loading products..." />
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-5"
          >
            <h2 className="text-base font-bold text-red-800">
              Unable to load products
            </h2>

            <p className="mt-2 text-sm text-red-700">{error}</p>

            <button
              type="button"
              onClick={() => {
                setLoading(true);
                fetchProducts();
              }}
              className="mt-4 rounded-lg bg-[#1A2E26] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#294438]"
            >
              Try Again
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#D5DED7] bg-white px-5 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EBF0EB] text-xl text-[#1A2E26]">
              ♡
            </div>

            <h2 className="mt-4 text-lg font-bold text-[#20332B]">
              No products available
            </h2>

            <p className="mt-2 text-sm text-[#68766F]">
              Please check back later for new products.
            </p>

            <Link
              to="/"
              className="mt-5 inline-flex rounded-lg bg-[#1A2E26] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#294438]"
            >
              Back to Home
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#20332B] sm:text-lg">
                  {searchTerm ? "Search Results" : "All Products"}
                </h2>

                <p className="mt-1 text-xs text-[#68766F] sm:text-sm">
                  Showing {filteredProducts.length} of {products.length}{" "}
                  {products.length === 1 ? "product" : "products"}
                </p>
              </div>

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="text-xs font-semibold text-[#B9533B] transition hover:text-[#1A2E26] sm:text-sm"
                >
                  Clear search
                </button>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D5DED7] bg-white px-5 py-12 text-center">
                <h2 className="text-lg font-bold text-[#20332B]">
                  No matching products
                </h2>

                <p className="mt-2 text-sm text-[#68766F]">
                  Try another search term or clear your search.
                </p>

                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="mt-5 rounded-lg bg-[#1A2E26] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#294438]"
                >
                  Show All Products
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 sm:gap-5">
                {filteredProducts.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default Products;
