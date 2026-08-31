"use client";
import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lightbulb, X, ChevronRight } from "lucide-react";
import { useGetMyApplications, useGetApplication, useWithdrawApplication } from "@/api/innovation/hooks";

const STATUS_STYLE: Record<string, { label: string; className: string; plain?: boolean }> = {
  submitted: { label: "Submitted", className: "bg-indigo-50 text-indigo-600" },
  under_review: { label: "Under review", className: "bg-amber-50 text-amber-700" },
  shortlisted: { label: "Shortlisted", className: "bg-primary/10 text-primary" },
  selected: { label: "Winner", className: "bg-amber-100 text-amber-800" },
  not_progressed: { label: "Not progressed", className: "text-foreground/50", plain: true },
  rejected: { label: "Rejected", className: "text-red-500", plain: true },
  withdrawn: { label: "Withdrawn", className: "text-foreground/40", plain: true },
};
const styleFor = (k: string) => STATUS_STYLE[k] ?? { label: k ? k.replace(/_/g, " ") : "—", className: "text-foreground/50", plain: true };

function MyApplicationsInner() {
  const searchParams = useSearchParams();
  // The challenge brief page ("My Application" row) only knows the challengeId;
  // a direct deep link (e.g. a notification) can pass applicationId directly.
  const applicationIdParam = searchParams.get("applicationId") ?? "";
  const challengeIdParam = searchParams.get("challengeId") ?? "";

  const { data, isLoading } = useGetMyApplications();
  const apps = (data?.data ?? []).map((a) => ({
    ...a,
    statusKey: (a.status || "").toLowerCase().replace(/[\s-]+/g, "_"),
  }));

  const resolvedId = applicationIdParam || apps.find((a) => a.challengeId === challengeIdParam)?.id || "";
  const showDrawer = !!(applicationIdParam || challengeIdParam);
  const fromList = useMemo(() => apps.find((a) => a.id === resolvedId), [apps, resolvedId]);

  // Fall back to a direct fetch only when the list hasn't surfaced this application
  // yet (e.g. a fresh deep link) — puts the previously-unused single-application
  // endpoint to work instead of duplicating a call the list already satisfies.
  const { data: singleResp, isLoading: singleLoading } = useGetApplication(!fromList ? resolvedId : "");
  const single = singleResp?.data;

  const { mutate: withdraw, isPending: withdrawing } = useWithdrawApplication();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">
          Innovation Challenges
        </h1>
        <p className="text-sm tracking-[-0.14px] text-foreground/60">
          Compete, build and win
        </p>
      </div>

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

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {[1, 2].map((n) => (
            <div key={n} className="h-20 animate-pulse rounded-xl bg-foreground/5" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground/50">
          You haven&apos;t applied to any challenges yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {apps.map((a) => {
            const style = styleFor(a.statusKey);
            return (
              <Link
                key={a.id}
                href={`/hackathon/my-applications?applicationId=${a.id}`}
                className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-white p-3 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-[0px_4px_20px_0px_rgba(0,0,0,0.08)]"
              >
                <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-foreground/[0.04]">
                  <Lightbulb className="h-6 w-6 text-foreground/60" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium tracking-[-0.14px] text-foreground">
                    {a.challengeName}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {style.plain ? (
                      <span className={`text-xs font-medium ${style.className}`}>{style.label}</span>
                    ) : (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style.className}`}>
                        {style.label}
                      </span>
                    )}
                  </div>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-foreground/10">
                  <ChevronRight className="h-4 w-4 text-foreground" />
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {showDrawer && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/50">
          <div className="flex h-full w-full flex-col gap-4 overflow-y-auto bg-[#f6f6f6] p-6 sm:max-w-[460px]">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium tracking-[-0.4px] text-foreground">My application details</h2>
              <Link
                href="/hackathon/my-applications"
                aria-label="Close"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,0.08)]"
              >
                <X className="h-4 w-4 text-foreground" />
              </Link>
            </div>

            {!fromList && singleLoading ? (
              <>
                <div className="h-16 animate-pulse rounded-xl bg-white/60" />
                <div className="h-16 animate-pulse rounded-xl bg-white/60" />
                <div className="h-32 animate-pulse rounded-xl bg-white/60" />
              </>
            ) : fromList ? (
              <ApplicationDetails
                teamName={fromList.teamName}
                ideaTitle={fromList.ideaTitle || "—"}
                description={fromList.ideaDescription || ""}
                members={(fromList.teamMembers ?? []).map((m) => ({ name: m.name, role: m.role, email: m.email, isLead: m.lead }))}
                statusKey={fromList.statusKey}
                onWithdraw={() => {
                  if (window.confirm("Withdraw this application? You can re-apply afterwards.")) {
                    withdraw(fromList.id);
                  }
                }}
                withdrawing={withdrawing}
              />
            ) : single ? (
              <ApplicationDetails
                teamName={single.teamName}
                ideaTitle={single.ideaTitle || "—"}
                description={single.ideaDescription || ""}
                members={single.members.map((m) => ({ name: m.fullName, role: m.role }))}
                statusKey={(single.status || "").toLowerCase().replace(/[\s-]+/g, "_")}
                onWithdraw={() => {
                  if (window.confirm("Withdraw this application? You can re-apply afterwards.")) {
                    withdraw(single.id);
                  }
                }}
                withdrawing={withdrawing}
              />
            ) : (
              <p className="py-8 text-center text-sm text-foreground/50">
                This application could not be found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ApplicationDetails({
  teamName,
  ideaTitle,
  description,
  members,
  statusKey,
  onWithdraw,
  withdrawing,
}: {
  teamName: string;
  ideaTitle: string;
  description: string;
  members: { name: string; role: string; email?: string; isLead?: boolean }[];
  statusKey: string;
  onWithdraw: () => void;
  withdrawing: boolean;
}) {
  return (
    <>
      <Field label="Team name" value={teamName} />
      <Field label="Idea title" value={ideaTitle} />

      {members.length > 0 && (
        <div className="rounded-xl bg-white p-4">
          <p className="mb-3 text-xs text-foreground/40">Team members</p>
          <div className="flex flex-col">
            {members.map((m, i) => (
              <div key={`${m.name}-${i}`} className={i > 0 ? "mt-3 border-t border-foreground/[0.06] pt-3" : ""}>
                <p className="text-sm font-medium text-foreground">
                  {m.name} {m.isLead && <span className="font-normal text-foreground/40">(You)</span>}
                </p>
                <p className="text-xs text-foreground/50">
                  {m.role}
                  {m.email && <> <span className="mx-1 inline-block h-1 w-1 rounded-full bg-foreground/20 align-middle" /> {m.email}</>}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {description && (
        <div className="rounded-xl bg-white p-4">
          <p className="mb-1.5 text-xs text-foreground/40">Description</p>
          <p className="text-sm leading-relaxed text-foreground/80">{description}</p>
        </div>
      )}

      {statusKey !== "withdrawn" && (
        <button
          type="button"
          onClick={onWithdraw}
          disabled={withdrawing}
          className="mt-2 self-start text-sm font-medium text-red-500 hover:underline disabled:opacity-50"
        >
          {withdrawing ? "Withdrawing…" : "Withdraw application"}
        </button>
      )}
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="mb-1 text-xs text-foreground/40">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export default function MyApplicationsPage() {
  return (
    <Suspense>
      <MyApplicationsInner />
    </Suspense>
  );
}
