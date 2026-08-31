"use client";
import { ChevronRight, UserCheck, Mail, Phone } from "lucide-react";
import { useGetProxyHistory } from "@/api/agm/hooks";
import { AgmHero, AgmSubNav } from "@/components/attend/AgmSubNav";
import { formatDate } from "@/lib/utils";

type Tone = "live" | "ended" | "cancelled" | "confirmed";
const statusTone = (s: string): Tone => {
  const u = (s || "").toUpperCase();
  if (u === "LIVE") return "live";
  if (u === "ENDED") return "ended";
  if (u === "CANCELLED") return "cancelled";
  return "confirmed";
};
const TONE_CLASS: Record<Tone, string> = {
  live: "bg-red-600 text-white",
  ended: "bg-foreground/[0.06] text-foreground/60",
  cancelled: "bg-red-50 text-red-600",
  confirmed: "bg-primary/10 text-primary",
};

export default function ProxyHistoryPage() {
  const { data, isLoading } = useGetProxyHistory();
  const proxies = data?.data?.proxies ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-1 text-sm font-medium tracking-[-0.14px]">
        <span className="text-foreground">AGM</span>
        <ChevronRight className="h-3 w-3 -rotate-90 text-foreground/40" />
        <span className="text-foreground/40">Proxy history</span>
      </div>

      <AgmHero />
      <AgmSubNav active="proxy-history" />

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-medium tracking-[-0.6px] text-foreground">Proxy history</h2>
        <p className="text-sm tracking-[-0.14px] text-foreground/60">
          Every proxy you&apos;ve appointed to vote on your behalf.
        </p>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-foreground/50">Loading…</p>
      ) : proxies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
          You haven&apos;t appointed any proxies yet. Appoint one from an AGM you&apos;re registered for.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {proxies.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-foreground/[0.06] bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium tracking-[-0.14px] text-foreground">{p.eventTitle}</p>
                  <p className="text-xs text-foreground/60">
                    {formatDate(p.eventDate)}
                    {p.assignedAt ? ` · appointed ${formatDate(p.assignedAt)}` : ""}
                  </p>
                </div>
                {p.eventStatus && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASS[statusTone(p.eventStatus)]}`}
                  >
                    {p.eventStatus.charAt(0) + p.eventStatus.slice(1).toLowerCase()}
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-start gap-3 rounded-xl bg-foreground/[0.03] p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <UserCheck className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="min-w-0 text-sm">
                  <p className="font-medium tracking-[-0.14px] text-foreground">{p.proxyName}</p>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-foreground/60">
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
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
