"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, CheckCircle2, XCircle, MinusCircle, Download, Copy, Check, Building2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { QRCodeSVG } from "qrcode.react";
import { downloadNodeAsPdf } from "@/lib/dom-to-pdf";
import { voteLabel } from "@/lib/agm-format";
import { ProxyCastVotes } from "@/components/attend/ProxyCastVotes";
import { useGetVoteReceipt, useGetProxy, useRevokeProxy } from "@/api/agm/hooks";
import { Dialog, DialogHeader } from "@/components/ui/Dialog";
import { formatDate } from "@/lib/utils";

// Re-skinned to the figma-redesign flat design. OUR logic is preserved wholesale:
//   • PDF export stays a DOM snapshot via downloadNodeAsPdf (html2canvas-pro), NOT
//     the hand-built jsPDF the figma branch still ships — docRef wraps the on-screen
//     document so the file is an exact snapshot of it.
//   • Proxy management (revoke, proxy code, signed QR) and the ProxyCastVotes
//     breakdown are kept — figma dropped all of these; they're real §10/§11 features.
//   • Pre-vote merging (preVotes/earlyVotes de-duped by resolutionId) and the
//     castByProxy per-resolution flags are kept.

const VOTE_PILL: Record<string, string> = {
  For: "bg-primary/10 text-primary",
  Against: "bg-red-50 text-red-600",
  Abstain: "bg-foreground/[0.06] text-foreground/60",
};

