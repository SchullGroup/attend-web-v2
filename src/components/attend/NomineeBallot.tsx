"use client";
import { useState } from "react";
import { Check, X, Minus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Resolution, ResolutionNominee } from "@/types/agm";

// Item G — multi-nominee resolutions: render per-nominee For/Against/Abstain grid.
// Cast payload uses `nomineeVotes: [{ nomineeId, choice }]`.

type Choice = "FOR" | "AGAINST" | "ABSTAIN";

export function NomineeBallot({
  resolution,
  disabled,
  onCast,
  submitting,
}: {
  resolution: Resolution;
  disabled?: boolean;
  onCast: (nomineeVotes: Array<{ nomineeId: string; choice: Choice }>) => void;
  submitting?: boolean;
}) {
  const nominees = resolution.nominees ?? [];
  const [choices, setChoices] = useState<Record<string, Choice>>({});

  function setChoice(id: string, c: Choice) {
    setChoices((prev) => ({ ...prev, [id]: c }));
  }

  function confirmAndCast() {
    const votes: Array<{ nomineeId: string; choice: Choice }> = [];
    for (const n of nominees) {
      const c = choices[n.id];
      if (c) votes.push({ nomineeId: n.id, choice: c });
    }
    const missing = nominees.length - votes.length;
    if (missing > 0) {
      const ok = window.confirm(
        `You have not voted on ${missing} nominee${missing === 1 ? "" : "s"}. ` +
        "They will be recorded as Abstain. Continue?",
      );
      if (!ok) return;
      // Fill missing as ABSTAIN so backend never sees a partial payload.
      for (const n of nominees) if (!choices[n.id]) votes.push({ nomineeId: n.id, choice: "ABSTAIN" });
    }
    onCast(votes);
  }

  const filledCount = Object.keys(choices).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Cast a vote For, Against, or Abstain for each nominee independently.
      </p>
      {nominees.map((n, i) => (
        <NomineeRow
          key={n.id}
          index={i + 1}
          nominee={n}
          current={choices[n.id]}
          onSelect={(c) => setChoice(n.id, c)}
          disabled={disabled || submitting}
        />
      ))}
      <Button
        fullWidth
        loading={submitting}
        disabled={disabled || submitting}
        onClick={confirmAndCast}
      >
        Cast {filledCount} vote{filledCount === 1 ? "" : "s"} across {nominees.length} nominee{nominees.length === 1 ? "" : "s"}
      </Button>
    </div>
  );
}

function NomineeRow({
  index,
  nominee,
  current,
  onSelect,
  disabled,
}: {
  index: number;
  nominee: ResolutionNominee;
  current?: Choice;
  onSelect: (c: Choice) => void;
  disabled?: boolean;
}) {
  const options: Array<{ v: Choice; label: string; Icon: typeof Check; sel: string; base: string }> = [
    { v: "FOR",     label: "For",     Icon: Check, sel: "bg-emerald-600 text-white border-emerald-600", base: "border-emerald-200 text-emerald-700 hover:bg-emerald-50" },
    { v: "AGAINST", label: "Against", Icon: X,     sel: "bg-red-600 text-white border-red-600",         base: "border-red-200 text-red-700 hover:bg-red-50" },
    { v: "ABSTAIN", label: "Abstain", Icon: Minus, sel: "bg-slate-700 text-white border-slate-700",     base: "border-border text-muted-foreground hover:bg-muted" },
  ];
  return (
    <div className="rounded-xl border border-border bg-white p-3">
      <div className="mb-2">
        <p className="text-sm font-semibold text-foreground">{index}. {nominee.name}</p>
        {nominee.bio && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{nominee.bio}</p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => {
          const selected = current === o.v;
          const Icon = o.Icon;
          return (
            <button
              key={o.v}
              type="button"
              onClick={() => onSelect(o.v)}
              disabled={disabled}
              className={cn(
                "flex items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition disabled:opacity-50",
                selected ? o.sel : o.base,
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {o.label}
            </button>
          );
        })}
      </div>
      {(nominee.forCount + nominee.againstCount + nominee.abstainCount) > 0 && (
        <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
          <span>For: {nominee.forCount}</span>
          <span>Against: {nominee.againstCount}</span>
          <span>Abstain: {nominee.abstainCount}</span>
        </div>
      )}
    </div>
  );
}
