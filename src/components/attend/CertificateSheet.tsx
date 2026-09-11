"use client";
import { useEffect, useRef, useState } from "react";
import { X, Download, Award, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useGetCertificate, useGetChallenge } from "@/api/hackathon/hooks";
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

  // The certificate the organiser actually uploaded lives behind `downloadPath` — a route
  // named /public/ for a reason: it's meant to be hit as a plain browser navigation, not
  // fetched from JS. The first cut of this did `apiClient.get(downloadPath, {responseType:
  // "blob"})`, which is exactly the wrong shape twice over — (1) apiClient attaches the
  // Authorization header to anything not on its publicEndpoints allowlist, which this path
  // isn't on, sending a bearer token to a route designed to need none; (2) reading a
  // cross-origin redirect's body via script is subject to CORS, the same failure mode already
  // documented on documentsClient's counted download (redirects to Cloudinary/OBS, which sends
  // no CORS headers). A plain resource load — <object>/<iframe>/window.open — is a browser
  // navigation, not a script-mediated read, so neither problem applies: no header gets
  // attached, and CORS enforcement doesn't cover navigation. `next.config.ts` rewrites
  // /api/v1/:path* to the backend, so this relative path resolves same-origin regardless.
  //
  // Confirmed with the real endpoint: this navigation reaches the file — but the response
  // carries `Content-Disposition: attachment`, so the browser forces a save instead of an
  // inline render for ANY consumer of this URL (window.open, <object>, <iframe>, a raw link —
  // the header wins over all of them). That's actually correct for Download, which wants a
  // save. It rules out `<object data={certificateUrl}>` for the *preview*, which needs bytes
  // with no disposition attached at all — only achievable by fetching them ourselves and
  // handing the browser a `blob:` URL, which carries no HTTP headers of its own.
  const certificateUrl = cert?.downloadPath || null;
  const canShowPdf = !!certificateUrl && cert?.issued && cert?.downloadReady !== false;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    if (!isOpen || !canShowPdf || !certificateUrl) return;
    let objectUrl: string | null = null;
    let cancelled = false;

    // Confirmed via the browser console (2026-09-09): downloadPath 302s to a Huawei OBS bucket
    // that sends no Access-Control-Allow-Origin, so a direct browser fetch() of it is blocked
    // by CORS no matter what headers we send — that's decided entirely by the bucket's own
    // response, which this app doesn't control. Routing through our own /api/certificate-pdf
    // (server-to-server fetch, exempt from CORS) and re-fetching THAT — same-origin — is what
    // actually gets the bytes.
    fetch(`/api/certificate-pdf?path=${encodeURIComponent(certificateUrl)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        // #toolbar=0&navpanes=0&scrollbar=0 is the browser PDF viewer's own open-parameter
        // convention (Chrome/Edge's PDFium viewer and Firefox's pdf.js both honour it) — it
        // suppresses the viewer's built-in download/print/menu chrome, which otherwise sits on
        // top of the artwork inside our own panel that already has its own Download button.
        // Revoking still needs the bare objectUrl below; the fragment doesn't change the blob
        // it points at.
        setPreviewUrl(`${objectUrl}#toolbar=0&navpanes=0&scrollbar=0`);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("Certificate preview fetch failed:", certificateUrl, err);
        setPreviewFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
    };
  }, [isOpen, canShowPdf, certificateUrl]);

  async function handleDownload() {
    setDownloading(true);
    try {
      if (certificateUrl) {
        // A real navigation to the download route, not the preview's fetched blob — this is
        // the one place `Content-Disposition: attachment` is exactly what's wanted, and the
        // user has already confirmed this path saves the file correctly.
        window.open(certificateUrl, "_blank");
        return;
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
        <div className="h-72 animate-pulse rounded-xl bg-foreground/4" />
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
      {/* The organiser's real certificate. previewUrl is a blob: URL we built from a plain
          fetch — see the note above on why the raw certificateUrl can't be embedded directly
          (its response forces a download rather than an inline render). */}
      {previewUrl ? (
        <object
          data={previewUrl}
          type="application/pdf"
          className="h-[420px] w-full rounded-2xl border border-foreground/10 bg-foreground/2"
          aria-label="Attendance certificate"
        >
          {/* Browsers without an inline PDF viewer (notably iOS Safari) render this instead. */}
          <iframe src={previewUrl} title="Attendance certificate" className="h-full w-full" />
        </object>
      ) : canShowPdf && !previewFailed ? (
        <div className="h-[420px] w-full animate-pulse rounded-2xl bg-foreground/4" />
      ) : (
        <>
          {/* Fallback only — a locally drawn stand-in, NOT the organiser's artwork. Labelled
              so it can't be mistaken for the official document. certRef wraps it so the
              snapshot download still has something to capture. */}
          <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Showing a preview — download the PDF for your official certificate.
          </p>
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
        </>
      )}
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
            "transition-colors hover:bg-foreground/4 hover:text-foreground",
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </Dialog>
  );
}
