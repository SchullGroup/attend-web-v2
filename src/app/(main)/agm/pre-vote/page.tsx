"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Check, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetResolutions, useCastVote, useRevokeProxy, useGetProxy } from "@/api/agm/hooks";
import { Resolution } from "@/types";
import { NomineeBallot } from "@/components/attend/NomineeBallot";

type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

function PreVotePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";

  const [pendingVotes, setPendingVotes] = useState<Record<string, VoteChoice>>({});
  const [pendingCandidateVotes, setPendingCandidateVotes] = useState<Record<string, { candidateId: string; choice: VoteChoice }[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data, isLoading } = useGetResolutions(eventId);
  const { data: proxyResp } = useGetProxy(eventId);
  const { mutateAsync: castVote } = useCastVote(eventId);
  const { mutate: revokeProxy, isPending: revoking } = useRevokeProxy(eventId);

  const resolutions = data?.data?.resolutions ?? [];
  const activeProxy = !!proxyResp?.data?.proxyName && (proxyResp.data as any)?.status?.toUpperCase() !== "REVOKED";
  const hasProxy = !!data?.data?.hasProxy || activeProxy;
  const open = resolutions.filter((r) => !r.myVote);
  const voted = resolutions.filter((r) => r.myVote);
  // 1-based by position, not r.order ΓÇö order isn't reliably 0-based on the backend, and
  // splitting into open/voted below means each subgroup's own index can't be used either
  // (it would restart numbering within each group). Computed once from the full sorted
  // list so "Resolution N" stays consistent regardless of which group a card lands in.
  const resNumber = new Map(
    [...resolutions].sort((a, b) => a.order - b.order).map((r, i) => [r.id, i + 1]),
  );

  useEffect(() => {
    if (!eventId) router.replace("/agm");
  }, [eventId, router]);

  function handleRevoke() {
    setSuccessMsg(null);
    setErrorMsg(null);
    revokeProxy(undefined, {
      onSuccess: () => {
        setSuccessMsg("Proxy has been successfully revoked. You can now vote directly.");
        router.refresh();
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.message;
        setErrorMsg(
          msg && !msg.includes("Something went wrong")
            ? msg
            : "Proxy revocation endpoint (DELETE /api/v1/participant/events/{eventId}/proxy) is currently unavailable on the server."
        );
      },
    });
  }

  async function submit() {
    if (hasProxy) {
      setErrorMsg("Pre-voting is disabled because you have appointed a proxy.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      // Submit regular resolution votes
      for (const [resolutionId, choice] of Object.entries(pendingVotes)) {
        await castVote({ resolutionId, data: { choice } });
      }
      // Submit candidate votes ΓÇö the API needs one entry per candidate
      for (const [resolutionId, votes] of Object.entries(pendingCandidateVotes)) {
        await castVote({ resolutionId, data: { votes } });
      }
      // Stay on the page and just confirm ΓÇö casting invalidates the resolutions
      // query, so voted items move to "Already voted" on their own. (The receipt is
      // still available from the AGM hub ΓåÆ "My receipts".)
      setPendingVotes({});
      setPendingCandidateVotes({});
      setSuccessMsg("Your vote has been recorded. You can update it until voting closes.");
    } catch (err: any) {
      const status = err?.response?.status;
      const backendMsg = err?.response?.data?.message;
      setErrorMsg(
        backendMsg ||
          (status === 409
            ? "Your proxy has already voted on your behalf for this resolution."
            : err?.message || "Failed to submit votes.")
      );
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

  // A resolution counts as "selected" only when it's fully answered ΓÇö for a candidate
  // resolution that means a choice for every candidate. Count over the OPEN list so the
  // tally can never exceed it (summing the two maps produced things like "2 of 1").
  const isFullySelected = (r: Resolution) =>
    r.candidates && r.candidates.length > 0
      ? (pendingCandidateVotes[r.id]?.length ?? 0) === r.candidates.length
      : !!pendingVotes[r.id];

  const selectedCount = open.filter(isFullySelected).length;
  const allOpenVoted = open.every(isFullySelected);

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <header>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Pre-vote on resolutions</h1>
        <p className="text-sm text-muted-foreground">
          Submit your vote on each open resolution before the meeting starts. You
          can change your vote until voting closes.
        </p>
      </header>

      {hasProxy && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
          <div>
            <p className="font-bold flex items-center gap-1.5">
              <span>ΓÜá∩╕Å</span> Voting Managed by Appointed Proxy
            </p>
            <p className="mt-1 text-xs text-amber-800">
              You have appointed a proxy for this AGM. Direct pre-voting is disabled. Your appointed proxy will cast votes on your behalf. To vote directly, click &quot;Revoke Proxy&quot;.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRevoke}
            loading={revoking}
            className="border-amber-300 hover:bg-amber-100 hover:text-amber-900 text-amber-900 bg-white shrink-0"
          >
            Revoke Proxy
          </Button>
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
                  number={resNumber.get(r.id) ?? 1}
                  selected={pendingVotes[r.id] ?? null}
                  onSelect={(choice) => {
                    if (hasProxy) return;
                    setSuccessMsg(null);
                    setPendingVotes((v) => ({ ...v, [r.id]: choice }));
                  }}
                  onCandidateSelect={(votes) => {
                    if (hasProxy) return;
                    setSuccessMsg(null);
                    setPendingCandidateVotes((v) => ({ ...v, [r.id]: votes }));
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
                <VotedCard
                  key={r.id}
                  resolution={r}
                  number={resNumber.get(r.id) ?? 1}
                  hasProxy={hasProxy}
                  onUpdateVote={async (resolutionId, choice) => {
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    try {
                      await castVote({ resolutionId, data: { choice } });
                      setSuccessMsg("Your vote choice has been updated.");
                    } catch (err: any) {
                      const backendMsg = err?.response?.data?.message;
                      setErrorMsg(backendMsg || err?.message || "Failed to update vote.");
                      throw err;
                    }
                  }}
                />
              ))}
            </section>
          )}

          {open.length > 0 && (
            <div className="sticky bottom-24 z-10 md:bottom-0">
              <div className="rounded-2xl border border-border bg-white p-4 shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">
                      {selectedCount} of {open.length} selected
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You can update your vote until voting closes.
                    </p>
                  </div>
                  <Button
                    onClick={submit}
                    loading={submitting}
                    disabled={!allOpenVoted || selectedCount === 0 || hasProxy}
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
  resolution: r,
  number,
  selected,
  onSelect,
  disabled,
  onCandidateSelect,
}: {
  resolution: Resolution;
  number: number;
  selected: VoteChoice | null;
  onSelect: (c: VoteChoice) => void;
  disabled?: boolean;
  onCandidateSelect: (votes: { candidateId: string; choice: "FOR" | "AGAINST" | "ABSTAIN" }[]) => void;
}) {
  return (
    <article className="rounded-2xl border-2 border-primary/30 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            Resolution {number}{r.specialResolution ? " (Special)" : ""}
          </p>
          <h3 className="mt-0.5 text-lg font-semibold text-foreground">{r.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
        </div>
        <Badge variant="default">Open</Badge>
      </div>

      {r.candidates && r.candidates.length > 0 ? (
        <div className="-mx-5 -mb-5 border-t border-slate-100 bg-slate-50/30 p-5 rounded-b-2xl">
          <NomineeBallot
            candidates={r.candidates}
            title={r.title}
            isPending={!!disabled}
            showSubmitButton={false}
            onChange={onCandidateSelect}
          />
        </div>
      ) : (
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
      )}
    </article>
  );
}

function VotedCard({
  resolution: r,
  number,
  hasProxy,
  onUpdateVote,
}: {
  resolution: Resolution;
  number: number;
  hasProxy: boolean;
  onUpdateVote: (resolutionId: string, choice: VoteChoice) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<VoteChoice>(
    (r.myVote?.toUpperCase() as VoteChoice) || "FOR"
  );

  const totalCount = r.forCount + r.againstCount + r.abstainCount;
  const totalShares = r.forShares + r.againstShares + r.abstainShares;
  const byShares = totalShares > 0;
  const denom = byShares ? totalShares : totalCount;
  const pct = (shares: number, count: number) =>
    denom ? Math.round(((byShares ? shares : count) / denom) * 100) : 0;

  async function handleSave() {
    setUpdating(true);
    try {
      await onUpdateVote(r.id, selectedChoice);
      setEditing(false);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-white p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Resolution {number}
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-foreground">{r.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">Voted {r.myVote}</Badge>
          {!hasProxy && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(!editing)}
              className="text-xs border-border bg-white text-muted-foreground hover:bg-slate-50 hover:text-foreground"
            >
              {editing ? "Cancel" : "Change vote"}
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="pt-2 border-t border-border space-y-4">
          <p className="text-xs text-muted-foreground">
            Select your updated vote for this resolution:
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(["FOR", "AGAINST", "ABSTAIN"] as VoteChoice[]).map((opt) => {
              const isSelected = selectedChoice === opt;
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
                  type="button"
                  onClick={() => setSelectedChoice(opt)}
                  disabled={updating}
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
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              loading={updating}
              onClick={handleSave}
              disabled={selectedChoice === r.myVote}
            >
              Update vote
            </Button>
          </div>
        </div>
      ) : (
        totalCount > 0 && (
          <div className="space-y-2">
            <Bar label="For" value={pct(r.forShares, r.forCount)} color="bg-emerald-500" count={r.forCount} shares={r.forShares} />
            <Bar label="Against" value={pct(r.againstShares, r.againstCount)} color="bg-red-500" count={r.againstCount} shares={r.againstShares} />
            <Bar label="Abstain" value={pct(r.abstainShares, r.abstainCount)} color="bg-slate-400" count={r.abstainCount} shares={r.abstainShares} />
          </div>
        )
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
          {count.toLocaleString()}{shares > 0 ? ` ┬╖ ${shares.toLocaleString()} shares` : ""} ┬╖ {value}%
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
