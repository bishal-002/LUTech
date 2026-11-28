
import { useCallback, useEffect, useState } from "react";
import {
  getSellerProfile,
  updateSellerProfile,
} from "../../services/sellerService";

const EMPTY_FORM = {
  storeName: "",
  tagline: "",
  about: "",
  logoUrl: "",
  bannerUrl: "",
  specialties: [],
  publicAddress: {
    street: "",
    area: "",
    city: "",
    district: "",
    postalCode: "",
    country: "Bangladesh",
  },
  supportPhone: "",
  supportEmail: "",
  supportHours: {
    monday: "",
    tuesday: "",
    wednesday: "",
    thursday: "",
    friday: "",
    saturday: "",
    sunday: "",
  },
  defaults: {
    dispatchTime: "",
    returnPolicy: "",
    warrantyPolicy: "",
    vacationMode: false,
  },
};

const SPECIALTY_LIMIT = 5;

const inputClass =
  "w-full rounded-xl border border-[#DDE7E0] bg-[#FAFCFA] px-4 py-3 text-sm text-[#29473C] outline-none transition placeholder:text-[#A0ACA4] focus:border-[#55A88B] focus:bg-white focus:ring-2 focus:ring-[#55A88B]/10";

const labelClass = "mb-2 block text-sm font-semibold text-[#29473C]";

const normalizeSeller = (seller = {}) => ({
  storeName: seller.storeName || "",
  tagline: seller.tagline || "",
  about: seller.about || seller.storeDescription || "",
  logoUrl: seller.logoUrl || "",
  bannerUrl: seller.bannerUrl || "",
  specialties: Array.isArray(seller.specialties)
    ? seller.specialties
    : [],
  publicAddress: {
    ...EMPTY_FORM.publicAddress,
    ...(typeof seller.publicAddress === "object"
      ? seller.publicAddress
      : {}),
  },
  supportPhone: seller.supportPhone || seller.storePhone || "",
  supportEmail: seller.supportEmail || "",
  supportHours: {
    ...EMPTY_FORM.supportHours,
    ...(typeof seller.supportHours === "object"
      ? seller.supportHours
      : {}),
  },
  defaults: {
    ...EMPTY_FORM.defaults,
    ...(seller.defaults || {}),
  },
});

