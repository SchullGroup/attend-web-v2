"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CircleUserRound, Mail, Lock, Phone, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { useRegister } from "@/api/auth/hooks";

export default function RegisterPage() {
  const router = useRouter();
  const { mutate: registerMutation, isPending } = useRegister();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const checks = [
    { label: "At least 8 characters", ok: form.password.length >= 8 },
    { label: "1 Uppercase letter", ok: /[A-Z]/.test(form.password) },
    { label: "Contains numbers", ok: /\d/.test(form.password) },
    { label: "1 Special character", ok: /[^A-Za-z0-9]/.test(form.password) },
  ];

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const nameParts = form.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    if (!firstName || !lastName) {
      setErrorMsg("Please enter your first and last name.");
      return;
    }
    // Item C — at least one of email or phone is required (both optional individually).
    if (!form.email.trim() && !form.phone.trim()) {
      setErrorMsg("Provide at least one of email or phone.");
      return;
    }
    if (!agreed) {
      setErrorMsg("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }

    registerMutation(
      {
        firstName,
        lastName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        password: form.password,
      },
      {
        onSuccess: () => {
          // OTP is sent to whichever channel was provided.
          if (form.email) sessionStorage.setItem("pendingVerifyEmail", form.email);
          if (form.phone) sessionStorage.setItem("pendingVerifyPhone", form.phone);
          router.push("/verify");
        },
        onError: (err: any) => {
          setErrorMsg(
            err?.response?.data?.message ||
              err?.message ||
              "Registration failed. Please try again.",
          );
        },
      },
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">
          Create account
        </h1>
        <p className="text-sm tracking-[-0.14px] text-foreground/70">
          Register to access AGMs, product launches, innovation challenges,
          and more.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex w-full flex-col items-stretch gap-4">
        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <Input
          name="fullName"
          leftIcon={<CircleUserRound className="h-5 w-5" />}
          placeholder="Full name"
          value={form.fullName}
          onChange={(e) => update("fullName", e.target.value)}
        />
        <Input
          name="email"
          type="email"
          leftIcon={<Mail className="h-5 w-5" />}
          placeholder="Email"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />
        <Input
          name="phone"
          type="tel"
          leftIcon={<Phone className="h-5 w-5" />}
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
        <p className="-mt-1 text-left text-xs text-foreground/60">
          You need at least one of email or phone.{" "}
          <Link href="/bvn-recover" className="font-medium underline">
            Don&apos;t have either? Sign in with BVN
          </Link>
        </p>

        <Input
          name="password"
          type="password"
          leftIcon={<Lock className="h-5 w-5" />}
          placeholder="Password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {checks.map((c) => (
            <span
              key={c.label}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                c.ok ? "bg-primary/10 text-primary" : "bg-foreground/[0.05] text-foreground/50",
              )}
            >
              {c.ok && <Check className="h-3 w-3" strokeWidth={3} />}
              {c.label}
            </span>
          ))}
        </div>

        <label className="flex items-start gap-2.5 text-left">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-foreground/20 text-primary focus:ring-primary"
          />
          <span className="text-sm text-foreground/70">
            I agree to the Terms of Service and Privacy Policy
          </span>
        </label>

        <Button type="submit" fullWidth size="lg" loading={isPending} className="mt-2">
          {isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
