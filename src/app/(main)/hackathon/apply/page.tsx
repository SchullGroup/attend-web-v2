"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Check, Video, Code2, Globe } from "lucide-react";
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

const STEPS = ["Team", "Idea", "Members"] as const;

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

  const challengeName = config?.challengeName ?? "Innovation Challenge";
  const tracks = config?.tracks && config.tracks.length > 0 ? config.tracks : ["General"];
  const teamSize = { min: config?.minTeamSize ?? 1, max: config?.maxTeamSize ?? 5 };

  const [step, setStep] = useState(0);
  const [teamName, setTeamName] = useState("");
  const [track, setTrack] = useState(tracks[0]);
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");
  const [members, setMembers] = useState<Member[]>([{ id: "m1", name: "", role: "Team Lead", isLeader: true }]);
  // Project (step 4)
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

  function addMember() {
    setMembers((m) => [...m, { id: `m${Math.random()}`, name: "", role: "", email: "" }]);
  }
  function removeMember(id: string) {
    setMembers((m) => m.filter((x) => x.id !== id));
  }
  function updateMember(id: string, k: "name" | "role" | "email", v: string) {
    setMembers((m) => m.map((x) => (x.id === id ? { ...x, [k]: v } : x)));
  }

  const teamSizeOk = members.length >= teamSize.min && members.length <= teamSize.max;

  // A project field is only required if the admin asked for it (`show.*`); anything
  // not required is hidden, so it never blocks. Project now lives on the Idea step.
  const projectComplete =
    (!show.projectDescription || projectDescription.trim().length > 0) &&
    (!show.sourceCode || sourceCodeUrl.trim().length > 0) &&
    (!show.liveDemo || liveDemoUrl.trim().length > 0) &&
    (!show.pitchVideo || pitchVideoUrl.trim().length > 0) &&
    (!show.demoVideo || demoVideoUrl.trim().length > 0) &&
    (!show.pitchDeck || !!pitchDeckFile) &&
    (!show.additionalDocs || !!additionalDocsFile);

  const canNext =
    step === 0 ? teamName.trim().length > 0 :
    step === 1 ? ideaTitle.trim().length > 0 && ideaDescription.trim().length > 10 && projectComplete :
    true; // Members is the last step → uses the Submit button (gated by canSubmit)

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
        onSuccess: () => router.push("/hackathon/my-applications"),
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
    <div className="space-y-6">
      <Link href="/hackathon" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Cancel application
      </Link>

      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
          {challengeName}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Apply to challenge</h1>
        <p className="text-sm text-muted-foreground">
          Submit your team, idea and project in one go. You can&apos;t edit after submitting (you can withdraw and re-apply).
        </p>
      </header>

      {/* stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  done && "border-purple-600 bg-purple-600 text-white",
                  active && "border-purple-600 bg-white text-purple-700",
                  !done && !active && "border-border bg-white text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <div className="hidden text-xs font-medium md:block">{s}</div>
              {i < STEPS.length - 1 && (
                <div className={cn("h-1 flex-1 rounded-full", done ? "bg-purple-600" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        {/* Step 1 — Team */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Team details</h2>
            <Input
              name="teamName"
              label="Team name"
              placeholder="e.g. ByteForce"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
            <div>
              <label className="text-sm font-medium text-foreground">Pathway</label>
              <select
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                className="mt-1.5 h-11 w-full rounded-xl border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
              >
                {tracks.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 2 — Idea */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Your idea</h2>
            <Input
              name="ideaTitle"
              label="Idea title"
              placeholder="e.g. MicroVest — fractional ETFs for everyone"
              value={ideaTitle}
              onChange={(e) => setIdeaTitle(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Description</label>
              <textarea
                value={ideaDescription}
                onChange={(e) => setIdeaDescription(e.target.value)}
                rows={6}
                placeholder="Describe the problem, your solution, target users, and what you'll have built by demo day."
                className="w-full rounded-xl border border-input bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
              />
              <p className="text-xs text-muted-foreground">Minimum 10 characters.</p>
            </div>
          </div>
        )}

        {/* Step 3 — Members */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Team members</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMember}
                disabled={members.length >= teamSize.max}
              >
                <Plus className="h-4 w-4" /> Add member
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {teamSize.min}–{teamSize.max} members per team. Add their full name, role and email.
            </p>
            <ul className="space-y-3">
              {members.map((m, i) => (
                <li key={m.id} className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground">Member {i + 1}</p>
                    {members.length > 1 && (
                      <button
                        onClick={() => removeMember(m.id)}
                        className="text-xs font-medium text-destructive hover:underline"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <Input
                      name={`name-${m.id}`}
                      label="Full name"
                      placeholder="e.g. Adaeze Nwosu"
                      value={m.name}
                      onChange={(e) => updateMember(m.id, "name", e.target.value)}
                    />
                    <Input
                      name={`role-${m.id}`}
                      label="Role"
                      placeholder="e.g. Backend engineer"
                      value={m.role}
                      onChange={(e) => updateMember(m.id, "role", e.target.value)}
                    />
                    <Input
                      name={`email-${m.id}`}
                      label="Email"
                      type="email"
                      placeholder="e.g. adaeze@example.com"
                      value={m.email ?? ""}
                      onChange={(e) => updateMember(m.id, "email", e.target.value)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Project — merged into the Idea step (only the fields the admin requires) */}
        {step === 1 && anyProjectField && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Your project</h2>
            {show.projectDescription && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Project description</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={5}
                  placeholder="What you built, how it works, and what's done so far."
                  className="w-full rounded-xl border border-input bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
                />
              </div>
            )}
            {(show.sourceCode || show.liveDemo || show.pitchVideo || show.demoVideo) && (
              <div className="grid gap-4 md:grid-cols-2">
                {show.sourceCode && (
                  <Input
                    name="sourceCodeUrl"
                    label="Source repository"
                    leftIcon={<Code2 className="h-4 w-4" />}
                    placeholder="https://github.com/team/project"
                    value={sourceCodeUrl}
                    onChange={(e) => setSourceCodeUrl(e.target.value)}
                  />
                )}
                {show.liveDemo && (
                  <Input
                    name="liveDemoUrl"
                    label="Live demo URL"
                    leftIcon={<Globe className="h-4 w-4" />}
                    placeholder="https://demo.example.com"
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
              </div>
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
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
            Continue
          </Button>
        ) : (
          <Button onClick={submit} loading={uploading || isPending} disabled={uploading || isPending || !canSubmit}>
            Submit application
          </Button>
        )}
      </div>
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
    <div className="space-y-6">
      <Link href="/hackathon" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Innovation
      </Link>
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
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
