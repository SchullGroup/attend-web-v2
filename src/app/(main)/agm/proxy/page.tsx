"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCheck, UserPlus, Copy, Check, KeyRound, Lock, Mail, Phone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn, formatDate } from "@/lib/utils";
import {
  useAssignProxy,
  useGetProxy,
  useAssignProxyDirections,
  useGetResolutions,
  useRevokeProxy,
} from "@/api/agm/hooks";
import { useGetEvent } from "@/api/events/hooks";

type ProxyType = "chairman" | "named";
const CHAIRMAN_NAME = "Chairman of the Meeting";

// Pre-directed proxy instructions come from the July spec (master ┬º5.5), but the backend
// never shipped them: POST /agm/{eventId}/proxy/directions returns 404 "No such endpoint",
// and no directions route exists anywhere in the API (there isn't even an /agm namespace).
// Appointing the proxy works, so leaving the section visible made submitting look
// half-successful ΓÇö the proxy saved, the instructions silently went nowhere.
// Flip to true once the backend endpoint lands; the UI below is unchanged.
const PROXY_DIRECTIONS_ENABLED: boolean = false;

function ProxyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId") ?? "";

  const [type, setType] = useState<ProxyType>("chairman");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [assignedCode, setAssignedCode] = useState<string | null>(null);
  const [assignedQr, setAssignedQr] = useState<string | null>(null);
  const [assignedDisclaimer, setAssignedDisclaimer] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [justRevoked, setJustRevoked] = useState(false);

  const { data: existingProxy } = useGetProxy(eventId);
  const { mutate: assignProxy, isPending } = useAssignProxy(eventId);
  const { mutate: revokeProxy, isPending: revoking } = useRevokeProxy(eventId);
  const { mutate: assignProxyDirections, isPending: savingDirections } = useAssignProxyDirections(eventId);
  const { data: resolutionsData } = useGetResolutions(eventId);
  const { data: eventData } = useGetEvent(eventId);

  const resolutions = resolutionsData?.data?.resolutions ?? [];
  const [directions, setDirections] = useState<Record<string, "FOR" | "AGAINST" | "ABSTAIN" | "LET_PROXY_DECIDE">>({});

  /**
   * One shareholder, one proxy ΓÇö appointing a second one is a duplicate, not a replacement.
   *
   * Read from two independent signals because either can be missing: `proxyName` off
   * GET /proxy (absent if that call 404s when nothing is appointed) and the `hasProxy`
   * boolean the resolutions payload already carries. Whichever answers, answers.
   *
   * The backend accepts a second POST and mints a second code, so this is the only thing
   * standing between a shareholder and two live proxy codes for the same meeting.
   */
  const existing = existingProxy?.data;
  // Backend-supplied legal copy (added 2026-08-18) ΓÇö read from whichever response has it:
  // freshly assigned (POST) takes priority, falling back to the existing appointment (GET).
  // Not hardcoded here on purpose ΓÇö this is legal text and the backend owns the wording.
  const disclaimer = assignedDisclaimer || existing?.disclaimer;
  const isRevokedStatus = (existing as any)?.status?.toUpperCase() === "REVOKED";
  const hasExistingProxy =
    !justRevoked &&
    !isRevokedStatus &&
    (!!existing?.proxyName || resolutionsData?.data?.hasProxy === true);

  // A proxy stands in for a shareholder who won't attend ΓÇö once the meeting is LIVE that's
  // moot (the shareholder is here, in the room, and can vote themselves), and appointing
  // one after the fact has no real effect on votes already open. Block new assignment from
  // LIVE onward; an existing proxy appointed earlier still stands and still votes.
  // NOTE: this is FE-only ΓÇö the backend accepts the call at any status, so this is UX
  // guidance, not enforcement. See docs/AGENT_CONTINUATION_GUIDE.md backlog.
  const eventStatus = (eventData?.data?.status || "").toUpperCase();
  const assignmentClosed = eventStatus === "LIVE" || eventStatus === "ENDED" || eventStatus === "CANCELLED";

  useEffect(() => {
    if (resolutions.length > 0) {
      const initial: Record<string, "FOR" | "AGAINST" | "ABSTAIN" | "LET_PROXY_DECIDE"> = {};
      resolutions.forEach((r) => {
        initial[r.id] = "LET_PROXY_DECIDE";
      });
      setDirections(initial);
    }
  }, [resolutions]);

  useEffect(() => {
    if (!eventId) router.replace("/agm");
  }, [eventId, router]);

  const valid =
    type === "chairman" || (name.trim().length > 0 && /.+@.+\..+/.test(email));

  function copyCode(value: string) {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRevoke() {
    setErrorMsg(null);
    revokeProxy(undefined, {
      onSuccess: () => {
        setConfirmRevoke(false);
        setJustRevoked(true);
        router.refresh();
      },
      onError: (err: any) => {
        setConfirmRevoke(false);
        const msg = err?.response?.data?.message;
        setErrorMsg(
          msg && !msg.includes("Something went wrong")
            ? msg
            : "Couldn't revoke the proxy right now. Please try again, or revoke it from Proxy history.",
        );
      },
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // The form isn't rendered when a proxy already exists, but a submit could still land
    // from a stale render or a double-click ΓÇö a second POST mints a second code.
    if (hasExistingProxy || isPending) return;
    setErrorMsg(null);
    const payload =
      type === "chairman"
        ? { proxyName: CHAIRMAN_NAME, proxyEmail: "", proxyPhone: "" }
        : { proxyName: name.trim(), proxyEmail: email.trim(), proxyPhone: phone.trim() };

    assignProxy(payload, {
      onSuccess: (res: any) => {
        const code = res?.data?.proxyCode || res?.proxyCode;
        setAssignedQr(res?.data?.proxyQrCode || res?.proxyQrCode || null);
        setAssignedDisclaimer(res?.data?.disclaimer || res?.disclaimer || null);
        const directionsList = Object.entries(directions).map(([resolutionId, direction]) => ({
          resolutionId,
          direction,
        }));
        if (PROXY_DIRECTIONS_ENABLED && directionsList.length > 0) {
          assignProxyDirections(
            { directions: directionsList },
            {
              onSuccess: () => {
                if (code) {
                  setAssignedCode(code);
                } else {
                  router.push(`/agm/receipt?eventId=${eventId}`);
                }
              },
              onError: (err: any) =>
                setErrorMsg(
                  err?.response?.data?.message || err?.message || "Proxy appointed, but failed to save directions."
                ),
            }
          );
        } else if (code) {
          setAssignedCode(code);
        } else {
          router.push(`/agm/receipt?eventId=${eventId}`);
        }
      },
      onError: (err: any) =>
        setErrorMsg(
          err?.response?.data?.message || err?.message || "Failed to assign proxy.",
        ),
    });
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <header>
        <h1 className="mt-1 text-2xl font-bold text-foreground">
          {hasExistingProxy && !assignedCode ? "Your proxy" : "Appoint a proxy"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {hasExistingProxy && !assignedCode
            ? "You've already appointed someone to vote on your behalf at this meeting."
            : "If you can't attend the meeting, appoint someone to vote on your behalf."}
        </p>
      </header>

      {assignmentClosed && !assignedCode ? (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-slate-50 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {eventStatus === "LIVE" ? "Proxy appointment is closed" : "Proxy appointment has ended"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {eventStatus === "LIVE"
                ? "This meeting is already live, so a new proxy can no longer be appointed ΓÇö you can vote directly instead."
                : "This meeting has ended, so a proxy can no longer be appointed for it."}
              {existing && " Your existing proxy appointment still stands."}
            </p>
          </div>
        </div>
      ) : assignedCode ? (
        <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-emerald-900">Proxy Appointed Successfully</h2>
              <p className="text-xs text-emerald-700">Give this 10-digit code to your proxy holder so they can vote on your behalf.</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-white p-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Proxy Code</p>
              <p className="text-xl font-mono font-bold tracking-widest text-foreground">{assignedCode}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyCode(assignedCode)}
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" /> Copy Code
                </>
              )}
            </Button>
          </div>

          {assignedQr && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-white p-4">
              <div className="rounded-lg bg-white p-2 ring-1 ring-emerald-100">
                <QRCodeSVG value={assignedQr} size={148} level="M" />
              </div>
              <p className="max-w-xs text-center text-[11px] text-muted-foreground">
                Or let your proxy scan this at sign-in ΓÇö no code to type.
              </p>
            </div>
          )}

          {disclaimer && (
            <div className="rounded-xl border border-emerald-200 bg-white p-3 text-xs text-emerald-900/80">
              {disclaimer}
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={() => router.push(`/agm/receipt?eventId=${eventId}`)}>
              View Vote Receipt
            </Button>
          </div>
        </div>
      ) : hasExistingProxy ? (
        /* One proxy per shareholder per meeting. The form is deliberately not rendered here ΓÇö
           re-submitting it minted a second code and left two people able to vote. Revoking is
           the way to change your mind, and it frees the slot for a new appointment. */
        <div className="space-y-4 rounded-2xl border border-border bg-white p-6 shadow-sm">
          {errorMsg && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {errorMsg}
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground">
                {existing?.proxyName || "Proxy appointed"}
              </h2>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {existing?.proxyEmail && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {existing.proxyEmail}
                  </span>
                )}
                {existing?.proxyPhone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {existing.proxyPhone}
                  </span>
                )}
                {existing?.assignedAt && <span>Appointed {formatDate(existing.assignedAt)}</span>}
              </div>
            </div>
          </div>

          {existing?.proxyCode && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Proxy code
                </p>
                <p className="font-mono text-xl font-bold tracking-widest text-foreground">
                  {existing.proxyCode}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => copyCode(existing.proxyCode!)}>
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-4 w-4 text-emerald-600" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-4 w-4" /> Copy code
                  </>
                )}
              </Button>
            </div>
          )}

          {existing?.proxyQrCode && (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-white p-4">
              <div className="rounded-lg bg-white p-2 ring-1 ring-border">
                <QRCodeSVG value={existing.proxyQrCode} size={148} level="M" />
              </div>
              <p className="max-w-xs text-center text-[11px] text-muted-foreground">
                Or let your proxy scan this at sign-in ΓÇö no code to type.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            You can only have one proxy for this meeting. To appoint someone else, revoke this
            appointment first ΓÇö the code above stops working the moment you do.
          </div>

          {disclaimer && (
            <div className="rounded-xl border border-border bg-slate-50 p-3 text-xs text-muted-foreground">
              {disclaimer}
            </div>
          )}

          {confirmRevoke ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-medium text-red-800">
                Revoke {existing?.proxyName || "this proxy"}? Their code stops working immediately.
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRevoke(false)}
                  className="bg-white"
                >
                  Keep proxy
                </Button>
                <Button
                  type="button"
                  size="sm"
                  loading={revoking}
                  onClick={handleRevoke}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Yes, revoke
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.push("/agm/proxy-history")}>
                Proxy history
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmRevoke(true)}
                className="border-red-200 bg-white text-red-700 hover:bg-red-800/5 hover:text-red-800"
              >
                Revoke proxy
              </Button>
            </div>
          )}
        </div>
      ) : (

      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-border bg-white p-5 shadow-sm">
        {errorMsg && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <Choice
            active={type === "chairman"}
            onClick={() => setType("chairman")}
            icon={UserCheck}
            title="Chairman of the meeting"
            body="Standard option ΓÇö your vote follows your pre-vote choices."
          />
          <Choice
            active={type === "named"}
            onClick={() => setType("named")}
            icon={UserPlus}
            title="Named proxy"
            body="Nominate a specific verified shareholder."
          />
        </div>

        {type === "named" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              name="name"
              label="Proxy full name"
              placeholder="e.g. Adekunle Bello"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              name="email"
              label="Proxy email"
              type="email"
              placeholder="proxy@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              name="phone"
              label="Proxy phone (optional)"
              type="tel"
              placeholder="+234 800 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        )}

        {PROXY_DIRECTIONS_ENABLED && resolutions.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Pre-directed proxy instructions</h3>
              <p className="text-xs text-muted-foreground">
                Specify your voting instructions for each resolution. If set to &quot;Let proxy decide&quot;, your proxy will cast the vote as they see fit during the live meeting.
              </p>
            </div>
            <div className="space-y-3">
              {[...resolutions].sort((a, b) => a.order - b.order).map((r, i) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-slate-50/50 p-3">
                  <div className="min-w-0 flex-1">
                    {/* 1-based by position, not r.order ΓÇö see events/[id]/page.tsx for why. */}
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Resolution {i + 1}</p>
                    <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { key: "FOR", label: "For" },
                      { key: "AGAINST", label: "Against" },
                      { key: "ABSTAIN", label: "Abstain" },
                      { key: "LET_PROXY_DECIDE", label: "Let proxy decide" }
                    ].map((opt) => {
                      const selected = (directions[r.id] || "LET_PROXY_DECIDE") === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setDirections((prev) => ({ ...prev, [r.id]: opt.key as any }))}
                          className={cn(
                            "rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition-all",
                            selected
                              ? opt.key === "FOR" ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                : opt.key === "AGAINST" ? "bg-rose-600 border-rose-600 text-white shadow-sm"
                                : opt.key === "ABSTAIN" ? "bg-slate-600 border-slate-600 text-white shadow-sm"
                                : "bg-primary border-primary text-white shadow-sm"
                              : "bg-white border-border text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Proxy appointments must be submitted at least 48 hours before the meeting.
          You can revoke this anytime before voting opens.
        </div>

        {disclaimer && (
          <div className="rounded-xl border border-border bg-slate-50 p-3 text-xs text-muted-foreground">
            {disclaimer}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push("/agm")}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isPending || savingDirections}
            disabled={!valid || !eventId || isPending || hasExistingProxy}
          >
            Submit proxy
          </Button>
        </div>
      </form>
      )}
    </div>
  );
}

function Choice({
  active, onClick, icon: Icon, title, body,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof UserCheck;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "border-border bg-white hover:border-primary/40",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          active ? "bg-primary text-white" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
      </div>
    </button>
  );
}

export default function ProxyPage() {
  return (
    <Suspense>
      <ProxyPageInner />
    </Suspense>
  );
}
