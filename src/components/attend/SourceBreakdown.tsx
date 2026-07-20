import type { Resolution } from "@/types";

/**
 * Item N — three-column vote tally split by source (Online / In-Room / Proxy).
 * Falls back gracefully when `bySource` is not provided by the backend yet —
 * the aggregate counts on `Resolution` still render in ResolutionBars.
 */
export function SourceBreakdown({
  r,
  shareWeighted = false,
}: {
  r: Resolution;
  shareWeighted?: boolean;
}) {
  if (!r.bySource) return null;
  const suffix = shareWeighted ? "Shares" : "Count";
  const rows: Array<{ key: "ONLINE" | "IN_ROOM" | "PROXY"; label: string }> = [
    { key: "ONLINE", label: "Online" },
    { key: "IN_ROOM", label: "In-Room" },
    { key: "PROXY", label: "Proxy" },
  ];
  const fmt = (n?: number) => (n ?? 0).toLocaleString();
  const total = {
    for: (shareWeighted ? r.forShares : r.forCount) ?? 0,
    against: (shareWeighted ? r.againstShares : r.againstCount) ?? 0,
    abstain: (shareWeighted ? r.abstainShares : r.abstainCount) ?? 0,
  };
  return (
    <table className="w-full mt-3 text-[11px]">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="pb-1 font-semibold">Source</th>
          <th className="pb-1 text-right font-semibold">For</th>
          <th className="pb-1 text-right font-semibold">Against</th>
          <th className="pb-1 text-right font-semibold">Abstain</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const s = r.bySource?.[row.key];
          return (
            <tr key={row.key} className="text-foreground">
              <td className="py-0.5">{row.label}</td>
              <td className="py-0.5 text-right">{fmt(s?.[`for${suffix}`] as number | undefined)}</td>
              <td className="py-0.5 text-right">{fmt(s?.[`against${suffix}`] as number | undefined)}</td>
              <td className="py-0.5 text-right">{fmt(s?.[`abstain${suffix}`] as number | undefined)}</td>
            </tr>
          );
        })}
        <tr className="font-semibold border-t border-border">
          <td className="pt-1">Total</td>
          <td className="pt-1 text-right">{fmt(total.for)}</td>
          <td className="pt-1 text-right">{fmt(total.against)}</td>
          <td className="pt-1 text-right">{fmt(total.abstain)}</td>
        </tr>
      </tbody>
    </table>
  );
}
