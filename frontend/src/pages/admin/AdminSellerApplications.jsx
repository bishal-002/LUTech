
import { useCallback, useEffect, useMemo, useState } from "react";

import AdminLayout from "../../components/admin/AdminLayout";
import { useAuth } from "../../context/AuthContext";

import {
  getSellerKycQueue,
  getSellerKycDetails,
  downloadSellerKycDocument,
  approveSellerApplication,
  rejectSellerApplication,
} from "../../services/adminService";

const SELLER_TYPES = [
  { value: "standard_seller", label: "Standard Seller" },
  { value: "official_brand", label: "Official Brand" },
  { value: "authorized_reseller", label: "Authorized Reseller" },
  { value: "verified_shop", label: "Verified Shop" },
  { value: "individual_seller", label: "Individual Seller" },
];

const DOCUMENTS = [
  {
    type: "nid_front",
    label: "NID / Passport — Front",
    field: "front",
  },
  {
    type: "nid_back",
    label: "NID / Passport — Back",
    field: "back",
  },
  {
    type: "trade_license",
    label: "Trade License",
  },
  {
    type: "authorization",
    label: "Brand Authorization",
  },
];

function formatDate(date, includeTime = false) {
  if (!date) return "Not available";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Not available";

  return parsed.toLocaleString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? { hour: "numeric", minute: "2-digit" }
      : {}),
  });
}

function labelize(value) {
  if (!value) return "Not provided";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-base font-bold text-slate-900">
        {title}
      </h3>
      {children}
    </section>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium leading-6 text-slate-800">
        {value === null || value === undefined || value === ""
          ? "Not provided"
          : String(value)}
      </p>
    </div>
  );
}

function StatusPill({ children, variant = "neutral" }) {
  const styles = {
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
    info: "bg-blue-100 text-blue-800",
    neutral: "bg-slate-100 text-slate-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${styles[variant]}`}
    >
      {children}
    </span>
  );
}

function DocumentCard({
  sellerId,
  document,
  canViewDocuments,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const openDocument = async () => {
    if (!canViewDocuments || !document?.uploaded) return;

    let objectUrl;

    try {
      setLoading(true);
      setError("");

      const response = await downloadSellerKycDocument(
        sellerId,
        document.type
      );

      const blob = new Blob([response.data], {
        type:
          response.headers?.["content-type"] ||
          document.mimeType ||
          "application/octet-stream",
      });

      objectUrl = URL.createObjectURL(blob);

      const link = document.mimeType?.startsWith("image/")
        ? objectUrl
        : objectUrl;

      const anchor = window.document.createElement("a");
      anchor.href = link;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";

      if (
        !document.mimeType?.startsWith("image/") &&
        document.mimeType !== "application/pdf"
      ) {
        anchor.download = document.originalName || "kyc-document";
      }

      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }, 60000);
    } catch (err) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);

      setError(
        getErrorMessage(err, "Unable to open this document.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">
            {document.label}
          </p>

          {document.uploaded ? (
            <>
              <p className="mt-1 break-all text-xs text-slate-500">
                {document.originalName || "Uploaded document"}
              </p>

              <p className="mt-1 text-xs text-slate-400">
                {document.mimeType || "Unknown format"}
                {" · "}
                {document.sizeBytes
                  ? `${(document.sizeBytes / 1024).toFixed(1)} KB`
                  : "Size unavailable"}
                {" · "}
                Uploaded {formatDate(document.uploadedAt)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs text-red-600">
              Document not uploaded
            </p>
          )}

          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}
        </div>

        <button
          type="button"
          onClick={openDocument}
          disabled={
            !document.uploaded ||
            !canViewDocuments ||
            loading
          }
          className="shrink-0 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading
            ? "Opening..."
            : document.uploaded
              ? "View document ↗"
              : "Unavailable"}
        </button>
      </div>
    </div>
  );
}

