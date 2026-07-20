"use client";
import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Item B — Guest redemption page. Non-shareholders enter their details and
// receive a short-lived guest session cookie (24h) issued by the backend.

const ROLES = [
  { value: "DIRECTOR",  label: "Director" },
  { value: "REGULATOR", label: "Regulator" },
  { value: "PRESS",     label: "Press" },
  { value: "SECRETARY", label: "Corporate Secretary" },
  { value: "LEGAL",     label: "Legal" },
  { value: "OTHER",     label: "Other" },
];

export default function GuestJoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const search = useSearchParams();
  const eventIdHint = search.get("eventId") ?? "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("DIRECTOR");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{ eventTitle?: string; expiresAt?: string; capabilities?: string[] } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/guest/invite/${encodeURIComponent(code)}`, { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          setInviteInfo(j.data ?? null);
        }
      } catch (_e) {
        /* preview is best-effort */
      }
    })();
  }, [code]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError("Provide at least one of email or phone.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/guest/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          fullName: fullName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          role,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data?.code === "GUEST_INVALID_CODE"
            ? "This code is no longer valid. Contact the organiser."
            : data?.message || "Could not redeem this code. Please try again.",
        );
        setSubmitting(false);
        return;
      }
      const eventId = data?.data?.eventId ?? eventIdHint;
      if (eventId) {
        router.replace(`/agm/live?eventId=${encodeURIComponent(eventId)}`);
      } else {
        router.replace("/");
      }
    } catch (_e) {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Join as a guest</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {inviteInfo?.eventTitle
            ? `You've been invited to ${inviteInfo.eventTitle}. Enter a few details to continue.`
            : "You've been invited to an Attend event. Enter a few details to continue."}
        </p>
        {inviteInfo?.capabilities && (
          <p className="mt-2 text-xs text-muted-foreground">
            You will be able to: {inviteInfo.capabilities.join(", ").toLowerCase()}
          </p>
        )}
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        <Input
          name="fullName"
          label="Full name"
          leftIcon={<User className="h-4 w-4" />}
          placeholder="e.g. Adekunle Bello"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Input
          name="email"
          label="Email (optional)"
          type="email"
          leftIcon={<Mail className="h-4 w-4" />}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          name="phone"
          label="Phone (optional)"
          type="tel"
          leftIcon={<Phone className="h-4 w-4" />}
          placeholder="+234 800 000 0000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Provide at least one of email or phone so we can contact you if needed.
        </p>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <Button type="submit" fullWidth size="lg" loading={submitting}>
          {submitting ? "Joining…" : "Join event"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Guests can view and (if enabled by the organiser) ask questions and vote.
      </p>
    </div>
  );
}
