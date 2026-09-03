"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserCheck, Mail, Phone, ChevronDown, ChevronUp, FileText, ChevronRight } from "lucide-react";
import { useGetProxyHistory, useRevokeProxy, useGetVoteReceipt } from "@/api/agm/hooks";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AgmHero, AgmSubNav } from "@/components/attend/AgmSubNav";
import { formatDate, cn } from "@/lib/utils";
import { ProxyCastVotes } from "@/components/attend/ProxyCastVotes";
import { ProxyHistoryItem } from "@/types";

// Re-skinned to the figma-redesign flat design (hub layout: AgmHero + AgmSubNav).
// OUR logic is preserved wholesale: per-row expand to reveal what the proxy actually
// cast (ProxyCastVotes derived from the vote receipt), in-place revoke, a link to the
// receipt document, and pre-set direction/outcome display — figma's proxy-history
// dropped all of these and only listed identity + status.

type Tone = "info" | "success" | "muted" | "danger" | "warning";

const statusTone = (s: string): Tone => {
  const u = (s || "").toUpperCase();
  if (u === "ATTENDED" || u === "AUTO_CAST") return "success";
  if (u === "ACCEPTED" || u === "INFO") return "info";
  if (u === "PENDING" || u === "OVERRIDDEN") return "warning";
  if (u === "REVOKED" || u === "CANCELLED") return "danger";
  return "muted";
};

const eventStatusTone = (s: string): Tone => {
  const u = (s || "").toUpperCase();
  if (u === "LIVE") return "info";
  if (u === "ENDED") return "muted";
  if (u === "CANCELLED") return "danger";
  return "success";
};

