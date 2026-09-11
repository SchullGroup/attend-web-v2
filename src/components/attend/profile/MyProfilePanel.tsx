"use client";
import { useEffect, useRef, useState } from "react";
import { CircleUserRound, Lock, Mail, Pencil, Phone, Loader2 } from "lucide-react";
import { useGetMe, useUpdateProfile } from "@/api/auth/hooks";
import type { UpdateProfileRequest } from "@/types/auth/requests";
import { uploadClient } from "@/api/upload/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { initialsFor } from "@/lib/utils";
import { PanelShell } from "./PanelShell";

// Figma's "My profile" frame, against the real `PATCH /api/v1/auth/me` contract (backend doc
// §25). Email stays locked with the padlock the frame shows — it's the login identifier and a
// verified contact point, so changing it needs request → OTP to the new address → swap, not a
// straight write. `POST /api/v1/auth/change-password` already covers the password.
//
// The frame draws "Full Name" as one field, but the API has firstName/lastName and the backend
// deliberately won't guess a split. This renders two inputs rather than splitting on whitespace
// as an earlier pass did — that mangles multi-word surnames and middle names, and `MeResponse`
// already carries the two separately, so there was never a reason to guess.
//
// ⚠️ NO USERNAME FIELD, deliberately. The backend added one in §25 and this form briefly had it,
// but the user's decision is that it must not be exposed anywhere: "lets never add the username
// field at all so no one even sees it." It's optional server-side, so omitting it is harmless —
// accounts simply never get one. Please don't re-add it because the API supports it.
export function MyProfilePanel({ onBack }: { onBack: () => void }) {
  const { data: meResp } = useGetMe();
  const me = meResp?.data;
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  // Seed the form once, when the profile first arrives — not on every `me` change.
  //
  // Re-seeding on each change looked harmless but raced the user: a successful save invalidates
  // `me`, and if they started a fresh edit before that refetch landed, the effect fired again
  // and overwrote what they had just typed. Local state is the source of truth for an
  // in-progress edit; a background refetch has no business touching it.
  const seeded = useRef(false);
  useEffect(() => {
    if (!me || seeded.current) return;
    seeded.current = true;
    setFirstName(me.firstName || "");
    setLastName(me.lastName || "");
    setPhone(me.phoneNumber || "");
    setAvatarUrl(me.avatarUrl ?? null);
  }, [me]);

  const namesBlank = !firstName.trim() || !lastName.trim();

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
    if (namesBlank) return;
    setStatus(null);

    // PATCH semantics: omit anything the user didn't change, so saving a phone here can't
    // clobber a name edited on another device. `avatarUrl` may be sent as "" (an explicit
    // clear); "" on a name or phone is a 400 by design, so those are omitted instead.
    const payload: UpdateProfileRequest = {};
    const nextFirst = firstName.trim();
    const nextLast = lastName.trim();
    const nextPhone = phone.trim();

    if (nextFirst !== (me?.firstName || "")) payload.firstName = nextFirst;
    if (nextLast !== (me?.lastName || "")) payload.lastName = nextLast;
    if (nextPhone !== (me?.phoneNumber || "")) payload.phone = nextPhone;
    if (avatarUrl && avatarUrl !== me?.avatarUrl) payload.avatarUrl = avatarUrl;

    if (Object.keys(payload).length === 0) {
      setStatus({ tone: "ok", text: "Nothing to save — no changes made." });
      return;
    }

    const phoneChanged = payload.phone !== undefined;

    updateProfile(payload, {
      onSuccess: () =>
        setStatus({
          tone: "ok",
          // §25: changing the number clears phoneVerified, and that flag gates OTP delivery
          // and notification routing — so say so rather than letting them find out later.
          text: phoneChanged
            ? "Profile updated. Your new number needs verifying before it can receive alerts."
            : "Your profile has been updated.",
        }),
      onError: (err: any) => {
        // Put the picture back to what's actually stored. The upload succeeds on its own
        // (it's a separate Cloudinary call), so without this the panel kept showing a new
        // photo that was never persisted — and disagreed with the avatar in the left pane,
        // which reads from the shared profile cache.
        setAvatarUrl(me?.avatarUrl ?? null);

        const code = err?.response?.status;
        const msg = err?.response?.data?.message;
        setStatus({
          tone: "err",
          text:
            code === 409
              ? // Phone is the only unique field this form can send. Prefer the server's wording.
                msg || "That phone number already belongs to another account."
              : code === 400
                ? msg || "Please check the details you entered and try again."
                : "Couldn't save your changes. Please try again later.",
        });
      },
    });
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

        {/* Two inputs, not the frame's single "Full Name" — see the note at the top of the file.
            Neither may be blank (the API rejects "" for these), hence maxLength 50 per §25. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="firstName"
            label="First Name"
            maxLength={50}
            leftIcon={<CircleUserRound className="h-4 w-4" />}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            error={firstName.length > 0 && !firstName.trim() ? "Required" : undefined}
          />
          <Input
            name="lastName"
            label="Last Name"
            maxLength={50}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            error={lastName.length > 0 && !lastName.trim() ? "Required" : undefined}
          />
        </div>

        <Input
          name="phone"
          label="Phone Number"
          inputMode="tel"
          leftIcon={<Phone className="h-4 w-4" />}
          placeholder="Not provided"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          hint={
            phone.trim() !== (me?.phoneNumber || "")
              ? "Changing this will require verifying the new number."
              : undefined
          }
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

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={isPending}
          disabled={uploading || namesBlank}
        >
          {isPending ? "Saving…" : "Save Changes"}
        </Button>
      </form>
    </PanelShell>
  );
}
