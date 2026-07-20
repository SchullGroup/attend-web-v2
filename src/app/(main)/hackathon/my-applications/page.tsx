"use client";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
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

const labelFor = (k: string) => STATUS_LABEL[k] ?? (k ? k.replace(/_/g, " ") : "—");
const toneFor = (k: string): Tone => STATUS_TONE[k] ?? "muted";

export default function MyApplicationsPage() {
  const { data, isLoading } = useGetMyApplications();
  const apps = (data?.data ?? []).map((a) => ({
    id: a.id,
    challengeId: a.challengeId,
    challengeName: a.challengeName,
    applicationCode: a.applicationCode,
    teamName: a.teamName,
    track: a.track,
    submittedAt: a.submittedAt ? formatDate(a.submittedAt) : "—",
    statusKey: (a.status || "").toLowerCase().replace(/[\s-]+/g, "_"),
    // Backend flags whether you're the team lead or just a member of this application.
    roleLabel: a.lead ? "Lead" : a.memberRole ? "Member" : null,
  }));

  return (
    <div className="space-y-6">
      <Link href="/hackathon" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Innovation
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-foreground">My applications</h1>
        <p className="text-sm text-muted-foreground">
          Track the status of every challenge you&apos;ve applied to.
        </p>
      </header>

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
                      {a.teamName} · {a.track}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.submittedAt}{a.applicationCode ? ` · ${a.applicationCode}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={toneFor(a.statusKey)}>{labelFor(a.statusKey)}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
