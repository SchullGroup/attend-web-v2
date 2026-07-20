"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Check, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetResolutions, useCastVote } from "@/api/agm/hooks";
import { Resolution } from "@/types";

type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

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
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-40 animate-pulse rounded-2xl border border-border bg-muted" />
        ))}
      </div>
    );
  }

  const allOpenVoted = open.every((r) => pendingVotes[r.id]);

  return (
    <div className="space-y-6">
      <Link href="/agm" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to AGMs
      </Link>

      <header>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Pre-vote on resolutions</h1>
        <p className="text-sm text-muted-foreground">
          Submit your vote on each open resolution before the meeting starts. You
          can change your vote until voting closes.
        </p>
      </header>

      {hasProxy && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-sm text-purple-800">
          <p className="font-bold">Voting Managed by Proxy</p>
          <p className="mt-1 text-xs text-purple-700/80">
            You have appointed a proxy for this AGM. Early voting and live voting are managed by your proxy.
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      {resolutions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No resolutions available for this AGM yet.
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Open for voting
              </h2>
              {open.map((r) => (
                <ResolutionCard
                  key={r.id}
                  resolution={r}
                  selected={pendingVotes[r.id] ?? null}
                  onSelect={(choice) => {
                    setSuccessMsg(null);
                    setPendingVotes((v) => ({ ...v, [r.id]: choice }));
                  }}
                  disabled={hasProxy}
                />
              ))}
            </section>
          )}

          {voted.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Already voted
              </h2>
              {voted.map((r) => (
                <VotedCard key={r.id} resolution={r} />
              ))}
            </section>
          )}

          {open.length > 0 && (
            <div className="sticky bottom-24 z-10 md:bottom-0">
              <div className="rounded-2xl border border-border bg-white p-4 shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">
                      {Object.keys(pendingVotes).length} of {open.length} selected
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You can update your vote until voting closes.
                    </p>
                  </div>
                  <Button
                    onClick={submit}
                    loading={submitting}
                    disabled={!allOpenVoted || Object.keys(pendingVotes).length === 0 || hasProxy}
                  >
                    Submit votes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ResolutionCard({
  resolution: r, selected, onSelect, disabled,
}: {
  resolution: Resolution;
  selected: VoteChoice | null;
  onSelect: (c: VoteChoice) => void;
  disabled?: boolean;
}) {
  return (
    <article className="rounded-2xl border-2 border-primary/30 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            Resolution {r.order + 1}{r.specialResolution ? " (Special)" : ""}
          </p>
          <h3 className="mt-0.5 text-lg font-semibold text-foreground">{r.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
        </div>
        <Badge variant="default">Open</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["FOR", "AGAINST", "ABSTAIN"] as VoteChoice[]).map((opt) => {
          const isSelected = selected === opt;
          const Icon = opt === "FOR" ? Check : opt === "AGAINST" ? X : Minus;
          const tone =
            opt === "FOR"
              ? "border-emerald-200 hover:bg-emerald-50 text-emerald-700"
              : opt === "AGAINST"
              ? "border-red-200 hover:bg-red-50 text-red-700"
              : "border-border hover:bg-muted text-muted-foreground";
          const selectedTone =
            opt === "FOR"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : opt === "AGAINST"
              ? "border-red-600 bg-red-600 text-white"
              : "border-slate-700 bg-slate-700 text-white";
          return (
            <button
              key={opt}
              onClick={() => onSelect(opt)}
              disabled={disabled}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition-colors disabled:opacity-50",
                isSelected ? selectedTone : tone,
              )}
            >
              <Icon className="h-4 w-4" />
              {opt.charAt(0) + opt.slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>
    </article>
  );
}

function VotedCard({ resolution: r }: { resolution: Resolution }) {
  const totalCount = r.forCount + r.againstCount + r.abstainCount;
  const totalShares = r.forShares + r.againstShares + r.abstainShares;
  // AGM votes are weighted by shareholding — use shares when available, else heads.
  const byShares = totalShares > 0;
  const denom = byShares ? totalShares : totalCount;
  const pct = (shares: number, count: number) =>
    denom ? Math.round(((byShares ? shares : count) / denom) * 100) : 0;

  return (
    <article className="rounded-2xl border border-border bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Resolution {r.order + 1}
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-foreground">{r.title}</h3>
        </div>
        <Badge variant="success">Voted {r.myVote}</Badge>
      </div>
      {totalCount > 0 && (
        <div className="space-y-2">
          <Bar label="For" value={pct(r.forShares, r.forCount)} color="bg-emerald-500" count={r.forCount} shares={r.forShares} />
          <Bar label="Against" value={pct(r.againstShares, r.againstCount)} color="bg-red-500" count={r.againstCount} shares={r.againstShares} />
          <Bar label="Abstain" value={pct(r.abstainShares, r.abstainCount)} color="bg-slate-400" count={r.abstainCount} shares={r.abstainShares} />
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
        <span className="text-muted-foreground">
          {count.toLocaleString()}{shares > 0 ? ` · ${shares.toLocaleString()} shares` : ""} · {value}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
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
