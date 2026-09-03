"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useGuestJoin } from "@/api/events/hooks";
import { storeGuestSession, resolveGuestLiveHref, readJoinResult } from "@/lib/guest-session";

// One-click guest invite link. The shape is the backend's own: creating a guest access
// code documents it as shareable at ".../guest-join?eventId=...&code=...", so the event
// id travels with the code — that's why no code→event lookup endpoint exists.
function GuestJoinInner() {
  const router = useRouter();
  const params = useSearchParams();
  const eventId = params.get("eventId") ?? "";
  const codeParam = (params.get("code") ?? "").toUpperCase();

  const [code, setCode] = useState(codeParam);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { mutate: guestJoin, isPending } = useGuestJoin(eventId);

  // Auto-join once when the link carries both halves; the ref stops React strict-mode's
  // double-effect from firing a second join and burning an extra use off maxUses.
  const attempted = useRef(false);

  function join(value: string, joinName?: string) {
    setError(null);
    guestJoin(
      { code: value.trim(), name: joinName?.trim() || undefined },
      {
        onSuccess: async (res: any) => {
          const { token, eventType, guestName } = readJoinResult(res);
          if (!token) {
            setError("Joined, but no guest session was returned. Please try again.");
            return;
          }
          storeGuestSession(token, eventId, joinName?.trim() || guestName);
          router.replace(await resolveGuestLiveHref(eventId, token, eventType));
        },
        onError: (err: any) =>
          setError(
            err?.response?.data?.message || err?.message || "This invite link is invalid or has expired.",
          ),
      },
    );
  }

  useEffect(() => {
    if (attempted.current) return;
    if (!eventId || !codeParam) return;
    attempted.current = true;
    join(codeParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, codeParam]);

  // A link missing the event id can't be resolved — a code alone doesn't identify an
  // event — so send them to browse rather than showing a dead end.
  if (!eventId) {
    return (
      <Shell>
        <h1 className="text-lg font-medium tracking-[-0.4px] text-foreground">Incomplete invite link</h1>
        <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/60">
          This link is missing the event it belongs to. You can find your event and enter the
          code manually.
        </p>
        <Link href="/guest" className="mt-4 inline-block">
          <Button>Find my event</Button>
        </Link>
      </Shell>
    );
  }

  if (isPending) {
    return (
      <Shell>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="mt-3 text-sm font-medium text-foreground">Joining as guest…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-primary/10">
        <KeyRound className="h-5 w-5 text-primary" />
      </div>
      <h1 className="mt-3 text-lg font-medium tracking-[-0.4px] text-foreground">Join as a guest</h1>
      <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/60">
        Enter the access code from your invitation.
      </p>

      {error && (
        <div className="mt-4 w-full rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mt-4 flex w-full gap-2">
        <input
          autoFocus
          className="flex-1 rounded-[10px] border border-transparent bg-foreground/[0.04] px-4 py-2.5 text-sm tracking-widest outline-none transition-colors placeholder:text-foreground/40 focus:border-primary focus:bg-white"
          placeholder="e.g. 7F3KQXPM"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter" && code.trim().length >= 3) join(code, name);
          }}
          maxLength={12}
        />
        <Button disabled={code.trim().length < 3} onClick={() => join(code, name)}>
          Join
        </Button>
      </div>

      <input
        className="mt-2 w-full rounded-[10px] border border-transparent bg-foreground/[0.04] px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-foreground/40 focus:border-primary focus:bg-white"
        placeholder="Your name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <Link href="/guest" className="mt-4 text-sm text-foreground/60 transition-colors hover:text-foreground">
        Browse other events
      </Link>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col items-center rounded-xl border border-foreground/[0.06] bg-white p-8 text-center shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
        {children}
      </div>
    </div>
  );
}

export default function GuestJoinPage() {
  return (
    <Suspense>
      <GuestJoinInner />
    </Suspense>
  );
}
