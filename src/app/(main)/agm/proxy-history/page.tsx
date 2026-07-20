"use client";
import Link from "next/link";
import { ArrowLeft, UserCheck, Mail, Phone } from "lucide-react";
import { useGetProxyHistory } from "@/api/agm/hooks";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

type Tone = "info" | "success" | "muted" | "danger";
const statusTone = (s: string): Tone => {
  const u = (s || "").toUpperCase();
  if (u === "LIVE") return "info";
  if (u === "ENDED") return "muted";
  if (u === "CANCELLED") return "danger";
  return "success";
};

export default function ProxyHistoryPage() {
  const { data, isLoading } = useGetProxyHistory();
  const proxies = data?.data?.proxies ?? [];

  return (
    <div className="space-y-6">
      <Link href="/agm" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to AGMs
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-foreground">Proxy history</h1>
        <p className="text-sm text-muted-foreground">
          Every proxy you&apos;ve appointed to vote on your behalf.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="h-24 animate-pulse rounded-2xl border border-border bg-muted" />
          ))}
        </div>
      ) : proxies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          You haven&apos;t appointed any proxies yet. Appoint one from an AGM you&apos;re registered for.
        </div>
      ) : (
        <ul className="space-y-3">
          {proxies.map((p) => (
            <li key={p.id} className="rounded-2xl border border-border bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{p.eventTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(p.eventDate)}
                    {p.assignedAt ? ` · appointed ${formatDate(p.assignedAt)}` : ""}
                  </p>
                </div>
                {p.eventStatus && (
                  <Badge variant={statusTone(p.eventStatus)}>
                    {p.eventStatus.charAt(0) + p.eventStatus.slice(1).toLowerCase()}
                  </Badge>
                )}
              </div>

              <div className="mt-3 flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                  <UserCheck className="h-4.5 w-4.5 text-purple-600" />
                </div>
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-foreground">{p.proxyName}</p>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
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
