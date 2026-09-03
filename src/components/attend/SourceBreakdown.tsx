import React from "react";
import { cn } from "@/lib/utils";

export interface Tally {
  for: number;
  against: number;
  abstain: number;
  forShares?: number;
  againstShares?: number;
  abstainShares?: number;
}

export interface SourceBreakdownProps {
  bySource: {
    ONLINE?: Tally;
    IN_ROOM?: Tally;
    PROXY?: Tally;
  };
}

export function SourceBreakdown({ bySource }: SourceBreakdownProps) {
  const sources = [
    { key: "ONLINE", label: "Online", data: bySource.ONLINE },
    { key: "IN_ROOM", label: "In-Room", data: bySource.IN_ROOM },
    { key: "PROXY", label: "Proxy", data: bySource.PROXY },
  ];

  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-white p-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] space-y-4">
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Votes by Source</h4>
        <p className="text-[11px] text-foreground/60 mt-0.5">
          Breakdown of votes cast online, physically in the room, and via proxy.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {sources.map((src) => {
          const tally = src.data || { for: 0, against: 0, abstain: 0 };
          
          // Use shares if present, otherwise counts
          const forVal = tally.forShares !== undefined ? tally.forShares : tally.for;
          const againstVal = tally.againstShares !== undefined ? tally.againstShares : tally.against;
          const abstainVal = tally.abstainShares !== undefined ? tally.abstainShares : tally.abstain;
          
          const isWeighted = tally.forShares !== undefined;
          const total = forVal + againstVal + abstainVal;

          const forPct = total > 0 ? (forVal / total) * 100 : 0;
          const againstPct = total > 0 ? (againstVal / total) * 100 : 0;
          const abstainPct = total > 0 ? (abstainVal / total) * 100 : 0;

          return (
            <div key={src.key} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="text-xs font-bold text-slate-800">{src.label}</span>
                <span className="text-[10px] font-semibold text-slate-500">
                  {total.toLocaleString()} {isWeighted ? "shares" : "votes"}
                </span>
              </div>

              <div className="space-y-2">
                {/* For Progress */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-emerald-700">For</span>
                    <span className="text-slate-700">{forVal.toLocaleString()} ({Math.round(forPct)}%)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${forPct}%` }} />
                  </div>
                </div>

                {/* Against Progress */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-rose-700">Against</span>
                    <span className="text-slate-700">{againstVal.toLocaleString()} ({Math.round(againstPct)}%)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${againstPct}%` }} />
                  </div>
                </div>

                {/* Abstain Progress */}
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-slate-600">Abstain</span>
                    <span className="text-slate-700">{abstainVal.toLocaleString()} ({Math.round(abstainPct)}%)</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-slate-400 rounded-full" style={{ width: `${abstainPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
