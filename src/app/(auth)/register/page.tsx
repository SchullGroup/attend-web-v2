"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User, Phone, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useRegister } from "@/api/auth/hooks";
import { apiErrorMessage } from "@/lib/api-error";
import { DIAL_CODE, stripDialCode, toE164 } from "@/lib/phone";

export default function RegisterPage() {
  const router = useRouter();
  const { mutate: registerMutation, isPending } = useRegister();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // The three rules mirrored under the password field. Also gates submit, so a password
  // the backend would reject never costs the user a round trip.
  const passwordRules = [
    { label: "At least 8 characters", ok: form.password.length >= 8 },
    { label: "One capital letter", ok: /[A-Z]/.test(form.password) },
    { label: "Contains a number", ok: /\d/.test(form.password) },
  ];
  const passwordValid = passwordRules.every((r) => r.ok);
  // Only a mismatch counts, not a half-typed confirmation ΓÇö the inline error would
  // otherwise flash red from the first keystroke.
  const passwordsMatch = form.password === form.confirmPassword;
  const confirmError =
    form.confirmPassword.length > 0 && !passwordsMatch ? "Passwords do not match." : undefined;

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
    // The field holds the local part; the API gets E.164, matching what the login form
    // sends so an account created here can be signed into by phone.
    const phoneE164 = toE164(form.phone);
    if (!form.email.trim() && !phoneE164) {
      setErrorMsg("Please provide at least an email address or phone number.");
      return;
    }
    if (!passwordValid) {
      setErrorMsg("Please choose a password that meets all three requirements.");
      return;
    }
    if (!passwordsMatch) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    registerMutation(
      {
        firstName,
        lastName,
        email: form.email,
        phone: phoneE164,
        password: form.password,
        confirmPassword: form.confirmPassword,
      },
      {
        onSuccess: () => {
          // OTP is sent to the email or phone; verify page reads it from here
          if (form.email) sessionStorage.setItem("pendingVerifyEmail", form.email);
          if (phoneE164) sessionStorage.setItem("pendingVerifyPhone", phoneE164);
          router.push("/verify");
        },
        onError: (err: any) => {
          setErrorMsg(apiErrorMessage(err, "Registration failed. Please try again."));
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
        <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Join Attend in under a minute.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}
        <Input
          name="fullName"
          label="Full name"
          leftIcon={<User className="h-4 w-4" />}
          placeholder="Ngozi Okafor"
          value={form.fullName}
          onChange={(e) => update("fullName", e.target.value)}
        />
        <Input
          name="email"
          label="Email"
          type="email"
          leftIcon={<Mail className="h-4 w-4" />}
          placeholder="you@email.com"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />
        <Input
          name="phone"
          label="Phone"
          type="tel"
          inputMode="tel"
          leftIcon={<Phone className="h-4 w-4" />}
          prefix={DIAL_CODE}
          placeholder="801 234 5678"
          value={form.phone}
          // Drop anything duplicating the pinned code so the field never reads "+234 0801ΓÇª".
          onChange={(e) => update("phone", stripDialCode(e.target.value))}
        />
        <p className="-mt-2 text-[11px] text-muted-foreground">
          At least one of email or phone is required.
        </p>
        <div>
          <Input
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            leftIcon={<Lock className="h-4 w-4" />}
            placeholder="Min 8 characters"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
          />
          {form.password.length > 0 && (
            <ul className="mt-2 space-y-1">
              {passwordRules.map((h) => (
                <li key={h.label} className="flex items-center gap-1.5">
                  {h.ok
                    ? <Check className="h-3.5 w-3.5 text-green-600" strokeWidth={2.5} />
                    : <X className="h-3.5 w-3.5 text-red-500" strokeWidth={2.5} />
                  }
                  <span className={`text-xs font-medium ${h.ok ? "text-green-700" : "text-red-600"}`}>
                    {h.label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Input
          name="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          leftIcon={<Lock className="h-4 w-4" />}
          placeholder="Re-enter your password"
          value={form.confirmPassword}
          onChange={(e) => update("confirmPassword", e.target.value)}
          error={confirmError}
        />
        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={isPending}
          disabled={isPending || !passwordValid || !passwordsMatch || !form.confirmPassword}
        >
          {isPending ? "Creating account" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        By continuing, you agree to Attend&apos;s Terms of Service and Privacy Policy.
      </p>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
