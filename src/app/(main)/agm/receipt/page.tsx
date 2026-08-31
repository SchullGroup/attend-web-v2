"use client";
import { Suspense, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Download, Copy, Check, Building2, ChevronRight, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { QRCodeSVG } from "qrcode.react";
import { downloadNodeAsPdf } from "@/lib/dom-to-pdf";
import { voteLabel } from "@/lib/agm-format";
import { ProxyCastVotes } from "@/components/attend/ProxyCastVotes";
import { useGetVoteReceipt, useGetProxy, useRevokeProxy } from "@/api/agm/hooks";
import { useGetEvents } from "@/api/events/hooks";
import { EventListItem } from "@/types";
import { formatDate } from "@/lib/utils";


function ReceiptInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";
  const [copied, setCopied] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revokeSuccess, setRevokeSuccess] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useGetVoteReceipt(eventId);
  const receipt = data?.data;
  const { data: proxyData } = useGetProxy(eventId);
  const proxy = proxyData?.data;
  const { mutate: revokeProxy, isPending: revoking } = useRevokeProxy(eventId);

  function handleRevoke() {
    setRevokeError(null);
    revokeProxy(undefined, {
      onSuccess: () => {
        setRevokeSuccess(true);
        router.refresh();
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message;
        setRevokeError(
          msg && !msg.includes("Something went wrong")
            ? msg
            : "Failed to revoke proxy. Please try again."
        );
      },
    });
  }

  // No event selected ΓåÆ let the user pick which AGM's receipt to view. There's no
  // "list all receipts" endpoint, so we list the AGMs they're registered for.
  if (!eventId) {
    return <ReceiptPicker />;
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="h-72 animate-pulse rounded-3xl border border-border bg-muted" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="space-y-6">
        <Link href="/agm/receipt" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All receipts
        </Link>
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No vote receipt found. Cast your votes at an AGM and your receipt will appear here.
        </div>
      </div>
    );
  }

  const votesList = receipt.votes || [];
  const preVotesList = (receipt as any).preVotes || (receipt as any).earlyVotes || [];

  // Combine lists, matching by resolutionId to avoid duplicates
  const combinedVotes = [...votesList];
  preVotesList.forEach((pv: any) => {
    if (!combinedVotes.some(v => v.resolutionId === pv.resolutionId)) {
      combinedVotes.push(pv);
    }
  });

  const view = {
    reference: data?.referenceId ?? "ΓÇö",
    meeting: receipt.eventTitle,
    date: combinedVotes[0]?.votedAt ? formatDate(combinedVotes[0].votedAt) : "ΓÇö",
    resolutions: combinedVotes.map((v: any, i) => {
      const isPre = !!v.preVote || !!v.isPreVote || !!v.earlyVote || !!v.early || preVotesList.includes(v);
      return {
        num: i + 1,
        title: v.resolutionTitle,
        vote: voteLabel(v.choice),
        isPre,
        castByProxy: !!v.castByProxy,
        proxyName: v.proxyName as string | undefined,
      };
    }),
  };

  function copy() {
    navigator.clipboard.writeText(view.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function downloadPdf() {
    if (!docRef.current) return;
    setDownloading(true);
    try {
      await downloadNodeAsPdf(docRef.current, `vote-receipt-${view.reference}.pdf`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mx-auto max-w-2xl">
        <div ref={docRef} className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
          <div className="border-b border-border bg-linear-to-br from-emerald-500 to-emerald-700 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-white/80">
                  Vote receipt
                </p>
                <h1 className="text-lg font-bold">
                  {view.resolutions.length > 0
                    ? "Your votes have been recorded"
                    : proxy && proxy.proxyName && !revokeSuccess
                    ? "Proxy Appointed"
                    : "Vote receipt"}
                </h1>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Row label="Meeting" value={view.meeting} />
              <Row label="Cast at" value={view.date} />
              <div>
                <p className="text-xs text-muted-foreground">Reference</p>
                <button
                  onClick={copy}
                  className="mt-0.5 inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary"
                >
                  {view.reference}
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resolutions
              </p>
              {view.resolutions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No votes recorded for this meeting yet.
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {view.resolutions.map((r) => (
                    <li key={r.num} className="flex items-center justify-between p-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Resolution {r.num}</p>
                        <p className="font-medium text-foreground">{r.title}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            r.vote === "For"
                              ? "bg-emerald-100 text-emerald-700"
                              : r.vote === "Against"
                              ? "bg-red-100 text-red-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {r.vote} {r.isPre && "(Pre-vote)"}
                        </span>
                        {r.castByProxy && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                            Cast by {r.proxyName || "Proxy"}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {revokeSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
                Proxy has been successfully revoked. You can now vote directly on resolutions.
              </div>
            )}

            {proxy && proxy.proxyName && !revokeSuccess && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Appointed Proxy
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRevoke}
                    loading={revoking}
                    data-pdf-hide
                    className="border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
                  >
                    Revoke Proxy
                  </Button>
                </div>

                {revokeError && (
                  <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-600">
                    {revokeError}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3.5 bg-slate-50/50">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                      <UserCheck className="h-4.5 w-4.5" />
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-foreground">{proxy.proxyName}</p>
                      {(proxy.proxyEmail || proxy.proxyPhone) && (
                        <p className="text-xs text-muted-foreground">
                          {[proxy.proxyEmail, proxy.proxyPhone].filter(Boolean).join(" ┬╖ ")}
                        </p>
                      )}
                      {proxy.assignedAt && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          Appointed {formatDate(proxy.assignedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  {(proxy.proxyCode || (receipt as any)?.proxyCode) && (
                    <div className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Proxy Code</p>
                      <p className="font-mono text-sm font-bold tracking-widest text-purple-900">
                        {proxy.proxyCode || (receipt as any)?.proxyCode}
                      </p>
                    </div>
                  )}
                </div>

                {/* ┬º11 ΓÇö signed QR of the proxy code. The holder scans it at /join to sign
                    in as a proxy; being HMAC-signed, a forged image fails verification. */}
                {(proxy.proxyQrCode || (receipt as any)?.proxyQrCode) && (
                  <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-border bg-white p-4">
                    <div className="rounded-lg bg-white p-2 ring-1 ring-border">
                      <QRCodeSVG
                        value={String(proxy.proxyQrCode || (receipt as any)?.proxyQrCode)}
                        size={148}
                        level="M"
                      />
                    </div>
                    <p className="max-w-xs text-center text-[11px] text-muted-foreground">
                      Have your proxy scan this at sign-in to vote on your behalf ΓÇö no code to type.
                    </p>
                  </div>
                )}
              </div>
            )}

            <ProxyCastVotes votes={votesList} proxyName={proxy?.proxyName} />

            <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
              This receipt is timestamped and serves as evidence of your
              participation and votes at the meeting.
            </div>

            <div data-pdf-hide className="flex flex-col gap-3 sm:flex-row">
              <Button fullWidth onClick={downloadPdf} loading={downloading} disabled={downloading}>
                <Download className="h-4 w-4" /> Download receipt
              </Button>
              <button
                onClick={() => router.back()}
                className="sm:flex-1 inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted/60 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptPicker() {
  const router = useRouter();
  const { data, isLoading } = useGetEvents({ eventType: "AGM_EGM", size: 50 });
  const agms = (data?.data?.events ?? []).filter(
    (e: EventListItem) => e.eventType === "AGM_EGM" && e.registered,
  );

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <header>
        <h1 className="text-2xl font-bold text-foreground">My receipts</h1>
        <p className="text-sm text-muted-foreground">
          Select an AGM to view your vote receipt.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-20 animate-pulse rounded-2xl border border-border bg-muted" />
          ))}
        </div>
      ) : agms.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          You don&apos;t have any AGM receipts yet. Once you vote at an AGM you&apos;re
          registered for, your receipt will appear here.
        </div>
      ) : (
        <ul className="space-y-3">
          {agms.map((e) => (
            <li key={e.id}>
              <Link
                href={`/agm/receipt?eventId=${e.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 hover:bg-muted/30"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(e.date)}{e.startTime ? ` ┬╖ ${e.startTime}` : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense>
      <ReceiptInner />
    </Suspense>
  );
}