export function ReceiptSheet({
  eventId,
  open: isOpen,
  onClose,
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
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

  if (isLoading) {
    return (
      <Dialog open={isOpen} onClose={onClose} side="right">
        <DialogHeader onBack={onClose} title="Vote receipt" />
        <div className="h-72 animate-pulse rounded-xl bg-foreground/[0.04]" />
      </Dialog>
    );
  }

  if (!receipt) {
    return (
      <Dialog open={isOpen} onClose={onClose} side="right">
        <DialogHeader onBack={onClose} title="Vote receipt" />
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
          No vote receipt found. Cast your votes at an AGM and your receipt will appear here.
        </div>
      </Dialog>
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
    reference: data?.referenceId ?? "—",
    meeting: receipt.eventTitle,
    date: combinedVotes[0]?.votedAt ? formatDate(combinedVotes[0].votedAt) : "—",
    resolutions: combinedVotes.map((v: any, i) => {
      const isPre = !!v.preVote || !!v.isPreVote || !!v.earlyVote || !!v.early || preVotesList.includes(v);
      return {
        num: i + 1,
        title: v.resolutionTitle,
        vote: voteLabel(v.choice),
        isPre,
        castByProxy: !!v.castByProxy,
        proxyName: v.proxyName as string | undefined,
        nomineeName: v.nomineeName as string | undefined,
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

  const statusLine =
    view.resolutions.length > 0
      ? "Your votes have been recorded"
      : proxy && proxy.proxyName && !revokeSuccess
      ? "Proxy appointed"
      : "No votes recorded yet";

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      side="right"
      footer={
        /* Pinned per Figma — the body scrolls underneath it. Outside docRef, so it
           never lands in the PDF snapshot. */
        <Button size="lg" fullWidth onClick={downloadPdf} loading={downloading} disabled={downloading}>
          <Download className="h-4 w-4" /> Download receipt
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <button
          onClick={onClose}
          aria-label="Back"
          data-pdf-hide
          className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/10 text-foreground/70 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </button>

        {/* docRef wraps the document → the PDF is an exact snapshot of it. */}
        <div ref={docRef} className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <BadgeCheck className="h-12 w-12 fill-primary text-white" />
            <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Vote receipt</h1>
            <p className="text-sm tracking-[-0.14px] text-foreground/60">{statusLine}</p>
          </div>

          <div className="rounded-xl border border-foreground/[0.06] bg-white p-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
            <div className="flex items-start justify-between gap-3 pb-4">
              <Row label="Meeting" value={view.meeting} />
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </span>
            </div>
            <hr className="border-foreground/[0.06]" />
            {/* Two-column row per Figma: time on the left, channel on the right. */}
            <div className="grid grid-cols-2 gap-3 py-4">
              <Row label="Time of vote" value={view.date} />
              <div className="text-right">
                <p className="text-xs text-foreground/60">Cast via</p>
                <p className="mt-0.5 text-sm font-medium tracking-[-0.14px] text-foreground">Attend app</p>
              </div>
            </div>
            <hr className="border-foreground/[0.06]" />
            <div className="flex items-center justify-between gap-3 pt-4">
              <div className="min-w-0">
                <p className="text-xs text-foreground/60">Reference</p>
                <p className="mt-0.5 truncate text-sm font-medium tracking-[-0.14px] text-foreground">{view.reference}</p>
              </div>
              <button
                onClick={copy}
                data-pdf-hide
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/50 hover:bg-foreground/[0.04] hover:text-foreground"
                aria-label="Copy reference"
              >
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold tracking-[-0.14px] text-foreground">Resolutions</h2>
            {view.resolutions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-foreground/15 p-6 text-center text-sm text-foreground/50">
                No votes recorded for this meeting yet.
              </div>
            ) : (
              <div className="divide-y divide-foreground/[0.06] rounded-xl border border-foreground/[0.06] bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
                {view.resolutions.map((r) => (
                  <div key={r.num} className="p-4">
                    <p className="text-xs text-foreground/60">
                      Resolution {r.num}{r.nomineeName ? ` — ${r.nomineeName}` : ""}
                    </p>
                    <p className="mt-0.5 text-sm font-medium tracking-[-0.14px] text-foreground">{r.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-foreground/60">Voted:</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${VOTE_PILL[r.vote]}`}>
                        {r.vote === "For" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : r.vote === "Against" ? (
                          <XCircle className="h-3.5 w-3.5" />
                        ) : (
                          <MinusCircle className="h-3.5 w-3.5" />
                        )}
                        {r.vote}
                      </span>
                      {r.isPre && <span className="text-foreground/40">Pre-vote</span>}
                      {r.castByProxy && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                          Cast by {r.proxyName || "proxy"}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {revokeSuccess && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-primary">
              Proxy has been successfully revoked. You can now vote directly on resolutions.
            </div>
          )}

          {proxy && proxy.proxyName && !revokeSuccess && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xl font-medium tracking-[-0.6px] text-foreground">Appointed proxy</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRevoke}
                  loading={revoking}
                  data-pdf-hide
                  className="border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
                >
                  Revoke proxy
                </Button>
              </div>

              {revokeError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                  {revokeError}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-foreground/[0.06] bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <UserCheck className="h-4.5 w-4.5 text-primary" />
                  </span>
                  <div className="text-sm">
                    <p className="font-medium tracking-[-0.14px] text-foreground">{proxy.proxyName}</p>
                    {(proxy.proxyEmail || proxy.proxyPhone) && (
                      <p className="text-xs text-foreground/60">
                        {[proxy.proxyEmail, proxy.proxyPhone].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {proxy.assignedAt && (
                      <p className="mt-0.5 text-[11px] text-foreground/50">
                        Appointed {formatDate(proxy.assignedAt)}
                      </p>
                    )}
                  </div>
                </div>
                {(proxy.proxyCode || (receipt as any)?.proxyCode) && (
                  <div className="rounded-[10px] border border-foreground/[0.06] bg-foreground/[0.03] px-3 py-1.5 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/50">Proxy code</p>
                    <p className="font-mono text-sm font-bold tracking-widest text-foreground">
                      {proxy.proxyCode || (receipt as any)?.proxyCode}
                    </p>
                  </div>
                )}
              </div>

              {/* §11 — signed QR of the proxy code. The holder scans it at /join to sign
                  in as a proxy; being HMAC-signed, a forged image fails verification. */}
              {(proxy.proxyQrCode || (receipt as any)?.proxyQrCode) && (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-foreground/[0.06] bg-white p-4">
                  <div className="rounded-lg bg-white p-2 ring-1 ring-foreground/[0.06]">
                    <QRCodeSVG
                      value={String(proxy.proxyQrCode || (receipt as any)?.proxyQrCode)}
                      size={148}
                      level="M"
                    />
                  </div>
                  <p className="max-w-xs text-center text-[11px] text-foreground/60">
                    Have your proxy scan this at sign-in to vote on your behalf — no code to type.
                  </p>
                </div>
              )}
            </div>
          )}

          <ProxyCastVotes votes={votesList} proxyName={proxy?.proxyName} />

          <p className="rounded-xl bg-foreground/[0.03] p-3 text-xs text-foreground/60">
            This receipt is timestamped and serves as evidence of your
            participation and votes at the meeting.
          </p>
        </div>
      </div>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-foreground/60">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium tracking-[-0.14px] text-foreground">{value}</p>
    </div>
  );
}

