
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { verifyAdminLoginTwoFactor } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

const CHALLENGE_KEY = "lutech_admin_2fa";

function readChallenge() {
  try {
    const stored = sessionStorage.getItem(CHALLENGE_KEY);
    if (!stored) return null;

    const challenge = JSON.parse(stored);

    if (
      !challenge.challengeToken ||
      !challenge.expiresAt ||
      Date.now() >= challenge.expiresAt
    ) {
      sessionStorage.removeItem(CHALLENGE_KEY);
      return null;
    }

    return challenge;
  } catch {
    sessionStorage.removeItem(CHALLENGE_KEY);
    return null;
  }
}

function AdminTwoFactor() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();

  const [challenge, setChallenge] = useState(readChallenge);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!challenge) {
      navigate("/admin/login", { replace: true });
    }
  }, [challenge, navigate]);

  if (!challenge) return null;

  const method =
    location.state?.method || challenge.method || "email_otp";

  const isAuthenticator = method === "authenticator_app";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const cleanCode = code.replace(/\D/g, "");

    if (cleanCode.length !== 6) {
      setError("Enter the complete 6-digit verification code.");
      return;
    }

    if (Date.now() >= challenge.expiresAt) {
      sessionStorage.removeItem(CHALLENGE_KEY);
      setChallenge(null);
      setError("Your security challenge has expired. Please sign in again.");
      return;
    }

    setLoading(true);

    try {
      const response = await verifyAdminLoginTwoFactor(
        challenge.challengeToken,
        cleanCode
      );

      if (response.user?.role !== "admin" || !response.token) {
        throw new Error("The server did not return a valid admin session.");
      }

      sessionStorage.removeItem(CHALLENGE_KEY);

      setSession(response.token, response.user);

      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Verification failed. Check your code and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-8 block text-center text-3xl font-extrabold tracking-tight text-white"
        >
          LUTech <span className="text-blue-400">Admin</span>
        </Link>

        <section className="rounded-2xl border border-white/10 bg-white p-6 shadow-2xl sm:p-9">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl text-blue-700">
              <span aria-hidden="true">🔐</span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Two-factor verification
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {isAuthenticator
                ? "Open your authenticator app and enter the current 6-digit code."
                : "Enter the 6-digit verification code sent to your registered email address."}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="admin-2fa-code"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Verification code
              </label>

              <input
                id="admin-2fa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                placeholder="000000"
                required
                disabled={loading}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify and Continue"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem(CHALLENGE_KEY);
                navigate("/admin/login", { replace: true });
              }}
              className="block w-full text-center text-sm font-semibold text-blue-700 transition hover:text-blue-900"
            >
              Cancel and return to admin login
            </button>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          This verification challenge is temporary and can only be used once.
        </p>
      </div>
    </main>
  );
}

export default AdminTwoFactor;
