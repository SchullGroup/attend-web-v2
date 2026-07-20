"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
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
    <div className="space-y-6">
      <div className="md:hidden mb-2">
        <img src="/attend-logo.png" alt="Attend" style={{ height: 44 }} />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to view your upcoming events and votes.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
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
        <Input
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          leftIcon={<Mail className="h-4 w-4" />}
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          leftIcon={<Lock className="h-4 w-4" />}
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-foreground hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" fullWidth size="lg" loading={isPending}>
          {isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        New to Attend?{" "}
        <Link href="/register" className="font-semibold text-foreground hover:underline">
          Create an account
        </Link>
      </p>
      <p className="text-center text-sm text-muted-foreground">
        No email or phone on file?{" "}
        <Link href="/bvn-recover" className="font-semibold text-foreground hover:underline">
          Sign in with BVN
        </Link>
      </p>
    </div>
  );
}
