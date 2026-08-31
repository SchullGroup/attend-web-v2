"use client";
import { useRef, useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { useVerifyEmail, useResendEmailOtp } from "@/api/auth/hooks";

function maskEmail(email: string): string {
  if (!email) return "your email";
  return email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + b.replace(/./g, "•") + c);
}

function VerifyForm() {
  const router = useRouter();
  const { mutate: verifyMutation, isPending } = useVerifyEmail();
  const { mutate: resendMutation, isPending: resending } = useResendEmailOtp();

  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
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
          setTimeout(() => router.push("/login"), 1500);
        },
        onError: (err: any) => {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Verification failed. Check your code and try again.",
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
          setResendCooldown(60);
          refs.current[0]?.focus();
        },
        onError: (err: any) => {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Couldn't resend the code. Please try again.",
          );
        },
      },
    );
  }

  const filled = digits.every(Boolean);

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <Link
        href="/register"
        aria-label="Go back"
        className="self-start rounded-full bg-white p-2 text-foreground shadow-[0px_1px_4px_0px_rgba(0,0,0,0.1)]"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div className="-mt-6 flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">
          Verify email
        </h1>
        <p className="text-sm leading-relaxed tracking-[-0.14px] text-foreground/70">
          We sent a 6-digit code to {maskEmail(email)}. Enter it below to
          verify your account.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex w-full flex-col items-center gap-6" onPaste={handlePaste}>
        <div className="flex justify-between gap-2.5">
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
                "focus-visible:outline-none focus-visible:border-primary",
                d ? "border-primary bg-primary/5 text-primary" : "border-transparent bg-foreground/[0.04] text-foreground",
              )}
            />
          ))}
        </div>

        {error && <p className="text-center text-xs text-red-500">{error}</p>}
        {success && (
          <p className="text-center text-xs text-emerald-600">
            Email verified! Redirecting to sign in…
          </p>
        )}

        <p className="text-sm text-foreground/60">
          Didn&apos;t receive it?{" "}
          {resendCooldown > 0 ? (
            <span className="font-semibold">Resend in {resendCooldown}s</span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="font-semibold text-foreground hover:underline disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend code"}
            </button>
          )}
        </p>

        <Button type="submit" fullWidth size="lg" loading={isPending} disabled={!filled || isPending}>
          {isPending ? "Verifying…" : "Verify"}
        </Button>
      </form>

      <Link href="/login" className="text-sm text-foreground/60 hover:text-foreground hover:underline transition-colors">
        Already have an account? Sign in
      </Link>
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
