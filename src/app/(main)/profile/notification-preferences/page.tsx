"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, Mail, Smartphone, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  useGetNotificationPreferences,
  useSaveNotificationPreferences,
} from "@/api/notifications/hooks";
import { usePushSubscription } from "@/hooks/usePushSubscription";

export default function NotificationPreferencesPage() {
  const router = useRouter();
  const { data: prefResp, isLoading } = useGetNotificationPreferences();
  const { mutate: savePreferences, isPending: savingPrefs } = useSaveNotificationPreferences();

  const [emailRsvp, setEmailRsvp] = useState(false);
  const [emailReminder, setEmailReminder] = useState(false);
  const [emailDoc, setEmailDoc] = useState(false);

  const [inAppRsvp, setInAppRsvp] = useState(false);
  const [inAppReminder, setInAppReminder] = useState(false);
  const [inAppDoc, setInAppDoc] = useState(false);

  const {
    enabled: pushSubscribed,
    busy: submittingPush,
    message: pushMsg,
    toggle: handleTogglePush,
  } = usePushSubscription();

  // Backend stores a pushEnabled flag per user; the hook above only knows whether *this
  // browser* holds a subscription. Track the saved value separately so the switch shows the
  // user's stored intent on a device that has never subscribed.
  const [pushPref, setPushPref] = useState(false);
  const pushOn = pushPref || pushSubscribed;

  // The toggles are local state until Save is pressed. Without a baseline to compare against
  // there was no way to tell the user their flips weren't persisted yet — they read the
  // switch position as the saved value and navigated away.
  const [baseline, setBaseline] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const snapshot = JSON.stringify([
    emailRsvp, emailReminder, emailDoc, inAppRsvp, inAppReminder, inAppDoc, pushPref,
  ]);
  const isDirty = baseline !== null && baseline !== snapshot;

  useEffect(() => {
    if (prefResp?.data) {
      const p = prefResp.data;
      setEmailRsvp(p.emailRsvpConfirmation);
      setEmailReminder(p.emailEventReminder);
      setEmailDoc(p.emailNewDocument);
      setInAppRsvp(p.inAppRsvpConfirmation);
      setInAppReminder(p.inAppEventReminder);
      setInAppDoc(p.inAppNewDocument);
      setPushPref(p.pushEnabled);
      setBaseline(JSON.stringify([
        p.emailRsvpConfirmation, p.emailEventReminder, p.emailNewDocument,
        p.inAppRsvpConfirmation, p.inAppEventReminder, p.inAppNewDocument, p.pushEnabled,
      ]));
    }
  }, [prefResp]);

  // A stale "Preferences saved." next to a freshly flipped switch would claim the new value
  // was persisted, so the confirmation clears the moment anything changes again.
  useEffect(() => {
    setSaveMsg(null);
  }, [snapshot]);

  // Closing the tab mid-edit silently discarded the changes. The browser prompt is the only
  // reliable warning available here.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  function handleSave() {
    setSaveMsg(null);
    savePreferences(
      {
        emailRsvpConfirmation: emailRsvp,
        emailEventReminder: emailReminder,
        emailNewDocument: emailDoc,
        inAppRsvpConfirmation: inAppRsvp,
        inAppEventReminder: inAppReminder,
        inAppNewDocument: inAppDoc,
        pushEnabled: pushPref,
      },
      {
        onSuccess: () => {
          setBaseline(snapshot);
          setSaveMsg("Preferences saved.");
        },
        onError: (err: any) => {
          // Backend now returns a stable `code` on every failure. Branch on that, not on
          // the message wording, which is display copy and can change.
          const code = err?.response?.data?.code;
          setSaveMsg(
            code === "UNAUTHORIZED"
              ? "Your session expired. Sign in again to save your preferences."
              : err?.response?.data?.message ||
                  "We couldn't save your preferences. Please try again.",
          );
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="animate-pulse text-sm text-foreground/60">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-sm tracking-[-0.14px] text-foreground/60 transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Profile
      </button>

      <header>
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Notification Preferences</h1>
        <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/60">
          Choose how you would like to be notified about meeting updates and documents.
        </p>
      </header>

      {/* Web Push Segment */}
      <section className="flex flex-col gap-4 rounded-xl border border-foreground/[0.06] bg-white p-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Smartphone className="h-4 w-4 text-primary" /> Web Push Notifications
            </h3>
            <p className="text-xs text-foreground/60">
              Receive instant alerts on your desktop or device when a vote opens or a meeting starts.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={pushOn}
            disabled={submittingPush}
            onClick={() => {
              // Two things have to happen: record the preference for saving, and ask the
              // browser for a subscription. The preference is the part that persists —
              // the browser half is a no-op until push is configured.
              setPushPref(!pushOn);
              handleTogglePush(!pushOn);
            }}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50",
              pushOn ? "bg-primary" : "bg-foreground/[0.15]"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                pushOn ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>

        {pushMsg && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            {pushMsg}
          </p>
        )}
      </section>

      {/* Email Preferences */}
      <section className="flex flex-col gap-4 rounded-xl border border-foreground/[0.06] bg-white p-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
        <h3 className="flex items-center gap-2 border-b border-foreground/[0.06] pb-3 text-sm font-semibold text-foreground">
          <Mail className="h-4 w-4 text-primary" /> Email Notifications
        </h3>
        <div className="flex flex-col gap-3.5">
          <PreferenceToggle
            label="RSVP Confirmations"
            description="Receive an email receipt when you confirm your attendance at an event."
            checked={emailRsvp}
            onChange={setEmailRsvp}
          />
          <PreferenceToggle
            label="Event Reminders"
            description="Receive email alerts leading up to events you are registered for."
            checked={emailReminder}
            onChange={setEmailReminder}
          />
          <PreferenceToggle
            label="New Document Uploads"
            description="Receive an email when new brochures or materials are published."
            checked={emailDoc}
            onChange={setEmailDoc}
          />
        </div>
      </section>

      {/* In-App Notifications */}
      <section className="flex flex-col gap-4 rounded-xl border border-foreground/[0.06] bg-white p-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
        <h3 className="flex items-center gap-2 border-b border-foreground/[0.06] pb-3 text-sm font-semibold text-foreground">
          <Bell className="h-4 w-4 text-primary" /> In-App Notifications
        </h3>
        <div className="flex flex-col gap-3.5">
          <PreferenceToggle
            label="RSVP Confirmations"
            description="Display a notification in the app when your RSVP is successful."
            checked={inAppRsvp}
            onChange={setInAppRsvp}
          />
          <PreferenceToggle
            label="Event Reminders"
            description="Display inside the app reminders when a meeting is about to go live."
            checked={inAppReminder}
            onChange={setInAppReminder}
          />
          <PreferenceToggle
            label="New Document Uploads"
            description="Display a badge when new meeting materials are uploaded."
            checked={inAppDoc}
            onChange={setInAppDoc}
          />
        </div>
      </section>

      <div className="flex items-center justify-end gap-4">
        {saveMsg && (
          <p
            className={cn(
              "text-xs font-medium",
              saveMsg === "Preferences saved." ? "text-primary" : "text-red-600",
            )}
          >
            {saveMsg}
          </p>
        )}
        {isDirty && !saveMsg && (
          <p className="text-xs font-medium text-amber-700">
            You have unsaved changes.
          </p>
        )}
        <Button
          onClick={handleSave}
          loading={savingPrefs}
          disabled={!isDirty || savingPrefs}
          className="flex items-center gap-2 px-6"
        >
          <Save className="h-4 w-4" /> {savingPrefs ? "Saving…" : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
}

function PreferenceToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (c: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="max-w-[80%] space-y-0.5">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs leading-normal text-foreground/60">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          checked ? "bg-primary" : "bg-foreground/[0.15]"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
