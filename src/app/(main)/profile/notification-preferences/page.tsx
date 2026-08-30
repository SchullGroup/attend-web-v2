"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useGetNotificationPreferences,
  useSaveNotificationPreferences,
} from "@/api/notifications/hooks";
import { NotificationPreferences } from "@/types";
import { ensurePushSubscription, getPushState, unsubscribePush } from "@/lib/push-notifications";

interface ToggleRow {
  key: string;
  label: string;
  description: string;
  on: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  emailRsvpConfirmation: true,
  emailEventReminder: true,
  emailNewDocument: true,
  inAppRsvpConfirmation: true,
  inAppEventReminder: true,
  inAppNewDocument: true,
};

function Toggle({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        on ? "bg-primary" : "bg-foreground/10",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          on ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

export default function NotificationPreferencesPage() {
  const { data, isLoading } = useGetNotificationPreferences();
  const { mutate: savePreferences, isPending: saving } = useSaveNotificationPreferences();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);

  useEffect(() => {
    if (data?.data) setPrefs(data.data);
  }, [data]);

  // Item K — sync Web Push subscription state with local UI
  const [pushBrowserSubscribed, setPushBrowserSubscribed] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const state = await getPushState();
      if (state.supported) {
        setPushSupported(true);
        setPushBrowserSubscribed(state.subscribed);
      } else {
        setPushSupported(false);
      }
    })();
  }, []);

  async function togglePushBrowser() {
    setPushError(null);
    try {
      if (pushBrowserSubscribed) {
        await unsubscribePush();
        setPushBrowserSubscribed(false);
      } else {
        const sub = await ensurePushSubscription();
        if (sub) setPushBrowserSubscribed(true);
        else setPushError("Enable notifications in your browser settings to receive updates.");
      }
    } catch (e: any) {
      setPushError(e?.message || "Could not update push notification settings.");
    }
  }

  const emailOn =
    prefs.emailRsvpConfirmation && prefs.emailEventReminder && prefs.emailNewDocument;

  // Figma groups by notification type (RSVP / Event Reminder / New Document) as
  // in-app toggles, plus one Email Notification master switch — same three pairs
  // of backend booleans as before, just regrouped to match the real design instead
  // of the channel-based guess the page previously shipped with.
  const rows: ToggleRow[] = [
    {
      key: "rsvp",
      label: "RSVP",
      description: "When your RSVP is confirmed",
      on: prefs.inAppRsvpConfirmation,
    },
    {
      key: "reminder",
      label: "Event Reminder",
      description: "Before an event starts",
      on: prefs.inAppEventReminder,
    },
    {
      key: "document",
      label: "New Document",
      description: "When a new document is added",
      on: prefs.inAppNewDocument,
    },
    {
      key: "email",
      label: "Email Notification",
      description: "Get notified via mail when you have updates",
      on: emailOn,
    },
  ];

  function toggle(key: string) {
    let next = prefs;
    if (key === "rsvp") next = { ...prefs, inAppRsvpConfirmation: !prefs.inAppRsvpConfirmation };
    else if (key === "reminder") next = { ...prefs, inAppEventReminder: !prefs.inAppEventReminder };
    else if (key === "document") next = { ...prefs, inAppNewDocument: !prefs.inAppNewDocument };
    else if (key === "email") {
      const v = !emailOn;
      next = { ...prefs, emailRsvpConfirmation: v, emailEventReminder: v, emailNewDocument: v };
    }
    setPrefs(next);
    savePreferences(next);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/profile"
          aria-label="Back to settings"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-white text-foreground shadow-[0px_1px_4px_0px_rgba(0,0,0,0.08)] transition-colors hover:bg-foreground/[0.04]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Notification Preference</h1>
        {saving && <span className="text-xs text-foreground/50">Saving…</span>}
      </div>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-xl bg-foreground/[0.04]" />
      ) : (
        <div className="divide-y divide-foreground/[0.06] rounded-xl border border-foreground/[0.06] bg-white px-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="text-sm font-medium tracking-[-0.14px] text-foreground">{r.label}</p>
                <p className="mt-0.5 text-xs text-foreground/60">{r.description}</p>
              </div>
              <Toggle on={r.on} onChange={() => toggle(r.key)} label={r.label} />
            </div>
          ))}
        </div>
      )}

      {/* Item K — Web Push browser subscription (no Figma equivalent; styled to match) */}
      <section className="rounded-xl border border-foreground/[0.06] bg-white p-4 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
        {pushSupported ? (
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium tracking-[-0.14px] text-foreground">
                {pushBrowserSubscribed ? "Push enabled in this browser" : "Enable browser push"}
              </p>
              <p className="text-xs text-foreground/60">
                Get real-time alerts even when Attend is not open. You can turn this off in your browser settings.
              </p>
              {pushError && <p className="mt-2 text-xs text-red-600">{pushError}</p>}
            </div>
            <button
              onClick={togglePushBrowser}
              className={cn(
                "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pushBrowserSubscribed
                  ? "bg-foreground/[0.04] text-foreground hover:bg-foreground/[0.08]"
                  : "bg-foreground text-background hover:bg-foreground/90",
              )}
            >
              {pushBrowserSubscribed ? "Disable" : "Enable"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-foreground/60">
            Push notifications aren&apos;t supported in this browser. Try the mobile app for real-time alerts.
          </p>
        )}
      </section>
    </div>
  );
}
