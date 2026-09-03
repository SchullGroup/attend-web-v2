"use client";
import Link from "next/link";
import { useGetNotifications, useMarkRead, useMarkAllRead } from "@/api/notifications/hooks";
import type { Notification } from "@/types";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { notificationStyle } from "@/lib/notification-types";

export default function NotificationsPage() {
  const { data, isLoading } = useGetNotifications({ size: 50 });
  const { mutate: markRead } = useMarkRead();
  const { mutate: markAllRead, isPending: markingAll } = useMarkAllRead();

  const {
    enabled: pushEnabled,
    busy: submittingPush,
    message: pushMsg,
    toggle: handleTogglePush,
  } = usePushSubscription();

  const notifications = data?.data?.notifications ?? [];
  const unreadCount = data?.data?.unreadCount ?? 0;
  const totalCount = data?.data?.totalCount ?? 0;

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-20 animate-pulse rounded-xl bg-foreground/[0.04]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-[-0.72px] text-foreground">Notifications</h1>
          <p className="mt-1 text-sm tracking-[-0.14px] text-foreground/60">
            {unreadCount} unread · {totalCount} total
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllRead()}
          loading={markingAll}
          disabled={unreadCount === 0}
        >
          Mark all as read
        </Button>
      </header>

      <div className="space-y-3 rounded-xl border border-foreground/[0.06] bg-white p-5 shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 pr-4">
            <h3 className="text-sm font-semibold text-foreground">Web Push Notifications</h3>
            <p className="text-xs leading-normal text-foreground/60">
              Receive live meeting alerts, reminders, and vote opening broadcasts instantly.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={pushEnabled}
            disabled={submittingPush}
            onClick={() => handleTogglePush(!pushEnabled)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50",
              pushEnabled ? "bg-primary" : "bg-foreground/[0.15]"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                pushEnabled ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>

        {pushMsg && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            {pushMsg}
          </p>
        )}

        <p className="text-xs text-foreground/60">
          Email and in-app alerts are configured separately in{" "}
          <Link href="/profile/notification-preferences" className="font-medium text-primary hover:underline">
            Notification Preferences
          </Link>
          .
        </p>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-foreground/15 p-10 text-center text-sm text-foreground/50">
          You have no notifications yet.
        </div>
      ) : (
        <>
          {unread.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                Unread
              </h2>
              <ul className="space-y-2">
                {unread.map((n) => (
                  <NotificationItem key={n.id} notification={n} onRead={() => markRead(n.id)} />
                ))}
              </ul>
            </section>
          )}

          {read.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
                Earlier
              </h2>
              <ul className="space-y-2">
                {read.map((n) => (
                  <NotificationItem key={n.id} notification={n} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function NotificationItem({
  notification: n,
  onRead,
}: {
  notification: Notification;
  onRead?: () => void;
}) {
  const { icon: Icon, color: colorClass } = notificationStyle(n.type);
  const timeLabel = useRelativeTime(n.createdAt);

  return (
    <li
      onClick={() => !n.read && onRead?.()}
      className={cn(
        "flex items-start gap-3 rounded-xl border border-foreground/[0.06] p-4 transition-colors",
        n.read
          ? "bg-white/60"
          : "cursor-pointer bg-white shadow-[0px_4px_20px_0px_rgba(0,0,0,0.03)] hover:bg-foreground/[0.02]",
      )}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${colorClass}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${n.read ? "font-medium" : "font-semibold"} text-foreground`}>
            {n.title}
          </p>
          {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </div>
        <p className="mt-0.5 text-xs text-foreground/60">{n.message}</p>
        <p className="mt-1 text-[11px] text-foreground/60">{timeLabel}</p>
      </div>
    </li>
  );
}
