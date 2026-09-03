"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLogin } from "@/api/auth/hooks";
import { getDeviceId } from "@/lib/device-id";
import { apiErrorMessage } from "@/lib/api-error";
import { DIAL_CODE, stripDialCode, toE164 } from "@/lib/phone";
import { cn } from "@/lib/utils";

type LoginMode = "email" | "phone";

function safeCallbackUrl(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const { mutate: loginMutation, isPending } = useLogin();
  const [mode, setMode] = useState<LoginMode>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [justVerifiedEmail, setJustVerifiedEmail] = useState<string | null>(null);
  const [sessionEnded, setSessionEnded] = useState<string | null>(null);

  useEffect(() => {
    const verified = sessionStorage.getItem("justVerifiedEmail");
    if (verified) {
      setJustVerifiedEmail(verified);
      setEmail(verified);
      setMode("email");
    }
    sessionStorage.removeItem("justVerifiedEmail");

    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "other-device") {
      setSessionEnded(
        "You were signed out because your account was used to sign in on another device."
      );
    } else if (reason === "idle") {
      setSessionEnded("Your session expired after 2 hours of inactivity. Please sign in again.");
    }
  }, []);

  const cleanId = mode === "phone" ? toE164(phone) : email.trim();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setNeedsVerify(false);
    loginMutation(
      {
        identifier: cleanId,
        emailOrPhone: cleanId,
        email: cleanId,
        password,
        deviceId: getDeviceId(),
      },
      {
        onSuccess: () => {
          const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
          router.push(safeCallbackUrl(callbackUrl));
        },
        onError: (err: any) => {
          const msg = apiErrorMessage(err, "Invalid credentials");
          setErrorMsg(msg);
          setNeedsVerify(/verify/i.test(msg) && /email/i.test(msg));
        },
      }
    );
  }

  function goVerify() {
    if (mode === "email" && cleanId) {
      sessionStorage.setItem("pendingVerifyEmail", cleanId);
    }
    router.push("/verify");
  }

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">
          Welcome back
        </h1>
        <p className="text-sm tracking-[-0.14px] text-foreground/70">
          Enter your details to continue
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex w-full flex-col items-center gap-6">
        {sessionEnded && !errorMsg && (
          <div className="flex w-full items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>{sessionEnded}</span>
          </div>
        )}
        {justVerifiedEmail && !errorMsg && (
          <div className="flex w-full items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-left text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>Your email is verified. Enter your password to sign in.</span>
          </div>
        )}
        {errorMsg && (
          <div className="w-full rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm text-red-600">
            {errorMsg}
            {needsVerify && (
              <button
                type="button"
                onClick={goVerify}
                className="mt-2 block font-semibold text-red-700 underline hover:no-underline"
              >
                Verify your email now →
              </button>
            )}
          </div>
        )}

        {/* Email / Phone Mode Switcher styled with Meristem theme */}
        <div role="tablist" aria-label="Sign in with" className="flex w-full gap-1 rounded-xl bg-foreground/[0.04] p-1">
          {(["email", "phone"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setErrorMsg(null);
                setNeedsVerify(false);
              }}
              className={cn(
                "flex-1 rounded-lg py-2 text-sm font-medium transition-colors",
                mode === m
                  ? "bg-white text-foreground shadow-sm"
                  : "text-foreground/60 hover:text-foreground"
              )}
            >
              {m === "email" ? "Email" : "Phone"}
            </button>
          ))}
        </div>

        <div className="flex w-full flex-col gap-4">
          {mode === "email" ? (
            <Input
              key="email"
              name="email"
              type="email"
              autoComplete="username"
              leftIcon={<Mail className="h-5 w-5" />}
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          ) : (
            <Input
              key="phone"
              name="phone"
              type="tel"
              autoComplete="username"
              leftIcon={<Phone className="h-5 w-5" />}
              prefix={DIAL_CODE}
              placeholder="803 123 4567"
              value={phone}
              onChange={(e) => setPhone(stripDialCode(e.target.value))}
            />
          )}

          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            leftIcon={<Lock className="h-5 w-5" />}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <Button type="submit" fullWidth size="lg" loading={isPending}>
          {isPending ? "Signing in…" : "Login"}
        </Button>

        <Link
          href="/forgot-password"
          className="text-sm font-medium tracking-[-0.14px] text-foreground underline"
        >
          Forgot password?
        </Link>
      </form>

      <div className="flex w-full flex-col items-center gap-5">
        <div className="flex w-full items-center gap-4">
          <div className="h-px flex-1 bg-foreground/15" />
          <span className="text-sm tracking-[-0.28px] text-foreground/60">or</span>
          <div className="h-px flex-1 bg-foreground/15" />
        </div>

        <Link
          href="/join"
          className="flex h-[50px] w-full items-center justify-center rounded-xl bg-foreground/[0.05] text-sm font-medium tracking-[-0.14px] text-foreground transition-colors hover:bg-foreground/[0.08]"
        >
          Join as a Guest/Regulator
        </Link>
        <Link
          href="/register"
          className="flex h-[50px] w-full items-center justify-center rounded-xl bg-foreground/[0.05] text-sm font-medium tracking-[-0.14px] text-foreground transition-colors hover:bg-foreground/[0.08]"
        >
          Create an account
        </Link>
      </div>

      <p className="text-sm text-foreground/60">
        No email or phone on file?{" "}
        <Link href="/bvn-recover" className="font-semibold text-foreground hover:underline">
          Sign in with BVN
        </Link>
      </p>
    </div>
  );
}
