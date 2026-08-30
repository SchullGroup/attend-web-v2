"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// Figma "Web - Redesign" (7B0U0fGXTJGggQEKL0p08X), JOIN AS GUEST section,
// "Enter code" frame — the secondary path off the "Guest events" browse list
// (../page.tsx) for events not publicly listed there (private AGMs needing a
// proxy/access code, or a QR code scanned in person). Does no lookup of its
// own: forwards whatever code the guest has into the existing /join/[code]
// redemption flow, carrying the optional name along as a prefill.
export default function JoinByCodePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Enter an access, proxy or QR code to continue.");
      return;
    }
    const qs = name.trim() ? `?name=${encodeURIComponent(name.trim())}` : "";
    router.push(`/join/${encodeURIComponent(trimmed)}${qs}`);
  }

  return (
    <div className="mx-auto w-full max-w-[410px] space-y-8">
      <Link
        href="/join"
        aria-label="Go back"
        className="inline-flex rounded-full bg-white p-2 text-foreground shadow-[0px_1px_4px_0px_rgba(0,0,0,0.1)]"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div>
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">
          Enter code
        </h1>
        <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/70">
          Enter your access code, proxy code or QR code to join the session
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm text-red-600">
            {error}
          </div>
        )}
        <Input
          name="name"
          placeholder="Your Name (Optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          name="code"
          placeholder="Access, Proxy or QR Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Button type="submit" fullWidth size="lg" disabled={!code.trim()}>
          Join Event
        </Button>
      </form>
    </div>
  );
}
