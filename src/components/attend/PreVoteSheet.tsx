"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog, DialogHeader } from "@/components/ui/Dialog";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetResolutions, useCastVote, useRevokeProxy, useGetProxy } from "@/api/agm/hooks";
import { Resolution } from "@/types";
import { NomineeBallot } from "@/components/attend/NomineeBallot";
import { VoteButtons, type VoteChoice } from "@/components/attend/VoteButtons";

// Figma's Pre-AGM voting sheet: a right-anchored panel over the event-detail page.
// Lives as a component so the detail page can open it in place (keeping itself mounted
// behind the dim, as the frame shows) while /agm/pre-vote still serves direct links.
// OUR logic is preserved wholesale: candidate/nominee ballots (NomineeBallot),
// per-resolution vote updating on already-cast votes, and proxy-aware gating + revoke.
export function PreVoteSheet({
  eventId,
  open: isOpen,
  onClose,
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

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
  const openResolutions = resolutions.filter((r) => !r.myVote);
  const voted = resolutions.filter((r) => r.myVote);
  // 1-based by position, not r.order — order isn't reliably 0-based on the backend, and
  // splitting into open/voted below means each subgroup's own index can't be used either
  // (it would restart numbering within each group). Computed once from the full sorted
  // list so "Resolution N" stays consistent regardless of which group a card lands in.
  const resNumber = new Map(
    [...resolutions].sort((a, b) => a.order - b.order).map((r, i) => [r.id, i + 1]),
  );

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

  // A resolution counts as "selected" only when it's fully answered — for a candidate
  // resolution that means a choice for every candidate. Count over the OPEN list so the
  // tally can never exceed it (summing the two maps produced things like "2 of 1").
  const isFullySelected = (r: Resolution) =>
    r.candidates && r.candidates.length > 0
      ? (pendingCandidateVotes[r.id]?.length ?? 0) === r.candidates.length
      : !!pendingVotes[r.id];

  async function submit() {
    if (hasProxy) {
      setErrorMsg("Pre-voting is disabled because you have appointed a proxy.");
      return;
    }
    // Figma keeps the Submit button filled at all times, so an incomplete ballot is
    // caught here and explained, rather than the button sitting inert.
    if (!openResolutions.every(isFullySelected)) {
      setErrorMsg("Choose For, Against or Abstain on each resolution before submitting.");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      // Submit regular resolution votes
      for (const [resolutionId, choice] of Object.entries(pendingVotes)) {
        await castVote({ resolutionId, data: { choice } });
      }
      // Submit candidate votes — the API needs one entry per candidate
      for (const [resolutionId, votes] of Object.entries(pendingCandidateVotes)) {
        await castVote({ resolutionId, data: { votes } });
      }
      // Stay on the page and just confirm — casting invalidates the resolutions
      // query, so voted items move to "Already voted" on their own. (The receipt is
      // still available from the AGM hub → "My receipts".)
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
      <Dialog open={isOpen} onClose={onClose} side="right">
        <DialogHeader
          onBack={onClose}
          title="Pre-AGM voting"
          description="Submit your vote on each open resolution before the meeting starts."
        />
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-40 animate-pulse rounded-xl bg-foreground/[0.04]" />
          ))}
        </div>
      </Dialog>
    );
  }

  const selectedCount = openResolutions.filter(isFullySelected).length;
  const answeredCount = voted.length + selectedCount;
  const progressPct = resolutions.length ? Math.round((answeredCount / resolutions.length) * 100) : 0;

  return (
    <Dialog open={isOpen} onClose={onClose} side="right">
      <DialogHeader
        onBack={onClose}
        title="Pre-AGM voting"
        description="Submit your vote on each open resolution before the meeting starts."
        progressPct={resolutions.length ? progressPct : undefined}
      />
      <div className="flex flex-col gap-6">
        {hasProxy && (
          <div className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-1.5 font-semibold">
                <span>⚠️</span> Voting managed by appointed proxy
              </p>
              <p className="mt-1 text-xs text-amber-800">
                You have appointed a proxy for this AGM. Direct pre-voting is disabled. Your appointed proxy will cast votes on your behalf. To vote directly, click &quot;Revoke proxy&quot;.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRevoke}
              loading={revoking}
              className="shrink-0 border-amber-300 bg-white text-amber-900 hover:bg-amber-100 hover:text-amber-900"
            >
              Revoke proxy
            </Button>
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
            {openResolutions.length > 0 && (
              <section className="flex flex-col gap-4">
                {openResolutions.map((r) => (
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
              <section className="flex flex-col gap-4">
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

            {openResolutions.length > 0 && (
              <div className="flex flex-col gap-4">
                <p className="text-center text-xs text-foreground/50">
                  You can update your vote until voting closes.
                </p>
                <Button size="lg" fullWidth onClick={submit} loading={submitting}>
                  Submit Vote
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
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
  const [expanded, setExpanded] = useState(true);
  return (
    <article className="rounded-xl border border-foreground/[0.06] bg-white p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-sm tracking-[-0.14px] text-foreground/70">
          Resolution {number}{r.specialResolution ? " (Special)" : ""}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-foreground/40 transition-transform",
            !expanded && "-rotate-90",
          )}
        />
      </button>

      {expanded && (
        <>
          <h3 className="mt-2 text-sm tracking-[-0.14px] text-foreground">{r.title}</h3>
          {r.description && <p className="mt-1 text-xs text-foreground/60">{r.description}</p>}

          {r.candidates && r.candidates.length > 0 ? (
            <div className="-mx-4 -mb-4 mt-3 rounded-b-xl border-t border-foreground/[0.06] bg-foreground/[0.02] p-4">
              <NomineeBallot
                candidates={r.candidates}
                title={r.title}
                isPending={!!disabled}
                showSubmitButton={false}
                onChange={onCandidateSelect}
              />
            </div>
          ) : (
            <div className="mt-3">
              <VoteButtons selected={selected} onSelect={onSelect} disabled={disabled} />
            </div>
          )}
        </>
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
    <article className="flex flex-col gap-3 rounded-xl border border-foreground/[0.06] bg-white p-4">
      {/* Same card shell as ResolutionCard so voted and open items read as one list. */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm tracking-[-0.14px] text-foreground/70">
          Resolution {number}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="success">Voted {r.myVote}</Badge>
          {!hasProxy && (
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              className="text-xs font-medium text-foreground/60 underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              {editing ? "Cancel" : "Change vote"}
            </button>
          )}
        </div>
      </div>

      <h3 className="text-sm tracking-[-0.14px] text-foreground">{r.title}</h3>

      {editing ? (
        <div className="flex flex-col gap-4 border-t border-foreground/[0.06] pt-3">
          <p className="text-xs text-foreground/60">
            Select your updated vote for this resolution:
          </p>
          <VoteButtons selected={selectedChoice} onSelect={setSelectedChoice} disabled={updating} />
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
          <div className="flex flex-col gap-2">
            <Bar label="For" value={pct(r.forShares, r.forCount)} color="bg-primary" count={r.forCount} shares={r.forShares} />
            <Bar label="Against" value={pct(r.againstShares, r.againstCount)} color="bg-red-500" count={r.againstCount} shares={r.againstShares} />
            <Bar label="Abstain" value={pct(r.abstainShares, r.abstainCount)} color="bg-foreground/30" count={r.abstainCount} shares={r.abstainShares} />
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
