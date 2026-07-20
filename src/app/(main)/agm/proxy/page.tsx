"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import { useAssignProxy, useGetProxy, useGetResolutions } from "@/api/agm/hooks";
import { useGetEvent } from "@/api/events/hooks";
import type { ProxyDirection } from "@/types/agm";

// Item D — pre-directed proxy votes; auto-cast when resolution opens.
const DIRECTION_OPTIONS: Array<{ value: ProxyDirection; label: string; color: string }> = [
  { value: "FOR",              label: "For",              color: "text-green-700 border-green-300 bg-green-50" },
  { value: "AGAINST",          label: "Against",          color: "text-red-700 border-red-300 bg-red-50" },
  { value: "ABSTAIN",          label: "Abstain",          color: "text-amber-700 border-amber-300 bg-amber-50" },
  { value: "LET_PROXY_DECIDE", label: "Let proxy decide", color: "text-muted-foreground border-border bg-muted/30" },
];

type ProxyType = "chairman" | "named";
const CHAIRMAN_NAME = "Chairman of the Meeting";

function ProxyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";

  const [type, setType] = useState<ProxyType>("chairman");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: existingProxy } = useGetProxy(eventId);
  const { mutate: assignProxy, isPending } = useAssignProxy(eventId);
  const { data: eventData } = useGetEvent(eventId);
  // Item D — proxy is now available for VIRTUAL meetings too. No blocking here.
  const { data: resolutionsData } = useGetResolutions(eventId, undefined, !!eventId);
  const resolutions = resolutionsData?.data?.resolutions ?? [];

  // Per-resolution pre-directed choices (Item D). Default: LET_PROXY_DECIDE.
  const [directions, setDirections] = useState<Record<string, ProxyDirection>>({});
  useEffect(() => {
    if (!resolutions.length) return;
    setDirections((prev) => {
      const next = { ...prev };
      for (const r of resolutions) {
        if (!next[r.id]) next[r.id] = "LET_PROXY_DECIDE";
      }
      return next;
    });
  }, [resolutions]);

  const directedCount = useMemo(
    () => Object.values(directions).filter((d) => d && d !== "LET_PROXY_DECIDE").length,
    [directions],
  );

  useEffect(() => {
    if (!eventId) router.replace("/agm");
  }, [eventId, router]);

  const valid =
    type === "chairman" || (name.trim().length > 0 && /.+@.+\..+/.test(email));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (directedCount > 0) {
      const confirmed = window.confirm(
        `You are pre-directing votes on ${directedCount} of ${resolutions.length} resolutions. ` +
        "This cannot be changed after voting opens. Continue?",
      );
      if (!confirmed) return;
    }
    const directionsPayload = resolutions.map((r) => ({
      resolutionId: r.id,
      direction: directions[r.id] ?? "LET_PROXY_DECIDE",
    }));
    const payload =
      type === "chairman"
        ? { proxyName: CHAIRMAN_NAME, proxyEmail: "", proxyPhone: "", directions: directionsPayload }
        : { proxyName: name.trim(), proxyEmail: email.trim(), proxyPhone: phone.trim(), directions: directionsPayload };

    assignProxy(payload, {
      onSuccess: () => router.push(`/agm/receipt?eventId=${eventId}`),
      onError: (err: any) =>
        setErrorMsg(
          err?.response?.data?.message || err?.message || "Failed to assign proxy.",
        ),
    });
  }

  return (
    <div className="space-y-6">
      <Link href="/agm" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to AGMs
      </Link>

      <header>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Appoint a proxy</h1>
        <p className="text-sm text-muted-foreground">
          If you can&apos;t attend the meeting, appoint someone to vote on your behalf.
        </p>
        {existingProxy?.data && (
          <p className="mt-2 text-xs font-medium text-primary">
            Current proxy: {existingProxy.data.proxyName}
          </p>
        )}
      </header>

      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-white p-5 shadow-sm">
        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <Choice
            active={type === "chairman"}
            onClick={() => setType("chairman")}
            icon={UserCheck}
            title="Chairman of the meeting"
            body="Standard option — your vote follows your pre-vote choices."
          />
          <Choice
            active={type === "named"}
            onClick={() => setType("named")}
            icon={UserPlus}
            title="Named proxy"
            body="Nominate a specific verified shareholder."
          />
        </div>

        {type === "named" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              name="name"
              label="Proxy full name"
              placeholder="e.g. Adekunle Bello"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              name="email"
              label="Proxy email"
              type="email"
              placeholder="proxy@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              name="phone"
              label="Proxy phone (optional)"
              type="tel"
              placeholder="+234 800 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        )}

        {resolutions.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Direct your votes (optional)</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose your position on each resolution. Selections auto-cast when voting opens.
                Choose &quot;Let proxy decide&quot; to leave it to your proxy.
              </p>
            </div>
            {resolutions.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-white p-4">
                <p className="text-sm font-medium text-foreground">
                  {r.order ? `${r.order}. ` : ""}{r.title}
                </p>
                {r.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                    {r.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {DIRECTION_OPTIONS.map((opt) => {
                    const active = directions[r.id] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setDirections((d) => ({ ...d, [r.id]: opt.value }))
                        }
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                          active
                            ? opt.color
                            : "border-border bg-white text-muted-foreground hover:border-primary/40",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              {directedCount > 0
                ? `Pre-directing votes on ${directedCount} of ${resolutions.length} resolution${resolutions.length === 1 ? "" : "s"}.`
                : "All resolutions left to your proxy."}
            </p>
          </div>
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Proxy appointments must be submitted at least 48 hours before the meeting.
          You can revoke this anytime before voting opens.
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/agm")}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending} disabled={!valid || !eventId}>
            Submit proxy
          </Button>
        </div>
      </form>
    </div>
  );
}

function Choice({
  active, onClick, icon: Icon, title, body,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof UserCheck;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/40",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          active ? "bg-primary text-white" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
      </div>
    </button>
  );
}

export default function ProxyPage() {
  return (
    <Suspense>
      <ProxyPageInner />
    </Suspense>
  );
}
