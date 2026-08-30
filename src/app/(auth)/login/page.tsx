"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircleUserRound, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useLogin } from "@/api/auth/hooks";

export default function LoginPage() {
  const router = useRouter();
  const { mutate: loginMutation, isPending } = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsVerify, setNeedsVerify] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setNeedsVerify(false);
    loginMutation(
      { email, password },
      {
        onSuccess: () => router.push("/"),
        onError: (err: any) => {
          const msg =
            err?.response?.data?.message || err?.message || "Invalid email or password";
          setErrorMsg(msg);
          // Backend blocks unverified accounts with a "verify your email" message —
          // surface a shortcut to the verification page (carrying the email over).
          setNeedsVerify(/verify/i.test(msg) && /email/i.test(msg));
        },
      },
    );
  }

  function goVerify() {
    sessionStorage.setItem("pendingVerifyEmail", email);
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
            name="email"
            type="email"
            autoComplete="email"
            leftIcon={<CircleUserRound className="h-5 w-5" />}
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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

      <p className="text-sm text-muted-foreground">
        No email or phone on file?{" "}
        <Link href="/bvn-recover" className="font-semibold text-foreground hover:underline">
          Sign in with BVN
        </Link>
      </p>
    </div>
  );
}
