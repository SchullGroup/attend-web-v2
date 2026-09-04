"use client";
import { useRef, useState } from "react";
import { X, Download, Award, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useGetCertificate, useGetChallenge } from "@/api/hackathon/hooks";
import { hackathonClient } from "@/api/hackathon/client";
import { downloadNodeAsPdf } from "@/lib/dom-to-pdf";
import { Dialog } from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";

// Figma's Attendance Certificate sheet — a right-anchored panel (same shell as
// MinutesSheet/ReceiptSheet) with a compact certificate card and a pinned Download PDF
// button. The artwork itself is redesigned to the new cream/gold frame, replacing the
// old purple card. OUR logic is preserved wholesale: prefer the canonical server PDF,
// fall back to a DOM snapshot; the eligible/issued/downloadReady states are unchanged.
export function CertificateSheet({
  challengeId,
  open: isOpen,
  onClose,
}: {
  challengeId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useGetCertificate(challengeId);
  const cert = data?.data;
  // The old artwork's signature line named a fictitious "Chief Innovation Officer" —
  // no such field exists on the certificate response. Using the challenge's real
  // organiser name instead of inventing a person.
  const { data: chData } = useGetChallenge(challengeId);
  const organizerName = chData?.data?.organizerName;

  const isWinner = cert?.certificateType === "WINNER";
  const fileName = `certificate-${cert?.certificateNumber || challengeId}.pdf`;

  async function handleDownload() {
    setDownloading(true);
    try {
      // Prefer the canonical server-rendered PDF (it carries the organiser's
      // artwork and matches the verifier). Fall back to a snapshot of the on-page
      // card only if that path is missing or fails, so the button is never dead.
      if (cert?.downloadPath) {
        try {
          const blob = await hackathonClient.downloadCertificatePdf(cert.downloadPath);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 60_000);
          return;
        } catch {
          /* fall through to the DOM snapshot */
        }
      }
      if (certRef.current) {
        await downloadNodeAsPdf(certRef.current, fileName);
      }
    } finally {
      setDownloading(false);
    }
  }

  if (isLoading) {
    return (
      <Sheet onClose={onClose} isOpen={isOpen}>
        <div className="h-72 animate-pulse rounded-xl bg-foreground/[0.04]" />
      </Sheet>
    );
  }

  if (!cert) {
    return (
      <Sheet onClose={onClose} isOpen={isOpen}>
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
          No certificate found. Open this from a challenge you participated in.
        </div>
      </Sheet>
    );
  }

  // No certificate issued yet. `eligible` means "would qualify" — issuance is an
  // organiser-triggered run, so a qualifying entrant still waits for the file.
  if (!cert.issued) {
    const waiting = cert.eligible;
    return (
      <Sheet onClose={onClose} isOpen={isOpen}>
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-foreground/15 p-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-6 w-6 text-amber-600" />
          </span>
          <p className="text-sm font-medium tracking-[-0.14px] text-foreground">
            {waiting ? "Your certificate is being prepared" : "Certificate not available yet"}
          </p>
          <p className="text-sm text-foreground/60">
            {cert.message ||
              (waiting
                ? "You qualify for a certificate. It will appear here once the organiser issues it."
                : "Your certificate will be available once participation is confirmed.")}
          </p>
        </div>
      </Sheet>
    );
  }

  const view = {
    name: cert.participantName,
    eventTitle: cert.eventTitle,
    subline: cert.teamName ? `Team ${cert.teamName}` : "",
    verifyId: cert.certificateNumber || data?.referenceId || "—",
  };
  const pdfPending = cert.downloadReady === false;

  return (
    <Sheet
      onClose={onClose}
      isOpen={isOpen}
      footer={
        <>
          <Button
            size="lg"
            fullWidth
            onClick={handleDownload}
            loading={downloading}
            disabled={downloading || pdfPending}
          >
            <Download className="h-4 w-4" /> {pdfPending ? "Preparing…" : "Download PDF"}
          </Button>
          {pdfPending && (
            <p className="mt-2 text-center text-xs text-foreground/60">
              The PDF is still being generated — this will be ready shortly.
            </p>
          )}
        </>
      }
    >
      {/* certRef wraps the on-screen artwork → the PDF fallback is an exact snapshot. */}
      <div
        ref={certRef}
        className="relative overflow-hidden rounded-2xl border border-[#e7ded0] p-6"
        style={{ background: "linear-gradient(180deg, #fbf8f2 0%, #f6f1e6 100%)" }}
      >
        <ChevronCorner />

        <div className="relative flex flex-col gap-4">
          <img src="/attend-logo.png" alt="Attend" style={{ height: 18, width: "auto" }} />

          <div>
            <h2 className="font-serif text-3xl leading-tight text-foreground">Certificate</h2>
            <p className="text-xs text-foreground/50">
              {isWinner ? "of achievement" : "of attendance"}
            </p>
          </div>

          <div>
            <p className="text-xs text-foreground/60">This certificate is proudly presented to</p>
            <p className="mt-1 text-lg font-semibold uppercase tracking-wide text-foreground">
              {view.name}
            </p>
          </div>

          <div>
            <p className="text-xs text-foreground/60">
              {isWinner
                ? "for being recognised as a winner of"
                : "for having successfully participated in"}
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {view.eventTitle}
              {view.subline && <span className="font-normal text-foreground/60"> · {view.subline}</span>}
            </p>
          </div>

          <div className="mt-2 flex items-end justify-between gap-4">
            <div className="text-left">
              <p className="text-[11px] font-medium text-foreground">
                {organizerName || "Event Organiser"}
              </p>
              <div className="mt-1 w-24 border-t border-foreground/30 pt-1 text-[9px] uppercase tracking-wide text-foreground/50">
                Organiser
              </div>
            </div>

            <Seal />

            <div className="text-right">
              <p className="text-[11px] font-medium text-foreground">{view.verifyId}</p>
              <div className="mt-1 w-24 border-t border-foreground/30 pt-1 text-right text-[9px] uppercase tracking-wide text-foreground/50">
                Verification ID
              </div>
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

// Decorative teal/orange chevron ribbon in the card's top-right corner.
function ChevronCorner() {
  const teal = "#1F6F63";
  const orange = "#E98A2A";
  const rows = [teal, orange, teal, orange, teal];
  return (
    <div className="pointer-events-none absolute -right-6 -top-6 flex flex-col gap-1.5 opacity-90">
      {rows.map((color, i) => (
        <div key={i} className="h-3 w-28 rotate-45" style={{ backgroundColor: color }} />
      ))}
    </div>
  );
}

// Circular medal in place of a real signature graphic — no fabricated name attached.
function Seal() {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-50">
      <Award className="h-5 w-5 text-amber-600" />
    </span>
  );
}

// Sheet shell — Figma's right-anchored panel: title + close on one row, the Download
// button pinned at the bottom (outside certRef, so it never lands in the PDF snapshot).
function Sheet({
  children, onClose, isOpen, footer,
}: {
  children: React.ReactNode;
  onClose: () => void;
  isOpen: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <Dialog open={isOpen} onClose={onClose} side="right" footer={footer} className="max-w-md">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-medium tracking-[-0.32px] text-foreground">
          Attendance Certificate
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/60",
            "transition-colors hover:bg-foreground/[0.04] hover:text-foreground",
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </Dialog>
  );
}
