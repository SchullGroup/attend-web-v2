"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, Download, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useGetCertificate } from "@/api/hackathon/hooks";

function CertificateInner() {
  const router = useRouter();
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

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50">
      <div className="flex h-full w-full flex-col gap-5 overflow-y-auto bg-[#f6f6f6] p-6 sm:max-w-[520px]">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-medium tracking-[-0.4px] text-foreground">Attendance Certificate</h1>
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,0.08)]"
          >
            <X className="h-4 w-4 text-foreground" />
          </button>
        </div>

        {challengeId && isLoading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-white/60" />
        ) : !challengeId || !cert ? (
          <div className="rounded-xl border border-dashed border-foreground/10 bg-white/40 p-10 text-center text-sm text-foreground/50">
            No certificate found. Open this from a challenge you participated in.
          </div>
        ) : !cert.eligible ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
              <Clock className="h-7 w-7 text-amber-600" />
            </div>
            <h2 className="mt-4 text-lg font-medium text-foreground">Certificate not available yet</h2>
            <p className="mt-2 text-sm text-foreground/60">
              {cert.message || "Your certificate will be available once participation is confirmed."}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
              <CertificateArt
                name={cert.participantName}
                eventTitle={cert.eventTitle}
                subline={cert.teamName ? `Team ${cert.teamName}` : ""}
              />
            </div>

            <div className="flex flex-col gap-2.5">
              <Button size="lg" fullWidth onClick={() => window.print()}>
                <Download className="h-4 w-4" /> Download PDF
              </Button>
              <Button size="lg" variant="ghost" fullWidth className="bg-foreground/[0.04] hover:bg-foreground/[0.08]" onClick={handleShare}>
                {shared ? <><Check className="h-4 w-4" /> Copied!</> : "Share"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CertificateArt({ name, eventTitle, subline }: { name: string; eventTitle: string; subline: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[#f7f2e4]">
      {/* left accent bars */}
      <div className="absolute inset-y-0 left-0 flex w-2 flex-col">
        <div className="flex-1 bg-teal-700" />
        <div className="flex-1 bg-primary" />
        <div className="flex-1 bg-amber-500" />
      </div>
      {/* right decorative pattern */}
      <div
        className="absolute inset-y-0 right-0 w-16 opacity-90"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, #0f5c52 0px, #0f5c52 10px, #f7f2e4 10px, #f7f2e4 12px, #057a46 12px, #057a46 22px, #f7f2e4 22px, #f7f2e4 24px, #1f1f2e 24px, #1f1f2e 34px, #f7f2e4 34px, #f7f2e4 36px, #d4a72c 36px, #d4a72c 46px, #f7f2e4 46px, #f7f2e4 48px)",
        }}
      />

      <div className="relative flex flex-col items-center gap-4 px-8 py-10 pr-20 text-center sm:px-14 sm:pr-24">
        <p className="text-lg font-semibold tracking-[-0.36px] text-primary">Attend</p>

        <div>
          <h2 className="text-3xl font-medium tracking-[-0.9px] text-foreground sm:text-4xl">Certificate</h2>
          <p className="text-sm text-foreground/60">of attendance</p>
        </div>

        <div>
          <p className="text-xs text-foreground/50">This certificate is proudly presented to</p>
          <p className="mt-2 border-b border-foreground/20 pb-1.5 text-xl font-semibold text-foreground">{name}</p>
        </div>

        <div>
          <p className="text-xs text-foreground/50">for attending and participating in</p>
          <p className="mt-2 border-b border-foreground/20 pb-1.5 text-base font-semibold text-foreground">{eventTitle}</p>
          {subline && <p className="mt-2 text-xs text-foreground/50">{subline}</p>}
        </div>

        <div className="mt-4 grid w-full grid-cols-2 gap-6 border-t border-foreground/10 pt-5 text-left">
          <div>
            <p className="text-sm italic text-foreground">Sulaiman Adedokun, CFA</p>
            <div className="mt-1 border-t border-foreground/30 pt-1 text-[9px] uppercase tracking-wide text-foreground/50">
              Group Managing Director
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm italic text-foreground">Dr. Stanley Jacob, PhD</p>
            <div className="mt-1 border-t border-foreground/30 pt-1 text-right text-[9px] uppercase tracking-wide text-foreground/50">
              Group Chief Innovation and Technology Officer
            </div>
          </div>
        </div>
      </div>
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
