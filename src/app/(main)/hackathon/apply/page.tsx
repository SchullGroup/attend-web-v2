"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, ChevronDown, Check, Video, Code2, Globe } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FilePickField } from "@/components/attend/FilePickField";
import { uploadClient } from "@/api/upload/client";
import { useApplicationConfig, useSubmitApplication } from "@/api/innovation/hooks";
import { useGetChallenge } from "@/api/hackathon/hooks";
import { useGetMe } from "@/api/auth/hooks";
import { InnovationApplicationRequest } from "@/types/innovation";
import { cn } from "@/lib/utils";

type Member = { id: string; name: string; role: string; email?: string; isLeader?: boolean };

const STEP_TITLES = ["Apply to challenge", "Add team members"];
const STEP_SUBTITLE = "Submit your idea details and invite your team members.";

function ApplyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get("challengeId") ?? "";

  const { data: cfgResp, isLoading: cfgLoading } = useApplicationConfig(challengeId);
  const config = cfgResp?.data;
  const { mutate: submitApplication, isPending } = useSubmitApplication(challengeId);

  // The challenge detail carries submissionRequirements (which project fields the
  // admin asked for); the current user becomes the team leader.
  const { data: chData } = useGetChallenge(challengeId);
  const reqs = chData?.data?.submissionRequirements;
  const { data: meResp } = useGetMe();
  const me = meResp?.data;

  // Show a project field only if the admin required it. If requirements aren't
  // available yet, show none of the optional ones (avoid sending what wasn't asked).
  const show = {
    projectDescription: !!reqs?.requireProjectDescription,
    sourceCode: !!reqs?.requireSourceCode,
    liveDemo: !!reqs?.requireLiveDemoUrl,
    pitchDeck: !!reqs?.requirePitchDeck,
    pitchVideo: !!reqs?.requirePitchVideoUrl,
    demoVideo: !!reqs?.requireDemoVideo,
    additionalDocs: !!reqs?.requireAdditionalDocuments,
  };
  const anyProjectField = Object.values(show).some(Boolean);

  const tracks = config?.tracks && config.tracks.length > 0 ? config.tracks : ["General"];
  const teamSize = { min: config?.minTeamSize ?? 1, max: config?.maxTeamSize ?? 5 };

  const [step, setStep] = useState(0);
  const [teamName, setTeamName] = useState("");
  const [track, setTrack] = useState(tracks[0]);
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");
  const [members, setMembers] = useState<Member[]>([{ id: "m1", name: "", role: "Team Lead", isLeader: true }]);
  // Project fields (part of step 1)
  const [projectDescription, setProjectDescription] = useState("");
  const [sourceCodeUrl, setSourceCodeUrl] = useState("");
  const [liveDemoUrl, setLiveDemoUrl] = useState("");
  const [pitchVideoUrl, setPitchVideoUrl] = useState("");
  const [demoVideoUrl, setDemoVideoUrl] = useState("");
  // Files are held in memory and only uploaded at submit time.
  const [pitchDeckFile, setPitchDeckFile] = useState<File | null>(null);
  const [additionalDocsFile, setAdditionalDocsFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);

  // Step 2's "add new member" mini-form — filled in, then committed to `members`
  // via "Invite members" (matches the Figma flow: added members render as
  // immutable summary rows, only removable, not inline-editable).
  const [memberDraftOpen, setMemberDraftOpen] = useState(true);
  const [memberDraft, setMemberDraft] = useState({ name: "", role: "", email: "" });

  useEffect(() => {
    if (!challengeId) router.replace("/hackathon");
  }, [challengeId, router]);

  // Default the selected track to a real one once config loads.
  useEffect(() => {
    if (tracks.length && !tracks.includes(track)) setTrack(tracks[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // Pre-fill the current user as team leader (name + email), so they're always
  // included in the submission as the leader.
  useEffect(() => {
    if (!me) return;
    setMembers((ms) =>
      ms.map((m) =>
        m.isLeader ? { ...m, name: m.name || me.fullName || "", email: me.email || "" } : m,
      ),
    );
  }, [me]);

  function removeMember(id: string) {
    setMembers((m) => m.filter((x) => x.id !== id));
  }
  function inviteMember() {
    if (!memberDraft.name.trim() || !memberDraft.role.trim() || !memberDraft.email.trim()) return;
    setMembers((m) => [
      ...m,
      { id: `m${Math.random().toString(36).slice(2)}`, name: memberDraft.name.trim(), role: memberDraft.role.trim(), email: memberDraft.email.trim() },
    ]);
    setMemberDraft({ name: "", role: "", email: "" });
  }

  const leader = members.find((m) => m.isLeader);
  const otherMembers = members.filter((m) => !m.isLeader);
  const teamSizeOk = members.length >= teamSize.min && members.length <= teamSize.max;

  // A project field is only required if the admin asked for it (`show.*`); anything
  // not required is hidden, so it never blocks.
  const projectComplete =
    (!show.projectDescription || projectDescription.trim().length > 0) &&
    (!show.sourceCode || sourceCodeUrl.trim().length > 0) &&
    (!show.liveDemo || liveDemoUrl.trim().length > 0) &&
    (!show.pitchVideo || pitchVideoUrl.trim().length > 0) &&
    (!show.demoVideo || demoVideoUrl.trim().length > 0) &&
    (!show.pitchDeck || !!pitchDeckFile) &&
    (!show.additionalDocs || !!additionalDocsFile);

  const canContinue =
    teamName.trim().length > 0 &&
    ideaTitle.trim().length > 0 &&
    ideaDescription.trim().length > 10 &&
    projectComplete;

  const canSubmit =
    teamName.trim().length > 0 &&
    ideaTitle.trim().length > 0 &&
    ideaDescription.trim().length > 10 &&
    teamSizeOk &&
    members.every((x) => x.name.trim() && x.role.trim() && (x.email ?? "").trim()) &&
    projectComplete;

  async function submit() {
    setErrorMsg(null);
    setUploading(true);
    try {
      // Upload the held files now (only the ones the admin asked for), get their URLs.
      let pitchDeckUrl = "";
      let additionalDocumentsUrl = "";
      if (show.pitchDeck && pitchDeckFile) {
        pitchDeckUrl = await uploadClient.upload(pitchDeckFile, "documents");
      }
      if (show.additionalDocs && additionalDocsFile) {
        additionalDocumentsUrl = await uploadClient.upload(additionalDocsFile, "documents");
      }

      // Send the leader's real email; only include the project fields the admin asked for.
      const payload: InnovationApplicationRequest = {
        teamName: teamName.trim(),
        track,
        ideaTitle: ideaTitle.trim(),
        ideaDescription: ideaDescription.trim(),
        members: members.map((m) => ({
          fullName: m.name.trim(),
          role: m.role.trim(),
          email: (m.email || "").trim(),
        })),
      };
      if (show.projectDescription) payload.projectDescription = projectDescription.trim();
      if (show.sourceCode) payload.sourceCodeUrl = sourceCodeUrl.trim();
      if (show.liveDemo) payload.liveDemoUrl = liveDemoUrl.trim();
      if (show.pitchDeck && pitchDeckUrl) payload.pitchDeckUrl = pitchDeckUrl;
      if (show.pitchVideo) payload.pitchVideoUrl = pitchVideoUrl.trim();
      if (show.demoVideo) payload.demoVideoUrl = demoVideoUrl.trim();
      if (show.additionalDocs && additionalDocumentsUrl) payload.additionalDocumentsUrl = additionalDocumentsUrl;

      submitApplication(payload, {
        onSuccess: () => setJustSubmitted(true),
        onError: (err: any) => {
          setErrorMsg(
            err?.response?.data?.message || err?.message || "Failed to submit application. Please try again.",
          );
          setUploading(false);
        },
      });
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || e?.message || "File upload failed. Please try again.");
      setUploading(false);
    }
  }

  // Gating: applications closed, or already applied.
  if (!cfgLoading && config && !config.applicationOpen) {
    return (
      <Gate title="Applications are closed" body="This challenge is not accepting applications right now." />
    );
  }
  if (!cfgLoading && config?.alreadyApplied) {
    return (
      <Gate
        title="You've already applied"
        body="You can only submit one application per challenge. To change it, withdraw it first from My Applications."
        action={{ label: "View my applications", href: "/hackathon/my-applications" }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50">
      <div className="flex h-full w-full flex-col bg-[#f6f6f6] sm:max-w-[480px]">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => (step === 0 ? router.push(`/hackathon/${challengeId}`) : setStep(0))}
              aria-label="Back"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,0.08)]"
            >
              <ArrowLeft className="h-4 w-4 text-foreground" />
            </button>
            <p className="text-xs font-medium tracking-[-0.12px] text-foreground/60">Step {step + 1} of 2</p>
          </div>

          <div className="mt-5 flex flex-col gap-1">
            <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">{STEP_TITLES[step]}</h1>
            <p className="text-sm tracking-[-0.14px] text-foreground/60">{STEP_SUBTITLE}</p>
          </div>

          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: step === 0 ? "50%" : "100%" }}
            />
          </div>

          {errorMsg && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {errorMsg}
            </div>
          )}

          {/* Step 1 — Idea + team basics */}
          {step === 0 && (
            <div className="mt-5 flex flex-col gap-4">
              <Input
                name="teamName"
                label="Team name"
                placeholder="Enter Team Name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Pathway</label>
                <select
                  value={track}
                  onChange={(e) => setTrack(e.target.value)}
                  className="h-[50px] w-full rounded-[10px] border border-transparent bg-foreground/[0.04] px-3.5 text-sm tracking-[-0.14px] text-foreground transition-colors focus-visible:border-primary focus-visible:outline-none"
                >
                  {tracks.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <Input
                name="ideaTitle"
                label="Idea title"
                placeholder="Enter Idea title"
                value={ideaTitle}
                onChange={(e) => setIdeaTitle(e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Description</label>
                <p className="text-xs text-foreground/50">Minimum 10 characters.</p>
                <textarea
                  value={ideaDescription}
                  onChange={(e) => setIdeaDescription(e.target.value)}
                  rows={5}
                  placeholder="Describe the problem, your solution, target users, and what you'll have built by demo day."
                  className="w-full rounded-[10px] border border-transparent bg-foreground/[0.04] p-3.5 text-sm tracking-[-0.14px] text-foreground placeholder:font-light placeholder:text-foreground/40 transition-colors focus-visible:border-primary focus-visible:outline-none"
                />
              </div>

              {anyProjectField && (
                <>
                  {show.projectDescription && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Project description</label>
                      <textarea
                        value={projectDescription}
                        onChange={(e) => setProjectDescription(e.target.value)}
                        rows={4}
                        placeholder="What you built, how it works, and what's done so far."
                        className="w-full rounded-[10px] border border-transparent bg-foreground/[0.04] p-3.5 text-sm tracking-[-0.14px] text-foreground placeholder:font-light placeholder:text-foreground/40 transition-colors focus-visible:border-primary focus-visible:outline-none"
                      />
                    </div>
                  )}
                  {show.sourceCode && (
                    <Input
                      name="sourceCodeUrl"
                      label="Source repository"
                      leftIcon={<Code2 className="h-4 w-4" />}
                      placeholder="GitHub repository link"
                      value={sourceCodeUrl}
                      onChange={(e) => setSourceCodeUrl(e.target.value)}
                    />
                  )}
                  {show.liveDemo && (
                    <Input
                      name="liveDemoUrl"
                      label="Live demo URL"
                      leftIcon={<Globe className="h-4 w-4" />}
                      placeholder="Enter GitHub / Demo link"
                      value={liveDemoUrl}
                      onChange={(e) => setLiveDemoUrl(e.target.value)}
                    />
                  )}
                  {show.pitchVideo && (
                    <Input
                      name="pitchVideoUrl"
                      label="Pitch video URL"
                      leftIcon={<Video className="h-4 w-4" />}
                      placeholder="https://youtube.com/... or loom.com/..."
                      value={pitchVideoUrl}
                      onChange={(e) => setPitchVideoUrl(e.target.value)}
                    />
                  )}
                  {show.demoVideo && (
                    <Input
                      name="demoVideoUrl"
                      label="Demo video URL"
                      leftIcon={<Video className="h-4 w-4" />}
                      placeholder="https://youtube.com/watch?v=..."
                      value={demoVideoUrl}
                      onChange={(e) => setDemoVideoUrl(e.target.value)}
                    />
                  )}
                  {show.pitchDeck && (
                    <FilePickField
                      label="Pitch deck"
                      accept=".pdf,.ppt,.pptx,.doc,.docx"
                      hint="PDF, PPT or DOC · max 10 MB — uploaded when you submit"
                      value={pitchDeckFile}
                      onChange={setPitchDeckFile}
                    />
                  )}
                  {show.additionalDocs && (
                    <FilePickField
                      label="Additional document"
                      accept=".pdf,.doc,.docx,.zip"
                      hint="PDF, DOC, or ZIP · max 10 MB — uploaded when you submit"
                      value={additionalDocsFile}
                      onChange={setAdditionalDocsFile}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 2 — Team members */}
          {step === 1 && (
            <div className="mt-5 flex flex-col gap-3">
              {leader && (
                <div className="rounded-xl bg-white p-4">
                  <p className="text-sm font-medium text-foreground">
                    {leader.name || "You"} <span className="font-normal text-foreground/40">(You)</span>
                  </p>
                  <p className="text-xs text-foreground/50">
                    {leader.role}
                    {leader.email && <> <span className="mx-1 inline-block h-1 w-1 rounded-full bg-foreground/20 align-middle" /> {leader.email}</>}
                  </p>
                </div>
              )}

              {otherMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl bg-white p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                    <p className="truncate text-xs text-foreground/50">
                      {m.role}
                      {m.email && <> <span className="mx-1 inline-block h-1 w-1 rounded-full bg-foreground/20 align-middle" /> {m.email}</>}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMember(m.id)}
                    aria-label={`Remove ${m.name}`}
                    className="shrink-0 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {members.length < teamSize.max && (
                <div className="rounded-xl bg-white p-4">
                  <button
                    type="button"
                    onClick={() => setMemberDraftOpen((v) => !v)}
                    className="flex w-full items-center justify-between text-sm font-medium text-foreground"
                  >
                    Add new member
                    <ChevronDown className={cn("h-4 w-4 text-foreground/50 transition-transform", memberDraftOpen && "rotate-180")} />
                  </button>
                  {memberDraftOpen && (
                    <div className="mt-3 flex flex-col gap-3">
                      <input
                        value={memberDraft.name}
                        onChange={(e) => setMemberDraft((d) => ({ ...d, name: e.target.value }))}
                        placeholder="Full name"
                        className="h-[46px] w-full rounded-[10px] border border-transparent bg-foreground/[0.04] px-3.5 text-sm tracking-[-0.14px] text-foreground placeholder:font-light placeholder:text-foreground/40 transition-colors focus-visible:border-primary focus-visible:outline-none"
                      />
                      <input
                        value={memberDraft.role}
                        onChange={(e) => setMemberDraft((d) => ({ ...d, role: e.target.value }))}
                        placeholder="Role"
                        className="h-[46px] w-full rounded-[10px] border border-transparent bg-foreground/[0.04] px-3.5 text-sm tracking-[-0.14px] text-foreground placeholder:font-light placeholder:text-foreground/40 transition-colors focus-visible:border-primary focus-visible:outline-none"
                      />
                      <input
                        value={memberDraft.email}
                        onChange={(e) => setMemberDraft((d) => ({ ...d, email: e.target.value }))}
                        placeholder="Email Address"
                        type="email"
                        className="h-[46px] w-full rounded-[10px] border border-transparent bg-foreground/[0.04] px-3.5 text-sm tracking-[-0.14px] text-foreground placeholder:font-light placeholder:text-foreground/40 transition-colors focus-visible:border-primary focus-visible:outline-none"
                      />
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={inviteMember}
                disabled={!memberDraft.name.trim() || !memberDraft.role.trim() || !memberDraft.email.trim()}
                className="flex h-[50px] w-full items-center justify-center gap-2 rounded-[10px] bg-foreground/[0.04] text-sm font-medium text-foreground transition-colors hover:bg-foreground/[0.08] disabled:opacity-50"
              >
                + Invite members
              </button>

              <p className="text-xs text-foreground/50">
                {teamSize.min}–{teamSize.max} members per team.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-foreground/[0.06] p-6">
          {step === 0 ? (
            <Button size="lg" fullWidth onClick={() => setStep(1)} disabled={!canContinue}>
              Continue
            </Button>
          ) : (
            <Button size="lg" fullWidth onClick={submit} loading={uploading || isPending} disabled={uploading || isPending || !canSubmit}>
              Submit Application
            </Button>
          )}
        </div>
      </div>

      {justSubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <Check className="h-8 w-8 text-white" strokeWidth={3} />
            </div>
            <h2 className="mt-5 text-xl font-medium tracking-[-0.4px] text-foreground">Application Submitted</h2>
            <p className="mt-2 text-sm text-foreground/60">
              Your application has been received. We&apos;ll notify you once judging begins.
            </p>
            <Button size="lg" fullWidth className="mt-6" onClick={() => router.push("/hackathon/my-applications")}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Gate({
  title, body, action,
}: {
  title: string;
  body: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/hackathon" className="inline-flex w-fit items-center gap-1 text-sm text-foreground/60 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Innovation
      </Link>
      <div className="mx-auto w-full max-w-md rounded-xl border border-foreground/[0.06] bg-white p-8 text-center shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
        <h1 className="text-xl font-medium text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-foreground/60">{body}</p>
        {action && (
          <Link href={action.href} className="mt-4 inline-block">
            <Button variant="outline" size="sm">{action.label}</Button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function ApplyPage() {
  return (
    <Suspense>
      <ApplyPageInner />
    </Suspense>
  );
}
