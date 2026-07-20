"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Check, X, CheckCircle2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { useResetPassword } from "@/api/auth/hooks";

const RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One capital letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Contains a number", test: (p: string) => /\d/.test(p) },
];

export default function ResetPasswordPage() {
  const router = useRouter();
  const { mutate: resetMutation, isPending } = useResetPassword();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const pending = sessionStorage.getItem("pendingResetEmail");
    if (pending) setEmail(pending);
  }, []);

  const rulesPass = RULES.every((r) => r.test(password));
  const matches = password === confirm && confirm.length > 0;
  const otpValid = /^\d{6}$/.test(otp);
  const canSubmit = rulesPass && matches && otpValid && !!email;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setErrorMsg(null);
    resetMutation(
      { email, otp, newPassword: password },
      {
        onSuccess: () => {
          sessionStorage.removeItem("pendingResetEmail");
          setDone(true);
        },
        onError: (err: any) => {
          setErrorMsg(
            err?.response?.data?.message ||
              err?.message ||
              "Reset failed. Check your code and try again.",
          );
        },
      },
    );
  }

  if (done) {
    return (
      <div className="space-y-6 text-center">
        <div className="md:hidden mb-2 flex justify-start">
          <img src="/attend-logo.png" alt="Attend" style={{ height: 31 }} />
        </div>
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Password updated</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your password has been reset. Sign in with your new credentials.
          </p>
        </div>
        <Button fullWidth size="lg" onClick={() => router.push("/login")}>
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="md:hidden mb-2">
        <img src="/attend-logo.png" alt="Attend" style={{ height: 31 }} />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the code sent to your email and choose a new password.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <Input
          name="otp"
          label="Verification code"
          inputMode="numeric"
          maxLength={6}
          leftIcon={<KeyRound className="h-4 w-4" />}
          placeholder="6-digit code"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        />

        <div>
          <Input
            name="password"
            label="New password"
            type="password"
            autoComplete="new-password"
            leftIcon={<Lock className="h-4 w-4" />}
            placeholder="Min 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {password.length > 0 && (
            <ul className="mt-2 space-y-1">
              {RULES.map((r) => {
                const ok = r.test(password);
                return (
                  <li key={r.label} className="flex items-center gap-1.5">
                    {ok ? (
                      <Check className="h-3.5 w-3.5 text-green-600" strokeWidth={2.5} />
                    ) : (
                      <X className="h-3.5 w-3.5 text-red-500" strokeWidth={2.5} />
                    )}
                    <span className={`text-xs font-medium ${ok ? "text-green-700" : "text-red-600"}`}>
                      {r.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Input
          name="confirm"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          placeholder="Re-enter password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {confirm.length > 0 && !matches && (
          <p className="text-xs text-red-600 font-medium -mt-2">Passwords do not match.</p>
        )}

        <Button type="submit" fullWidth size="lg" loading={isPending} disabled={!canSubmit}>
          {isPending ? "Updating…" : "Update password"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
