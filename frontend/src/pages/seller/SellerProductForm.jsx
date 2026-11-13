
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api/products";

const INITIAL_FORM = {
  name: "",
  price: "",
  image: "",
  description: "",
};

function FormIcon({ name, className = "h-5 w-5" }) {
  const icons = {
    package: (
      <>
        <path d="m12 2 9 5-9 5-9-5 9-5Z" />
        <path d="m3 7 9 5 9-5M3 7v10l9 5 9-5V7M12 12v10" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5m0-8h.01" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    arrow: <path d="M7 17 17 7M7 7h10v10" />,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

function FormSection({ icon, title, description, children }) {
  return (
    <section className="min-w-0 rounded-2xl border border-[#E5E9E5] bg-white shadow-sm">
      <div className="flex items-start gap-3 border-b border-[#E5E9E5] p-4 sm:p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E5EDE7] text-[#1A2E26]">
          <FormIcon name={icon} />
        </div>

        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[#20332B]">
            {title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-[#89958D]">
            {description}
          </p>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        {children}
      </div>
    </section>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div className="min-w-0">
      <label className="mb-2 flex flex-wrap items-center gap-1 text-xs font-bold text-[#20332B]">
        {label}
        {required && <span className="text-[#B9533B]">*</span>}
      </label>

      {children}

      {hint && (
        <p className="mt-2 text-[10px] leading-5 text-[#89958D]">
          {hint}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "box-border w-full min-w-0 rounded-xl border border-[#DCE5DD] bg-white px-4 py-3 text-sm text-[#20332B] outline-none transition placeholder:text-[#A4ADA7] focus:border-[#1A2E26] focus:ring-2 focus:ring-[#1A2E26]/10";

function SellerProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  const isEditing = Boolean(id);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [imageError, setImageError] = useState(false);

  const getAuthConfig = () => ({
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  // Load existing product when editing.
  useEffect(() => {
    if (!isEditing) return;

    let active = true;

    const fetchProduct = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          navigate("/login", { replace: true });
          return;
        }

        const response = await axios.get(
          `${API_URL}/${id}`,
          getAuthConfig()
        );

        if (!active) return;

        const product = response.data;

        setFormData({
          name: product.name || "",
          price: product.price ?? "",
          image: product.image || "",
          description: product.description || "",
        });
      } catch (err) {
        if (!active) return;

        if (
          err.response?.status === 401 ||
          err.response?.status === 403
        ) {
          navigate("/login", { replace: true });
        } else {
          setError(
            err.response?.data?.message ||
              "Unable to load product."
          );
        }
      } finally {
        if (active) setFetching(false);
      }
    };

    fetchProduct();

    return () => {
      active = false;
    };
  }, [id, isEditing, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");

    if (name === "image") {
      setImageError(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (
      !formData.name.trim() ||
      !formData.price ||
      !formData.image.trim()
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (
      !Number.isFinite(Number(formData.price)) ||
      Number(formData.price) <= 0
    ) {
      setError("Please enter a valid price greater than zero.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...formData,
        name: formData.name.trim(),
        image: formData.image.trim(),
        description: formData.description.trim(),
        price: Number(formData.price),
      };

      if (isEditing) {
        await axios.put(
          `${API_URL}/${id}`,
          payload,
          getAuthConfig()
        );

        setSuccess("Product updated successfully!");
      } else {
        await axios.post(
          API_URL,
          payload,
          getAuthConfig()
        );

        setSuccess("Product added successfully!");
      }

      // Keep the success message visible before navigating.
      window.setTimeout(() => {
        navigate("/seller/products");
      }, 1000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-white/10 bg-[#153B3C]">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-white/10 border-t-[#B9F4E4]" />
          <p className="mt-4 text-sm text-[#B7CCC7]">
            Loading product information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      {/* Page heading */}
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#8FB8AB]">
            PRODUCT MANAGEMENT
          </p>

          <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
            {isEditing ? "Edit Product" : "Add New Product"}
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#A9C4BE]">
            {isEditing
              ? "Update your product information and keep your catalog accurate."
              : "Add a product to your store and make it available to customers."}
          </p>
        </div>

        <Link
          to="/seller/products"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-white/10"
        >
          <span aria-hidden="true">←</span>
          Back to Products
        </Link>
      </div>

      {/* Alerts */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-300/20 bg-red-950/30 p-4 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-xl border border-[#8BE5CC]/20 bg-[#8BE5CC]/10 p-4 text-sm font-medium text-[#B9F4E4]"
        >
          <FormIcon name="check" className="h-5 w-5 shrink-0" />
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"
      >
        {/* Main form column */}
        <div className="min-w-0 space-y-5">
          {/* Basic information */}
          <FormSection
            icon="package"
            title="Basic Information"
            description="Enter the essential details of your product."
          >
            <Field label="Product Name" required>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Wireless Bluetooth Headphones"
                required
                maxLength={150}
                className={inputClass}
              />
            </Field>

            <Field
              label="Product Description"
              hint="Provide clear information to help customers understand your product."
            >
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={6}
                maxLength={5000}
                placeholder="Describe the product, its features, quality and benefits..."
                className={`${inputClass} resize-y`}
              />

              <div className="mt-2 flex justify-end">
                <span className="text-[10px] text-[#89958D]">
                  {formData.description.length}/5000 characters
                </span>
              </div>
            </Field>
          </FormSection>

          {/* Pricing */}
          <FormSection
            icon="info"
            title="Pricing Information"
            description="Set the selling price of your product."
          >
            <Field
              label="Selling Price (BDT)"
              required
              hint="Enter the amount customers will pay for this product."
            >
              <div className="flex min-w-0 overflow-hidden rounded-xl border border-[#DCE5DD] transition focus-within:border-[#1A2E26] focus-within:ring-2 focus-within:ring-[#1A2E26]/10">
                <div className="flex shrink-0 items-center border-r border-[#DCE5DD] bg-[#F4F6F4] px-4 text-sm font-bold text-[#68766F]">
                  ৳ BDT
                </div>

                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                  className="box-border min-w-0 flex-1 bg-white px-4 py-3 text-sm text-[#20332B] outline-none placeholder:text-[#A4ADA7]"
                />
              </div>
            </Field>
          </FormSection>

          {/* Image URL */}
          <FormSection
            icon="image"
            title="Product Image"
            description="Provide an image URL to display your product."
          >
            <Field
              label="Product Image URL"
              required
              hint="Use a publicly accessible image URL. File uploads can be connected when the backend supports image storage."
            >
              <input
                type="url"
                name="image"
                value={formData.image}
                onChange={handleChange}
                placeholder="https://example.com/product-image.jpg"
                required
                className={inputClass}
              />
            </Field>

            {formData.image && (
              <div className="overflow-hidden rounded-xl border border-[#E5E9E5] bg-[#F4F6F4] p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-[#20332B]">
                    Image Preview
                  </p>

                  <span className="rounded-full bg-[#E5EDE7] px-2 py-1 text-[9px] font-bold text-[#1A2E26]">
                    PREVIEW
                  </span>
                </div>

                {!imageError ? (
                  <img
                    src={formData.image}
                    alt="Product preview"
                    onError={() => setImageError(true)}
                    onLoad={() => setImageError(false)}
                    className="mx-auto max-h-72 w-full rounded-lg bg-white object-contain"
                  />
                ) : (
                  <div className="flex min-h-40 flex-col items-center justify-center rounded-lg bg-white px-4 text-center">
                    <FormIcon
                      name="image"
                      className="h-8 w-8 text-[#A4ADA7]"
                    />
                    <p className="mt-3 text-xs font-semibold text-[#68766F]">
                      Unable to load image
                    </p>
                    <p className="mt-1 text-[10px] text-[#89958D]">
                      Check the image URL and try again.
                    </p>
                  </div>
                )}
              </div>
            )}
          </FormSection>

          {/* Form actions */}
          <div className="flex flex-col-reverse gap-3 rounded-2xl border border-white/10 bg-[#153B3C] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <Link
              to="/seller/products"
              className="rounded-xl border border-white/15 px-5 py-3 text-center text-sm font-semibold text-[#C5DAD3] transition hover:bg-white/5"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B9F4E4] px-6 py-3 text-sm font-bold text-[#062729] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#062729]/30 border-t-[#062729]" />
                  Saving...
                </>
              ) : (
                <>
                  <FormIcon name="check" className="h-4 w-4" />
                  {isEditing ? "Save Changes" : "Publish Product"}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right preview column */}
        <aside className="min-w-0 space-y-5 xl:sticky xl:top-24">
          {/* Product preview card */}
          <section className="overflow-hidden rounded-2xl border border-[#E5E9E5] bg-white shadow-sm">
            <div className="border-b border-[#E5E9E5] p-4">
              <h2 className="text-sm font-bold text-[#20332B]">
                Product Preview
              </h2>
              <p className="mt-1 text-xs text-[#89958D]">
                A quick look at your product information.
              </p>
            </div>

            <div className="p-4">
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-[#F0F3F0]">
                {formData.image && !imageError ? (
                  <img
                    src={formData.image}
                    alt={formData.name || "Product"}
                    className="h-full w-full object-contain"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="text-center text-[#A4ADA7]">
                    <FormIcon
                      name="image"
                      className="mx-auto h-12 w-12"
                    />
                    <p className="mt-2 text-xs">
                      Product image preview
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#89958D]">
                  Product Name
                </p>

                <h3 className="mt-1 break-words text-base font-bold text-[#20332B]">
                  {formData.name || "Your product name"}
                </h3>

                <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-[#89958D]">
                  Selling Price
                </p>

                <p className="mt-1 text-2xl font-extrabold text-[#1A2E26]">
                  {formData.price
                    ? `৳${Number(formData.price).toLocaleString("en-BD")}`
                    : "৳0.00"}
                </p>

                <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-[#89958D]">
                  Description
                </p>

                <p className="mt-1 break-words text-xs leading-6 text-[#68766F]">
                  {formData.description ||
                    "Your product description will appear here."}
                </p>
              </div>
            </div>
          </section>

          {/* Publishing guidance */}
          <section className="rounded-2xl border border-[#B9F4E4]/20 bg-[#153B3C] p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#B9F4E4]/10 text-[#B9F4E4]">
                <FormIcon name="info" />
              </div>

              <h3 className="text-sm font-bold text-white">
                Publishing Tips
              </h3>
            </div>

            <ul className="mt-4 space-y-3 text-xs leading-5 text-[#B7CCC7]">
              <li className="flex gap-2">
                <span className="text-[#8BE5CC]">✓</span>
                Use a clear and descriptive product name.
              </li>
              <li className="flex gap-2">
                <span className="text-[#8BE5CC]">✓</span>
                Provide an accurate product description.
              </li>
              <li className="flex gap-2">
                <span className="text-[#8BE5CC]">✓</span>
                Set a correct and competitive price.
              </li>
              <li className="flex gap-2">
                <span className="text-[#8BE5CC]">✓</span>
                Use a publicly accessible product image.
              </li>
            </ul>
          </section>
        </aside>
      </form>
    </div>
  );
}

export default SellerProductForm;
