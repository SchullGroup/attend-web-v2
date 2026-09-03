"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, Copy, Check, KeyRound, Lock, Mail, Phone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog, DialogHeader } from "@/components/ui/Dialog";
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

// Re-skinned to the figma-redesign flat design; OUR logic is preserved wholesale.
// Pre-directed proxy instructions come from the July spec (master §5.5), but the backend
// never shipped them: POST /agm/{eventId}/proxy/directions returns 404 "No such endpoint",
// and no directions route exists anywhere in the API (there isn't even an /agm namespace).
// Appointing the proxy works, so leaving the section visible made submitting look
// half-successful — the proxy saved, the instructions silently went nowhere.
// Flip to true once the backend endpoint lands; the UI below is unchanged.
// NOTE (functional delta vs figma): the figma branch bundles `directions` INTO the
// assignProxy payload instead of a separate endpoint. That route is closed too —
// re-checked against the live spec (/v3/api-docs, 2026-09-02): there is no /directions
// path and no direction schema anywhere, and ProxyAssignmentRequest accepts exactly
// { proxyName, proxyEmail, proxyPhone }, so a bundled `directions` field would be
// dropped server-side without an error. Section stays hidden until backend ships it.
const PROXY_DIRECTIONS_ENABLED: boolean = false;

// Figma's Appoint-a-proxy sheet: a right-anchored panel over the event-detail page,
// same treatment as PreVoteSheet. OUR logic is preserved wholesale — the one-proxy-per
// -meeting guard, the assignment-closed lock, the post-assign code + QR, and the
// existing-proxy card with its two-step revoke all render inside the sheet.
export function ProxySheet({
  eventId,
  open: isOpen,
  onClose,
}: {
  eventId: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();

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
   * One shareholder, one proxy — appointing a second one is a duplicate, not a replacement.
   *
   * Read from two independent signals because either can be missing: `proxyName` off
   * GET /proxy (absent if that call 404s when nothing is appointed) and the `hasProxy`
   * boolean the resolutions payload already carries. Whichever answers, answers.
   *
   * The backend accepts a second POST and mints a second code, so this is the only thing
   * standing between a shareholder and two live proxy codes for the same meeting.
   */
  const existing = existingProxy?.data;
  // Backend-supplied legal copy (added 2026-08-18) — read from whichever response has it:
  // freshly assigned (POST) takes priority, falling back to the existing appointment (GET).
  // Not hardcoded here on purpose — this is legal text and the backend owns the wording.
  const disclaimer = assignedDisclaimer || existing?.disclaimer;
  const isRevokedStatus = (existing as any)?.status?.toUpperCase() === "REVOKED";
  const hasExistingProxy =
    !justRevoked &&
    !isRevokedStatus &&
    (!!existing?.proxyName || resolutionsData?.data?.hasProxy === true);

  // A proxy stands in for a shareholder who won't attend — once the meeting is LIVE that's
  // moot (the shareholder is here, in the room, and can vote themselves), and appointing
  // one after the fact has no real effect on votes already open. Block new assignment from
  // LIVE onward; an existing proxy appointed earlier still stands and still votes.
  // NOTE: this is FE-only — the backend accepts the call at any status, so this is UX
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
    // from a stale render or a double-click — a second POST mints a second code.
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
    <Dialog open={isOpen} onClose={onClose} side="right">
      <DialogHeader
        onBack={onClose}
        title={hasExistingProxy && !assignedCode ? "Your proxy" : "Appoint a proxy"}
        description={
          hasExistingProxy && !assignedCode
            ? "You've already appointed someone to vote on your behalf at this meeting."
            : "If you can't attend the meeting, appoint someone to vote on your behalf."
        }
      />
      <div className="flex flex-col gap-6">

        {assignmentClosed && !assignedCode ? (
          <div className="flex items-start gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-foreground/[0.06] text-foreground/60">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-medium tracking-[-0.14px] text-foreground">
                {eventStatus === "LIVE" ? "Proxy appointment is closed" : "Proxy appointment has ended"}
              </h2>
              <p className="mt-1 text-xs text-foreground/60">
                {eventStatus === "LIVE"
                  ? "This meeting is already live, so a new proxy can no longer be appointed — you can vote directly instead."
                  : "This meeting has ended, so a proxy can no longer be appointed for it."}
                {existing && " Your existing proxy appointment still stands."}
              </p>
            </div>
          </div>
        ) : assignedCode ? (
          <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary text-white">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-medium tracking-[-0.32px] text-foreground">Proxy appointed successfully</h2>
                <p className="text-xs text-foreground/60">Give this 10-digit code to your proxy holder so they can vote on your behalf.</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-foreground/[0.06] bg-white p-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">Proxy code</p>
                <p className="font-mono text-xl font-bold tracking-widest text-foreground">{assignedCode}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => copyCode(assignedCode)}>
                {copied ? (
                  <>
                    <Check className="mr-1.5 h-4 w-4 text-primary" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-4 w-4" /> Copy code
                  </>
                )}
              </Button>
            </div>

            {assignedQr && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-foreground/[0.06] bg-white p-4">
                <div className="rounded-lg bg-white p-2 ring-1 ring-foreground/[0.06]">
                  <QRCodeSVG value={assignedQr} size={148} level="M" />
                </div>
                <p className="max-w-xs text-center text-[11px] text-foreground/60">
                  Or let your proxy scan this at sign-in — no code to type.
                </p>
              </div>
            )}

            {disclaimer && (
              <div className="rounded-xl border border-foreground/[0.06] bg-white p-3 text-xs text-foreground/70">
                {disclaimer}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => router.push(`/agm/receipt?eventId=${eventId}`)}>
                View vote receipt
              </Button>
            </div>
          </div>
        ) : hasExistingProxy ? (
          /* One proxy per shareholder per meeting. The form is deliberately not rendered here —
             re-submitting it minted a second code and left two people able to vote. Revoking is
             the way to change your mind, and it frees the slot for a new appointment. */
          <div className="flex flex-col gap-4 rounded-xl border border-foreground/[0.06] bg-white p-6 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {errorMsg}
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-medium tracking-[-0.32px] text-foreground">
                  {existing?.proxyName || "Proxy appointed"}
                </h2>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-foreground/60">
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
              <div className="flex items-center justify-between gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] p-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
                    Proxy code
                  </p>
                  <p className="font-mono text-xl font-bold tracking-widest text-foreground">
                    {existing.proxyCode}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => copyCode(existing.proxyCode!)}>
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-4 w-4 text-primary" /> Copied
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
              <div className="flex flex-col items-center gap-2 rounded-xl border border-foreground/[0.06] bg-white p-4">
                <div className="rounded-lg bg-white p-2 ring-1 ring-foreground/[0.06]">
                  <QRCodeSVG value={existing.proxyQrCode} size={148} level="M" />
                </div>
                <p className="max-w-xs text-center text-[11px] text-foreground/60">
                  Or let your proxy scan this at sign-in — no code to type.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              You can only have one proxy for this meeting. To appoint someone else, revoke this
              appointment first — the code above stops working the moment you do.
            </div>

            {disclaimer && (
              <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] p-3 text-xs text-foreground/60">
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
          <form onSubmit={submit} className="flex flex-col gap-5">
            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {errorMsg}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Choice
                active={type === "chairman"}
                onClick={() => setType("chairman")}
                title="Appoint Chairman of the meeting"
                body="Your vote follows your pre-vote choices."
              />
              <div className="flex items-center gap-3 py-1">
                <div className="h-px flex-1 bg-foreground/10" />
                <span className="text-xs text-foreground/50">or</span>
                <div className="h-px flex-1 bg-foreground/10" />
              </div>
              <Choice
                active={type === "named"}
                onClick={() => setType("named")}
                title="Named proxy"
                body="Nominate a specific verified shareholder"
              />
            </div>

            {type === "named" && (
              <div className="flex flex-col gap-4">
                {/* Figma labels these by placeholder only. */}
                <Input
                  name="name"
                  placeholder="Proxy full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  name="email"
                  type="email"
                  placeholder="Proxy email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  name="phone"
                  type="tel"
                  placeholder="Proxy phone (optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            )}

            {PROXY_DIRECTIONS_ENABLED && resolutions.length > 0 && (
              <div className="flex flex-col gap-4 rounded-xl bg-foreground/[0.03] p-4">
                <div>
                  <h3 className="text-sm font-medium tracking-[-0.14px] text-foreground">Pre-directed proxy instructions</h3>
                  <p className="mt-1 text-xs text-foreground/60">
                    Specify your voting instructions for each resolution. If set to &quot;Let proxy decide&quot;, your proxy will cast the vote as they see fit during the live meeting.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {[...resolutions].sort((a, b) => a.order - b.order).map((r, i) => (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-foreground/[0.06] bg-white p-3">
                      <div className="min-w-0 flex-1">
                        {/* 1-based by position, not r.order — see events/[id]/page.tsx for why. */}
                        <p className="text-xs font-semibold uppercase text-foreground/50">Resolution {i + 1}</p>
                        <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
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
                                "rounded-full border px-2.5 py-1.5 text-xs font-medium transition-colors",
                                selected
                                  ? opt.key === "AGAINST"
                                    ? "border-red-600 bg-red-600 text-white"
                                    : "border-foreground bg-foreground text-background"
                                  : "border-foreground/15 bg-white text-foreground/60 hover:border-foreground/30"
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
              <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] p-3 text-xs text-foreground/60">
                {disclaimer}
              </div>
            )}

            {/* Figma: side by side on desktop (Cancel left), stacked on mobile with
                Submit on top — flex-col-reverse gives that from this DOM order. */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button
                type="button"
                size="lg"
                className="flex-1 bg-foreground/[0.04] text-foreground/60 shadow-none hover:bg-foreground/[0.08]"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="lg"
                className="flex-1"
                loading={isPending || savingDirections}
                disabled={!valid || !eventId || isPending || hasExistingProxy}
              >
                Submit Proxy
              </Button>
            </div>
          </form>
        )}
      </div>
    </Dialog>
  );
}

function Choice({
  active, onClick, title, body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "border-foreground/10 bg-white hover:border-foreground/20",
      )}
    >
      <div>
        <p className="text-sm font-medium tracking-[-0.14px] text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-foreground/60">{body}</p>
      </div>
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
          active ? "border-primary" : "border-foreground/25",
        )}
      >
        {active && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </span>
    </button>
  );
}
