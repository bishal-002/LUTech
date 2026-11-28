
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  getMyProducts,
  getCategories,
  getSellerMasterBrands,
  createProduct,
  updateProduct,
  uploadProductImage,
  uploadProductVideo,
} from "../../services/productService";

const inputClass =
  "w-full rounded-xl border border-[#DCE5DD] bg-white px-4 py-3 text-sm text-[#20332B] outline-none focus:border-[#1A2E26]";

const INITIAL_FORM = {
  title: "",
  brandId: "",
  mpn: "",
  categoryId: "",
  tags: "",
  condition: "new_sealed",
  conditionNotes: "",
  regionVariant: "Official Local Variant (BD)",
  gtin: "",
  images: [],
  videoUrl: "",
  highlights: ["", "", ""],
  description: "",
  hasVariants: false,
  variantOptions: [],
  variants: [{
    sku: "",
    attributes: {},
    regularPrice: "",
    salePrice: "",
    stockQuantity: 0,
    lowStockThreshold: 3,
    isDefault: true,
  }],
  warrantyType: "No Warranty",
  warrantyDuration: { value: "", unit: "Months" },
  warrantyPolicy: "",
  returnPolicy: "Non-Returnable",
  shipping: {
    weightGrams: "",
    dimensions: { lengthCm: "", widthCm: "", heightCm: "" },
  },
  dispatchTime: "1–2 Business Days",
  preorderReleaseDate: "",
  specifications: [],
  boxContents: [],
  plugType: "",
  includesAdapter: false,
  compatibility: {
    mode: "not_applicable",
    devices: [],
    notes: "",
  },
};

const CONDITIONS = [
  ["new_sealed", "New & Sealed"],
  ["open_box", "Open Box"],
  ["manufacturer_refurbished", "Manufacturer Refurbished"],
  ["seller_refurbished", "Seller Refurbished"],
  ["used_grade_a", "Used - Grade A"],
  ["used_grade_b", "Used - Grade B"],
];

const WARRANTY_TYPES = [
  "Official Brand Warranty",
  "Seller / Shop Service Warranty",
  "Instant Replacement Only",
  "International Warranty",
  "No Warranty",
];

