"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { AgmBackButton } from "@/components/attend/AgmSubNav";
import { Check, X, Minus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetResolutions, useCastVote } from "@/api/agm/hooks";
import { Resolution } from "@/types";

type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";
const CHOICES: { value: VoteChoice; label: string; icon: typeof Check }[] = [
  { value: "FOR", label: "For", icon: Check },
  { value: "AGAINST", label: "Against", icon: X },
  { value: "ABSTAIN", label: "Abstain", icon: Minus },
];

function PreVotePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";

  const [pendingVotes, setPendingVotes] = useState<Record<string, VoteChoice>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data, isLoading } = useGetResolutions(eventId);
  const { mutateAsync: castVote } = useCastVote(eventId);

  const resolutions = data?.data?.resolutions ?? [];
  const hasProxy = !!data?.data?.hasProxy;
  const open = resolutions.filter((r) => !r.myVote);
  const voted = resolutions.filter((r) => r.myVote);
  const answered = voted.length + Object.keys(pendingVotes).length;
  const progressPct = resolutions.length ? Math.round((answered / resolutions.length) * 100) : 0;

  useEffect(() => {
    if (!eventId) router.replace("/agm");
  }, [eventId, router]);

  async function submit() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      for (const [resolutionId, choice] of Object.entries(pendingVotes)) {
        await castVote({ resolutionId, data: { choice } });
      }
      // Stay on the page and just confirm — casting invalidates the resolutions
      // query, so voted items move to "Already voted" on their own. (The receipt is
      // still available from the AGM hub → "My receipts".)
      setPendingVotes({});
      setSuccessMsg("Your vote has been recorded. You can update it until voting closes.");
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || "Failed to submit votes.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-40 animate-pulse rounded-xl bg-foreground/[0.04]" />
        ))}
      </div>
    );
  }

  const allOpenVoted = open.every((r) => pendingVotes[r.id]);

  return (
    <div className="flex flex-col gap-6">
      <AgmBackButton href="/agm" label="Back to AGMs" />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Pre-AGM voting</h1>
          <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/60">
            Submit your vote on each open resolution before the meeting starts. You
            can change your vote until voting closes.
          </p>
        </div>

        {resolutions.length > 0 && (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {hasProxy && (
          <div className="rounded-xl bg-foreground/[0.03] p-4 text-sm text-foreground/70">
            <p className="font-medium text-foreground">Voting managed by proxy</p>
            <p className="mt-1 text-xs text-foreground/60">
              You have appointed a proxy for this AGM. Early voting and live voting are managed by your proxy.
            </p>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
            {successMsg}
          </div>
        )}

        {resolutions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
            No resolutions available for this AGM yet.
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {open.map((r, idx) => (
                <ResolutionCard
                  key={r.id}
                  index={idx + 1}
                  resolution={r}
                  selected={pendingVotes[r.id] ?? null}
                  onSelect={(choice) => {
                    setSuccessMsg(null);
                    setPendingVotes((v) => ({ ...v, [r.id]: choice }));
                  }}
                  disabled={hasProxy}
                />
              ))}

              {voted.map((r, idx) => (
                <ResolutionCard
                  key={r.id}
                  index={open.length + idx + 1}
                  resolution={r}
                  selected={(r.myVote as VoteChoice) ?? null}
                  onSelect={() => {}}
                  disabled
                  voted
                />
              ))}
            </div>

            {open.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-center text-xs text-foreground/50">
                  You can update your vote until voting closes.
                </p>
                <Button
                  size="lg"
                  fullWidth
                  onClick={submit}
                  loading={submitting}
                  disabled={!allOpenVoted || Object.keys(pendingVotes).length === 0 || hasProxy}
                >
                  Submit Vote
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ResolutionCard({
  index, resolution: r, selected, onSelect, disabled, voted,
}: {
  index: number;
  resolution: Resolution;
  selected: VoteChoice | null;
  onSelect: (c: VoteChoice) => void;
  disabled?: boolean;
  voted?: boolean;
}) {
  const totalCount = r.forCount + r.againstCount + r.abstainCount;
  const totalShares = r.forShares + r.againstShares + r.abstainShares;
  const byShares = totalShares > 0;
  const denom = byShares ? totalShares : totalCount;
  const pct = (shares: number, count: number) =>
    denom ? Math.round(((byShares ? shares : count) / denom) * 100) : 0;

  return (
    <article className="rounded-xl border border-foreground/[0.06] bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-sm text-foreground/50">
          Resolution {index}
          {r.specialResolution ? " (Special)" : ""}
        </p>
        <ChevronDown className="h-4 w-4 shrink-0 text-foreground/40" />
      </div>
      <h3 className="text-sm font-medium tracking-[-0.14px] text-foreground">{r.title}</h3>
      {r.description && (
        <p className="mt-1 text-xs text-foreground/60">{r.description}</p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {CHOICES.map(({ value, label, icon: Icon }) => {
          const isSelected = selected === value;
          const tone =
            value === "FOR"
              ? "border-primary/30 text-primary hover:bg-primary/5"
              : value === "AGAINST"
              ? "border-red-200 text-red-600 hover:bg-red-50"
              : "border-foreground/15 text-foreground/60 hover:bg-foreground/5";
          const selectedTone =
            value === "FOR"
              ? "border-primary bg-primary text-white"
              : value === "AGAINST"
              ? "border-red-600 bg-red-600 text-white"
              : "border-foreground bg-foreground text-background";
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              disabled={disabled}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-full border px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed",
                isSelected ? selectedTone : tone,
                disabled && !isSelected && "opacity-40",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {voted && totalCount > 0 && (
        <div className="mt-4 space-y-2 border-t border-foreground/[0.06] pt-3">
          <Bar label="For" value={pct(r.forShares, r.forCount)} color="bg-primary" count={r.forCount} shares={r.forShares} />
          <Bar label="Against" value={pct(r.againstShares, r.againstCount)} color="bg-red-500" count={r.againstCount} shares={r.againstShares} />
          <Bar label="Abstain" value={pct(r.abstainShares, r.abstainCount)} color="bg-foreground/30" count={r.abstainCount} shares={r.abstainShares} />
        </div>
      )}
    </article>
  );
}

function Bar({ label, value, color, count, shares }: { label: string; value: number; color: string; count: number; shares: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-foreground/60">
          {count.toLocaleString()}{shares > 0 ? ` · ${shares.toLocaleString()} shares` : ""} · {value}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <div className={`${color} h-full rounded-full`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function PreVotePage() {
  return (
    <Suspense>
      <PreVotePageInner />
    </Suspense>
  );
}
