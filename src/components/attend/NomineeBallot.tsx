import React, { useState } from "react";
import { User, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { CandidateItem, VoteChoiceValue } from "@/types";

// Ballot for a candidate ("election") resolution — every candidate is voted on
// independently. Field names mirror the API: `candidates` and `{ candidateId, choice }`.
export type CandidateVote = { candidateId: string; choice: VoteChoiceValue };

interface NomineeBallotProps {
  candidates: CandidateItem[];
  title: string;
  onVoteCast?: (votes: CandidateVote[]) => void;
  isPending: boolean;
  showSubmitButton?: boolean;
  onChange?: (votes: CandidateVote[]) => void;
}

export function NomineeBallot({
  candidates,
  title,
  onVoteCast,
  isPending,
  showSubmitButton = true,
  onChange,
}: NomineeBallotProps) {
  const [choices, setChoices] = useState<Record<string, VoteChoiceValue>>({});

  const handleSelect = (candidateId: string, choice: VoteChoiceValue) => {
    const nextChoices = { ...choices, [candidateId]: choice };
    setChoices(nextChoices);
    if (onChange) {
      const payload = candidates
        .map((c) => ({ candidateId: c.id, choice: nextChoices[c.id] }))
        .filter((v) => !!v.choice) as CandidateVote[];
      onChange(payload);
    }
  };

  const allSelected = candidates.every((c) => !!choices[c.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allSelected || !onVoteCast) return;

    const payload = candidates.map((c) => ({
      candidateId: c.id,
      choice: choices[c.id],
    }));

    onVoteCast(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-foreground/[0.06] bg-white p-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
      <div>
        <h3 className="text-sm font-bold text-foreground">Candidate ballot</h3>
        <p className="text-xs text-foreground/60 mt-0.5">
          Please select your vote for each candidate below to complete your ballot.
        </p>
      </div>

      <div className="space-y-3.5 divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
        {candidates.map((candidate, idx) => {
          const choice = choices[candidate.id];
          return (
            <div key={candidate.id} className={cn("flex flex-col gap-2.5 pt-3 first:pt-0 border-t border-slate-100 first:border-t-0")}>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-snug">{candidate.name}</p>
                  {candidate.bio && <p className="text-xs text-foreground/60 mt-0.5">{candidate.bio}</p>}
                </div>
              </div>

              <div className="flex gap-2">
                {[
                  { key: "FOR", label: "For", activeClass: "bg-emerald-600 border-emerald-600 text-white shadow-sm hover:bg-emerald-700" },
                  { key: "AGAINST", label: "Against", activeClass: "bg-rose-600 border-rose-600 text-white shadow-sm hover:bg-rose-750" },
                  { key: "ABSTAIN", label: "Abstain", activeClass: "bg-slate-700 border-slate-700 text-white shadow-sm hover:bg-slate-800" }
                ].map((btn) => {
                  const active = choice === btn.key;
                  return (
                    <button
                      key={btn.key}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSelect(candidate.id, btn.key as any)}
                      className={cn(
                        "flex-1 rounded-xl py-2 text-xs font-semibold border transition-all duration-200",
                        active
                          ? btn.activeClass
                          : "bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100/70"
                      )}
                    >
                      {btn.label}
                    </button>
                  );
                })}
              </div>

              <CandidateTally candidate={candidate} />
            </div>
          );
        })}
      </div>

      {showSubmitButton && (
        <Button
          type="submit"
          fullWidth
          disabled={!allSelected || isPending}
          loading={isPending}
          className="mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold"
        >
          Cast Ballot Vote
        </Button>
      )}
    </form>
  );
}

// Compact per-candidate running tally, mirroring the standard resolution's live tally.
// Head counts only (the candidate payload's share fields are all 0 unless the register is
// share-weighted). Hidden until at least one vote exists, so it stays clean pre-voting.
export function CandidateTally({ candidate }: { candidate: CandidateItem }) {
  const f = candidate.forCount ?? 0;
  const a = candidate.againstCount ?? 0;
  const ab = candidate.abstainCount ?? 0;
  const total = f + a + ab;
  if (total === 0) return null;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="mt-1">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="bg-emerald-500" style={{ width: pct(f) }} />
        <div className="bg-rose-500" style={{ width: pct(a) }} />
        <div className="bg-slate-400" style={{ width: pct(ab) }} />
      </div>
      <p className="mt-1 flex gap-3 text-[10px] font-medium text-foreground/60">
        <span className="text-emerald-600">For {f}</span>
        <span className="text-rose-600">Against {a}</span>
        <span>Abstain {ab}</span>
      </p>
    </div>
  );
}
