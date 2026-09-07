"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// A small dropdown, extracted from the pattern NavShell's account caret already uses: a
// full-screen click-away catcher behind an absolutely-positioned panel, with the trigger
// lifted above the catcher so it stays clickable (that's what closes the menu on a second
// click). Adds the two things that version is missing — Escape to close, and menu semantics.
//
// Deliberately not a portal. Dialog portals at z-[60], so a sheet opened from a menu item
// always lands above this, and the menu closing underneath it is the behaviour we want.
export function Menu({
  trigger,
  children,
  align = "left",
  className,
}: {
  /** Rendered inside the trigger button. */
  trigger: React.ReactNode;
  /** Menu items. Each should call the `close` passed by MenuItem's onSelect, or its own handler. */
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className={cn("relative", className)}>
      {open && (
        <>
          {/* Click-away catcher. Sits below the trigger (z-0 vs z-10) so clicking the
              trigger itself toggles rather than being swallowed by the catcher. */}
          <div className="fixed inset-0 z-0" onClick={close} aria-hidden />
          <div
            ref={panelRef}
            role="menu"
            className={cn(
              "absolute top-[calc(100%+8px)] z-10 min-w-[220px] overflow-hidden rounded-xl border border-foreground/10 bg-white py-1 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)]",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {children(close)}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative z-10 w-full text-left"
      >
        {trigger}
      </button>
    </div>
  );
}

/** One row in a Menu — icon, label, trailing chevron. Renders as a button or a link. */
export function MenuItem({
  icon,
  label,
  onSelect,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm tracking-[-0.14px] text-foreground transition-colors hover:bg-foreground/4"
    >
      <span className="shrink-0 text-foreground/60">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  );
}
