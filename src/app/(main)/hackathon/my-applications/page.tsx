"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, CheckCircle2, Award } from "lucide-react";
import { useGetMyApplications } from "@/api/innovation/hooks";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";

type Tone = "info" | "warning" | "success" | "muted";

const STATUS_TONE: Record<string, Tone> = {
  submitted: "info",
  under_review: "warning",
  shortlisted: "success",
  selected: "success",
  not_progressed: "muted",
  rejected: "muted",
  withdrawn: "muted",
};
const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  selected: "Selected",
  not_progressed: "Not progressed",
  rejected: "Not progressed",
  withdrawn: "Withdrawn",
};

const labelFor = (k: string) => STATUS_LABEL[k] ?? (k ? k.replace(/_/g, " ") : "ΓÇö");
const toneFor = (k: string): Tone => STATUS_TONE[k] ?? "muted";

// A certificate (participation or winner) can only exist for an application that
// actually took part ΓÇö the withdrawn/rejected entrants never get one. The
// certificate page itself resolves the precise not-yet / being-prepared / issued
// state, so this gate can be a little optimistic.
const CERT_EXCLUDED = new Set(["withdrawn", "rejected"]);
const mayHaveCertificate = (statusKey: string) => !CERT_EXCLUDED.has(statusKey);

export default function MyApplicationsPage() {
  const router = useRouter();
  const { data, isLoading } = useGetMyApplications();
  const [justSubmitted, setJustSubmitted] = useState<string | null>(null);

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
    applicationCode: a.applicationCode,
    teamName: a.teamName,
    track: a.track,
    submittedAt: a.submittedAt ? formatDate(a.submittedAt) : "ΓÇö",
    statusKey: (a.status || "").toLowerCase().replace(/[\s-]+/g, "_"),
    // Backend flags whether you're the team lead or just a member of this application.
    roleLabel: a.lead ? "Lead" : a.memberRole ? "Member" : null,
  }));

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <header>
        <h1 className="text-2xl font-bold text-foreground">My applications</h1>
        <p className="text-sm text-muted-foreground">
          Track the status of every challenge you&apos;ve applied to.
        </p>
      </header>

      {justSubmitted && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            Application submitted{justSubmitted ? ` for ${justSubmitted}` : ""}. You can track its status here.
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-muted" />
      ) : apps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          You haven&apos;t applied to any challenges yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-white">
          {/* desktop table */}
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Challenge</th>
                <th className="px-4 py-3 text-left font-semibold">Team</th>
                <th className="px-4 py-3 text-left font-semibold">Pathway</th>
                <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold" aria-label="Certificate" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {apps.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <Link href={`/hackathon/${a.challengeId}`} className="hover:text-primary">
                      {a.challengeName}
                    </Link>
                    {a.applicationCode && (
                      <span className="block text-xs font-normal text-muted-foreground">{a.applicationCode}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      {a.teamName}
                      {a.roleLabel && (
                        <Badge variant={a.roleLabel === "Lead" ? "info" : "muted"}>{a.roleLabel}</Badge>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.track}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.submittedAt}</td>
                  <td className="px-4 py-3">
                    <Badge variant={toneFor(a.statusKey)}>{labelFor(a.statusKey)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {mayHaveCertificate(a.statusKey) && (
                      <Link
                        href={`/hackathon/certificate?challengeId=${a.challengeId}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <Award className="h-3.5 w-3.5" /> Certificate
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* mobile list */}
          <ul className="divide-y divide-border md:hidden">
            {apps.map((a) => (
              <li key={a.id}>
                <Link href={`/hackathon/${a.challengeId}`} className="flex items-start gap-3 p-4 hover:bg-muted/30">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{a.challengeName}</p>
                      {a.roleLabel && (
                        <Badge variant={a.roleLabel === "Lead" ? "info" : "muted"}>{a.roleLabel}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {a.teamName} ┬╖ {a.track}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.submittedAt}{a.applicationCode ? ` ┬╖ ${a.applicationCode}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={toneFor(a.statusKey)}>{labelFor(a.statusKey)}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
                {mayHaveCertificate(a.statusKey) && (
                  <Link
                    href={`/hackathon/certificate?challengeId=${a.challengeId}`}
                    className="flex items-center gap-1 border-t border-border px-4 py-2.5 text-xs font-medium text-primary hover:bg-muted/30"
                  >
                    <Award className="h-3.5 w-3.5" /> View certificate
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
