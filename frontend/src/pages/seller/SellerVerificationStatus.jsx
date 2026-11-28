
import { useCallback, useEffect, useState } from "react";
import {
  getSellerKyc,
  saveSellerKycDraft,
  uploadSellerKycDocument,
  deleteSellerKycDocument,
  downloadSellerKycDocument,
  sendSellerPhoneOtp,
  verifySellerPhoneOtp,
  submitSellerKyc,
} from "../../services/sellerService";

const initialKyc = {
  businessType: "individual",
  requestedSellerType: "standard_seller",
  ownerName: "",
  ownerPhone: "",
  ownerPhoneVerified: false,
  nidNumber: "",
  legalBusinessName: "",
  tradeLicenseNumber: "",
  tinNumber: "",
  binNumber: "",
  nidDocuments: {
    front: null,
    back: null,
  },
  tradeLicenseDocument: null,
  authorizationDocument: null,
  warehouseAddress: {
    street: "",
    city: "",
    district: "",
    postalCode: "",
    contactPerson: "",
    phone: "",
  },
};

const documentLabels = {
  nid_front: "NID / Passport — Front",
  nid_back: "NID / Passport — Back",
  trade_license: "Trade License",
  authorization: "Brand Authorization Letter",
};

const statusLabels = {
  not_submitted: "Not submitted",
  pending_review: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

function Field({ label, value, onChange, required, type = "text", placeholder }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#25483E]">
        {label} {required && <span className="text-rose-600">*</span>}
      </span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder || ""}
        className="w-full rounded-xl border border-[#DCE7DF] bg-white px-4 py-3 text-sm text-[#173D36] outline-none transition focus:border-[#278263] focus:ring-2 focus:ring-[#278263]/10"
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#25483E]">
        {label} <span className="text-rose-600">*</span>
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#DCE7DF] bg-white px-4 py-3 text-sm text-[#173D36] outline-none focus:border-[#278263] focus:ring-2 focus:ring-[#278263]/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-[#E4ECE6] bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[#173D36]">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-6 text-[#7C8D83]">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function SellerVerificationStatus() {
  const [kyc, setKyc] = useState(initialKyc);
  const [verificationStatus, setVerificationStatus] = useState("not_submitted");
  const [sellerStatus, setSellerStatus] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [documents, setDocuments] = useState({
    nid_front: null,
    nid_back: null,
    trade_license: null,
    authorization: null,
  });

  const isSubmitted = verificationStatus === "pending_review";
  const isApproved = sellerStatus === "approved";
  const isEditable = !isApproved && sellerStatus !== "suspended";

  const loadKyc = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getSellerKyc();
      const data = response.kyc || {};

      setKyc({
        ...initialKyc,
        ...data,
        nidDocuments: {
          ...initialKyc.nidDocuments,
          ...(data.nidDocuments || {}),
        },
        warehouseAddress: {
          ...initialKyc.warehouseAddress,
          ...(data.warehouseAddress || {}),
        },
      });

      setDocuments({
        nid_front: data.nidDocuments?.front || null,
        nid_back: data.nidDocuments?.back || null,
        trade_license: data.tradeLicenseDocument || null,
        authorization: data.authorizationDocument || null,
      });

      setVerificationStatus(
        response.verificationStatus || "not_submitted"
      );
      setSellerStatus(response.sellerStatus || "");
      setReviewNote(response.reviewNote || "");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load your verification information."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKyc();
  }, [loadKyc]);

  const updateField = (field, value) => {
    setKyc((current) => ({ ...current, [field]: value }));
  };

  const updateWarehouse = (field, value) => {
    setKyc((current) => ({
      ...current,
      warehouseAddress: {
        ...current.warehouseAddress,
        [field]: value,
      },
    }));
  };

  const saveDraft = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        kyc: {
          businessType: kyc.businessType,
          requestedSellerType: kyc.requestedSellerType,
          ownerName: kyc.ownerName,
          ownerPhone: kyc.ownerPhone,
          nidNumber: kyc.nidNumber,
          legalBusinessName: kyc.legalBusinessName,
          tradeLicenseNumber: kyc.tradeLicenseNumber,
          tinNumber: kyc.tinNumber,
          binNumber: kyc.binNumber,
        },
        warehouseAddress: kyc.warehouseAddress,
      };

      const response = await saveSellerKycDraft(payload);

      if (response.kyc) {
        setKyc((current) => ({
          ...current,
          ...response.kyc,
          warehouseAddress: {
            ...current.warehouseAddress,
            ...(response.kyc.warehouseAddress || {}),
          },
        }));
      }

      setVerificationStatus(response.verificationStatus || "not_submitted");
      setSuccess("Your KYC draft has been saved.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to save your KYC draft."
      );
    } finally {
      setSaving(false);
    }
  };

  const uploadDocument = async (documentType, file) => {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG, and PDF files are accepted.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Each document must be 5 MB or smaller.");
      return;
    }

    setUploading(documentType);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("documentType", documentType);
      formData.append("document", file);

      await uploadSellerKycDocument(formData);

      setSuccess(`${documentLabels[documentType]} uploaded successfully.`);
      await loadKyc();
    } catch (err) {
      setError(
        err.response?.data?.message || "Document upload failed."
      );
    } finally {
      setUploading("");
    }
  };

  const removeDocument = async (documentType) => {
    if (!window.confirm(`Remove ${documentLabels[documentType]}?`)) return;

    setError("");
    setSuccess("");

    try {
      await deleteSellerKycDocument(documentType);
      setSuccess("Document removed.");
      await loadKyc();
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to remove the document."
      );
    }
  };

  const downloadDocument = async (documentType) => {
    setError("");

    try {
      const blob = await downloadSellerKycDocument(documentType);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = documents[documentType]?.originalName ||
        `${documentType}-document`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to download this document."
      );
    }
  };

  const sendOtp = async () => {
    setSendingOtp(true);
    setError("");
    setSuccess("");

    try {
      const response = await sendSellerPhoneOtp();
      setSuccess(response.message || "OTP sent to your owner phone.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to send phone OTP."
      );
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the six-digit OTP.");
      return;
    }

    setVerifyingOtp(true);
    setError("");
    setSuccess("");

    try {
      const response = await verifySellerPhoneOtp(otp);
      setKyc((current) => ({
        ...current,
        ownerPhoneVerified: true,
      }));
      setOtp("");
      setSuccess(response.message || "Owner phone verified successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message || "Phone verification failed."
      );
    } finally {
      setVerifyingOtp(false);
    }
  };

  const submitKyc = async () => {
    setError("");
    setSuccess("");

    const confirmed = window.confirm(
      "Submit your seller KYC for administrator review? You should check all information and documents before continuing."
    );

    if (!confirmed) return;

    setSubmitting(true);

    try {
      const response = await submitSellerKyc();

      setVerificationStatus(response.verificationStatus || "pending_review");
      setSellerStatus(response.sellerStatus || "pending");
      setSuccess(response.message || "KYC submitted for review.");
      await loadKyc();
    } catch (err) {
      const data = err.response?.data;
      const messages = Array.isArray(data?.errors)
        ? data.errors.join(" ")
        : data?.message;

      setError(messages || "Unable to submit your KYC.");
    } finally {
      setSubmitting(false);
    }
  };

  const uploadCard = (documentType) => {
    const document = documents[documentType];

    return (
      <div className="rounded-xl border border-[#E4ECE6] bg-[#FAFCFA] p-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#25483E]">
              {documentLabels[documentType]}
            </p>
            {document?.uploaded ? (
              <p className="mt-1 truncate text-xs text-emerald-700">
                Uploaded: {document.originalName}
              </p>
            ) : (
              <p className="mt-1 text-xs text-[#8A9990]">
                No document uploaded
              </p>
            )}
          </div>

          {document?.uploaded && (
            <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              Uploaded
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className={`cursor-pointer rounded-lg px-3 py-2 text-xs font-bold ${
            uploading === documentType
              ? "bg-slate-200 text-slate-500"
              : "bg-[#1D7055] text-white hover:bg-[#185B46]"
          }`}>
            {uploading === documentType ? "Uploading..." : "Choose file"}
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              className="hidden"
              disabled={!isEditable || uploading === documentType}
              onChange={(event) => {
                uploadDocument(documentType, event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>

          {document?.uploaded && (
            <>
              <button
                type="button"
                onClick={() => downloadDocument(documentType)}
                className="rounded-lg border border-[#DCE7DF] px-3 py-2 text-xs font-bold text-[#315B4D] hover:bg-white"
              >
                Download
              </button>
              {isEditable && (
                <button
                  type="button"
                  onClick={() => removeDocument(documentType)}
                  className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
                >
                  Remove
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-[#315B53] border-t-[#83CDB5]" />
          <p className="mt-4 text-sm text-[#B5C9C1]">
            Loading verification information...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <header className="rounded-3xl border border-[#315B53] bg-gradient-to-br from-[#17483F] to-[#0B302E] p-6 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#83CDB5]">
          Seller onboarding
        </p>
        <h1 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">
          KYC & Verification
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#B5C9C1]">
          Complete your business information and upload the required
          documents to submit your seller account for verification.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white">
            Seller status: {sellerStatus || "Applicant"}
          </span>
          <span className="rounded-full border border-[#83CDB5]/30 bg-[#83CDB5]/10 px-4 py-2 text-xs font-bold text-[#A6E4CD]">
            Verification: {statusLabels[verificationStatus] || verificationStatus}
          </span>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-800">
          {error}
        </div>
      )}

      {success && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {reviewNote && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-900">Administrator review note</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-800">
            {reviewNote}
          </p>
        </div>
      )}

      {isApproved ? (
        <Section
          title="Seller verification approved"
          description="Your seller account has been approved."
        >
          <p className="text-sm leading-6 text-[#52665B]">
            Your KYC onboarding is complete. You can access your approved
            seller workspace.
          </p>
          <a
            href="/seller/home"
            className="mt-5 inline-flex rounded-xl bg-[#1D7055] px-5 py-3 text-sm font-bold text-white"
          >
            Go to Seller Workspace
          </a>
        </Section>
      ) : (
        <>
          {isSubmitted && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
              <h2 className="font-bold text-sky-900">Application under review</h2>
              <p className="mt-2 text-sm leading-6 text-sky-800">
                Your KYC has been submitted. The administrator is reviewing
                your information. If changes are requested, follow the review
                note shown above.
              </p>
            </div>
          )}

          <Section
            title="1. Business and seller information"
            description="Select the business type and seller category you are applying for."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField
                label="Business type"
                value={kyc.businessType}
                onChange={(value) => updateField("businessType", value)}
                options={[
                  { value: "individual", label: "Individual" },
                  { value: "retail_shop", label: "Retail shop" },
                  { value: "company", label: "Company" },
                ]}
              />

              <SelectField
                label="Requested seller type"
                value={kyc.requestedSellerType}
                onChange={(value) => updateField("requestedSellerType", value)}
                options={[
                  { value: "standard_seller", label: "Standard seller" },
                  { value: "individual_seller", label: "Individual seller" },
                  { value: "verified_shop", label: "Verified shop" },
                  { value: "official_brand", label: "Official brand" },
                  { value: "authorized_reseller", label: "Authorized reseller" },
                ]}
              />

              {kyc.businessType !== "individual" && (
                <Field
                  label="Legal business name"
                  required
                  value={kyc.legalBusinessName}
                  onChange={(value) => updateField("legalBusinessName", value)}
                  placeholder="Registered business name"
                />
              )}

              <Field
                label="Trade license number"
                value={kyc.tradeLicenseNumber}
                onChange={(value) => updateField("tradeLicenseNumber", value)}
                placeholder="Enter trade license number if applicable"
              />

              <Field
                label="TIN (optional)"
                value={kyc.tinNumber}
                onChange={(value) => updateField("tinNumber", value)}
              />

              <Field
                label="BIN (optional)"
                value={kyc.binNumber}
                onChange={(value) => updateField("binNumber", value)}
              />
            </div>
          </Section>

          <Section
            title="2. Owner identity"
            description="Enter the legal identity details of the person responsible for this seller account."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Owner's full legal name"
                required
                value={kyc.ownerName}
                onChange={(value) => updateField("ownerName", value)}
                placeholder="Name as shown on NID or passport"
              />

              <Field
                label="NID or passport number"
                required
                value={kyc.nidNumber}
                onChange={(value) => updateField("nidNumber", value)}
                placeholder="Enter NID or passport number"
              />

              <div className="sm:col-span-2">
                <Field
                  label="Owner's Bangladesh mobile number"
                  required
                  value={kyc.ownerPhone}
                  onChange={(value) => {
                    updateField("ownerPhone", value);
                    updateField("ownerPhoneVerified", false);
                  }}
                  placeholder="01XXXXXXXXX"
                />

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {kyc.ownerPhoneVerified ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800">
                      Phone verified
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={!isEditable || sendingOtp || !kyc.ownerPhone}
                        onClick={sendOtp}
                        className="rounded-lg bg-[#1D7055] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {sendingOtp ? "Sending..." : "Send OTP"}
                      </button>
                      <input
                        value={otp}
                        onChange={(event) =>
                          setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        placeholder="6-digit OTP"
                        inputMode="numeric"
                        className="w-36 rounded-lg border border-[#DCE7DF] px-3 py-2.5 text-sm outline-none focus:border-[#278263]"
                      />
                      <button
                        type="button"
                        disabled={!isEditable || verifyingOtp || otp.length !== 6}
                        onClick={verifyOtp}
                        className="rounded-lg border border-[#1D7055] px-4 py-2.5 text-xs font-bold text-[#1D7055] disabled:opacity-50"
                      >
                        {verifyingOtp ? "Verifying..." : "Verify OTP"}
                      </button>
                    </>
                  )}
                </div>
                <p className="mt-2 text-xs text-[#87968D]">
                  Save your phone number first. The OTP is valid for five
                  minutes; resend limits are enforced by the server.
                </p>
              </div>
            </div>
          </Section>

          <Section
            title="3. Identity and business documents"
            description="Upload clear, readable documents. Maximum file size is 5 MB per document."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {uploadCard("nid_front")}
              {uploadCard("nid_back")}
            </div>

            {kyc.requestedSellerType === "verified_shop" && (
              <div className="mt-4">
                {uploadCard("trade_license")}
              </div>
            )}

            {["official_brand", "authorized_reseller"].includes(
              kyc.requestedSellerType
            ) && (
              <div className="mt-4">
                {uploadCard("authorization")}
              </div>
            )}

            {kyc.requestedSellerType !== "verified_shop" &&
              kyc.tradeLicenseNumber && (
                <div className="mt-4">
                  {uploadCard("trade_license")}
                </div>
              )}

            <p className="mt-4 text-xs leading-5 text-[#87968D]">
              NID documents accept JPG, PNG, or PDF. Trade license accepts
              PDF or JPG. Brand authorization accepts PDF only.
            </p>
          </Section>

          <Section
            title="4. Warehouse and return contact address"
            description="Provide the address from which orders will be dispatched and where seller-related contact can be made."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  label="Street address"
                  required
                  value={kyc.warehouseAddress.street}
                  onChange={(value) => updateWarehouse("street", value)}
                  placeholder="House, road, area"
                />
              </div>

              <Field
                label="City"
                value={kyc.warehouseAddress.city}
                onChange={(value) => updateWarehouse("city", value)}
              />

              <Field
                label="District"
                value={kyc.warehouseAddress.district}
                onChange={(value) => updateWarehouse("district", value)}
              />

              <Field
                label="Postal code"
                required
                value={kyc.warehouseAddress.postalCode}
                onChange={(value) => updateWarehouse("postalCode", value)}
              />

              <Field
                label="Warehouse contact person"
                required
                value={kyc.warehouseAddress.contactPerson}
                onChange={(value) => updateWarehouse("contactPerson", value)}
              />

              <Field
                label="Warehouse contact phone"
                required
                value={kyc.warehouseAddress.phone}
                onChange={(value) => updateWarehouse("phone", value)}
                placeholder="01XXXXXXXXX"
              />
            </div>
          </Section>

          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#315B53] bg-[#103B36] p-5 sm:flex-row sm:items-center sm:p-6">
            <div>
              <h2 className="font-bold text-white">Ready to submit?</h2>
              <p className="mt-1 max-w-xl text-xs leading-5 text-[#B5C9C1]">
                Save your draft while working. Submission is checked by the
                server and incomplete applications will be rejected with
                validation details.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveDraft}
                disabled={saving || !isEditable}
                className="rounded-xl border border-[#83CDB5]/40 px-5 py-3 text-sm font-bold text-white hover:bg-white/5 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save draft"}
              </button>

              <button
                type="button"
                onClick={submitKyc}
                disabled={submitting || !isEditable || isSubmitted}
                className="rounded-xl bg-[#83CDB5] px-5 py-3 text-sm font-extrabold text-[#123B35] hover:bg-[#A1DEC9] disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit for verification"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default SellerVerificationStatus;
