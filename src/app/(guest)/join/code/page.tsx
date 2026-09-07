"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useGuestJoin } from "@/api/events/hooks";
import { storeGuestSession, resolveGuestLiveHref, readJoinResult } from "@/lib/guest-session";

// Figma "Web - Redesign" (7B0U0fGXTJGggQEKL0p08X), JOIN AS GUEST section,
// "Enter code" frame — reached by picking an event on the "Guest events" grid
// (../page.tsx), which carries that event's id (and title, for display only)
// through as query params. The join API is per-event (POST
// /guest/events/{eventId}/join) with no code→event lookup anywhere in the
// backend, so this page cannot resolve a bare code on its own — it always
// needs an eventId to have arrived with it.
function JoinByCodeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";
  const eventTitle = searchParams.get("title") ?? "";

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { mutate: guestJoin, isPending } = useGuestJoin(eventId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter an access, proxy or QR code to continue.");
      return;
    }
    setError(null);
    guestJoin(
      { code: trimmed, name: name.trim() || undefined },
      {
        onSuccess: async (res: any) => {
          const { token, eventType, guestName } = readJoinResult(res);
          if (!token) {
            setError("Joined, but no guest session was returned. Please try again.");
            return;
          }
          storeGuestSession(token, eventId, name.trim() || guestName);
          router.push(await resolveGuestLiveHref(eventId, token, eventType));
        },
        onError: (err: any) =>
          setError(
            err?.response?.data?.message || err?.message || "Invalid or expired access code."
          ),
      }
    );
  }

  if (!eventId) {
    return (
      <div className="mx-auto w-full max-w-[410px] space-y-8">
        <Link
          href="/join"
          aria-label="Go back"
          className="inline-flex rounded-full bg-white p-2 text-foreground shadow-[0px_1px_4px_0px_rgba(0,0,0,0.1)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">
            Select an event
          </h1>
          <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/70">
            Pick the event you have a code for from the guest events list, then enter your code
            from there.
          </p>
        </div>
        <Link href="/join">
          <Button fullWidth size="lg">
            Browse guest events
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[410px] space-y-8">
      <Link
        href="/join"
        aria-label="Go back"
        className="inline-flex rounded-full bg-white p-2 text-foreground shadow-[0px_1px_4px_0px_rgba(0,0,0,0.1)]"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div>
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Enter code</h1>
        <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/70">
          Enter your access code, proxy code or QR code to join the session
        </p>
        {eventTitle && (
          <p className="mt-2 truncate text-sm font-medium tracking-[-0.14px] text-foreground/80">
            {eventTitle}
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
          name="name"
          placeholder="Your Name (Optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          name="code"
          placeholder="Access, Proxy or QR Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Button type="submit" fullWidth size="lg" loading={isPending} disabled={!code.trim()}>
          Join Event
        </Button>
      </form>
    </div>
  );
}

export default function JoinByCodePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center p-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <JoinByCodeContent />
    </Suspense>
  );
}
