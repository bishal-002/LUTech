
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import {
    getAdminBrands,
    createCatalogBrand,
    updateCatalogBrand,
    deactivateCatalogBrand,
    getAdminCategories,
    createCatalogCategory,
    updateCatalogCategory,
    deactivateCatalogCategory,
} from "../../services/adminService";

const EMPTY_BRAND = {
    name: "",
    slug: "",
    description: "",
    logo: "",
    isVerified: false,
    isGeneric: false,
};

const EMPTY_CATEGORY = {
    name: "",
    slug: "",
    description: "",
    parentCategory: "",
    image: "",
    sortOrder: 0,
    isActive: true,
    specificationTemplate: [],
};

const EMPTY_SPEC = {
    group: "",
    key: "",
    label: "",
    inputType: "text",
    options: "",
    unit: "",
    required: false,
    filterable: false,
    displayOrder: 0,
};

const INPUT =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const LABEL = "mb-1.5 block text-xs font-bold text-slate-600";

function errorText(error, fallback) {
    return (
        error?.response?.data?.message ||
        error?.message ||
        fallback
    );
}

function Status({ active }) {
    return (
        <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${active
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
        >
            {active ? "Active" : "Inactive"}
        </span>
    );
}

function Field({ label, children }) {
    return (
        <label className="block">
            <span className={LABEL}>{label}</span>
            {children}
        </label>
    );
}

function Modal({ title, onClose, children, wide = false }) {
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section
                className={`my-auto max-h-[92vh] w-full ${wide ? "max-w-3xl" : "max-w-xl"
                    } overflow-y-auto rounded-2xl bg-white shadow-2xl`}
            >
                <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
                    <h2 className="text-lg font-extrabold text-slate-900">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg px-3 py-1 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                        aria-label="Close dialog"
                    >
                        ×
                    </button>
                </header>
                <div className="p-5">{children}</div>
            </section>
        </div>
    );
}