export default function ProxyHistoryPage() {
  const { data, isLoading } = useGetProxyHistory();
  const proxies = data?.data?.proxies ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 text-sm font-medium tracking-[-0.14px]">
        <span className="text-foreground">AGM</span>
        <ChevronRight className="h-3 w-3 -rotate-90 text-foreground/40" />
        <span className="text-foreground/40">Proxy history</span>
      </div>

      <AgmHero />
      <AgmSubNav active="proxy-history" />

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-medium tracking-[-0.6px] text-foreground">Proxy history</h2>
        <p className="text-sm tracking-[-0.14px] text-foreground/60">
          Every proxy you&apos;ve appointed to vote on your behalf.
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-24 animate-pulse rounded-xl bg-foreground/[0.04]" />
          ))}
        </div>
      ) : proxies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
          You haven&apos;t appointed any proxies yet. Appoint one from an AGM you&apos;re registered for.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {proxies.map((p) => (
            <ProxyHistoryItemRow key={p.id} p={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProxyHistoryItemRow({ p }: { p: ProxyHistoryItem }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const { mutate: revoke, isPending: revoking } = useRevokeProxy(p.eventId);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // The proxy-history payload carries no vote outcomes — the only source of what a proxy
  // actually cast is the shareholder's vote receipt. Fetch it lazily, only once this row
  // is expanded, and pull out the castByProxy rows.
  const { data: receiptResp, isLoading: receiptLoading } = useGetVoteReceipt(p.eventId, expanded);
  const proxyVotes = (receiptResp?.data?.votes ?? []).filter((v) => v.castByProxy);

  const isRevoked = p.status?.toUpperCase() === "REVOKED";
  const isEnded = p.eventStatus?.toUpperCase() === "ENDED";
  // A proxy stands in for an absent shareholder — once the meeting is LIVE, revoking
  // mid-meeting would strip the proxy's authority while voting may already be underway.
  // Same cutoff as appointment (see agm/proxy/page.tsx): blocked at LIVE and ENDED alike.
  const isLive = p.eventStatus?.toUpperCase() === "LIVE";
  const showRevoke = !isRevoked && !isEnded && !isLive;

  // The downloadable record of what a proxy voted lives on the vote-receipt page — it
  // owns the document and its PDF export. Rather than rebuild that document here from
  // partial data, link straight to it for this event.
  const receipt = receiptResp?.data;
  const canDownload = !!receipt;

  function handleRevoke() {
    setErrorMsg(null);
    revoke(undefined, {
      onSuccess: () => {
        router.refresh();
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message;
        setErrorMsg(
          msg && !msg.includes("Something went wrong")
            ? msg
            : "Proxy revocation endpoint (DELETE /api/v1/participant/events/{eventId}/proxy) is currently unavailable on the server."
        );
      },
    });
  }

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-foreground/[0.06] bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
          {errorMsg}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium tracking-[-0.14px] text-foreground">{p.eventTitle}</p>
          <p className="text-xs text-foreground/60">
            {formatDate(p.eventDate)}
            {p.assignedAt ? ` · appointed ${formatDate(p.assignedAt)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {p.status && (
            <Badge variant={statusTone(p.status)}>
              {p.status.replace(/_/g, " ").charAt(0) + p.status.replace(/_/g, " ").slice(1).toLowerCase()}
            </Badge>
          )}
          {p.eventStatus && (
            <Badge variant={eventStatusTone(p.eventStatus)}>
              {p.eventStatus.charAt(0) + p.eventStatus.slice(1).toLowerCase()}
            </Badge>
          )}
        </div>
      </div>

      {/* The whole proxy card is the disclosure control — clicking anywhere in it opens
          the activity below, so no separate "What did your proxy vote?" button is needed. */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
        className="flex cursor-pointer flex-col justify-between gap-3 rounded-xl bg-foreground/[0.03] p-3 transition-colors hover:bg-foreground/[0.06] sm:flex-row sm:items-center"
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <UserCheck className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="min-w-0 text-sm">
            <p className="flex items-center gap-1.5 font-medium tracking-[-0.14px] text-foreground">
              <span className="truncate">{p.proxyName}</span>
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
              )}
            </p>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-foreground/60">
              {p.proxyEmail && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {p.proxyEmail}
                </span>
              )}
              {p.proxyPhone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {p.proxyPhone}
                </span>
              )}
              {p.sharesRepresented != null && p.sharesRepresented > 0 && (
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  {p.sharesRepresented.toLocaleString()} shares
                </span>
              )}
            </div>
          </div>
        </div>

        {showRevoke && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              // Don't let the revoke click bubble up and toggle the card open/closed.
              e.stopPropagation();
              handleRevoke();
            }}
            loading={revoking}
            className="self-start border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800 sm:self-auto"
          >
            Revoke proxy
          </Button>
        )}
      </div>

      <div className={cn(expanded && "border-t border-foreground/[0.06] pt-3")}>
        {expanded && (
          <div className="flex flex-col gap-3">
            {receiptLoading ? (
              <div className="h-16 animate-pulse rounded-xl bg-foreground/[0.04]" />
            ) : proxyVotes.length > 0 ? (
              <ProxyCastVotes votes={proxyVotes} proxyName={p.proxyName} />
            ) : (
              <p className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] p-3 text-xs text-foreground/60">
                No votes have been recorded by this proxy yet
                {p.eventStatus?.toUpperCase() === "ENDED" ? "." : " — check back once voting is underway."}
              </p>
            )}

            {canDownload && (
              <Link href={`/agm/receipt?eventId=${p.eventId}`}>
                <Button type="button" variant="outline" size="sm">
                  <FileText className="mr-1.5 h-4 w-4" /> View &amp; download vote receipt
                </Button>
              </Link>
            )}

            {/* Pre-set voting directions — only if the backend ever populates them. */}
            {p.directions && p.directions.length > 0 && (
              <div className="flex flex-col gap-2 rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] p-3">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground/50">Resolution directions</h4>
                <div className="flex flex-col gap-2.5">
                  {p.directions.map((dir, idx) => (
                    <div key={dir.resolutionId || idx} className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/[0.06] pb-2 last:border-b-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {dir.resolutionTitle || `Resolution ${idx + 1}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={cn(
                          "rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase",
                          dir.direction === "FOR" ? "border-primary/20 bg-primary/5 text-primary"
                            : dir.direction === "AGAINST" ? "border-red-200 bg-red-50 text-red-600"
                            : dir.direction === "ABSTAIN" ? "border-foreground/10 bg-foreground/[0.04] text-foreground/60"
                            : "border-primary/20 bg-primary/5 text-primary"
                        )}>
                          Direct: {dir.direction?.replace(/_/g, " ") || "LET PROXY DECIDE"}
                        </span>
                        {dir.castOutcome && (
                          <span className={cn(
                            "rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase",
                            dir.castOutcome === "AUTO_CAST" ? "border-primary/20 bg-primary/5 text-primary"
                              : dir.castOutcome === "OVERRIDDEN" ? "border-amber-200 bg-amber-50 text-amber-700"
                              : dir.castOutcome === "REVOKED" ? "border-red-200 bg-red-50 text-red-600"
                              : "border-foreground/10 bg-foreground/[0.04] text-foreground/50"
                          )}>
                            Outcome: {dir.castOutcome.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
