"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircleUserRound, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLogin } from "@/api/auth/hooks";
import { getDeviceId } from "@/lib/device-id";
import { apiErrorMessage } from "@/lib/api-error";
import { toE164 } from "@/lib/phone";

// Figma has a single "Email or Phone Number" field, so the identifier's shape decides
// how it is normalised rather than a mode toggle. The payload is unchanged either way —
// it already sends the same value as identifier/emailOrPhone/email.
const looksLikePhone = (v: string) => /^\+?[\d\s-]+$/.test(v.trim());
const looksLikeEmail = (v: string) => /.+@.+\..+/.test(v.trim());

function safeCallbackUrl(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export default function LoginPage() {
  const router = useRouter();
  const { mutate: loginMutation, isPending } = useLogin();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [justVerifiedEmail, setJustVerifiedEmail] = useState<string | null>(null);
  const [sessionEnded, setSessionEnded] = useState<string | null>(null);

  useEffect(() => {
    const verified = sessionStorage.getItem("justVerifiedEmail");
    if (verified) {
      setJustVerifiedEmail(verified);
      setIdentifier(verified);
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

  const cleanId = looksLikePhone(identifier) ? toE164(identifier) : identifier.trim();

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
    if (looksLikeEmail(cleanId) && cleanId) {
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

        <div className="flex w-full flex-col gap-4">
          <Input
            name="identifier"
            type="text"
            inputMode="email"
            autoComplete="username"
            leftIcon={<CircleUserRound className="h-5 w-5" />}
            placeholder="Email or Phone Number"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setErrorMsg(null);
              setNeedsVerify(false);
            }}
          />

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
    </div>
  );
}
