"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useForgotPassword } from "@/api/auth/hooks";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { mutate: forgotMutation, isPending } = useForgotPassword();
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    forgotMutation(
      { email },
      {
        onSuccess: () => {
          sessionStorage.setItem("pendingResetEmail", email);
          router.push("/reset-password");
        },
        onError: (err: any) => {
          setErrorMsg(
            err?.response?.data?.message ||
              err?.message ||
              "Could not send reset code. Check your email and try again.",
          );
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="md:hidden mb-2">
        <img src="/attend-logo.png" alt="Attend" style={{ height: 31 }} />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Forgot password?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a verification code.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
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
        <Button type="submit" fullWidth size="lg" loading={isPending} disabled={!email.trim()}>
          {isPending ? "Sending code…" : "Send reset code"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-foreground hover:underline">
          <ArrowLeft className="inline h-3.5 w-3.5 mr-0.5" />
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
