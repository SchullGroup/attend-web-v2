"use client";
import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, User } from "lucide-react";
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

  // Prefilled from the /join landing page's optional "Your Name" field, if
  // the guest arrived via that code-entry step rather than a direct link.
  const [fullName, setFullName] = useState(search.get("name") ?? "");
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
    <div className="space-y-8">
      <Link
        href="/join"
        aria-label="Go back"
        className="inline-flex rounded-full bg-white p-2 text-foreground shadow-[0px_1px_4px_0px_rgba(0,0,0,0.1)]"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div>
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">
          Join as a guest
        </h1>
        <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/70">
          {inviteInfo?.eventTitle
            ? `You've been invited to ${inviteInfo.eventTitle}. Enter a few details to continue.`
            : "You've been invited to an Attend event. Enter a few details to continue."}
        </p>
        {inviteInfo?.capabilities && (
          <p className="mt-2 text-xs text-foreground/60">
            You will be able to: {inviteInfo.capabilities.join(", ").toLowerCase()}
          </p>
        )}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm text-red-600">
            {error}
          </div>
        )}
        <Input
          name="fullName"
          leftIcon={<User className="h-4 w-4" />}
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Input
          name="email"
          type="email"
          leftIcon={<Mail className="h-4 w-4" />}
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          name="phone"
          type="tel"
          leftIcon={<Phone className="h-4 w-4" />}
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <p className="text-xs text-foreground/60">
          Provide at least one of email or phone so we can contact you if needed.
        </p>
        <div className="space-y-1.5">
          <label htmlFor="role" className="text-sm font-medium text-foreground">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="h-[50px] w-full rounded-[10px] border border-transparent bg-foreground/[0.04] px-3.5 text-sm tracking-[-0.14px] text-foreground transition-colors focus-visible:outline-none focus-visible:border-primary"
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

      <p className="text-center text-xs text-foreground/60">
        Guests can view and (if enabled by the organiser) ask questions and vote.
      </p>
    </div>
  );
}
