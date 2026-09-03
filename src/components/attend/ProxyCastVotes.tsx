import { UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VoteReceiptItem } from "@/types";

// "What your proxy voted." The only source of a proxy's actual choices is the
// shareholder's own vote receipt — each item flags castByProxy + proxyName (§10).
// The proxy-history / dashboard endpoints return identity and attendance only, never
// the per-resolution choices — so both the receipt page and the proxy-history page
// derive this the same way: filter the receipt for castByProxy rows.
export function ProxyCastVotes({
  votes,
  proxyName,
  className,
}: {
  votes: VoteReceiptItem[];
  proxyName?: string;
  className?: string;
}) {
  const cast = votes.filter((v) => v.castByProxy);
  if (cast.length === 0) return null;

  const name = proxyName || cast.find((v) => v.proxyName)?.proxyName || "your proxy";

  return (
    <div className={cn("rounded-xl border border-purple-200 bg-purple-50/50 p-3.5", className)}>
      <div className="mb-2.5 flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
          <UserCheck className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-purple-700">Cast by your proxy</p>
          <p className="text-[11px] text-purple-600/80">
            {cast.length} vote{cast.length > 1 ? "s" : ""} recorded by {name} on your behalf.
          </p>
        </div>
      </div>

      <ul className="space-y-1.5">
        {cast.map((v, i) => {
          const c = (v.choice || "").toUpperCase();
          return (
            <li
              key={`${v.resolutionId}-${v.candidateId ?? i}`}
              className="flex items-center justify-between gap-2 border-t border-purple-100 pt-1.5 first:border-t-0 first:pt-0 text-xs"
            >
              <span className="min-w-0 truncate text-foreground">
                {v.resolutionTitle}
                {v.candidateName ? <span className="text-foreground/60"> — {v.candidateName}</span> : null}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  c === "FOR"
                    ? "bg-emerald-100 text-emerald-700"
                    : c === "AGAINST"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-slate-100 text-slate-700",
                )}
              >
                {v.choice}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
