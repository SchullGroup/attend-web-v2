"use client";
import { Bell, FileText, Megaphone, CalendarClock, Vote, Sparkles } from "lucide-react";
import { useGetNotifications, useMarkRead, useMarkAllRead } from "@/api/notifications/hooks";
import { Notification } from "@/types";
import { Button } from "@/components/ui/Button";
import { formatRelativeTime } from "@/lib/utils";

const ICONS: Record<string, typeof Bell> = {
  vote_open: Vote,
  event_reminder: CalendarClock,
  application_update: Sparkles,
  document: FileText,
  broadcast: Megaphone,
};

const TYPE_COLOR: Record<string, string> = {
  vote_open: "bg-red-50 text-red-600",
  event_reminder: "bg-amber-50 text-amber-600",
  application_update: "bg-emerald-50 text-emerald-600",
  document: "bg-blue-50 text-blue-600",
  broadcast: "bg-purple-50 text-purple-600",
};

export default function NotificationsPage() {
  const { data, isLoading } = useGetNotifications({ size: 50 });
  const { mutate: markRead } = useMarkRead();
  const { mutate: markAllRead, isPending: markingAll } = useMarkAllRead();

  const notifications = data?.data?.notifications ?? [];
  const unreadCount = data?.data?.unreadCount ?? 0;
  const totalCount = data?.data?.totalCount ?? 0;

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-20 animate-pulse rounded-2xl border border-border bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">
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

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          You have no notifications yet.
        </div>
      ) : (
        <>
          {unread.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
  const Icon = ICONS[n.type] ?? Bell;
  const colorClass = TYPE_COLOR[n.type] ?? "bg-muted text-muted-foreground";

  return (
    <li
      onClick={() => !n.read && onRead?.()}
      className={`flex items-start gap-3 rounded-2xl border border-border p-4 transition-colors ${
        n.read ? "bg-white/60" : "cursor-pointer bg-white shadow-sm hover:bg-muted/20"
      }`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${n.read ? "font-medium" : "font-semibold"} text-foreground`}>
            {n.title}
          </p>
          {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{formatRelativeTime(n.createdAt)}</p>
      </div>
    </li>
  );
}
