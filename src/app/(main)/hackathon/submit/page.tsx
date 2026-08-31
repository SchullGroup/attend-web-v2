"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Github, Globe } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UploadField } from "@/components/attend/UploadField";
import { useSubmitProject, useGetMyTeam, useGetChallenge } from "@/api/hackathon/hooks";

function SubmitPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const challengeId = searchParams.get("challengeId") ?? "";
  const teamIdParam = searchParams.get("teamId") ?? "";

  const [form, setForm] = useState({
    title: "",
    description: "",
    repositoryUrl: "",
    demoUrl: "",
    pitchDeckUrl: "",
    demoVideoUrl: "",
    additionalDocsUrl: "",
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: teamData } = useGetMyTeam(challengeId);
  const { data: chData } = useGetChallenge(challengeId);
  const { mutate: submitProject, isPending } = useSubmitProject();

  const teamId = teamIdParam || teamData?.data?.id || "";

  // Which fields the admin requires for this challenge. If the requirements aren't
  // available (e.g. detail call fails), fall back to showing all fields.
  const reqs = chData?.data?.submissionRequirements;
  const showAll = !reqs;
  const show = {
    description: showAll || !!reqs?.requireProjectDescription,
    repo: showAll || !!reqs?.requireSourceCode,
    demoUrl: showAll || !!reqs?.requireLiveDemoUrl,
    pitchDeck: showAll || !!reqs?.requirePitchDeck,
    demoVideo: showAll || !!reqs?.requireDemoVideo || !!reqs?.requirePitchVideoUrl,
    additionalDocs: !!reqs?.requireAdditionalDocuments,
  };

  useEffect(() => {
    if (!challengeId) router.replace("/hackathon");
  }, [challengeId, router]);

  useEffect(() => {
    const sub = teamData?.data?.submission;
    if (sub) {
      setForm((f) => ({
        ...f,
        title: sub.title || "",
        description: sub.description || "",
        repositoryUrl: sub.repositoryUrl || "",
        demoUrl: sub.demoUrl || "",
      }));
    }
  }, [teamData]);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Title is always required; every other field only when it's shown AND required.
  const valid =
    form.title.trim().length > 0 &&
    (!show.description || form.description.trim().length > 0) &&
    (!reqs?.requireSourceCode || form.repositoryUrl.trim().length > 0) &&
    (!reqs?.requireLiveDemoUrl || form.demoUrl.trim().length > 0) &&
    (!reqs?.requirePitchDeck || form.pitchDeckUrl.trim().length > 0) &&
    ((!reqs?.requireDemoVideo && !reqs?.requirePitchVideoUrl) || form.demoVideoUrl.trim().length > 0) &&
    (!reqs?.requireAdditionalDocuments || form.additionalDocsUrl.trim().length > 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) return;
    setErrorMsg(null);
    // The additional-document upload is collected (when the challenge requires it) but
    // NOT sent — SubmitApplicationRequest has no field for it (see backend doc 7f). We
    // keep the field rather than fold its URL into the description (which pollutes it).
    const description = form.description.trim();

    submitProject(
      {
        teamId,
        data: {
          title: form.title.trim(),
          description,
          repositoryUrl: form.repositoryUrl.trim(),
          demoUrl: form.demoUrl.trim(),
          pitchDeckUrl: form.pitchDeckUrl.trim(),
          demoVideoUrl: form.demoVideoUrl.trim(),
        },
      },
      {
        onSuccess: () => router.push("/hackathon/my-applications"),
        onError: (err: any) =>
          setErrorMsg(
            err?.response?.data?.message || err?.message || "Submission failed. Please try again.",
          ),
      },
    );
  }

  const showLinks = show.demoUrl || show.repo;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/hackathon" className="inline-flex w-fit items-center gap-1 text-sm text-foreground/60 hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-[-0.12px] text-foreground/60">
          {teamData?.data?.name ?? "Your team"}
        </p>
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Submit your project</h1>
        <p className="text-sm tracking-[-0.14px] text-foreground/60">
          {reqs
            ? "Provide the items requested for this challenge. You can update before the deadline."
            : "Fill in the fields below to submit your team's entry. You can update this before the deadline."}
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-5 rounded-xl border border-foreground/[0.06] bg-white p-6 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        {/* ── Project Details ── */}
        <p className="-mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/40">
          Project Details
        </p>

        <Input
          name="title"
          label="Project title"
          placeholder="e.g. MicroVest"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
        />

        {show.description && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Project description</label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={6}
              placeholder="What you built, who it's for, and what makes it stand out."
              className="w-full rounded-[10px] border border-transparent bg-foreground/[0.04] p-3.5 text-sm tracking-[-0.14px] text-foreground placeholder:font-light placeholder:text-foreground/40 transition-colors focus-visible:border-primary focus-visible:outline-none"
            />
          </div>
        )}

        {/* ── Links ── */}
        {showLinks && (
          <>
            <hr className="border-foreground/[0.06]" />
            <p className="-mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/40">
              Links
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {show.demoUrl && (
                <Input
                  name="demoUrl"
                  label="Demo URL"
                  leftIcon={<Globe className="h-4 w-4" />}
                  placeholder="https://demo.example.com"
                  value={form.demoUrl}
                  onChange={(e) => update("demoUrl", e.target.value)}
                />
              )}
              {show.repo && (
                <Input
                  name="repositoryUrl"
                  label="Source repository"
                  leftIcon={<Github className="h-4 w-4" />}
                  placeholder="https://github.com/team/project"
                  value={form.repositoryUrl}
                  onChange={(e) => update("repositoryUrl", e.target.value)}
                />
              )}
            </div>
          </>
        )}

        {/* ── Pitch deck ── */}
        {show.pitchDeck && (
          <>
            <hr className="border-foreground/[0.06]" />
            <p className="-mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/40">
              Presentation
            </p>
            <UploadField
              label="Pitch deck"
              accept=".pdf,.ppt,.pptx,.doc,.docx"
              folder="documents"
              hint="PDF, PPT or DOC · max 10 MB"
              value={form.pitchDeckUrl}
              onUploaded={(url) => update("pitchDeckUrl", url)}
            />
          </>
        )}

        {/* ── Demo video ── */}
        {show.demoVideo && (
          <>
            <hr className="border-foreground/[0.06]" />
            <p className="-mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/40">
              Demo
            </p>
            <UploadField
              label="Demo video"
              accept="video/*"
              folder="videos"
              maxSize={100 * 1024 * 1024}
              hint="MP4 or MOV · max 100 MB"
              value={form.demoVideoUrl}
              onUploaded={(url) => update("demoVideoUrl", url)}
            />
          </>
        )}

        {/* ── Additional documents ── */}
        {show.additionalDocs && (
          <>
            <hr className="border-foreground/[0.06]" />
            <p className="-mb-1 text-xs font-semibold uppercase tracking-wide text-foreground/40">
              Supporting documents
            </p>
            <UploadField
              label="Additional document"
              accept=".pdf,.doc,.docx,.zip"
              folder="documents"
              hint="PDF, DOC, or ZIP · max 10 MB"
              value={form.additionalDocsUrl}
              onUploaded={(url) => update("additionalDocsUrl", url)}
            />
          </>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" loading={isPending} disabled={!valid || !teamId}>
            {teamData?.data?.submission ? "Update submission" : "Submit project"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function SubmitPage() {
  return (
    <Suspense>
      <SubmitPageInner />
    </Suspense>
  );
}
