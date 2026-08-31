"use client";
import { useRef, useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Mail, CheckCircle2 } from "lucide-react";
import { useVerifyEmail, useResendEmailOtp } from "@/api/auth/hooks";
import { apiErrorMessage } from "@/lib/api-error";

function maskEmail(email: string): string {
  if (!email) return "your email";
  return email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + b.replace(/./g, "ΓÇó") + c);
}

/**
 * How long "Resend code" stays locked, in seconds.
 *
 * Tied to the backend's OTP lifetime, which is 2 minutes (confirmed 2026-08-11): asking for a
 * new code while the old one is still valid is refused with "Please wait N minute(s)..." (the
 * backend switched this message from seconds to minutes on 2026-08-14). At the
 * previous 60s the button went live a full minute before the server would honour it, so the one
 * person who most needs it ΓÇö someone whose code never arrived ΓÇö got an error for clicking a
 * button that looked ready.
 *
 * The countdown starts when this page mounts, a moment *after* the server created the code, so it
 * expires slightly late rather than early. That is the safe direction; shortening it is not.
 */
const RESEND_COOLDOWN_SECONDS = 120;

/** "1:59" past a minute, "45s" under it ΓÇö a raw "117s" is hard to read as a wait. */
function formatCooldown(total: number): string {
  if (total < 60) return `${total}s`;
  const mins = Math.floor(total / 60);
  return `${mins}:${String(total % 60).padStart(2, "0")}`;
}

function VerifyForm() {
  const router = useRouter();
  const { mutate: verifyMutation, isPending } = useVerifyEmail();
  const { mutate: resendMutation, isPending: resending } = useResendEmailOtp();

  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const pending = sessionStorage.getItem("pendingVerifyEmail");
    if (pending) setEmail(pending);
    refs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function handleChange(i: number, v: string) {
    if (!/^\d?$/.test(v)) return;
    setError("");
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    // With the auto-submit re-entrancy guard in verifyCode, an edit mid-flight is a no-op
    // on purpose ΓÇö the request is already going out and would otherwise be resent.
    if (isPending || success) return;
    if (v && i < 5) refs.current[i + 1]?.focus();
    if (next.every(Boolean)) verifyCode(next.join(""));
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = Array.from({ length: 6 }, (_, i) => pasted[i] ?? "");
    setDigits(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) verifyCode(pasted);
  }

  function verifyCode(code: string) {
    // The last-digit auto-submit re-fires on any subsequent edit, so an impatient user
    // could send the same OTP twice. The second attempt hits a code the backend has
    // already consumed and comes back "invalid", painting an error over a verification
    // that actually succeeded.
    if (isPending || success) return;
    if (!email) {
      setError("No email found. Please go back and register again.");
      return;
    }
    setError("");
    verifyMutation(
      { email, otp: code },
      {
        onSuccess: () => {
          setSuccess(true);
          sessionStorage.removeItem("pendingVerifyEmail");
          sessionStorage.removeItem("pendingVerifyPhone");
          // Hand the address to the login page, which repeats the confirmation and
          // prefills the field ΓÇö so the message survives the navigation instead of
          // vanishing into a "Welcome back" screen that acknowledges nothing.
          // sessionStorage rather than a query param: an email in the URL ends up in
          // browser history and server access logs.
          sessionStorage.setItem("justVerifiedEmail", email);
          router.push("/login");
        },
        onError: (err: any) => {
          setError(
            apiErrorMessage(err, "Verification failed. Check your code and try again."),
          );
        },
      },
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) {
      setError("Please enter the full 6-digit code.");
      return;
    }
    verifyCode(code);
  }

  function handleResend() {
    if (!email) {
      setError("No email found. Please go back and register again.");
      return;
    }
    setError("");
    resendMutation(
      { email },
      {
        onSuccess: () => {
          setDigits(["", "", "", "", "", ""]);
          setResendCooldown(RESEND_COOLDOWN_SECONDS);
          refs.current[0]?.focus();
        },
        onError: (err: any) => {
          setError(
            apiErrorMessage(err, "Couldn't resend the code. Please try again."),
          );
        },
      },
    );
  }

  const filled = digits.every(Boolean);

  return (
    <div className="space-y-6">
      <div className="md:hidden mb-2">
        <img src="/attend-logo.png" alt="Attend" style={{ height: 31 }} />
      </div>

      <div className="text-center">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <Mail className="h-6 w-6 text-gray-700" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Verify your email</h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          We sent a 6-digit code to
          <br />
          <span className="font-semibold text-foreground">{maskEmail(email)}</span>
        </p>
        {/* Testers reported codes never arriving; the most common cause is spam filing, and
            saying so up front costs nothing when it's a genuine delivery failure. */}
        <p className="mx-auto mt-3 max-w-xs rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
          It usually arrives within a minute. If it doesn&apos;t, check your spam or junk
          folder before requesting another code.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-5" onPaste={handlePaste}>
        <div className="flex justify-between gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKey(i, e)}
              className={cn(
                "h-12 w-12 rounded-xl border text-center text-lg font-semibold transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                d ? "border-foreground bg-foreground/5" : "border-input bg-white",
              )}
            />
          ))}
        </div>

        {error && <p className="text-center text-xs text-red-500">{error}</p>}
        {success && (
          <p className="flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Email verified ΓÇö taking you to sign inΓÇª
          </p>
        )}

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={isPending}
          // Stays disabled through the redirect. Letting it revert to an enabled
          // "Confirm code" the moment the request settled is what made a successful
          // verification look like the form was still waiting for input.
          disabled={!filled || isPending || success}
        >
          {success ? "Verified" : isPending ? "VerifyingΓÇª" : "Confirm code"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t receive a code?{" "}
          {resendCooldown > 0 ? (
            <span className="font-semibold text-muted-foreground">
              Resend in {formatCooldown(resendCooldown)}
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="font-semibold text-foreground hover:underline disabled:opacity-50"
            >
              {resending ? "SendingΓÇª" : "Resend code"}
            </button>
          )}
        </p>
      </form>

      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <Link href="/register" className="hover:text-foreground hover:underline transition-colors">
          Wrong details? Go back
        </Link>
        <Link href="/login" className="hover:text-foreground hover:underline transition-colors">
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
