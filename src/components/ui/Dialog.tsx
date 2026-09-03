"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Figma's overlay treatment — a white panel over a dimmed backdrop, with a circular
// back-arrow control instead of the AgmBackButton full-page nav used elsewhere.
//
// Two placements:
//   "center" — a box that hugs its content, vertically centred (default).
//   "right"  — Figma's Pre-AGM voting sheet: anchored to the right edge with a small
//              inset, near full height, content top-aligned (so there is white space
//              below short content). Goes full-bleed with square corners on mobile.
// `footer` pins content to the bottom of the panel (Figma's receipt/minutes sheets put
// the Download button there, with the body scrolling underneath it). Without it the
// panel is a single scrolling column.
interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  side?: "center" | "right";
  footer?: React.ReactNode;
}

export function Dialog({ open, onClose, children, className, side = "center", footer }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const isRight = side === "right";

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[60] flex",
        isRight ? "justify-end p-0 sm:p-3" : "items-center justify-center p-4",
      )}
    >
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative flex w-full flex-col border border-foreground/[0.06] bg-white shadow-[0px_20px_60px_0px_rgba(0,0,0,0.25)]",
          // With a pinned footer the panel itself must not scroll — the body does.
          footer ? "overflow-hidden" : "overflow-y-auto",
          isRight
            // Full height, top-aligned: short content leaves white space below it.
            ? "h-full max-w-[600px] rounded-none sm:rounded-2xl"
            : "max-h-[90vh] max-w-md rounded-2xl",
          footer ? "" : "p-6",
          className,
        )}
      >
        {footer ? (
          <>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
            <div className="shrink-0 bg-white px-6 pb-6 pt-4">{footer}</div>
          </>
        ) : (
          children
        )}
      </div>
    </div>,
    document.body,
  );
}

export function DialogHeader({
  title,
  description,
  onBack,
  onClose,
  progressPct,
}: {
  title: string;
  description?: string;
  onBack?: () => void;
  onClose?: () => void;
  progressPct?: number;
}) {
  return (
    <div className="flex flex-col gap-3 pb-4">
      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            onClick={onBack}
            aria-label="Back"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/10 text-foreground/70 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
        ) : (
          <span />
        )}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
      <div>
        <h2 className="text-xl font-medium tracking-[-0.6px] text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/60">{description}</p>
        )}
      </div>
      {typeof progressPct === "number" && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/10">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </div>
  );
}
