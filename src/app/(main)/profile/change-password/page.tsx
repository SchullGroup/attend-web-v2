"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { useGoBack } from "@/hooks/useGoBack";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useChangePassword } from "@/api/auth/hooks";
import Cookies from "js-cookie";

export default function ChangePasswordPage() {
  const goBack = useGoBack("/profile");
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
    <div className="flex flex-col gap-6">
      <button
        onClick={goBack}
        className="inline-flex items-center gap-1 text-sm tracking-[-0.14px] text-foreground/60 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <header>
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Change password</h1>
        <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/60">
          Use a strong password you don&apos;t use anywhere else.
        </p>
      </header>

      <form
        onSubmit={submit}
        className="mx-auto flex w-full max-w-2xl flex-col gap-5 rounded-xl border border-foreground/[0.06] bg-white p-6 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]"
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
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
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
