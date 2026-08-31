"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCheck, Mail, Phone, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { useGetProxyHistory, useRevokeProxy, useGetVoteReceipt } from "@/api/agm/hooks";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate, cn } from "@/lib/utils";
import { ProxyCastVotes } from "@/components/attend/ProxyCastVotes";
import { ProxyHistoryItem } from "@/types";

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
  const router = useRouter();
  const { data, isLoading } = useGetProxyHistory();
  const proxies = data?.data?.proxies ?? [];

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <header>
        <h1 className="text-2xl font-bold text-foreground">Proxy history</h1>
        <p className="text-sm text-muted-foreground">
          Every proxy you&apos;ve appointed to vote on your behalf.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-24 animate-pulse rounded-2xl border border-border bg-muted" />
          ))}
        </div>
      ) : proxies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          You haven&apos;t appointed any proxies yet. Appoint one from an AGM you&apos;re registered for.
        </div>
      ) : (
        <ul className="space-y-3">
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

  // The proxy-history payload carries no vote outcomes ΓÇö the only source of what a proxy
  // actually cast is the shareholder's vote receipt. Fetch it lazily, only once this row
  // is expanded, and pull out the castByProxy rows.
  const { data: receiptResp, isLoading: receiptLoading } = useGetVoteReceipt(p.eventId, expanded);
  const proxyVotes = (receiptResp?.data?.votes ?? []).filter((v) => v.castByProxy);

  const isRevoked = p.status?.toUpperCase() === "REVOKED";
  const isEnded = p.eventStatus?.toUpperCase() === "ENDED";
  // A proxy stands in for an absent shareholder ΓÇö once the meeting is LIVE, revoking
  // mid-meeting would strip the proxy's authority while voting may already be underway.
  // Same cutoff as appointment (see agm/proxy/page.tsx): blocked at LIVE and ENDED alike.
  const isLive = p.eventStatus?.toUpperCase() === "LIVE";
  const showRevoke = !isRevoked && !isEnded && !isLive;

  // The downloadable record of what a proxy voted lives on the vote-receipt page ΓÇö it
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
    <li className="rounded-2xl border border-border bg-white p-4 space-y-3">
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
          {errorMsg}
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{p.eventTitle}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(p.eventDate)}
            {p.assignedAt ? ` ┬╖ appointed ${formatDate(p.assignedAt)}` : ""}
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

      {/* The whole proxy card is the disclosure control ΓÇö clicking anywhere in it opens
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
        className="flex cursor-pointer flex-col justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/60 sm:flex-row sm:items-center"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50">
            <UserCheck className="h-4.5 w-4.5 text-purple-600" />
          </div>
          <div className="min-w-0 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <span className="truncate">{p.proxyName}</span>
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
            </p>
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
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
            Revoke Proxy
          </Button>
        )}
      </div>

      <div className={cn(expanded && "border-t border-border pt-3")}>
        {expanded && (
          <div className="space-y-3">
            {receiptLoading ? (
              <div className="h-16 animate-pulse rounded-xl bg-muted" />
            ) : proxyVotes.length > 0 ? (
              <ProxyCastVotes votes={proxyVotes} proxyName={p.proxyName} />
            ) : (
              <p className="rounded-xl border border-border bg-slate-50 p-3 text-xs text-muted-foreground">
                No votes have been recorded by this proxy yet
                {p.eventStatus?.toUpperCase() === "ENDED" ? "." : " ΓÇö check back once voting is underway."}
              </p>
            )}

            {canDownload && (
              <Link href={`/agm/receipt?eventId=${p.eventId}`}>
                <Button type="button" variant="outline" size="sm" className="bg-white">
                  <FileText className="mr-1.5 h-4 w-4" /> View &amp; download vote receipt
                </Button>
              </Link>
            )}

            {/* Pre-set voting directions ΓÇö only if the backend ever populates them. */}
            {p.directions && p.directions.length > 0 && (
              <div className="space-y-2 rounded-xl bg-slate-50 p-3 border border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Resolution Directions</h4>
                <div className="space-y-2.5">
                  {p.directions.map((dir, idx) => (
                  <div key={dir.resolutionId || idx} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 last:border-b-0 pb-2 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {dir.resolutionTitle || `Resolution ${idx + 1}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn(
                        "rounded-lg px-2 py-0.5 text-[10px] font-bold border uppercase",
                        dir.direction === "FOR" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : dir.direction === "AGAINST" ? "bg-rose-50 text-rose-700 border-rose-200"
                          : dir.direction === "ABSTAIN" ? "bg-slate-50 text-slate-700 border-slate-200"
                          : "bg-primary/5 text-primary border-primary/20"
                      )}>
                        Direct: {dir.direction?.replace(/_/g, " ") || "LET PROXY DECIDE"}
                      </span>
                      {dir.castOutcome && (
                        <span className={cn(
                          "rounded-lg px-2 py-0.5 text-[10px] font-bold border uppercase",
                          dir.castOutcome === "AUTO_CAST" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : dir.castOutcome === "OVERRIDDEN" ? "bg-amber-50 text-amber-700 border-amber-200"
                            : dir.castOutcome === "REVOKED" ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-slate-50 text-slate-500 border-slate-200"
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
