"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BadgeCheck, Download, Copy, Check, Building2, ChevronRight, UserCheck, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { jsPDF } from "jspdf";
import { useGetVoteReceipt, useGetProxy } from "@/api/agm/hooks";
import { useGetEvents } from "@/api/events/hooks";
import { EventListItem } from "@/types";
import { AgmBackButton, AgmHero, AgmSubNav } from "@/components/attend/AgmSubNav";
import { formatDate } from "@/lib/utils";

function voteLabel(c: string) {
  const u = (c || "").toUpperCase();
  return u === "FOR" ? "For" : u === "AGAINST" ? "Against" : "Abstain";
}
const VOTE_PILL: Record<string, string> = {
  For: "bg-primary/10 text-primary",
  Against: "bg-red-50 text-red-600",
  Abstain: "bg-foreground/[0.06] text-foreground/60",
};

function ReceiptInner() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useGetVoteReceipt(eventId);
  const receipt = data?.data;
  const { data: proxyData } = useGetProxy(eventId);
  const proxy = proxyData?.data;

  // No event selected → let the user pick which AGM's receipt to view. There's no
  // "list all receipts" endpoint, so we list the AGMs they're registered for.
  if (!eventId) {
    return <ReceiptPicker />;
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="h-72 animate-pulse rounded-xl bg-foreground/[0.04]" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex flex-col gap-6">
        <AgmBackButton href="/agm/receipt" label="All receipts" />
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
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
        // Item G — nominee metadata (populated when the resolution had nominees)
        nomineeName: v.nomineeName as string | undefined,
        // Item D — proxy pre-directed indicator
        viaProxy: !!v.viaProxy,
      };
    }),
  };

  function copy() {
    navigator.clipboard.writeText(view.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Build the receipt as a real PDF (drawn directly, so it's crisp and one page).
  function downloadPdf() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 48;
    let y = 64;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Vote Receipt", margin, y);
    y += 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text("Your votes have been recorded", margin, y);
    doc.setTextColor(20);
    y += 30;

    const field = (label: string, value: string) => {
      doc.setFontSize(9);
      doc.setTextColor(130);
      doc.text(label.toUpperCase(), margin, y);
      y += 14;
      doc.setFontSize(12);
      doc.setTextColor(20);
      const lines = doc.splitTextToSize(value || "—", pageW - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 15 + 12;
    };

    field("Meeting", view.meeting);
    field("Cast at", view.date);
    field("Reference", view.reference);

    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text("RESOLUTIONS", margin, y);
    y += 16;
    doc.setTextColor(20);
    if (view.resolutions.length === 0) {
      doc.setFontSize(11);
      doc.text("No votes recorded.", margin, y);
      y += 18;
    } else {
      view.resolutions.forEach((r) => {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        const headText = r.nomineeName
          ? `Resolution ${r.num}: ${r.title} — ${r.nomineeName}`
          : `Resolution ${r.num}: ${r.title}`;
        const title = doc.splitTextToSize(headText, pageW - margin * 2 - 100);
        doc.text(title, margin, y);
        doc.setFont("helvetica", "normal");
        const suffix = [
          r.isPre ? "Pre-vote" : null,
          r.viaProxy ? "via proxy" : null,
        ].filter(Boolean).join(", ");
        const textLabel = suffix ? `${r.vote} (${suffix})` : r.vote;
        doc.text(textLabel, pageW - margin, y, { align: "right" });
        y += title.length * 15 + 8;
      });
    }
    y += 10;

    if (proxy && proxy.proxyName) {
      doc.setFontSize(9);
      doc.setTextColor(130);
      doc.text("PROXY", margin, y);
      y += 16;
      doc.setFontSize(12);
      doc.setTextColor(20);
      doc.text(proxy.proxyName, margin, y);
      y += 16;
      const contact = [proxy.proxyEmail, proxy.proxyPhone].filter(Boolean).join("  ·  ");
      if (contact) {
        doc.setFontSize(10);
        doc.setTextColor(110);
        doc.text(contact, margin, y);
        y += 14;
      }
      if (proxy.assignedAt) {
        doc.setFontSize(9);
        doc.setTextColor(130);
        doc.text(`Appointed ${formatDate(proxy.assignedAt)}`, margin, y);
        y += 16;
      }
      doc.setTextColor(20);
    }

    y += 12;
    doc.setFontSize(9);
    doc.setTextColor(130);
    const footer = doc.splitTextToSize(
      "This receipt is timestamped and serves as evidence of your participation and votes at the meeting.",
      pageW - margin * 2,
    );
    doc.text(footer, margin, y);

    doc.save(`vote-receipt-${view.reference}.pdf`);
  }

  return (
    <div className="flex flex-col gap-6">
      <AgmBackButton href="/agm/receipt" label="All receipts" />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <BadgeCheck className="h-8 w-8 text-primary" />
          </span>
          <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Vote receipt</h1>
          <p className="text-sm tracking-[-0.14px] text-foreground/60">Your votes have been recorded</p>
        </div>

        <div className="rounded-xl border border-foreground/[0.06] bg-white p-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
          <div className="flex items-start justify-between gap-3 pb-4">
            <Row label="Meeting" value={view.meeting} />
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </span>
          </div>
          <hr className="border-foreground/[0.06]" />
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
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/50 hover:bg-foreground/[0.04] hover:text-foreground"
              aria-label="Copy reference"
            >
              {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-medium tracking-[-0.6px] text-foreground">Resolutions</h2>
          {view.resolutions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-foreground/15 p-6 text-center text-sm text-foreground/50">
              No votes recorded for this meeting yet.
            </div>
          ) : (
            <div className="divide-y divide-foreground/[0.06] rounded-xl border border-foreground/[0.06] bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
              {view.resolutions.map((r, i) => (
                <div key={`${r.num}-${i}`} className="p-4">
                  <p className="text-xs text-foreground/60">
                    Resolution {r.num}{r.nomineeName ? ` — ${r.nomineeName}` : ""}
                  </p>
                  <p className="mt-0.5 text-sm font-medium tracking-[-0.14px] text-foreground">{r.title}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <span className="text-foreground/60">Voted:</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${VOTE_PILL[r.vote]}`}>
                      {r.vote}
                    </span>
                    {r.isPre && <span className="text-foreground/40">Pre-vote</span>}
                    {r.viaProxy && <span className="text-foreground/40">via proxy</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {proxy && proxy.proxyName && (
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-medium tracking-[-0.6px] text-foreground">Proxy</h2>
            <div className="flex items-start gap-3 rounded-xl border border-foreground/[0.06] bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
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
          </div>
        )}

        <p className="rounded-xl bg-foreground/[0.03] p-3 text-xs text-foreground/60">
          This receipt is timestamped and serves as evidence of your
          participation and votes at the meeting.
        </p>

        <Button size="lg" fullWidth onClick={downloadPdf}>
          <Download className="h-4 w-4" /> Download receipt
        </Button>
      </div>
    </div>
  );
}

function ReceiptPicker() {
  const { data, isLoading } = useGetEvents({ eventType: "AGM_EGM", size: 50 });
  const agms = (data?.data?.events ?? []).filter(
    (e: EventListItem) => e.eventType === "AGM_EGM" && e.registered,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 text-sm font-medium tracking-[-0.14px]">
        <span className="text-foreground">AGM</span>
        <ChevronRight className="h-3 w-3 -rotate-90 text-foreground/40" />
        <span className="text-foreground/40">My receipts</span>
      </div>

      <AgmHero />
      <AgmSubNav active="receipts" />

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-medium tracking-[-0.6px] text-foreground">My receipts</h2>
        <p className="text-sm tracking-[-0.14px] text-foreground/60">
          Select an AGM to view your vote receipt.
        </p>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-foreground/50">Loading…</p>
      ) : agms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
          You don&apos;t have any AGM receipts yet. Once you vote at an AGM you&apos;re
          registered for, your receipt will appear here.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {agms.map((e) => (
            <Link
              key={e.id}
              href={`/agm/receipt?eventId=${e.id}`}
              className="flex items-center gap-2.5 rounded-xl border border-foreground/[0.06] bg-white p-1.5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
            >
              <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[10px] bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1 py-1">
                <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">{e.title}</p>
                <p className="flex items-center gap-1 text-xs text-foreground/80">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(e.date)}
                </p>
              </div>
              <span className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground/10 text-foreground/60">
                <ChevronRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
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

export default function ReceiptPage() {
  return (
    <Suspense>
      <ReceiptInner />
    </Suspense>
  );
}