export default function SellerStoreProfile() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getSellerProfile();
      setForm(normalizeSeller(response.seller));
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load your store profile."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage("");
    setError("");
  };

  const updateNested = (section, field, value) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value,
      },
    }));
    setMessage("");
    setError("");
  };

  const addSpecialty = () => {
    const value = specialtyInput.trim();

    if (!value) return;

    if (value.length > 50) {
      setError("Each specialty must be 50 characters or fewer.");
      return;
    }

    if (form.specialties.length >= SPECIALTY_LIMIT) {
      setError("You can add up to five specialties.");
      return;
    }

    if (
      form.specialties.some(
        (item) => item.toLowerCase() === value.toLowerCase()
      )
    ) {
      setError("This specialty has already been added.");
      return;
    }

    updateField("specialties", [...form.specialties, value]);
    setSpecialtyInput("");
  };

  const removeSpecialty = (value) => {
    updateField(
      "specialties",
      form.specialties.filter((item) => item !== value)
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (form.storeName.trim().length < 3 || form.storeName.trim().length > 50) {
      setError("Store name must contain 3–50 characters.");
      return;
    }

    if (form.about.trim().length < 50 || form.about.trim().length > 1000) {
      setError("Store description must contain 50–1000 characters.");
      return;
    }

    if (form.specialties.length < 1 || form.specialties.length > 5) {
      setError("Add between one and five store specialties.");
      return;
    }

    if (!form.supportPhone.trim()) {
      setError("A store support phone number is required.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        storeName: form.storeName.trim(),
        tagline: form.tagline.trim(),
        about: form.about.trim(),
        logoUrl: form.logoUrl.trim(),
        bannerUrl: form.bannerUrl.trim(),
        specialties: form.specialties,
        publicAddress: form.publicAddress,
        supportPhone: form.supportPhone.trim(),
        supportEmail: form.supportEmail.trim(),
        supportHours: form.supportHours,
        defaults: form.defaults,
      };

      const response = await updateSellerProfile(payload);

      setForm(normalizeSeller(response.seller));
      setMessage("Your store profile has been updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save your store profile."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#315B53] border-t-[#83CDB5]" />
          <p className="mt-4 text-sm text-[#B5C9C1]">
            Loading store settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-7">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#83CDB5]">
          Seller Workspace / Store Management
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
          Store Profile & Settings
        </h1>
        <p className="mt-2 text-sm text-[#A8C0B9]">
          Manage your public store identity, contact details and operating preferences.
        </p>
      </header>

      {message && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          ✓ {message}
        </div>
      )}

      {error && (
        <div role="alert" className="flex flex-col justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 sm:flex-row sm:items-center">
          <p>{error}</p>
          <button type="button" onClick={loadProfile} className="w-fit font-semibold underline">
            Reload profile
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-[#E6ECE8] bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-bold text-[#173D36]">Store Identity</h2>
          <p className="mt-1 text-sm text-[#839088]">
            These details help customers recognize your business.
          </p>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className={labelClass}>
              Store name *
              <input
                required
                minLength={3}
                maxLength={50}
                value={form.storeName}
                onChange={(e) => updateField("storeName", e.target.value)}
                className={inputClass}
                placeholder="Your store name"
              />
              <span className="mt-1 block text-xs font-normal text-[#89958F]">
                3–50 characters
              </span>
            </label>

            <label className={labelClass}>
              Tagline
              <input
                maxLength={100}
                value={form.tagline}
                onChange={(e) => updateField("tagline", e.target.value)}
                className={inputClass}
                placeholder="A short statement about your store"
              />
            </label>

            <label className={labelClass}>
              Store logo URL
              <input
                type="url"
                value={form.logoUrl}
                onChange={(e) => updateField("logoUrl", e.target.value)}
                className={inputClass}
                placeholder="https://example.com/logo.png"
              />
              <span className="mt-1 block text-xs font-normal text-[#89958F]">
                Use a publicly accessible HTTPS image URL.
              </span>
            </label>

            <label className={labelClass}>
              Store banner URL
              <input
                type="url"
                value={form.bannerUrl}
                onChange={(e) => updateField("bannerUrl", e.target.value)}
                className={inputClass}
                placeholder="https://example.com/banner.jpg"
              />
            </label>
          </div>

          <label className={`${labelClass} mt-5`}>
            Store description *
            <textarea
              required
              minLength={50}
              maxLength={1000}
              rows={5}
              value={form.about}
              onChange={(e) => updateField("about", e.target.value)}
              className={`${inputClass} resize-y`}
              placeholder="Describe your store, products, and customer service..."
            />
            <span className="mt-1 block text-xs font-normal text-[#89958F]">
              {form.about.length}/1000 characters · minimum 50
            </span>
          </label>

          <div className="mt-6">
            <label className={labelClass}>Store specialties *</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={specialtyInput}
                maxLength={50}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSpecialty();
                  }
                }}
                className={inputClass}
                placeholder="e.g. Laptops, Smartphones, Accessories"
              />
              <button
                type="button"
                onClick={addSpecialty}
                className="shrink-0 rounded-xl bg-[#1D7055] px-5 py-3 text-sm font-semibold text-white"
              >
                Add specialty
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {form.specialties.map((specialty) => (
                <span key={specialty} className="inline-flex items-center gap-2 rounded-full bg-[#E7F5EF] px-3 py-2 text-xs font-semibold text-[#1D7055]">
                  {specialty}
                  <button
                    type="button"
                    aria-label={`Remove ${specialty}`}
                    onClick={() => removeSpecialty(specialty)}
                    className="font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
              {form.specialties.length === 0 && (
                <p className="text-xs text-[#89958F]">No specialties added.</p>
              )}
            </div>
            <p className="mt-2 text-xs text-[#89958F]">
              Add 1–5 specialties.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E6ECE8] bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-bold text-[#173D36]">Public Business Address</h2>
          <p className="mt-1 text-sm text-[#839088]">
            This is your public store address, not your private warehouse or pickup address.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[
              ["street", "Street / Building"],
              ["area", "Area / Locality"],
              ["city", "City"],
              ["district", "District"],
              ["postalCode", "Postal code"],
              ["country", "Country"],
            ].map(([key, title]) => (
              <label key={key} className={labelClass}>
                {title}
                <input
                  value={form.publicAddress[key]}
                  onChange={(e) => updateNested("publicAddress", key, e.target.value)}
                  className={inputClass}
                  maxLength={150}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E6ECE8] bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-bold text-[#173D36]">Customer Support</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Support phone *
              <input
                required
                maxLength={30}
                value={form.supportPhone}
                onChange={(e) => updateField("supportPhone", e.target.value)}
                className={inputClass}
                placeholder="01XXXXXXXXX"
              />
            </label>
            <label className={labelClass}>
              Support email
              <input
                type="email"
                maxLength={254}
                value={form.supportEmail}
                onChange={(e) => updateField("supportEmail", e.target.value)}
                className={inputClass}
                placeholder="support@example.com"
              />
            </label>
          </div>

          <h3 className="mt-6 text-sm font-bold text-[#29473C]">Support hours</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {Object.keys(EMPTY_FORM.supportHours).map((day) => (
              <label key={day} className={labelClass}>
                {day.charAt(0).toUpperCase() + day.slice(1)}
                <input
                  maxLength={100}
                  value={form.supportHours[day]}
                  onChange={(e) => updateNested("supportHours", day, e.target.value)}
                  className={inputClass}
                  placeholder="e.g. 9:00 AM – 6:00 PM"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E6ECE8] bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-bold text-[#173D36]">Store Operating Defaults</h2>
          <p className="mt-1 text-sm text-[#839088]">
            These are default policy and dispatch details for your store.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Dispatch time
              <input
                maxLength={100}
                value={form.defaults.dispatchTime}
                onChange={(e) => updateNested("defaults", "dispatchTime", e.target.value)}
                className={inputClass}
                placeholder="e.g. Within 1–2 business days"
              />
            </label>

            <label className={labelClass}>
              Return policy
              <textarea
                rows={3}
                maxLength={1000}
                value={form.defaults.returnPolicy}
                onChange={(e) => updateNested("defaults", "returnPolicy", e.target.value)}
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              Warranty policy
              <textarea
                rows={3}
                maxLength={1000}
                value={form.defaults.warrantyPolicy}
                onChange={(e) => updateNested("defaults", "warrantyPolicy", e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className="mt-5 flex items-start gap-3 rounded-xl bg-[#F4F8F5] p-4">
            <input
              type="checkbox"
              checked={Boolean(form.defaults.vacationMode)}
              onChange={(e) => updateNested("defaults", "vacationMode", e.target.checked)}
              className="mt-1 h-4 w-4 accent-emerald-700"
            />
            <span>
              <span className="block text-sm font-semibold text-[#29473C]">
                Vacation mode
              </span>
              <span className="mt-1 block text-xs leading-5 text-[#839088]">
                Save your vacation preference. This setting alone does not guarantee that listings or orders will be paused.
              </span>
            </span>
          </label>
        </section>

        <div className="flex flex-col-reverse justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs text-[#A8C0B9]">
            Seller type, verification status, commission and private payout/KYC details are controlled separately.
          </p>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#83CDB5] px-7 py-3 text-sm font-bold text-[#123B35] transition hover:bg-[#A1DEC9] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving changes..." : "Save Store Profile"}
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-[#315B53] bg-[#103633] p-5">
        <h2 className="font-bold text-white">Public Store Preview</h2>
        <div className="mt-4 overflow-hidden rounded-xl bg-[#17443D]">
          {form.bannerUrl && (
            <img
              src={form.bannerUrl}
              alt="Store banner preview"
              className="h-32 w-full object-cover"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          )}
          <div className="flex items-center gap-4 p-5">
            {form.logoUrl ? (
              <img
                src={form.logoUrl}
                alt="Store logo preview"
                className="h-16 w-16 rounded-xl bg-white object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#83CDB5] text-2xl font-bold text-[#123B35]">
                {form.storeName.charAt(0).toUpperCase() || "S"}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="break-words text-lg font-bold text-white">
                {form.storeName || "Your Store Name"}
              </h3>
              <p className="mt-1 text-sm text-[#B5C9C1]">
                {form.tagline || "Your store tagline"}
              </p>
            </div>
          </div>
          <p className="whitespace-pre-wrap px-5 pb-5 text-sm leading-6 text-[#B5C9C1]">
            {form.about || "Your store description will appear here."}
          </p>
        </div>
      </section>
    </div>
  );
}
