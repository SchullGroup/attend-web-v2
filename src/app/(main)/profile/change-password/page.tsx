"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useChangePassword } from "@/api/auth/hooks";
import Cookies from "js-cookie";

export default function ChangePasswordPage() {
  const { mutate: changePassword, isPending } = useChangePassword();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const matches = form.next.length >= 8 && form.next === form.confirm;
  const valid = form.current.length >= 8 && matches;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    changePassword(
      { currentPassword: form.current, newPassword: form.next },
      {
        onSuccess: () => {
          setSuccess(true);
          // Changing the password invalidates the current session.
          Cookies.remove("accessToken");
          setTimeout(() => {
            window.location.href = "/login";
          }, 1500);
        },
        onError: (err: any) => {
          setErrorMsg(
            err?.response?.data?.message ||
              err?.message ||
              "Could not change password. Check your current password and try again.",
          );
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/profile"
          aria-label="Back to settings"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-white text-foreground shadow-[0px_1px_4px_0px_rgba(0,0,0,0.08)] transition-colors hover:bg-foreground/[0.04]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Change Password</h1>
          <p className="text-sm tracking-[-0.14px] text-foreground/60">
            Enter your current password and proceed to creating a new one
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="max-w-md space-y-5">
        {errorMsg && (
          <div className="rounded-[10px] border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <Input
          name="current"
          label="Current Password"
          type="password"
          placeholder="Password"
          leftIcon={<Lock className="h-4 w-4" />}
          value={form.current}
          onChange={(e) => update("current", e.target.value)}
        />
        <Input
          name="next"
          label="New Password"
          type="password"
          placeholder="Password"
          leftIcon={<Lock className="h-4 w-4" />}
          value={form.next}
          onChange={(e) => update("next", e.target.value)}
          hint="Min 8 characters. Mix letters, numbers and symbols."
        />
        <Input
          name="confirm"
          label="Confirm New Password"
          type="password"
          placeholder="Password"
          leftIcon={<Lock className="h-4 w-4" />}
          value={form.confirm}
          onChange={(e) => update("confirm", e.target.value)}
          error={form.confirm && !matches ? "Passwords do not match" : undefined}
        />

        {success && (
          <div className="rounded-[10px] border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Password updated. Please sign in again…
          </div>
        )}

        <Button type="submit" size="lg" fullWidth loading={isPending} disabled={!valid || success}>
          Update Password
        </Button>
      </form>
    </div>
  );
}
