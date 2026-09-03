"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, CheckCircle2, Award, Lightbulb } from "lucide-react";
import { useGetMyApplications } from "@/api/innovation/hooks";
import { useGetChallenges } from "@/api/hackathon/hooks";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

// Laid out to Figma's "My Application" frame: it is a TAB of the Innovation Challenges
// page (same header + underline tabs), and each application is a card — thumbnail,
// challenge name, status pill, circular chevron — not the table this page used to be.

type Tone = "info" | "warning" | "success" | "muted" | "danger";

const STATUS_TONE: Record<string, Tone> = {
  submitted: "info",
  under_review: "warning",
  shortlisted: "success",
  selected: "success",
  winner: "warning",
  not_progressed: "muted",
  rejected: "danger",
  withdrawn: "muted",
};
const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  selected: "Selected",
  winner: "Winner",
  not_progressed: "Not progressed",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const labelFor = (k: string) => STATUS_LABEL[k] ?? (k ? k.replace(/_/g, " ") : "—");
const toneFor = (k: string): Tone => STATUS_TONE[k] ?? "muted";

// A certificate (participation or winner) can only exist for an application that
// actually took part — the withdrawn/rejected entrants never get one. The
// certificate page itself resolves the precise not-yet / being-prepared / issued
// state, so this gate can be a little optimistic.
const CERT_EXCLUDED = new Set(["withdrawn", "rejected"]);
const mayHaveCertificate = (statusKey: string) => !CERT_EXCLUDED.has(statusKey);

const TILE_TINTS = ["#f9b6ff", "#8ba6ff", "#c3e1d0", "#dbe1c3", "#f6f6f6", "#e2e2e2"];
function tileTint(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return TILE_TINTS[h % TILE_TINTS.length];
}

export default function MyApplicationsPage() {
  const { data, isLoading } = useGetMyApplications();
  const [justSubmitted, setJustSubmitted] = useState<string | null>(null);

  // The application summary carries no artwork, so the card thumbnails come from the
  // challenge list (one request) matched on challengeId — rather than a fetch per row.
  const { data: challengesResp } = useGetChallenges({ size: 100 });
  const artworkFor = new Map(
    (challengesResp?.data?.events ?? []).map((e) => [e.id, e.flyerUrl || e.bannerUrl || null]),
  );

  // Set on the apply page right before it navigates here. Read once on mount and cleared
  // immediately so the banner doesn't reappear on a later visit or refresh.
  useEffect(() => {
    const team = sessionStorage.getItem("justSubmittedApplication");
    if (team) setJustSubmitted(team);
    sessionStorage.removeItem("justSubmittedApplication");
  }, []);

  const apps = (data?.data ?? []).map((a) => ({
    id: a.id,
    challengeId: a.challengeId,
    challengeName: a.challengeName,
    statusKey: (a.status || "").toLowerCase().replace(/[\s-]+/g, "_"),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Innovation Challenges</h1>
        <p className="text-sm tracking-[-0.14px] text-foreground/60">Compete, build and win</p>
      </div>

      {/* Same underline tab row as /hackathon, with this tab active. */}
      <div className="-mx-4 flex gap-2 overflow-x-auto border-b border-foreground/10 px-4 md:-mx-8 md:px-8">
        <Link
          href="/hackathon"
          className="border-b-2 border-transparent px-6 py-2 text-sm tracking-[-0.14px] text-foreground/60 transition-colors hover:text-foreground"
        >
          All
        </Link>
        <span className="border-b-2 border-foreground px-6 py-2 text-sm font-semibold tracking-[-0.14px] text-foreground">
          My Application
        </span>
      </div>

      {justSubmitted && (
        <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Application submitted{justSubmitted ? ` for ${justSubmitted}` : ""}. You can track its status here.
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {[1, 2].map((n) => (
            <div key={n} className="h-20 animate-pulse rounded-xl bg-foreground/[0.04]" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
          You haven&apos;t applied to any challenges yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {apps.map((a) => {
            const art = artworkFor.get(a.challengeId) ?? null;
            return (
              <div
                key={a.id}
                className="overflow-hidden rounded-xl border border-foreground/[0.06] bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
              >
                <Link href={`/hackathon/${a.challengeId}`} className="flex items-center gap-3 p-2">
                  <span
                    className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg"
                    style={{ backgroundColor: tileTint(a.challengeName || a.challengeId) }}
                  >
                    {art ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={art}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Lightbulb className="h-5 w-5 text-foreground/50" strokeWidth={1.75} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 py-1">
                    <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">
                      {a.challengeName}
                    </p>
                    <div className="mt-1.5">
                      <Badge variant={toneFor(a.statusKey)}>{labelFor(a.statusKey)}</Badge>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      "border border-foreground/10 text-foreground/60",
                    )}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>

                {/* Kept from our version — this page is the only entry point to a
                    certificate; Figma's card has no slot for it. */}
                {mayHaveCertificate(a.statusKey) && (
                  <Link
                    href={`/hackathon/certificate?challengeId=${a.challengeId}`}
                    className="flex items-center gap-1 border-t border-foreground/[0.06] px-4 py-2.5 text-xs font-medium text-primary transition-colors hover:bg-foreground/[0.02]"
                  >
                    <Award className="h-3.5 w-3.5" /> View certificate
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
