"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { AgendaItemDetail, SpeakerItem } from "@/types";
import { cn } from "@/lib/utils";

// Speakers + agenda, as collapsible cards. Shared by the event detail page's side panel
// and the live room's Agenda tab — guests and proxies land straight in the room and never
// see the detail page, so this is their only way to read the running order.
export function AgendaPanel({
  speakers,
  agenda,
}: {
  speakers: SpeakerItem[];
  agenda: AgendaItemDetail[];
}) {
  if (speakers.length === 0 && agenda.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-foreground/15 p-6 text-center text-sm text-foreground/50">
        The organiser hasn&apos;t published an agenda yet.
      </div>
    );
  }

  return (
    <>
      {speakers.length > 0 && (
        <PanelCard title="Speakers">
          <div className="flex flex-col">
            {speakers.map((spk, i) => (
              <div
                key={spk.id ?? `${spk.name}-${i}`}
                className={cn("py-2.5", i > 0 && "border-t border-foreground/[0.06]")}
              >
                <p className="text-sm font-medium tracking-[-0.14px] text-foreground">{spk.name}</p>
                {spk.roleTitle && <p className="text-xs text-foreground/60">{spk.roleTitle}</p>}
              </div>
            ))}
          </div>
        </PanelCard>
      )}

      {agenda.length > 0 && (
        <PanelCard title="Agenda">
          <ol className="flex flex-col">
            {[...agenda]
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((item, i) => (
                <li
                  key={item.id ?? `${item.title}-${i}`}
                  className={cn("flex gap-2 py-2.5", i > 0 && "border-t border-foreground/[0.06]")}
                >
                  <span className="text-sm text-foreground/60">{i + 1}.</span>
                  <div className="min-w-0">
                    <p className="text-sm tracking-[-0.14px] text-foreground">{item.title}</p>
                    {(item.time || item.durationMinutes || item.speaker) && (
                      <p className="text-xs text-foreground/60">
                        {[item.time, item.durationMinutes ? `${item.durationMinutes} min` : null, item.speaker]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                </li>
              ))}
          </ol>
        </PanelCard>
      )}
    </>
  );
}

export function PanelCard({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-xl border border-foreground/[0.06] bg-white px-4 py-3 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-medium tracking-[-0.14px] text-foreground/70">{title}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-foreground/40 transition-transform", !open && "-rotate-90")}
        />
      </button>
      {open && <div className="mt-1">{children}</div>}
    </section>
  );
}
