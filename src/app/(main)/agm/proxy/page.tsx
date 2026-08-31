"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AgmBackButton } from "@/components/attend/AgmSubNav";
import { cn } from "@/lib/utils";
import { useAssignProxy, useGetProxy, useGetResolutions } from "@/api/agm/hooks";
import { useGetEvent } from "@/api/events/hooks";
import type { ProxyDirection } from "@/types/agm";

// Item D — pre-directed proxy votes; auto-cast when resolution opens.
const DIRECTION_OPTIONS: Array<{ value: ProxyDirection; label: string }> = [
  { value: "FOR", label: "For" },
  { value: "AGAINST", label: "Against" },
  { value: "ABSTAIN", label: "Abstain" },
  { value: "LET_PROXY_DECIDE", label: "Let proxy decide" },
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
    <div className="flex flex-col gap-6">
      <AgmBackButton href="/agm" label="Back to AGMs" />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Appoint a proxy</h1>
          <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/60">
            If you can&apos;t attend the meeting, appoint someone to vote on your behalf.
          </p>
          {existingProxy?.data && (
            <p className="mt-2 text-xs font-medium text-primary">
              Current proxy: {existingProxy.data.proxyName}
            </p>
          )}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-5">
          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Choice
              active={type === "chairman"}
              onClick={() => setType("chairman")}
              title="Appoint Chairman of the meeting"
              body="Your vote follows your pre-vote choices."
            />
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-foreground/10" />
              <span className="text-xs text-foreground/50">or</span>
              <div className="h-px flex-1 bg-foreground/10" />
            </div>
            <Choice
              active={type === "named"}
              onClick={() => setType("named")}
              title="Named proxy"
              body="Nominate a specific verified shareholder"
            />
          </div>

          {type === "named" && (
            <div className="flex flex-col gap-4">
              <Input
                name="name"
                placeholder="Proxy full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Input
                name="email"
                type="email"
                placeholder="Proxy email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                name="phone"
                type="tel"
                placeholder="Proxy phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          )}

          {resolutions.length > 0 && (
            <div className="flex flex-col gap-3 rounded-xl bg-foreground/[0.03] p-4">
              <div>
                <h3 className="text-sm font-medium tracking-[-0.14px] text-foreground">Direct your votes (optional)</h3>
                <p className="mt-1 text-xs text-foreground/60">
                  Choose your position on each resolution. Selections auto-cast when voting opens.
                  Choose &quot;Let proxy decide&quot; to leave it to your proxy.
                </p>
              </div>
              {resolutions.map((r) => (
                <div key={r.id} className="rounded-xl border border-foreground/[0.06] bg-white p-4">
                  <p className="text-sm font-medium tracking-[-0.14px] text-foreground">
                    {r.order ? `${r.order}. ` : ""}{r.title}
                  </p>
                  {r.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-foreground/60">
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
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                            active
                              ? "border-foreground bg-foreground text-background"
                              : "border-foreground/15 bg-white text-foreground/60 hover:border-foreground/30",
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="text-xs text-foreground/50">
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

          <div className="flex flex-col gap-3">
            <Button type="submit" size="lg" fullWidth loading={isPending} disabled={!valid || !eventId}>
              Submit Proxy
            </Button>
            <Button
              type="button"
              size="lg"
              fullWidth
              className="bg-foreground/[0.04] text-foreground/60 shadow-none hover:bg-foreground/[0.08]"
              onClick={() => router.push("/agm")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Choice({
  active, onClick, title, body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "border-foreground/10 bg-white hover:border-foreground/20",
      )}
    >
      <div>
        <p className="text-sm font-medium tracking-[-0.14px] text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-foreground/60">{body}</p>
      </div>
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
          active ? "border-primary" : "border-foreground/25",
        )}
      >
        {active && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </span>
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