function SpecificationEditor({ fields, onChange, disabled }) {
    const [draft, setDraft] = useState(EMPTY_SPEC);

    const addField = () => {
        if (
            !draft.group.trim() ||
            !draft.key.trim() ||
            !draft.label.trim()
        ) {
            return;
        }

        const options = draft.options
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);

        onChange([
            ...fields,
            {
                group: draft.group.trim(),
                key: draft.key.trim(),
                label: draft.label.trim(),
                inputType: draft.inputType,
                options,
                unit: draft.unit.trim(),
                required: draft.required,
                filterable: draft.filterable,
                displayOrder: Number(draft.displayOrder) || 0,
            },
        ]);

        setDraft(EMPTY_SPEC);
    };

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3">
                    <h3 className="font-bold text-slate-900">
                        Specification fields
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                        These fields define the specifications sellers can submit
                        for products in this category.
                    </p>
                </div>

                {fields.length === 0 ? (
                    <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                        No specification fields configured.
                    </p>
                ) : (
                    <div className="mb-4 space-y-2">
                        {fields.map((field, index) => (
                            <div
                                key={`${field.key}-${index}`}
                                className="flex flex-col gap-2 rounded-lg border border-slate-100 p-3 sm:flex-row sm:items-center"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-slate-800">
                                        {field.label}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {field.group} · {field.key} · {field.inputType}
                                        {field.unit ? ` · ${field.unit}` : ""}
                                        {field.required ? " · Required" : ""}
                                        {field.filterable ? " · Filterable" : ""}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() =>
                                        onChange(fields.filter((_, i) => i !== index))
                                    }
                                    className="self-start rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-40 sm:self-center"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Group">
                        <input
                            className={INPUT}
                            value={draft.group}
                            disabled={disabled}
                            onChange={(e) =>
                                setDraft({ ...draft, group: e.target.value })
                            }
                            placeholder="e.g. Display"
                        />
                    </Field>

                    <Field label="Field key">
                        <input
                            className={INPUT}
                            value={draft.key}
                            disabled={disabled}
                            onChange={(e) =>
                                setDraft({ ...draft, key: e.target.value })
                            }
                            placeholder="e.g. screen_size"
                        />
                    </Field>

                    <Field label="Display label">
                        <input
                            className={INPUT}
                            value={draft.label}
                            disabled={disabled}
                            onChange={(e) =>
                                setDraft({ ...draft, label: e.target.value })
                            }
                            placeholder="e.g. Screen Size"
                        />
                    </Field>

                    <Field label="Input type">
                        <select
                            className={INPUT}
                            value={draft.inputType}
                            disabled={disabled}
                            onChange={(e) =>
                                setDraft({ ...draft, inputType: e.target.value })
                            }
                        >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="boolean">Yes / No</option>
                            <option value="select">Select</option>
                            <option value="multiselect">Multi-select</option>
                        </select>
                    </Field>

                    {(draft.inputType === "select" ||
                        draft.inputType === "multiselect") && (
                            <div className="sm:col-span-2">
                                <Field label="Options (comma-separated)">
                                    <input
                                        className={INPUT}
                                        value={draft.options}
                                        disabled={disabled}
                                        onChange={(e) =>
                                            setDraft({ ...draft, options: e.target.value })
                                        }
                                        placeholder="e.g. OLED, AMOLED, IPS"
                                    />
                                </Field>
                            </div>
                        )}

                    <Field label="Unit (optional)">
                        <input
                            className={INPUT}
                            value={draft.unit}
                            disabled={disabled}
                            onChange={(e) =>
                                setDraft({ ...draft, unit: e.target.value })
                            }
                            placeholder="e.g. inches, GB, mAh"
                        />
                    </Field>

                    <Field label="Display order">
                        <input
                            className={INPUT}
                            type="number"
                            min="0"
                            value={draft.displayOrder}
                            disabled={disabled}
                            onChange={(e) =>
                                setDraft({ ...draft, displayOrder: e.target.value })
                            }
                        />
                    </Field>

                    <div className="flex flex-wrap gap-5 sm:col-span-2">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={draft.required}
                                disabled={disabled}
                                onChange={(e) =>
                                    setDraft({ ...draft, required: e.target.checked })
                                }
                            />
                            Required field
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={draft.filterable}
                                disabled={disabled}
                                onChange={(e) =>
                                    setDraft({ ...draft, filterable: e.target.checked })
                                }
                            />
                            Use as product filter
                        </label>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={addField}
                    disabled={
                        disabled ||
                        !draft.group.trim() ||
                        !draft.key.trim() ||
                        !draft.label.trim()
                    }
                    className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    + Add specification field
                </button>
            </div>
        </div>
    );
}

function BrandForm({ initial, onSave, onCancel, busy }) {
    const [form, setForm] = useState(initial || EMPTY_BRAND);
    const set = (key, value) =>
        setForm((current) => ({ ...current, [key]: value }));

    const submit = (event) => {
        event.preventDefault();
        onSave({
            ...form,
            name: form.name.trim(),
            slug: form.slug.trim(),
            description: form.description.trim(),
            logo: form.logo.trim(),
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <Field label="Brand name *">
                <input
                    className={INPUT}
                    required
                    maxLength={80}
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="e.g. Samsung"
                />
            </Field>
            <Field label="Slug (optional)">
                <input
                    className={INPUT}
                    maxLength={100}
                    value={form.slug}
                    onChange={(e) => set("slug", e.target.value)}
                    placeholder="Auto-generated if empty"
                />
            </Field>
            <Field label="Description">
                <textarea
                    className={INPUT}
                    rows={3}
                    maxLength={500}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                />
            </Field>
            <Field label="Logo URL">
                <input
                    className={INPUT}
                    maxLength={2048}
                    value={form.logo}
                    onChange={(e) => set("logo", e.target.value)}
                    placeholder="https://..."
                />
            </Field>
            <div className="flex flex-wrap gap-5">
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.isVerified}
                        onChange={(e) => set("isVerified", e.target.checked)}
                    />
                    Verified brand
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.isGeneric}
                        onChange={(e) => set("isGeneric", e.target.checked)}
                    />
                    Generic brand
                </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600"
                >
                    Cancel
                </button>
                <button
                    disabled={busy}
                    className="rounded-xl bg-[#103B37] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                    {busy ? "Saving..." : "Save brand"}
                </button>
            </div>
        </form>
    );
}

function CategoryForm({
    initial,
    categories,
    canEditSchema,
    onSave,
    onCancel,
    busy,
}) {
    const [form, setForm] = useState(() => ({
        ...EMPTY_CATEGORY,
        ...(initial || {}),
        parentCategory:
            initial?.parentCategory?._id ||
            initial?.parentCategory ||
            "",
        specificationTemplate: (
            initial?.specificationTemplate || []
        ).map((field) => ({
            ...field,
            options: Array.isArray(field.options)
                ? field.options
                : [],
        })),
    }));

    const set = (key, value) =>
        setForm((current) => ({ ...current, [key]: value }));

    const submit = (event) => {
        event.preventDefault();

        const payload = {
            name: form.name.trim(),
            slug: form.slug.trim(),
            description: form.description.trim(),
            parentCategory: form.parentCategory || null,
            image: form.image.trim(),
            sortOrder: Number(form.sortOrder) || 0,
            isActive: form.isActive,
        };

        if (canEditSchema) {
            payload.specificationTemplate = form.specificationTemplate;
        }

        onSave(payload);
    };

    const parentOptions = categories.filter(
        (item) => item._id !== initial?._id && item.isActive
    );

    return (
        <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category name *">
                    <input
                        className={INPUT}
                        required
                        maxLength={80}
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        placeholder="e.g. Smartphones"
                    />
                </Field>
                <Field label="Slug (optional)">
                    <input
                        className={INPUT}
                        maxLength={100}
                        value={form.slug}
                        onChange={(e) => set("slug", e.target.value)}
                        placeholder="Auto-generated if empty"
                    />
                </Field>
                <Field label="Parent category">
                    <select
                        className={INPUT}
                        value={form.parentCategory}
                        onChange={(e) => set("parentCategory", e.target.value)}
                    >
                        <option value="">No parent (top-level)</option>
                        {parentOptions.map((item) => (
                            <option key={item._id} value={item._id}>
                                {item.name} · Level {item.level}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Sort order">
                    <input
                        className={INPUT}
                        type="number"
                        min="0"
                        value={form.sortOrder}
                        onChange={(e) => set("sortOrder", e.target.value)}
                    />
                </Field>
                <div className="sm:col-span-2">
                    <Field label="Description">
                        <textarea
                            className={INPUT}
                            rows={3}
                            maxLength={500}
                            value={form.description}
                            onChange={(e) => set("description", e.target.value)}
                        />
                    </Field>
                </div>
                <div className="sm:col-span-2">
                    <Field label="Image URL">
                        <input
                            className={INPUT}
                            maxLength={2048}
                            value={form.image}
                            onChange={(e) => set("image", e.target.value)}
                            placeholder="https://..."
                        />
                    </Field>
                </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => set("isActive", e.target.checked)}
                />
                Category is active
            </label>

            <div className="border-t border-slate-100 pt-4">
                <div className="mb-3">
                    <h3 className="font-bold text-slate-900">
                        Specification template
                    </h3>
                    {!canEditSchema && (
                        <p className="mt-1 text-xs text-amber-700">
                            Your account can manage category details but does not have
                            permission to change specification templates.
                        </p>
                    )}
                </div>
                <SpecificationEditor
                    fields={form.specificationTemplate}
                    onChange={(value) => set("specificationTemplate", value)}
                    disabled={!canEditSchema || busy}
                />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600"
                >
                    Cancel
                </button>
                <button
                    disabled={busy}
                    className="rounded-xl bg-[#103B37] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                    {busy ? "Saving..." : "Save category"}
                </button>
            </div>
        </form>
    );
}

export default function AdminCatalog() {
    const { hasPermission } = useAuth();

    const canManageBrands = hasPermission("manage_brands");
    const canManageCategories = hasPermission("manage_categories");
    const canEditSchema = hasPermission("edit_category_schemas");

    const [tab, setTab] = useState(
        canManageBrands ? "brands" : "categories"
    );
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [search, setSearch] = useState("");
    const [brandModal, setBrandModal] = useState(false);
    const [categoryModal, setCategoryModal] = useState(false);

    const canAccess = canManageBrands || canManageCategories;

    const loadCatalog = useCallback(async () => {
        if (!canAccess) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const requests = await Promise.all([
                canManageBrands ? getAdminBrands() : Promise.resolve(null),
                canManageCategories
                    ? getAdminCategories()
                    : Promise.resolve(null),
            ]);

            setBrands(
                Array.isArray(requests[0]?.brands) ? requests[0].brands : []
            );
            setCategories(
                Array.isArray(requests[1]?.categories)
                    ? requests[1].categories
                    : []
            );
        } catch (err) {
            setError(errorText(err, "Unable to load catalog records."));
        } finally {
            setLoading(false);
        }
    }, [canAccess, canManageBrands, canManageCategories]);

    useEffect(() => {
        loadCatalog();
    }, [loadCatalog]);

    const visibleBrands = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return brands;
        return brands.filter((item) =>
            [item.name, item.slug, item.description]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(term))
        );
    }, [brands, search]);

    const visibleCategories = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return categories;
        return categories.filter((item) =>
            [item.name, item.slug, item.description]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(term))
        );
    }, [categories, search]);

    const saveBrand = async (payload) => {
        setBusy(true);
        setError("");
        try {
            if (brandModal?._id) {
                await updateCatalogBrand(brandModal._id, payload);
                setNotice("Brand updated successfully.");
            } else {
                await createCatalogBrand(payload);
                setNotice("Brand created successfully.");
            }
            setBrandModal(null);
            await loadCatalog();
        } catch (err) {
            setError(errorText(err, "Unable to save brand."));
        } finally {
            setBusy(false);
        }
    };

    const saveCategory = async (payload) => {
        setBusy(true);
        setError("");
        try {
            if (categoryModal?._id) {
                await updateCatalogCategory(categoryModal._id, payload);
                setNotice("Category updated successfully.");
            } else {
                await createCatalogCategory(payload);
                setNotice("Category created successfully.");
            }
            setCategoryModal(null);
            await loadCatalog();
        } catch (err) {
            setError(errorText(err, "Unable to save category."));
        } finally {
            setBusy(false);
        }
    };

    const deactivate = async (type, item) => {
        const confirmed = window.confirm(
            `Deactivate "${item.name}"? It will no longer be available for new catalog selections.`
        );
        if (!confirmed) return;

        setBusy(true);
        setError("");
        setNotice("");

        try {
            if (type === "brand") {
                await deactivateCatalogBrand(item._id);
                setNotice("Brand deactivated successfully.");
            } else {
                await deactivateCatalogCategory(item._id);
                setNotice("Category deactivated successfully.");
            }
            await loadCatalog();
        } catch (err) {
            setError(errorText(err, `Unable to deactivate ${type}.`));
        } finally {
            setBusy(false);
        }
    };

    if (!canAccess) {
        return (
            <AdminLayout>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
                    <h1 className="text-xl font-extrabold">Permission required</h1>
                    <p className="mt-2 text-sm">
                        Your administrator account does not have brand or category
                        management permission.
                    </p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-[#83CDB5]">
                            Administration / Catalog
                        </p>
                        <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
                            Catalog Management
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-100/70">
                            Manage product brands, category hierarchy and the technical
                            specification fields used by the seller product workflow.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={loadCatalog}
                        disabled={loading || busy}
                        className="rounded-xl border border-[#83CDB5]/30 bg-[#103B37] px-4 py-2.5 text-sm font-semibold text-[#B9F4E4] hover:bg-[#18554C] disabled:opacity-50"
                    >
                        {loading ? "Refreshing..." : "↻ Refresh"}
                    </button>
                </header>

                <section className="grid gap-4 sm:grid-cols-2">
                    {canManageBrands && (
                        <div className="rounded-2xl bg-white p-5 shadow-sm">
                            <p className="text-sm text-slate-500">Total brands</p>
                            <p className="mt-2 text-3xl font-extrabold text-slate-900">
                                {loading ? "..." : brands.length.toLocaleString()}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {brands.filter((item) => item.isActive).length} active
                            </p>
                        </div>
                    )}
                    {canManageCategories && (
                        <div className="rounded-2xl bg-white p-5 shadow-sm">
                            <p className="text-sm text-slate-500">Total categories</p>
                            <p className="mt-2 text-3xl font-extrabold text-slate-900">
                                {loading ? "..." : categories.length.toLocaleString()}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {categories.filter((item) => item.isActive).length} active
                            </p>
                        </div>
                    )}
                </section>

                {notice && (
                    <div
                        role="status"
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
                    >
                        {notice}
                    </div>
                )}
                {error && (
                    <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                        {error}
                    </div>
                )}

                <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                            {canManageBrands && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTab("brands");
                                        setSearch("");
                                        setNotice("");
                                    }}
                                    className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === "brands"
                                            ? "bg-[#103B37] text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                >
                                    Brands
                                </button>
                            )}
                            {canManageCategories && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTab("categories");
                                        setSearch("");
                                        setNotice("");
                                    }}
                                    className={`rounded-xl px-4 py-2.5 text-sm font-bold ${tab === "categories"
                                            ? "bg-[#103B37] text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                >
                                    Categories & specifications
                                </button>
                            )}
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Search ${tab}...`}
                                className="min-w-0 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    setNotice("");
                                    if (tab === "brands") setBrandModal(null);
                                    else setCategoryModal(null);
                                }}
                                className="rounded-xl bg-[#83CDB5] px-4 py-2.5 text-sm font-extrabold text-[#062729] hover:bg-[#A1DEC9]"
                            >
                                + Add {tab === "brands" ? "brand" : "category"}
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-16 text-center text-sm text-slate-500">
                            Loading catalog records...
                        </div>
                    ) : tab === "brands" ? (
                        <div className="mt-5 overflow-x-auto">
                            <table className="w-full min-w-[720px] text-left">
                                <thead>
                                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                                        <th className="px-3 py-3">Brand</th>
                                        <th className="px-3 py-3">Slug</th>
                                        <th className="px-3 py-3">Flags</th>
                                        <th className="px-3 py-3">Status</th>
                                        <th className="px-3 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {visibleBrands.map((brand) => (
                                        <tr key={brand._id} className="hover:bg-slate-50">
                                            <td className="px-3 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-sm font-bold text-slate-500">
                                                        {brand.logo ? (
                                                            <img
                                                                src={brand.logo}
                                                                alt=""
                                                                className="h-full w-full object-contain"
                                                            />
                                                        ) : (
                                                            brand.name?.slice(0, 1)?.toUpperCase()
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-900">
                                                            {brand.name}
                                                        </p>
                                                        <p className="max-w-xs truncate text-xs text-slate-500">
                                                            {brand.description || "No description"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-4 text-sm text-slate-600">
                                                {brand.slug}
                                            </td>
                                            <td className="px-3 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {brand.isVerified && (
                                                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                                                            Verified
                                                        </span>
                                                    )}
                                                    {brand.isGeneric && (
                                                        <span className="rounded-full bg-violet-50 px-2 py-1 text-xs font-bold text-violet-700">
                                                            Generic
                                                        </span>
                                                    )}
                                                    {!brand.isVerified && !brand.isGeneric && "—"}
                                                </div>
                                            </td>
                                            <td className="px-3 py-4">
                                                <Status active={brand.isActive} />
                                            </td>
                                            <td className="px-3 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => setBrandModal(brand)}
                                                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        Edit
                                                    </button>
                                                    {brand.isActive && (
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => deactivate("brand", brand)}
                                                            className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                                                        >
                                                            Deactivate
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {visibleBrands.length === 0 && (
                                <p className="p-12 text-center text-sm text-slate-500">
                                    No brands match your search.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="mt-5 overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left">
                                <thead>
                                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                                        <th className="px-3 py-3">Category</th>
                                        <th className="px-3 py-3">Hierarchy</th>
                                        <th className="px-3 py-3">Specifications</th>
                                        <th className="px-3 py-3">Status</th>
                                        <th className="px-3 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {visibleCategories.map((category) => (
                                        <tr key={category._id} className="hover:bg-slate-50">
                                            <td className="px-3 py-4">
                                                <p className="font-bold text-slate-900">
                                                    {category.name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {category.slug}
                                                </p>
                                            </td>
                                            <td className="px-3 py-4 text-sm text-slate-600">
                                                <p>Level {category.level || 1}</p>
                                                <p className="text-xs text-slate-400">
                                                    {category.parentCategory?.name || "Top-level"}
                                                </p>
                                            </td>
                                            <td className="px-3 py-4 text-sm text-slate-600">
                                                {category.specificationTemplate?.length || 0} fields
                                            </td>
                                            <td className="px-3 py-4">
                                                <Status active={category.isActive} />
                                            </td>
                                            <td className="px-3 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() => setCategoryModal(category)}
                                                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        Edit
                                                    </button>
                                                    {category.isActive && (
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() => deactivate("category", category)}
                                                            className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                                                        >
                                                            Deactivate
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {visibleCategories.length === 0 && (
                                <p className="p-12 text-center text-sm text-slate-500">
                                    No categories match your search.
                                </p>
                            )}
                        </div>
                    )}
                </section>
            </div>

            {tab === "brands" && brandModal !== undefined && brandModal !== false && (
                <Modal
                    title={brandModal?._id ? "Edit brand" : "Create brand"}
                    onClose={() => setBrandModal(false)}
                >
                    <BrandForm
                        key={brandModal?._id || "new-brand"}
                        initial={brandModal || EMPTY_BRAND}
                        busy={busy}
                        onCancel={() => setBrandModal(false)}
                        onSave={saveBrand}
                    />
                </Modal>
            )}

            {tab === "categories" && categoryModal !== undefined && categoryModal !== false && (
                <Modal
                    title={categoryModal?._id ? "Edit category" : "Create category"}
                    onClose={() => setCategoryModal(false)}
                    wide
                >
                    <CategoryForm
                        key={categoryModal?._id || "new-category"}
                        initial={categoryModal || EMPTY_CATEGORY}
                        categories={categories}
                        canEditSchema={canEditSchema}
                        busy={busy}
                        onCancel={() => setCategoryModal(false)}
                        onSave={saveCategory}
                    />
                </Modal>
            )}
        </AdminLayout>
    );
}
