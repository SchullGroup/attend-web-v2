"use client";
import { useEffect, useRef, useState } from "react";
import { CircleUserRound, Lock, Mail, Pencil, Phone, Loader2 } from "lucide-react";
import { useGetMe, useUpdateProfile } from "@/api/auth/hooks";
import { uploadClient } from "@/api/upload/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { initialsFor } from "@/lib/utils";
import { PanelShell } from "./PanelShell";

// Figma's "My profile" frame. Full Name and Phone Number are editable; Email is locked (the
// frame shows a padlock), because changing it would re-open email verification.
//
// The frame also shows a Username field — there is no such thing on this backend, so it is
// omitted rather than faked, and the header shows the email instead.
//
// ⚠️ The save endpoint does not exist yet (see authClient.updateProfile). Save is real and
// wired; until the backend adds the route it fails, and the copy says "please try again
// later" rather than surfacing a 404 the user can do nothing about.
export function MyProfilePanel({ onBack }: { onBack: () => void }) {
  const { data: meResp } = useGetMe();
  const me = meResp?.data;
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  // Seed once the profile lands (and re-seed if it changes underneath, e.g. after a save).
  useEffect(() => {
    if (!me) return;
    setFullName(me.fullName || "");
    setPhone(me.phoneNumber || "");
    setAvatarUrl(me.avatarUrl ?? null);
  }, [me]);

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStatus(null);
    setUploading(true);
    try {
      // POST /api/v1/upload already exists and returns a Cloudinary URL. Persisting it against
      // the user still depends on the save endpoint below.
      setAvatarUrl(await uploadClient.upload(file, "avatars"));
    } catch {
      setStatus({ tone: "err", text: "Couldn't upload that image. Please try another." });
    } finally {
      setUploading(false);
    }
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    // fullName is what the UI edits; send the split pair too since the backend stores
    // first/last separately and we don't yet know which shape it will accept.
    const [firstName, ...rest] = fullName.trim().split(/\s+/);
    updateProfile(
      {
        fullName: fullName.trim(),
        firstName: firstName || undefined,
        lastName: rest.length ? rest.join(" ") : undefined,
        phoneNumber: phone.trim() || undefined,
        ...(avatarUrl && avatarUrl !== me?.avatarUrl ? { avatarUrl } : {}),
      },
      {
        onSuccess: () => setStatus({ tone: "ok", text: "Your profile has been updated." }),
        onError: () =>
          setStatus({ tone: "err", text: "Couldn't save your changes. Please try again later." }),
      }
    );
  }

  const initials = me?.initials || initialsFor(me?.fullName || "");

  return (
    <PanelShell title="My profile" onBack={onBack}>
      <form onSubmit={onSave} className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-xs font-medium text-foreground/70">Profile Picture</p>
          <div className="relative w-fit">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              aria-label="Change profile picture"
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-foreground text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Pencil className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPickAvatar}
              className="hidden"
            />
          </div>
        </div>

        <Input
          name="fullName"
          label="Full Name"
          leftIcon={<CircleUserRound className="h-4 w-4" />}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <Input
          name="phoneNumber"
          label="Phone Number"
          inputMode="tel"
          leftIcon={<Phone className="h-4 w-4" />}
          placeholder="Not provided"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Email Address</p>
          <div className="flex h-[50px] items-center gap-2.5 rounded-[10px] bg-foreground/4 px-3.5">
            <Mail className="h-4 w-4 shrink-0 text-foreground/40" />
            <span className="truncate text-sm tracking-[-0.14px] text-foreground">
              {me?.email || "—"}
            </span>
            <Lock className="ml-auto h-4 w-4 shrink-0 text-foreground/30" />
          </div>
          <p className="text-xs text-foreground/50">
            Your email is used to sign in and can&apos;t be changed here.
          </p>
        </div>

        {status && (
          <div
            className={
              status.tone === "ok"
                ? "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                : "rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            }
          >
            {status.text}
          </div>
        )}

        <Button type="submit" fullWidth size="lg" loading={isPending} disabled={uploading}>
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
      </form>
    </PanelShell>
  );
}
