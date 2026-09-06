"use client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  useGetNotificationPreferences,
  useSaveNotificationPreferences,
} from "@/api/notifications/hooks";
import { PanelShell } from "./PanelShell";

// Figma's Notification Preference frame — four rows, no save button.
//
// The backend keeps six independent flags (email + in-app for each of RSVP / reminder / new
// document) plus pushEnabled. The frame shows four controls, so they map like this:
//
//   RSVP / Event Reminder / New Document → the three inApp* flags
//   Email Notification                   → a master over all three email* flags at once
//   pushEnabled                          → follows: on whenever any in-app row is on
//
// So the email flags can no longer be set individually from this screen. They're still sent
// on every save (all three together), so nothing is silently dropped — but a user who had a
// mixed email setup will see it collapse to all-on or all-off the first time they touch the
// master. Flagged in the redesign doc.
//
// Only the stored pushEnabled *preference* is written here — this panel deliberately does not
// ask the browser for a push subscription. NEXT_PUBLIC_VAPID_KEY is unset in every environment,
// so subscribing always bails out — but only after firing a permission prompt, which would pop
// up unexplained when someone flips "RSVP". The real subscribe UI lives on /notifications,
// where it has room to say what happened.
//
// Saving is per-toggle (the frame has no button), which replaces the old dirty-baseline +
// unsaved-changes warning. A failed save reverts the switch so it never shows a value the
// server didn't take.
type Prefs = {
  rsvp: boolean;
  reminder: boolean;
  document: boolean;
  email: boolean;
};

export function NotificationPrefsPanel({ onBack }: { onBack: () => void }) {
  const { data: prefResp, isLoading } = useGetNotificationPreferences();
  const { mutate: savePreferences } = useSaveNotificationPreferences();

  const [prefs, setPrefs] = useState<Prefs>({
    rsvp: false,
    reminder: false,
    document: false,
    email: false,
  });
  const [saving, setSaving] = useState<keyof Prefs | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const p = prefResp?.data;
    if (!p) return;
    setPrefs({
      rsvp: p.inAppRsvpConfirmation,
      reminder: p.inAppEventReminder,
      document: p.inAppNewDocument,
      // The three email flags are one control now; treat any of them as "email on".
      email: p.emailRsvpConfirmation || p.emailEventReminder || p.emailNewDocument,
    });
  }, [prefResp]);

  function toggle(key: keyof Prefs, value: boolean) {
    const next = { ...prefs, [key]: value };
    const previous = prefs;
    setPrefs(next);
    setErrorMsg(null);
    setSaving(key);

    const anyInApp = next.rsvp || next.reminder || next.document;

    savePreferences(
      {
        inAppRsvpConfirmation: next.rsvp,
        inAppEventReminder: next.reminder,
        inAppNewDocument: next.document,
        // Master switch — the three email flags move together.
        emailRsvpConfirmation: next.email,
        emailEventReminder: next.email,
        emailNewDocument: next.email,
        pushEnabled: anyInApp,
      },
      {
        onSuccess: () => setSaving(null),
        onError: (err: any) => {
          // Revert — leaving the switch flipped would claim a setting that wasn't saved.
          setPrefs(previous);
          setSaving(null);
          const code = err?.response?.data?.code;
          setErrorMsg(
            code === "UNAUTHORIZED"
              ? "Your session expired. Sign in again to change your preferences."
              : err?.response?.data?.message ||
                  "We couldn't save that. Please try again."
          );
        },
      }
    );
  }

  const ROWS: { key: keyof Prefs; label: string; description: string }[] = [
    { key: "rsvp", label: "RSVP", description: "When your RSVP is confirmed" },
    { key: "reminder", label: "Event Reminder", description: "Before an event starts" },
    { key: "document", label: "New Document", description: "When a new document is added" },
    {
      key: "email",
      label: "Email Notification",
      description: "Get notified via mail when you have updates",
    },
  ];

  return (
    <PanelShell title="Notification Preference" onBack={onBack}>
      {errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-[62px] animate-pulse border-b border-foreground/6 bg-foreground/2"
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          {ROWS.map(({ key, label, description }) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4 border-b border-foreground/6 py-3.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium tracking-[-0.14px] text-foreground">{label}</p>
                <p className="text-xs text-foreground/60">{description}</p>
              </div>
              <Switch
                checked={prefs[key]}
                disabled={saving === key}
                onChange={() => toggle(key, !prefs[key])}
                label={label}
              />
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}

// Green when on, per the frame — deliberately not `bg-primary`, which is the near-black navy.
function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50",
        checked ? "bg-emerald-500" : "bg-foreground/15"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
