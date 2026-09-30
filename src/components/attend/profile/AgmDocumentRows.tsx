"use client";
import { useEffect } from "react";
import { FileText } from "lucide-react";
import { useGetMinutes, useGetVoteReceipt } from "@/api/agm/hooks";

function hasMinutesContent(data: ReturnType<typeof useGetMinutes>["data"]): boolean {
  return !!data?.data?.content?.trim();
}

function hasReceiptContent(data: ReturnType<typeof useGetVoteReceipt>["data"]): boolean {
  const receipt = data?.data;
  const votesList = receipt?.votes ?? [];
  const preVotesList = (receipt as any)?.preVotes || (receipt as any)?.earlyVotes || [];
  return !!receipt && (votesList.length > 0 || preVotesList.length > 0);
}

// Minutes and vote receipts aren't rows the backend's /documents list carries — that endpoint
// is the organiser's own uploads (notices, agendas, proxy forms). Minutes and receipts are
// generated per participant off separate endpoints (useGetMinutes / useGetVoteReceipt) and
// downloaded as a DOM snapshot from inside their own sheets (see MinutesSheet/ReceiptSheet),
// so there's no file URL to list here ahead of time. These rows fetch just enough to know
// whether there's something to show, and open the real sheet (which has the actual download
// button) rather than trying to reproduce the PDF export out of context.

const rowClass =
  "flex items-center gap-3 rounded-xl border border-foreground/6 bg-white p-3 text-left shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]";

function DocRow({
  title, subtitle, onOpen,
}: {
  title: string;
  subtitle: string;
  onOpen: () => void;
}) {
  return (
    <li>
      <button type="button" onClick={onOpen} className={rowClass}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] bg-foreground/4">
          <FileText className="h-[18px] w-[18px] text-foreground/50" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-[-0.14px] text-foreground">{title}</p>
          <p className="truncate text-xs text-foreground/60">{subtitle}</p>
        </div>
      </button>
    </li>
  );
}

/** Renders nothing until minutes are actually finalised for this event. */
export function MinutesDocRow({
  eventId, eventTitle, onOpen,
}: {
  eventId: string;
  eventTitle: string;
  onOpen: () => void;
}) {
  const { data } = useGetMinutes(eventId);
  if (!hasMinutesContent(data)) return null;
  return <DocRow title={`${eventTitle} — Minutes`} subtitle="Meeting minutes" onOpen={onOpen} />;
}

/** Renders nothing until there's at least one recorded vote for this event. */
export function ReceiptDocRow({
  eventId, eventTitle, onOpen,
}: {
  eventId: string;
  eventTitle: string;
  onOpen: () => void;
}) {
  const { data } = useGetVoteReceipt(eventId);
  if (!hasReceiptContent(data)) return null;
  return <DocRow title={`${eventTitle} — Vote receipt`} subtitle="Vote receipt" onOpen={onOpen} />;
}

/**
 * Invisible — fetches the same two queries as the rows above purely to report whether they'd
 * render, so the profile page's "N documents" count (computed before the vault panel is ever
 * opened) agrees with what the panel actually shows. Same shape as the live-count pattern the
 * page already uses for My Events/Saved Events (see profile/page.tsx).
 */
export function AgmDocCounter({
  eventId, onCount,
}: {
  eventId: string;
  onCount: (counts: { minutes: boolean; receipt: boolean }) => void;
}) {
  const { data: minutesResp } = useGetMinutes(eventId);
  const { data: receiptResp } = useGetVoteReceipt(eventId);
  const minutes = hasMinutesContent(minutesResp);
  const receipt = hasReceiptContent(receiptResp);

  useEffect(() => {
    onCount({ minutes, receipt });
    // onCount is a fresh closure each render (keyed by eventId in the caller) — only the
    // resolved booleans should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, minutes, receipt]);

  return null;
}
