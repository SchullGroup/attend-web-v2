"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BellRing, MessageSquare, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useGetNotificationPreferences,
  useSaveNotificationPreferences,
} from "@/api/notifications/hooks";
import { NotificationPreferences } from "@/types";

interface PrefRow {
  key: string;
  label: string;
  description: string;
  icon: typeof BellRing;
}

// Design's channel model. Each channel is a master switch over the backend's
// three notification types (RSVP confirmation, event reminder, new document):
//   Email → email* fields, Push → inApp* fields, SMS → no backend field yet.
const CHANNELS: PrefRow[] = [
  { key: "push", label: "Push notifications", description: "On-device alerts for new activity.", icon: BellRing },
  { key: "sms", label: "SMS", description: "Critical updates by text message.", icon: MessageSquare },
  { key: "email", label: "Email", description: "Notices, agendas and receipts by email.", icon: Mail },
];

const DEFAULT_PREFS: NotificationPreferences = {
  emailRsvpConfirmation: true,
  emailEventReminder: true,
  emailNewDocument: true,
  inAppRsvpConfirmation: true,
  inAppEventReminder: true,
  inAppNewDocument: true,
};

export default function NotificationPreferencesPage() {
  const { data, isLoading } = useGetNotificationPreferences();
  const { mutate: savePreferences, isPending: saving } = useSaveNotificationPreferences();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [sms, setSms] = useState(false); // no backend field yet

  useEffect(() => {
    if (data?.data) setPrefs(data.data);
  }, [data]);

  const emailOn =
    prefs.emailRsvpConfirmation && prefs.emailEventReminder && prefs.emailNewDocument;
  const pushOn =
    prefs.inAppRsvpConfirmation && prefs.inAppEventReminder && prefs.inAppNewDocument;

  const channelState: Record<string, boolean> = { email: emailOn, push: pushOn, sms };

  function toggle(key: string) {
    if (key === "sms") {
      setSms((v) => !v);
      return;
    }
    let next = prefs;
    if (key === "email") {
      const v = !emailOn;
      next = { ...prefs, emailRsvpConfirmation: v, emailEventReminder: v, emailNewDocument: v };
    } else {
      const v = !pushOn;
      next = { ...prefs, inAppRsvpConfirmation: v, inAppEventReminder: v, inAppNewDocument: v };
    }
    setPrefs(next);
    savePreferences(next);
  }

  return (
    <div className="space-y-6">
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notification preferences</h1>
          <p className="text-sm text-muted-foreground">
            Choose how and when you&apos;d like to hear from Attend.
          </p>
        </div>
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
      </header>

      {isLoading ? (
        <div className="h-40 animate-pulse rounded-2xl border border-border bg-muted" />
      ) : (
        <Section title="Delivery channels" rows={CHANNELS} prefs={channelState} toggle={toggle} />
      )}
    </div>
  );
}

function Section({
  title,
  rows,
  prefs,
  toggle,
}: {
  title: string;
  rows: PrefRow[];
  prefs: Record<string, boolean>;
  toggle: (k: string) => void;
}) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="overflow-hidden rounded-2xl border border-border bg-white">
        {rows.map((r, i) => {
          const Icon = r.icon;
          const on = prefs[r.key];
          return (
            <li
              key={r.key}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-3",
                i > 0 && "border-t border-border",
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.description}</p>
                </div>
              </div>
              <button
                onClick={() => toggle(r.key)}
                role="switch"
                aria-checked={on}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  on ? "bg-primary" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    on ? "translate-x-5" : "translate-x-0",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
