"use client";
import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useChangePassword } from "@/api/auth/hooks";
import Cookies from "js-cookie";
import { PanelShell } from "./PanelShell";

// Logic carried over verbatim from the old /profile/change-password page — only the chrome
// changed. Changing the password invalidates the session, so this still signs the user out.
export function ChangePasswordPanel({ onBack }: { onBack: () => void }) {
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
              "Could not change password. Check your current password and try again."
          );
        },
      }
    );
  }

  return (
    <PanelShell title="Change Password" onBack={onBack}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="-mt-2 text-sm tracking-[-0.14px] text-foreground/60">
          Enter your current password and proceed to creating a new one
        </p>

        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        {/* Labels and the "Password" placeholder per the frame; Input supplies the eye toggle. */}
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
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Password updated. Please sign in again…
          </div>
        )}

        <Button type="submit" fullWidth size="lg" loading={isPending} disabled={!valid || success}>
          Update Password
        </Button>
      </form>
    </PanelShell>
  );
}