function SellerReviewPanel({
  sellerId,
  onClose,
  onCompleted,
  canViewKyc,
  canViewDocuments,
  canApprove,
  canReject,
}) {
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [processing, setProcessing] = useState(false);

  const [selectedSellerType, setSelectedSellerType] =
    useState("standard_seller");

  const [reviewNote, setReviewNote] = useState("");

  const fetchDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getSellerKycDetails(sellerId);

      setSeller(response.seller || null);

      if (response.seller?.kyc?.requestedSellerType) {
        setSelectedSellerType(
          response.seller.kyc.requestedSellerType
        );
      }
    } catch (err) {
      setError(
        getErrorMessage(err, "Unable to load seller KYC details.")
      );
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleApprove = async () => {
    if (!seller) return;

    if (!canApprove) {
      setActionError("You do not have permission to approve sellers.");
      return;
    }

    if (!seller.isEmailVerified) {
      setActionError("The applicant's email must be verified.");
      return;
    }

    if (!seller.isComplete) {
      setActionError(
        "This application has incomplete or invalid KYC information."
      );
      return;
    }

    const confirmed = window.confirm(
      `Approve ${seller.name || "this applicant"} as ${labelize(selectedSellerType)}?`
    );

    if (!confirmed) return;

    try {
      setProcessing(true);
      setActionError("");
      setActionMessage("");

      const response = await approveSellerApplication(
        sellerId,
        selectedSellerType
      );

      setActionMessage(
        response.message || "Seller approved successfully."
      );

      onCompleted(response.message || "Seller approved successfully.");
    } catch (err) {
      const message = getErrorMessage(
        err,
        "Unable to approve seller."
      );

      const validationErrors = err?.response?.data?.errors;

      setActionError(
        [
          message,
          ...(Array.isArray(validationErrors)
            ? validationErrors
            : []),
        ].join(" ")
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!canReject) {
      setActionError("You do not have permission to reject sellers.");
      return;
    }

    const note = reviewNote.trim();

    if (!note) {
      setActionError("Enter a rejection reason before continuing.");
      return;
    }

    if (note.length > 500) {
      setActionError("Rejection reason cannot exceed 500 characters.");
      return;
    }

    const confirmed = window.confirm(
      `Reject the seller application from ${seller?.name || "this applicant"}?`
    );

    if (!confirmed) return;

    try {
      setProcessing(true);
      setActionError("");
      setActionMessage("");

      const response = await rejectSellerApplication(
        sellerId,
        note
      );

      setActionMessage(
        response.message || "Seller application rejected."
      );

      onCompleted(response.message || "Seller application rejected.");
    } catch (err) {
      setActionError(
        getErrorMessage(err, "Unable to reject seller application.")
      );
    } finally {
      setProcessing(false);
    }
  };

  const kyc = seller?.kyc;
  const store = seller?.store;
  const warehouse = kyc?.warehouseAddress;

  const documents = [
    {
      type: "nid_front",
      label: "NID / Passport — Front",
      ...kyc?.nidDocuments?.front,
    },
    {
      type: "nid_back",
      label: "NID / Passport — Back",
      ...kyc?.nidDocuments?.back,
    },
    {
      type: "trade_license",
      label: "Trade License",
      ...kyc?.tradeLicenseDocument,
    },
    {
      type: "authorization",
      label: "Brand Authorization",
      ...kyc?.authorizationDocument,
    },
  ];

  if (!canViewKyc) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Permission required
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Your account does not have permission to view private seller KYC information.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-3 sm:p-6">
      <div className="mx-auto my-4 w-full max-w-5xl overflow-hidden rounded-2xl bg-slate-50 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#092F30] px-5 py-4 text-white sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#83CDB5]">
              Seller verification
            </p>
            <h2 className="mt-1 text-lg font-bold sm:text-xl">
              KYC Application Review
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close seller review"
            className="rounded-lg px-3 py-2 text-xl text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="p-16 text-center text-sm text-slate-500">
            Loading private KYC information...
          </div>
        ) : error ? (
          <div className="p-8">
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
            <button
              type="button"
              onClick={fetchDetails}
              className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        ) : !seller ? (
          <div className="p-10 text-center text-slate-500">
            Seller information is unavailable.
          </div>
        ) : (
          <div className="space-y-5 p-4 sm:p-6">
            {/* Applicant summary */}
            <Section title="Applicant Information">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {seller.name || "Unnamed applicant"}
                  </h3>
                  <p className="mt-1 break-all text-sm text-slate-500">
                    {seller.email}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusPill variant="warning">
                      {labelize(seller.verificationStatus)}
                    </StatusPill>
                    <StatusPill
                      variant={seller.isEmailVerified ? "success" : "danger"}
                    >
                      {seller.isEmailVerified
                        ? "Email verified"
                        : "Email not verified"}
                    </StatusPill>
                    <StatusPill
                      variant={seller.isComplete ? "success" : "danger"}
                    >
                      {seller.isComplete
                        ? "KYC complete"
                        : "KYC incomplete"}
                    </StatusPill>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase text-slate-400">
                    Submitted
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {formatDate(seller.review?.submittedAt, true)}
                  </p>
                </div>
              </div>
            </Section>

            {/* Store */}
            <Section title="Store Information">
              <div className="grid gap-5 sm:grid-cols-2">
                <DetailItem label="Store name" value={store?.storeName} />
                <DetailItem label="Store phone" value={store?.storePhone} />
                <DetailItem label="Store address" value={store?.storeAddress} />
                <DetailItem
                  label="Business type"
                  value={labelize(kyc?.businessType)}
                />
              </div>

              {store?.storeDescription && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <DetailItem
                    label="Store description"
                    value={store.storeDescription}
                  />
                </div>
              )}
            </Section>

            {/* Owner */}
            <Section title="Business Owner & Identity">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Legal owner name" value={kyc?.ownerName} />
                <DetailItem label="Owner phone" value={kyc?.ownerPhone} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Phone verification
                  </p>
                  <div className="mt-2">
                    <StatusPill
                      variant={kyc?.ownerPhoneVerified ? "success" : "danger"}
                    >
                      {kyc?.ownerPhoneVerified ? "Verified" : "Not verified"}
                    </StatusPill>
                  </div>
                </div>
                <DetailItem label="NID / Passport number" value={kyc?.nidNumber} />
                <DetailItem
                  label="Legal business name"
                  value={kyc?.legalBusinessName}
                />
                <DetailItem
                  label="Requested seller tier"
                  value={labelize(kyc?.requestedSellerType)}
                />
                <DetailItem
                  label="Trade license number"
                  value={kyc?.tradeLicenseNumber}
                />
                <DetailItem label="TIN" value={kyc?.tinNumber} />
                <DetailItem label="BIN" value={kyc?.binNumber} />
              </div>
            </Section>

            {/* Warehouse */}
            <Section title="Private Warehouse / Pickup Address">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Street" value={warehouse?.street} />
                <DetailItem label="City" value={warehouse?.city} />
                <DetailItem label="District" value={warehouse?.district} />
                <DetailItem label="Postal code" value={warehouse?.postalCode} />
                <DetailItem
                  label="Contact person"
                  value={warehouse?.contactPerson}
                />
                <DetailItem label="Contact phone" value={warehouse?.phone} />
              </div>
            </Section>

            {/* Documents */}
            <Section title="Private Verification Documents">
              <p className="mb-4 text-sm leading-6 text-slate-500">
                Documents are retrieved through the authenticated admin endpoint.
                They are not served from public upload URLs.
              </p>

              <div className="grid gap-3 md:grid-cols-2">
                {documents.map((document) => (
                  <DocumentCard
                    key={document.type}
                    sellerId={sellerId}
                    document={document}
                    canViewDocuments={canViewDocuments}
                  />
                ))}
              </div>

              {!canViewDocuments && (
                <p className="mt-3 text-xs text-amber-700">
                  Your account can see the application but does not have permission to access private documents.
                </p>
              )}
            </Section>

            {/* Validation */}
            <Section title="KYC Validation">
              {seller.validationErrors?.length ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-bold text-amber-900">
                    The backend reports the following validation issues:
                  </p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-amber-800">
                    {seller.validationErrors.map((item, index) => (
                      <li key={`${index}-${item}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                  All backend KYC validation checks passed.
                </div>
              )}
            </Section>

            {/* Review history */}
            <Section title="Review Information">
              <div className="grid gap-5 sm:grid-cols-2">
                <DetailItem
                  label="Previous review date"
                  value={formatDate(seller.review?.reviewedAt, true)}
                />
                <DetailItem
                  label="Previous seller-visible note"
                  value={seller.review?.sellerVisibleNote}
                />
                <DetailItem
                  label="Internal admin note"
                  value={seller.review?.internalNote}
                />
              </div>
            </Section>

            {/* Decision */}
            <Section title="Administrator Decision">
              {actionMessage && (
                <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  {actionMessage}
                </div>
              )}

              {actionError && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {actionError}
                </div>
              )}

              {canApprove && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <label className="block text-sm font-bold text-slate-800">
                    Approved seller type
                  </label>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    The applicant's requested tier is not automatically trusted.
                    Choose the actual seller type to assign.
                  </p>

                  <select
                    value={selectedSellerType}
                    onChange={(event) =>
                      setSelectedSellerType(event.target.value)
                    }
                    disabled={processing}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:max-w-md"
                  >
                    {SELLER_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={
                      processing ||
                      !seller.isComplete ||
                      !seller.isEmailVerified
                    }
                    className="mt-4 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {processing ? "Processing..." : "Approve Seller"}
                  </button>
                </div>
              )}

              {canReject && (
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50/50 p-4">
                  <label
                    htmlFor="seller-rejection-reason"
                    className="block text-sm font-bold text-slate-800"
                  >
                    Rejection reason
                  </label>

                  <p className="mt-1 text-xs text-slate-500">
                    This reason is saved as the seller-visible review note.
                    Maximum 500 characters.
                  </p>

                  <textarea
                    id="seller-rejection-reason"
                    rows={4}
                    maxLength={500}
                    value={reviewNote}
                    onChange={(event) =>
                      setReviewNote(event.target.value)
                    }
                    disabled={processing}
                    placeholder="Explain why this seller application is being rejected..."
                    className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                  />

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {reviewNote.length}/500 characters
                    </span>

                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={processing || !reviewNote.trim()}
                      className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {processing ? "Processing..." : "Reject Application"}
                    </button>
                  </div>
                </div>
              )}

              {!canApprove && !canReject && (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  Your administrator account can review this application but cannot approve or reject it.
                </p>
              )}
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminSellerApplications() {
  const {
    hasPermission,
  } = useAuth();

  const canViewQueue = hasPermission("view_seller_applications");
  const canViewKyc = hasPermission("view_seller_kyc");
  const canViewDocuments = canViewKyc;
  const canApprove = hasPermission("approve_sellers");
  const canReject = hasPermission("reject_sellers");

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const [search, setSearch] = useState("");
  const [businessFilter, setBusinessFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");

  const [selectedSellerId, setSelectedSellerId] = useState(null);

  const fetchApplications = useCallback(async () => {
    if (!canViewQueue) {
      setLoading(false);
      setError("You do not have permission to view seller applications.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await getSellerKycQueue();

      setApplications(
        Array.isArray(response.applicants)
          ? response.applicants
          : []
      );
    } catch (err) {
      setError(
        getErrorMessage(err, "Failed to load seller KYC queue.")
      );
    } finally {
      setLoading(false);
    }
  }, [canViewQueue]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return applications.filter((applicant) => {
      const matchesSearch =
        !query ||
        [
          applicant.name,
          applicant.email,
          applicant.storeName,
          applicant._id,
        ].some((value) =>
          String(value || "").toLowerCase().includes(query)
        );

      const matchesBusiness =
        businessFilter === "all" ||
        applicant.businessType === businessFilter;

      const matchesTier =
        tierFilter === "all" ||
        applicant.requestedSellerType === tierFilter;

      return matchesSearch && matchesBusiness && matchesTier;
    });
  }, [applications, search, businessFilter, tierFilter]);

  const handleCompleted = (message) => {
    setSelectedSellerId(null);
    setActionMessage(message);
    fetchApplications();
  };

  const verifiedCount = applications.filter(
    (item) => item.isEmailVerified
  ).length;

  const businessCount = applications.filter(
    (item) => item.businessType !== "individual"
  ).length;

  if (!canViewQueue) {
    return (
      <AdminLayout>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-xl font-bold">
            Permission required
          </h1>
          <p className="mt-2 text-sm">
            Your administrator account does not have permission to view the seller application queue.
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#83CDB5]">
              Administration / Seller Management
            </p>

            <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-3xl">
              Seller KYC Verification
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-teal-100/70">
              Review seller identity, business information and private verification
              documents before approving or rejecting applications.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchApplications}
            disabled={loading}
            className="rounded-xl border border-[#83CDB5]/30 bg-[#103B37] px-4 py-2.5 text-sm font-semibold text-[#B9F4E4] transition hover:bg-[#18554C] disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "↻ Refresh queue"}
          </button>
        </section>

        {/* Summary */}
        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Pending KYC Applications
            </p>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">
              {loading ? "..." : applications.length.toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Submitted applications awaiting review
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Email Verified
            </p>
            <p className="mt-3 text-3xl font-extrabold text-emerald-700">
              {loading ? "..." : verifiedCount.toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Applicants with verified email addresses
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Business Applicants
            </p>
            <p className="mt-3 text-3xl font-extrabold text-blue-700">
              {loading ? "..." : businessCount.toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Retail shop and company applications
            </p>
          </div>
        </section>

        {actionMessage && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {actionMessage}
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

        {/* Filters */}
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="seller-search"
                className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
              >
                Search applications
              </label>
              <input
                id="seller-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, store or applicant ID..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div className="w-full lg:w-52">
              <label
                htmlFor="business-filter"
                className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
              >
                Business type
              </label>
              <select
                id="business-filter"
                value={businessFilter}
                onChange={(event) => setBusinessFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-emerald-500"
              >
                <option value="all">All business types</option>
                <option value="individual">Individual</option>
                <option value="retail_shop">Retail shop</option>
                <option value="company">Company</option>
              </select>
            </div>

            <div className="w-full lg:w-56">
              <label
                htmlFor="tier-filter"
                className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500"
              >
                Requested seller tier
              </label>
              <select
                id="tier-filter"
                value={tierFilter}
                onChange={(event) => setTierFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none focus:border-emerald-500"
              >
                <option value="all">All requested tiers</option>
                {SELLER_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              Showing {filteredApplications.length} of {applications.length} applications
            </span>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setBusinessFilter("all");
                setTierFilter("all");
              }}
              className="font-semibold text-emerald-700 hover:underline"
            >
              Clear filters
            </button>
          </div>
        </section>

        {/* Queue */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Applications to Review
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Open an application to inspect its KYC details and documents.
              </p>
            </div>

            <StatusPill variant="warning">
              {filteredApplications.length} awaiting review
            </StatusPill>
          </div>

          {loading ? (
            <div className="p-14 text-center text-sm text-slate-500">
              Loading seller applications...
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700">
                ✓
              </div>
              <h3 className="mt-4 font-bold text-slate-900">
                {applications.length === 0
                  ? "No pending KYC applications"
                  : "No matching applications"}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {applications.length === 0
                  ? "New submitted seller applications will appear here."
                  : "Try changing your search or filters."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredApplications.map((applicant) => (
                <article
                  key={applicant._id}
                  className="p-5 transition hover:bg-slate-50/70 sm:p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">
                          {applicant.name || "Unnamed applicant"}
                        </h3>
                        <StatusPill variant="warning">
                          Pending review
                        </StatusPill>
                        <StatusPill
                          variant={
                            applicant.isEmailVerified ? "success" : "danger"
                          }
                        >
                          {applicant.isEmailVerified
                            ? "Email verified"
                            : "Email unverified"}
                        </StatusPill>
                      </div>

                      <p className="mt-1 break-all text-sm text-slate-500">
                        {applicant.email}
                      </p>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <DetailItem
                          label="Store"
                          value={applicant.storeName}
                        />
                        <DetailItem
                          label="Business type"
                          value={labelize(applicant.businessType)}
                        />
                        <DetailItem
                          label="Requested tier"
                          value={labelize(applicant.requestedSellerType)}
                        />
                        <DetailItem
                          label="Submitted"
                          value={formatDate(applicant.submittedAt)}
                        />
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                      <button
                        type="button"
                        onClick={() => {
                          setActionMessage("");
                          setSelectedSellerId(applicant._id);
                        }}
                        className="rounded-xl bg-[#103B37] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#18554C]"
                      >
                        Review KYC →
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs leading-5 text-teal-100/50">
          Private seller information and KYC documents are accessible only through
          authenticated administrator endpoints. All approval and rejection
          decisions are validated and recorded by the backend.
        </p>
      </div>

      {selectedSellerId && (
        <SellerReviewPanel
          sellerId={selectedSellerId}
          onClose={() => setSelectedSellerId(null)}
          onCompleted={handleCompleted}
          canViewKyc={canViewKyc}
          canViewDocuments={canViewDocuments}
          canApprove={canApprove}
          canReject={canReject}
        />
      )}
    </AdminLayout>
  );
}

export default AdminSellerApplications;
