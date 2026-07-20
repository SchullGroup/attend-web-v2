"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, Award, Star, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useGetCertificate } from "@/api/hackathon/hooks";
import { formatDate } from "@/lib/utils";

function CertificateInner() {
  const challengeId = useSearchParams().get("challengeId") ?? "";
  const [shared, setShared] = useState(false);

  const { data, isLoading } = useGetCertificate(challengeId);
  const cert = data?.data;

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: "My Innovation Challenge Certificate", url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }

  if (challengeId && isLoading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="h-96 animate-pulse rounded-3xl border border-border bg-muted" />
      </div>
    );
  }

  if (!challengeId || !cert) {
    return (
      <div className="space-y-6">
        <Link href="/hackathon" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No certificate found. Open this from a challenge you participated in.
        </div>
      </div>
    );
  }

  // Not eligible yet → show the backend message instead of a certificate.
  if (!cert.eligible) {
    return (
      <div className="space-y-6">
        <Link href="/hackathon" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-foreground">Certificate not available yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {cert.message || "Your certificate will be available once participation is confirmed."}
          </p>
        </div>
      </div>
    );
  }

  const view = {
    name: cert.participantName,
    eventTitle: cert.eventTitle,
    subline: cert.teamName ? `Team ${cert.teamName}` : "",
    verifyId: data?.referenceId ?? "—",
  };

  return (
    <div className="space-y-6">
      <Link href="/hackathon" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <header className="flex flex-wrap items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your certificate</h1>
          <p className="text-sm text-muted-foreground">
            Thank you for taking part — share your achievement.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl">
        <div className="relative overflow-hidden rounded-3xl border-[3px] border-purple-200 bg-gradient-to-br from-white via-purple-50/40 to-white p-8 shadow-lg md:p-12">
          <Corner className="left-3 top-3" />
          <Corner className="right-3 top-3 rotate-90" />
          <Corner className="bottom-3 left-3 -rotate-90" />
          <Corner className="bottom-3 right-3 rotate-180" />

          <div className="relative space-y-6 text-center">
            <div className="flex items-center justify-center gap-2 text-purple-700">
              <div className="text-base font-extrabold tracking-tight">attend</div>
              <span className="h-1 w-1 rounded-full bg-purple-700" />
              <p className="text-[10px] uppercase tracking-[0.3em]">Innovation Challenge</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Certificate of Participation
              </p>
              <h2 className="mt-3 font-serif text-4xl font-bold text-foreground md:text-5xl">
                {view.name}
              </h2>
              <div className="mx-auto mt-3 h-px w-32 bg-purple-200" />
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                successfully participated in the
              </p>
              <p className="mt-1 text-lg font-semibold text-foreground md:text-xl">
                {view.eventTitle}
              </p>
              {view.subline && (
                <p className="mt-3 text-sm text-muted-foreground">{view.subline}.</p>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2 text-purple-700">
              <Star className="h-4 w-4 fill-current" />
              <Award className="h-8 w-8" />
              <Star className="h-4 w-4 fill-current" />
            </div>

            <div className="grid grid-cols-2 gap-6 border-t border-purple-200 pt-6 text-left">
              <div>
                <p className="font-serif italic text-foreground">Dr. Yewande Adeyemi</p>
                <div className="mt-1 border-t border-foreground/40 pt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Chief Innovation Officer
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground tracking-wider">{view.verifyId}</p>
                <div className="mt-1 border-t border-foreground/40 pt-1 text-right text-[10px] uppercase tracking-wide text-muted-foreground">
                  Verification ID
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-3">
          <Button onClick={() => window.print()}>
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Button variant="outline" onClick={handleShare}>
            {shared ? <><Check className="h-4 w-4" /> Copied!</> : "Share"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return (
    <div className={`absolute h-12 w-12 ${className}`}>
      <div className="absolute left-0 top-0 h-1 w-12 bg-purple-300" />
      <div className="absolute left-0 top-0 h-12 w-1 bg-purple-300" />
    </div>
  );
}

export default function CertificatePage() {
  return (
    <Suspense>
      <CertificateInner />
    </Suspense>
  );
}
