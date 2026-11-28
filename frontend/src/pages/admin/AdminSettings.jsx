
import { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../context/AuthContext";
import {
  getPlatformSettings,
  updatePlatformSettings,
  getAdminBrands,
} from "../../services/adminService";

const DEFAULT_SETTINGS = {
  commissionRate: 5,
  autoApproveProducts: false,
  codMaxOrderAmount: 50000,
  maxRefusedCodAllowed: 2,
  payoutHoldDays: 7,
  masterBrands: [],
};

const numberInputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

function SettingCard({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function FieldLabel({ children }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {children}
    </label>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
      <span>
        <span className="block text-sm font-bold text-slate-800">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-emerald-700"
      />
    </label>
  );
}

function AdminSettingsContent() {
  const { user, hasPermission } = useAuth();

  const isSuperAdmin =
    user?.role === "admin" && user?.adminRole === "super_admin";

  const canManageSettings = hasPermission("manage_platform_settings");

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = useState(DEFAULT_SETTINGS);
  const [brands, setBrands] = useState([]);
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [brandSearch, setBrandSearch] = useState("");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [settingsResponse, brandsResponse] = await Promise.all([
        getPlatformSettings(),
        getAdminBrands(),
      ]);

      const received = settingsResponse.settings || {};

      const normalized = {
        commissionRate: Number(
          received.defaultCommissionRate ??
          received.commissionRate ??
          5
        ),
        autoApproveProducts: Boolean(received.autoApproveProducts),
        codMaxOrderAmount: Number(received.codMaxOrderAmount ?? 50000),
        maxRefusedCodAllowed: Number(received.maxRefusedCodAllowed ?? 2),
        payoutHoldDays: Number(received.payoutHoldDays ?? 7),
        masterBrands: Array.isArray(received.masterBrands)
          ? received.masterBrands.map((brand) =>
              typeof brand === "string" ? brand : brand._id
            ).filter(Boolean)
          : [],
      };

      const brandList = Array.isArray(brandsResponse.brands)
        ? brandsResponse.brands
        : [];

      setSettings(normalized);
      setInitialSettings(normalized);
      setBrands(brandList);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to load platform settings. Check your Super Admin access."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin && canManageSettings) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [isSuperAdmin, canManageSettings, loadSettings]);

  const updateField = (field, value) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
    setNotice("");
  };

  const toggleMasterBrand = (brandId) => {
    setSettings((current) => {
      const selected = current.masterBrands.includes(brandId);

      return {
        ...current,
        masterBrands: selected
          ? current.masterBrands.filter((id) => id !== brandId)
          : [...current.masterBrands, brandId],
      };
    });

    setNotice("");
  };

  const hasChanges =
    JSON.stringify(settings) !== JSON.stringify(initialSettings);

  const validate = () => {
    if (
      !Number.isFinite(settings.commissionRate) ||
      settings.commissionRate < 0 ||
      settings.commissionRate > 100 ||
      Math.round(settings.commissionRate * 100) !==
        settings.commissionRate * 100
    ) {
      return "Commission rate must be between 0 and 100, with at most two decimal places.";
    }

    if (
      !Number.isSafeInteger(settings.codMaxOrderAmount) ||
      settings.codMaxOrderAmount < 1
    ) {
      return "COD maximum order amount must be a positive whole number.";
    }

    if (
      !Number.isSafeInteger(settings.maxRefusedCodAllowed) ||
      settings.maxRefusedCodAllowed < 1 ||
      settings.maxRefusedCodAllowed > 100
    ) {
      return "Maximum refused COD orders must be between 1 and 100.";
    }

    if (
      !Number.isSafeInteger(settings.payoutHoldDays) ||
      settings.payoutHoldDays < 0 ||
      settings.payoutHoldDays > 365
    ) {
      return "Payout hold days must be between 0 and 365.";
    }

    if (settings.masterBrands.length > 500) {
      return "You can select a maximum of 500 master brands.";
    }

    if (note.trim().length < 3 || note.trim().length > 500) {
      return "An internal note between 3 and 500 characters is required.";
    }

    return "";
  };

  const saveSettings = async (event) => {
    event.preventDefault();

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!hasChanges) {
      setError("No changes have been made.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await updatePlatformSettings({
        ...settings,
        note: note.trim(),
      });

      const received = response.settings || {};

      const normalized = {
        commissionRate: Number(
          received.defaultCommissionRate ??
          received.commissionRate ??
          settings.commissionRate
        ),
        autoApproveProducts: Boolean(received.autoApproveProducts),
        codMaxOrderAmount: Number(received.codMaxOrderAmount),
        maxRefusedCodAllowed: Number(received.maxRefusedCodAllowed),
        payoutHoldDays: Number(received.payoutHoldDays),
        masterBrands: Array.isArray(received.masterBrands)
          ? received.masterBrands.map((brand) =>
              typeof brand === "string" ? brand : brand._id
            ).filter(Boolean)
          : settings.masterBrands,
      };

      setSettings(normalized);
      setInitialSettings(normalized);
      setNote("");
      setNotice(response.message || "Platform settings updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Unable to update platform settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const filteredBrands = brands.filter((brand) =>
    `${brand.name || ""} ${brand.slug || ""}`
      .toLowerCase()
      .includes(brandSearch.toLowerCase())
  );

  if (!isSuperAdmin || !canManageSettings) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-xl font-bold text-amber-900">
          Access restricted
        </h1>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          Only a Super Admin with platform settings permission can access
          global platform configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-[#83CDB5]">
            ADMINISTRATION / CONFIGURATION
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
            Platform Settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#A9C7BD]">
            Configure platform-wide commission, product approval, COD,
            payout hold, and master brand settings.
          </p>
        </div>

        <button
          type="button"
          onClick={loadSettings}
          disabled={loading || saving}
          className="rounded-xl border border-[#83CDB5]/30 px-4 py-2.5 text-sm font-semibold text-[#C5E8DC] hover:bg-white/5 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh settings"}
        </button>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-white p-12 text-center text-sm text-slate-500">
          Loading platform configuration...
        </div>
      ) : (
        <form onSubmit={saveSettings} className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <SettingCard
              title="Commission configuration"
              description="Set the default commission percentage applied by the platform."
            >
              <FieldLabel>
                Default commission rate (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  value={settings.commissionRate}
                  onChange={(event) =>
                    updateField("commissionRate", Number(event.target.value))
                  }
                  className={numberInputClass}
                />
              </FieldLabel>
              <p className="mt-2 text-xs text-slate-500">
                Allowed range: 0–100%. Maximum two decimal places.
              </p>
            </SettingCard>

            <SettingCard
              title="Product approval"
              description="Control whether newly submitted products are automatically approved."
            >
              <Toggle
                checked={settings.autoApproveProducts}
                onChange={(value) => updateField("autoApproveProducts", value)}
                label="Automatically approve products"
                description="When enabled, products can bypass the normal manual product moderation queue."
              />
              <p className="mt-3 text-xs text-amber-700">
                Enabling this changes the platform's product moderation policy.
              </p>
            </SettingCard>

            <SettingCard
              title="Cash on Delivery"
              description="Configure the maximum order amount and refused COD order limit."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldLabel>
                  Maximum COD order amount (BDT)
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={settings.codMaxOrderAmount}
                    onChange={(event) =>
                      updateField("codMaxOrderAmount", Number(event.target.value))
                    }
                    className={numberInputClass}
                  />
                </FieldLabel>

                <FieldLabel>
                  Maximum refused COD orders
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    required
                    value={settings.maxRefusedCodAllowed}
                    onChange={(event) =>
                      updateField("maxRefusedCodAllowed", Number(event.target.value))
                    }
                    className={numberInputClass}
                  />
                </FieldLabel>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                COD maximum must be a positive whole number. Refused order
                limit must be between 1 and 100.
              </p>
            </SettingCard>

            <SettingCard
              title="Seller payout policy"
              description="Set how long seller payouts remain on hold before becoming eligible."
            >
              <FieldLabel>
                Payout hold period (days)
                <input
                  type="number"
                  min="0"
                  max="365"
                  step="1"
                  required
                  value={settings.payoutHoldDays}
                  onChange={(event) =>
                    updateField("payoutHoldDays", Number(event.target.value))
                  }
                  className={numberInputClass}
                />
              </FieldLabel>
              <p className="mt-2 text-xs text-slate-500">
                Allowed range: 0–365 whole days.
              </p>
            </SettingCard>
          </div>

          <SettingCard
            title="Master brands"
            description="Choose which active catalog brands are included in the platform's master brand list."
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-700">
                {settings.masterBrands.length} selected
              </p>
              <input
                type="search"
                value={brandSearch}
                onChange={(event) => setBrandSearch(event.target.value)}
                placeholder="Search brands..."
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-600 sm:max-w-xs"
              />
            </div>

            <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-slate-100">
              {filteredBrands.length === 0 ? (
                <p className="p-5 text-center text-sm text-slate-500">
                  No matching brands found.
                </p>
              ) : (
                filteredBrands.map((brand) => {
                  const selected = settings.masterBrands.includes(brand._id);

                  return (
                    <label
                      key={brand._id}
                      className="flex cursor-pointer items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">
                          {brand.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          {brand.slug}
                        </span>
                      </span>

                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleMasterBrand(brand._id)}
                        className="h-4 w-4 shrink-0 accent-emerald-700"
                      />
                    </label>
                  );
                })
              )}
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Only active brands are offered by the backend. Maximum 500
              unique brand IDs.
            </p>
          </SettingCard>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <h2 className="font-bold text-amber-950">
              Change audit note
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              Every platform settings update requires an internal reason.
              This note is stored with the audit log entry.
            </p>

            <textarea
              required
              minLength={3}
              maxLength={500}
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Explain why these platform settings are being changed..."
              className="mt-4 w-full rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
            <p className="mt-1 text-right text-xs text-amber-800">
              {note.length}/500 characters
            </p>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving || !hasChanges}
              onClick={() => {
                setSettings(initialSettings);
                setNote("");
                setError("");
                setNotice("");
              }}
              className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-40"
            >
              Discard changes
            </button>

            <button
              type="submit"
              disabled={saving || !hasChanges}
              className="rounded-xl bg-[#83CDB5] px-6 py-3 text-sm font-extrabold text-[#062729] transition hover:bg-[#A1DEC9] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving settings..." : "Save platform settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function AdminSettings() {
  return (
    <AdminLayout>
      <AdminSettingsContent />
    </AdminLayout>
  );
}
