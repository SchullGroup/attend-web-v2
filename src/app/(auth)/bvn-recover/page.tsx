"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, KeyRound, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  useBvnRecoverInit,
  useBvnRecoverVerify,
  useBvnRecoverComplete,
} from "@/api/auth/hooks";

type Step = "bvn" | "otp" | "contact";

const ERROR_COPY: Record<string, string> = {
  BVN_INVALID: "We could not verify this BVN. Please double-check and try again.",
  BVN_NO_REGISTER:
    "Your name does not appear on any of our registers. Please contact your registrar.",
  OTP_INVALID: "That code is incorrect. Please try again.",
  RATE_LIMIT: "Too many attempts. Please wait 15 minutes and try again.",
};

export default function BvnRecoverPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("bvn");
  const [bvn, setBvn] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { mutate: initRecover, isPending: initing } = useBvnRecoverInit();
  const { mutate: verifyOtp, isPending: verifying } = useBvnRecoverVerify();
  const { mutate: completeRecover, isPending: completing } = useBvnRecoverComplete();

  function extractError(err: any): string {
    const code = err?.response?.data?.code;
    if (code && ERROR_COPY[code]) return ERROR_COPY[code];
    return (
      err?.response?.data?.message ||
      err?.message ||
      "Something went wrong. Please try again."
    );
  }

  function handleInit(e?: React.FormEvent) {
    e?.preventDefault();
    setErrorMsg(null);
    if (bvn.length !== 11 || !/^\d+$/.test(bvn)) {
      setErrorMsg("BVN must be exactly 11 digits.");
      return;
    }
    initRecover(
      { bvn },
      {
        onSuccess: (res: any) => {
          setSessionId(res.data.sessionId);
          setMaskedPhone(res.data.maskedPhone);
          setStep("otp");
        },
        onError: (err: any) => setErrorMsg(extractError(err)),
      },
    );
  }

  function handleVerify(e?: React.FormEvent) {
    e?.preventDefault();
    setErrorMsg(null);
    if (otp.length !== 6) {
      setErrorMsg("Enter the 6-digit code sent to your phone.");
      return;
    }
    verifyOtp(
      { sessionId, otp },
      {
        onSuccess: (res: any) => {
          setAuthToken(res.data.authToken);
          setStep("contact");
        },
        onError: (err: any) => setErrorMsg(extractError(err)),
      },
    );
  }

  function handleComplete(e?: React.FormEvent) {
    e?.preventDefault();
    setErrorMsg(null);
    completeRecover(
      { authToken, email: email || undefined, phone: phone || undefined },
      {
        onSuccess: () => router.replace("/"),
        onError: (err: any) => setErrorMsg(extractError(err)),
      },
    );
  }

  function handleSkip() {
    completeRecover(
      { authToken },
      {
        onSuccess: () => router.replace("/"),
        onError: (err: any) => setErrorMsg(extractError(err)),
      },
    );
  }

  const busy = initing || verifying || completing;

  return (
    <div className="space-y-6">
      <div className="md:hidden mb-2">
        <img src="/attend-logo.png" alt="Attend" style={{ height: 31 }} />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Sign in with BVN</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === "bvn"
            ? "We'll send an OTP to the phone linked to your BVN."
            : step === "otp"
              ? `Enter the 6-digit code sent to ${maskedPhone}.`
              : "Add contact info so we can reach you about future meetings."}
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      {step === "bvn" && (
        <form onSubmit={handleInit} className="space-y-4">
          <Input
            name="bvn"
            label="BVN"
            leftIcon={<ShieldCheck className="h-4 w-4" />}
            placeholder="11-digit BVN"
            value={bvn}
            onChange={(e) => setBvn(e.target.value.replace(/\D/g, ""))}
            maxLength={11}
          />
          <Button type="submit" fullWidth size="lg" loading={busy}>
            Continue
          </Button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerify} className="space-y-4">
          <Input
            name="otp"
            label="6-digit code"
            leftIcon={<KeyRound className="h-4 w-4" />}
            placeholder="• • • • • •"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
          />
          <p className="text-xs text-muted-foreground">
            Code expires in 5 minutes.
          </p>
          <Button type="submit" fullWidth size="lg" loading={busy}>
            Verify
          </Button>
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={() => {
              setOtp("");
              handleInit();
            }}
            disabled={busy}
          >
            Resend code
          </Button>
        </form>
      )}

      {step === "contact" && (
        <form onSubmit={handleComplete} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Optional — you can skip this and add contacts later from your profile.
          </p>
          <Input
            name="email"
            label="Email"
            type="email"
            leftIcon={<Mail className="h-4 w-4" />}
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            name="phone"
            label="Phone"
            type="tel"
            leftIcon={<Phone className="h-4 w-4" />}
            placeholder="+234 800 000 0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Button type="submit" fullWidth size="lg" loading={busy}>
            Save & continue
          </Button>
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={handleSkip}
            disabled={busy}
          >
            Skip for now
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Have your email or phone on file?{" "}
        <Link href="/login" className="font-semibold text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