function Section({ title, description, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#E5E9E5] bg-white">
      <div className="border-b border-[#E5E9E5] p-4 sm:p-5">
        <h2 className="font-bold text-[#20332B]">{title}</h2>
        {description && (
          <p className="mt-1 text-xs text-[#89958D]">{description}</p>
        )}
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-xs font-bold text-[#20332B]">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-[#89958D]">{hint}</span>}
    </label>
  );
}

function SellerProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = Boolean(id);

  const [form, setForm] = useState(INITIAL_FORM);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState("");
  const [videoFile, setVideoFile] = useState(null);

  const selectedCategory = useMemo(
    () => categories.find((item) => item._id === form.categoryId),
    [categories, form.categoryId]
  );

  const template = selectedCategory?.specificationTemplate || [];

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);

        const [brandResponse, categoryResponse, productResponse] =
          await Promise.all([
            getSellerMasterBrands(),
            getCategories(),
            editing
              ? getMyProducts({ params: { page: 1, limit: 100 } })
              : Promise.resolve({ products: [] }),
          ]);

        if (!active) return;

        setBrands(brandResponse.brands || []);
        setCategories(categoryResponse.categories || []);

        if (editing) {
          const product = (productResponse.products || []).find(
            (item) => item._id === id
          );

          if (!product) {
            throw new Error(
              "This product was not found in your seller catalog."
            );
          }

          setForm({
            ...INITIAL_FORM,
            ...product,
            title: product.title || "",
            brandId: product.brandId?._id || product.brandId || "",
            categoryId: product.categoryId?._id || product.categoryId || "",
            tags: (product.tags || []).join(", "),
            highlights: product.highlights?.length
              ? product.highlights
              : ["", "", ""],
            variants: product.variants?.length
              ? product.variants.map((item) => ({
                  ...item,
                  regularPrice: item.regularPrice ?? "",
                  salePrice: item.salePrice ?? "",
                }))
              : INITIAL_FORM.variants,
            warrantyDuration: {
              value: product.warrantyDuration?.value ?? "",
              unit: product.warrantyDuration?.unit || "Months",
            },
            shipping: {
              ...INITIAL_FORM.shipping,
              ...product.shipping,
              dimensions: {
                ...INITIAL_FORM.shipping.dimensions,
                ...product.shipping?.dimensions,
              },
            },
            specifications: product.specifications || [],
            images: product.images || [],
            boxContents: product.boxContents || [],
          });
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
            err.message ||
            "Unable to load product form data."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [editing, id]);

  const update = (name, value) => {
    setForm((previous) => ({ ...previous, [name]: value }));
    setError("");
  };

  const updateNested = (section, name, value) => {
    setForm((previous) => ({
      ...previous,
      [section]: { ...previous[section], [name]: value },
    }));
  };

  const uploadImage = async (file, slot) => {
    if (!file) return;

    try {
      setUploading(slot);
      setError("");

      const response = await uploadProductImage(file, slot);
      const media = response.media;

      setForm((previous) => {
        const remaining = previous.images.filter(
          (image) => image.slot !== slot
        );

        return {
          ...previous,
          images: [...remaining, {
            url: media.url,
            slot: media.slot,
          }],
        };
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Image upload failed."
      );
    } finally {
      setUploading("");
    }
  };

  const uploadExtraImage = async (file) => {
    if (!file) return;

    if (form.images.length >= 10) {
      setError("You can upload a maximum of 10 images.");
      return;
    }

    try {
      setUploading("extra");
      const response = await uploadProductImage(file, "extra");

      setForm((previous) => ({
        ...previous,
        images: [...previous.images, response.media],
      }));
    } catch (err) {
      setError(err.response?.data?.message || "Image upload failed.");
    } finally {
      setUploading("");
    }
  };

  const uploadVideo = async () => {
    if (!videoFile) return;

    try {
      setUploading("video");
      const response = await uploadProductVideo(videoFile);
      update("videoUrl", response.media.url);
      setVideoFile(null);
    } catch (err) {
      setError(err.response?.data?.message || "Video upload failed.");
    } finally {
      setUploading("");
    }
  };

  const updateSpecification = (field, value) => {
    setForm((previous) => {
      const next = previous.specifications.filter(
        (item) => item.key !== field.key
      );

      const empty =
        value === "" ||
        value === null ||
        (Array.isArray(value) && value.length === 0);

      if (!empty) {
        next.push({
          group: field.group,
          key: field.key,
          label: field.label,
          value,
        });
      }

      return { ...previous, specifications: next };
    });
  };

  const getSpecificationValue = (key) =>
    form.specifications.find((item) => item.key === key)?.value ?? "";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const images = form.images || [];
    const mainCount = images.filter((item) => item.slot === "main").length;
    const portsCount = images.filter((item) => item.slot === "ports").length;

    if (mainCount !== 1 || portsCount !== 1 || images.length < 2) {
      setError("Upload exactly one main image and one ports image. At least two images are required.");
      return;
    }

    const highlights = form.highlights
      .map((item) => item.trim())
      .filter(Boolean);

    if (highlights.length < 3 || highlights.length > 5) {
      setError("Enter between 3 and 5 product highlights.");
      return;
    }

    if (form.description.trim().length < 100) {
      setError("Product description must contain at least 100 characters.");
      return;
    }

    if (!form.variants.length || !form.variants[0].sku.trim()) {
      setError("A variant SKU is required.");
      return;
    }

    if (form.warrantyType !== "No Warranty" &&
        !form.warrantyPolicy.trim()) {
      setError("Enter the warranty policy.");
      return;
    }

    const payload = {
      ...form,
      tags: form.tags.split(",").map((item) => item.trim()).filter(Boolean),
      highlights,
      variants: form.variants.map((variant, index) => ({
        ...variant,
        regularPrice: Number(variant.regularPrice),
        salePrice: variant.salePrice === "" ? null : Number(variant.salePrice),
        stockQuantity: Number(variant.stockQuantity),
        lowStockThreshold: Number(variant.lowStockThreshold),
        isDefault: index === 0,
      })),
      shipping: {
        weightGrams: Number(form.shipping.weightGrams),
        dimensions: Object.fromEntries(
          Object.entries(form.shipping.dimensions).map(([key, value]) => [
            key,
            value === "" ? null : Number(value),
          ])
        ),
      },
      warrantyDuration: {
        value: form.warrantyType === "No Warranty" ||
          form.warrantyDuration.unit === "Lifetime"
          ? null
          : Number(form.warrantyDuration.value),
        unit: form.warrantyDuration.unit,
      },
      preorderReleaseDate: form.dispatchTime === "Pre-Order"
        ? form.preorderReleaseDate
        : null,
      images,
      specifications: form.specifications,
      boxContents: form.boxContents,
      compatibility: form.compatibility,
    };

    delete payload._id;
    delete payload.seller;
    delete payload.sellerId;
    delete payload.moderationStatus;
    delete payload.moderationNote;
    delete payload.moderatedBy;
    delete payload.moderatedAt;
    delete payload.isGenuineVerified;
    delete payload.genuineVerifiedBy;
    delete payload.genuineVerifiedAt;
    delete payload.createdAt;
    delete payload.updatedAt;
    delete payload.slug;
    delete payload.averageRating;
    delete payload.reviewCount;

    try {
      setSaving(true);

      if (editing) {
        await updateProduct(id, payload);
      } else {
        await createProduct(payload);
      }

      navigate("/seller/products", {
        state: {
          message: editing
            ? "Product updated successfully."
            : "Product submitted successfully.",
        },
      });
    } catch (err) {
      const details = err.response?.data?.errors;
      setError(
        [err.response?.data?.message, ...(details || [])]
          .filter(Boolean)
          .join(" ")
        || "Unable to save product."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center text-sm text-white">
        Loading product form...
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#8FB8AB]">
            PRODUCT MANAGEMENT
          </p>
          <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
            {editing ? "Edit Product" : "Add New Product"}
          </h1>
          <p className="mt-2 text-sm text-[#A9C4BE]">
            Complete the product information required by LUTech.
          </p>
        </div>

        <Link
          to="/seller/products"
          className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white"
        >
          ← Back to Products
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-300/20 bg-red-950/30 p-4 text-sm leading-6 text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Product Identity" description="Basic product identification and catalog classification.">
          <Field label="Product Title" required>
            <input className={inputClass} minLength={10} maxLength={120}
              value={form.title} onChange={(e) => update("title", e.target.value)} required />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Approved Brand" required>
              <select className={inputClass} value={form.brandId}
                onChange={(e) => update("brandId", e.target.value)} required>
                <option value="">Select brand</option>
                {brands.map((brand) => (
                  <option key={brand._id} value={brand._id}>{brand.name}</option>
                ))}
              </select>
              {!brands.length && (
                <span className="mt-1 block text-xs text-amber-700">
                  No approved master brands are available. Contact the administrator.
                </span>
              )}
            </Field>

            <Field label="Category" required>
              <select className={inputClass} value={form.categoryId}
                onChange={(e) => {
                  update("categoryId", e.target.value);
                  update("specifications", []);
                }} required>
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>{category.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Manufacturer Part Number (MPN)" required>
              <input className={inputClass} value={form.mpn}
                onChange={(e) => update("mpn", e.target.value)} required />
            </Field>

            <Field label="GTIN / Barcode" hint="Optional. Enter a valid GTIN-8, UPC-A, EAN-13 or GTIN-14 with its correct check digit.">
              <input className={inputClass} value={form.gtin}
                onChange={(e) => update("gtin", e.target.value.replace(/\D/g, ""))} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product Condition">
              <select className={inputClass} value={form.condition}
                onChange={(e) => update("condition", e.target.value)}>
                {CONDITIONS.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>

            <Field label="Region Variant">
              <select className={inputClass} value={form.regionVariant}
                onChange={(e) => update("regionVariant", e.target.value)}>
                {[
                  "Official Local Variant (BD)",
                  "Global / International",
                  "US Variant",
                  "UK / EU Variant",
                  "CN (China ROM)",
                  "Japan Variant",
                ].map((value) => <option key={value}>{value}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Condition Notes">
            <textarea className={inputClass} rows="2" maxLength="500"
              value={form.conditionNotes}
              onChange={(e) => update("conditionNotes", e.target.value)} />
          </Field>

          <Field label="Tags" hint="Separate tags with commas. Maximum 8 tags.">
            <input className={inputClass} value={form.tags}
              onChange={(e) => update("tags", e.target.value)} />
          </Field>
        </Section>

        <Section title="Product Images" description="Upload at least two images. The main and ports images are mandatory.">
          {[
            ["main", "Main Product Image", true],
            ["ports", "Ports / Connectivity Image", true],
          ].map(([slot, label, required]) => {
            const current = form.images.find((image) => image.slot === slot);

            return (
              <Field key={slot} label={label} required={required}>
                <input type="file" accept="image/jpeg,image/png,image/webp"
                  className="block w-full text-xs text-[#68766F]"
                  onChange={(e) => uploadImage(e.target.files?.[0], slot)} />
                {uploading === slot && <p className="mt-2 text-xs">Uploading...</p>}
                {current && (
                  <div className="mt-3 flex items-center gap-3">
                    <img src={current.url} className="h-20 w-20 rounded-lg object-cover" />
                    <span className="text-xs text-green-700">Uploaded successfully</span>
                  </div>
                )}
              </Field>
            );
          })}

          <Field label="Additional Images" hint="Optional. Maximum 10 images in total.">
            <input type="file" accept="image/jpeg,image/png,image/webp"
              className="block w-full text-xs"
              onChange={(e) => uploadExtraImage(e.target.files?.[0])} />
          </Field>

          <div className="flex flex-wrap gap-2">
            {form.images.filter((image) => image.slot === "extra").map((image, index) => (
              <div key={`${image.url}-${index}`} className="relative">
                <img src={image.url} className="h-16 w-16 rounded-lg object-cover" />
                <button type="button"
                  onClick={() => update("images", form.images.filter((item) => item !== image))}
                  className="absolute -right-2 -top-2 rounded-full bg-red-600 px-2 text-xs text-white">
                  ×
                </button>
              </div>
            ))}
          </div>

          <Field label="Product Video" hint="Optional video upload.">
            <input type="file" accept="video/mp4,video/webm,video/quicktime"
              className="block w-full text-xs"
              onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
            <button type="button" disabled={!videoFile || uploading === "video"}
              onClick={uploadVideo}
              className="mt-2 rounded-lg bg-[#1A2E26] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
              {uploading === "video" ? "Uploading..." : "Upload Video"}
            </button>
            {form.videoUrl && <p className="mt-2 break-all text-xs text-green-700">Video uploaded</p>}
          </Field>
        </Section>

        <Section title="Product Description" description="Provide clear and accurate product information.">
          <Field label="Product Highlights" hint="Enter 3–5 concise highlights, maximum 100 characters each.">
            {form.highlights.map((value, index) => (
              <input key={index} className={`${inputClass} mb-2`}
                maxLength={100}
                placeholder={`Highlight ${index + 1}`}
                value={value}
                onChange={(e) => update("highlights", form.highlights.map((item, i) => i === index ? e.target.value : item))} />
            ))}
            {form.highlights.length < 5 && (
              <button type="button"
                onClick={() => update("highlights", [...form.highlights, ""])}
                className="text-xs font-bold text-[#1A2E26] underline">
                + Add highlight
              </button>
            )}
            {form.highlights.length > 3 && (
              <button type="button"
                onClick={() => update("highlights", form.highlights.slice(0, -1))}
                className="ml-4 text-xs font-bold text-red-600 underline">
                Remove last
              </button>
            )}
          </Field>

          <Field label="Full Description" required hint={`${form.description.length}/5000 characters. Minimum 100 characters.`}>
            <textarea className={inputClass} rows="8" minLength={100} maxLength={5000}
              value={form.description}
              onChange={(e) => update("description", e.target.value)} required />
          </Field>
        </Section>

        {template.length > 0 && (
          <Section title="Category Specifications" description="Fields are loaded from the selected category's specification template.">
            {template.map((field) => {
              const value = getSpecificationValue(field.key);

              return (
                <Field key={field.key} label={`${field.label}${field.unit ? ` (${field.unit})` : ""}`} required={field.required}>
                  {field.inputType === "boolean" ? (
                    <select className={inputClass} value={String(value)}
                      onChange={(e) => updateSpecification(field, e.target.value === "true")}>
                      <option value="">Select</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : field.inputType === "select" ? (
                    <select className={inputClass} value={value}
                      onChange={(e) => updateSpecification(field, e.target.value)}>
                      <option value="">Select</option>
                      {field.options.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  ) : field.inputType === "multiselect" ? (
                    <select multiple className={inputClass} value={Array.isArray(value) ? value : []}
                      onChange={(e) => updateSpecification(field, [...e.target.selectedOptions].map((option) => option.value))}>
                      {field.options.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input type={field.inputType === "number" ? "number" : "text"}
                      className={inputClass} value={value}
                      onChange={(e) => updateSpecification(field, field.inputType === "number" ? e.target.value : e.target.value)} />
                  )}
                </Field>
              );
            })}
          </Section>
        )}

        <Section title="Variant & Inventory" description="Every product must contain at least one variant.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SKU" required>
              <input className={inputClass} value={form.variants[0].sku}
                onChange={(e) => update("variants", [{ ...form.variants[0], sku: e.target.value.toUpperCase() }])} required />
            </Field>
            <Field label="Stock Quantity" required>
              <input type="number" min="0" step="1" className={inputClass}
                value={form.variants[0].stockQuantity}
                onChange={(e) => update("variants", [{ ...form.variants[0], stockQuantity: e.target.value }])} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Regular Price (BDT)" required>
              <input type="number" min="0.01" step="0.01" className={inputClass}
                value={form.variants[0].regularPrice}
                onChange={(e) => update("variants", [{ ...form.variants[0], regularPrice: e.target.value }])} required />
            </Field>
            <Field label="Sale Price (BDT)" hint="Optional. Must be lower than regular price.">
              <input type="number" min="0.01" step="0.01" className={inputClass}
                value={form.variants[0].salePrice}
                onChange={(e) => update("variants", [{ ...form.variants[0], salePrice: e.target.value }])} />
            </Field>
          </div>

          <Field label="Low Stock Threshold">
            <input type="number" min="0" step="1" className={inputClass}
              value={form.variants[0].lowStockThreshold}
              onChange={(e) => update("variants", [{ ...form.variants[0], lowStockThreshold: e.target.value }])} />
          </Field>
        </Section>

        <Section title="Shipping & Dispatch">
          <Field label="Shipping Weight (grams)" required>
            <input type="number" min="1" className={inputClass}
              value={form.shipping.weightGrams}
              onChange={(e) => updateNested("shipping", "weightGrams", e.target.value)} required />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["lengthCm", "Length (cm)"],
              ["widthCm", "Width (cm)"],
              ["heightCm", "Height (cm)"],
            ].map(([key, label]) => (
              <Field key={key} label={label}>
                <input type="number" min="0.1" className={inputClass}
                  value={form.shipping.dimensions[key]}
                  onChange={(e) => update("shipping", {
                    ...form.shipping,
                    dimensions: { ...form.shipping.dimensions, [key]: e.target.value },
                  })} />
              </Field>
            ))}
          </div>

          <Field label="Dispatch Time">
            <select className={inputClass} value={form.dispatchTime}
              onChange={(e) => update("dispatchTime", e.target.value)}>
              {[
                "Same-Day Dispatch (Orders before 3 PM)",
                "1–2 Business Days",
                "3–5 Business Days",
                "Pre-Order",
              ].map((value) => <option key={value}>{value}</option>)}
            </select>
          </Field>

          {form.dispatchTime === "Pre-Order" && (
            <Field label="Pre-order Release Date" required>
              <input type="date" className={inputClass}
                value={form.preorderReleaseDate}
                onChange={(e) => update("preorderReleaseDate", e.target.value)} required />
            </Field>
          )}
        </Section>

        <Section title="Warranty & Returns">
          <Field label="Warranty Type">
            <select className={inputClass} value={form.warrantyType}
              onChange={(e) => update("warrantyType", e.target.value)}>
              {WARRANTY_TYPES.map((value) => <option key={value}>{value}</option>)}
            </select>
          </Field>

          {form.warrantyType !== "No Warranty" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Warranty Duration">
                  <input type="number" min="1" className={inputClass}
                    value={form.warrantyDuration.value}
                    onChange={(e) => update("warrantyDuration", {
                      ...form.warrantyDuration, value: e.target.value,
                    })} />
                </Field>
                <Field label="Duration Unit">
                  <select className={inputClass}
                    value={form.warrantyDuration.unit}
                    onChange={(e) => update("warrantyDuration", {
                      ...form.warrantyDuration, unit: e.target.value,
                    })}>
                    {["Days", "Months", "Years", "Lifetime"].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Warranty Policy" required hint="10–300 characters.">
                <textarea className={inputClass} rows="3" maxLength={300}
                  value={form.warrantyPolicy}
                  onChange={(e) => update("warrantyPolicy", e.target.value)} />
              </Field>
            </>
          )}

          <Field label="Return Policy">
            <select className={inputClass} value={form.returnPolicy}
              onChange={(e) => update("returnPolicy", e.target.value)}>
              {[
                "7-Day Easy Return (Unopened/Defective)",
                "3-Day DOA (Dead on Arrival) Replacement",
                "Non-Returnable",
              ].map((value) => <option key={value}>{value}</option>)}
            </select>
          </Field>
        </Section>

        <div className="flex flex-col-reverse gap-3 rounded-2xl border border-white/10 bg-[#153B3C] p-4 sm:flex-row sm:justify-between">
          <Link to="/seller/products"
            className="rounded-xl border border-white/15 px-5 py-3 text-center text-sm font-semibold text-white">
            Cancel
          </Link>

          <button type="submit" disabled={saving || Boolean(uploading)}
            className="rounded-xl bg-[#B9F4E4] px-6 py-3 text-sm font-bold text-[#062729] disabled:opacity-50">
            {saving ? "Saving..." : editing ? "Save Changes" : "Submit Product"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SellerProductForm;
