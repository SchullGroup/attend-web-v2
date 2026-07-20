"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useChangePassword } from "@/api/auth/hooks";
import Cookies from "js-cookie";

export default function ChangePasswordPage() {
  const router = useRouter();
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
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-foreground">Change password</h1>
        <p className="text-sm text-muted-foreground">
          Use a strong password you don&apos;t use anywhere else.
        </p>
      </header>

      <form
        onSubmit={submit}
        className="mx-auto max-w-lg space-y-5 rounded-2xl border border-border bg-white p-6 shadow-sm"
      >
        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <Input
          name="current"
          label="Current password"
          type="password"
          leftIcon={<Lock className="h-4 w-4" />}
          value={form.current}
          onChange={(e) => update("current", e.target.value)}
        />
        <Input
          name="next"
          label="New password"
          type="password"
          leftIcon={<Lock className="h-4 w-4" />}
          value={form.next}
          onChange={(e) => update("next", e.target.value)}
          hint="Min 8 characters. Mix letters, numbers and symbols."
        />
        <Input
          name="confirm"
          label="Confirm new password"
          type="password"
          leftIcon={<Lock className="h-4 w-4" />}
          value={form.confirm}
          onChange={(e) => update("confirm", e.target.value)}
          error={form.confirm && !matches ? "Passwords do not match" : undefined}
        />

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            Password updated. Please sign in again…
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending || success}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isPending} disabled={!valid || success}>
            Update password
          </Button>
        </div>
      </form>
    </div>
  );
}
