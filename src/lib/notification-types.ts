import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  FileText,
  FolderPlus,
  Gavel,
  Megaphone,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Vote,
} from "lucide-react";

// The type values the backend actually sends, confirmed by their code audit on 2026-08-08
// (BACKEND_STATUS_FOR_FE). The previous map here guessed lowercase names — vote_open,
// document, broadcast — none of which the backend has ever emitted, so every notification
// fell through to the default grey bell.
//
// The Swagger types NotificationItem.type as a plain string with no enum, so the spec will
// not catch it if this list drifts. Anything unmapped still renders the neutral bell.
export type NotificationType =
  | "RSVP_CONFIRMED"
  | "NEW_REGISTRATION"
  | "VOTE_CAST"
  | "PROXY_ASSIGNED"
  | "PROXY_VOTE_CAST"
  | "KYC_SUBMISSION"
  | "HACKATHON_APPLIED"
  | "APPLICATION_SUBMITTED"
  | "APPLICATION_STATUS_CHANGED"
  | "CHALLENGE_MEMBER_ADDED"
  | "JUDGE_ASSIGNED"
  | "JUDGE_UNASSIGNED"
  | "CHALLENGE_STATUS_CHANGED"
  | "RESOURCE_ADDED"
  | "EVENT_CREATED"
  | "ENROLLMENT_REQUEST"
  // Confirmed added to the backend on 2026-08-10 (BACKEND_STATUS_FOR_FE):
  // batch proxy vote, challenge application, organiser broadcast, event reminder.
  | "PROXY_VOTE_BATCH_CAST"
  | "CHALLENGE_APPLICATION_SUBMITTED"
  | "BROADCAST"
  | "EVENT_REMINDER";

type NotificationStyle = {
  icon: typeof Bell;
  color: string;
};

const STYLES: Record<string, NotificationStyle> = {
  RSVP_CONFIRMED: { icon: CalendarCheck, color: "bg-emerald-50 text-emerald-600" },
  NEW_REGISTRATION: { icon: UserPlus, color: "bg-emerald-50 text-emerald-600" },
  VOTE_CAST: { icon: Vote, color: "bg-red-50 text-red-600" },
  PROXY_ASSIGNED: { icon: Users, color: "bg-indigo-50 text-indigo-600" },
  PROXY_VOTE_CAST: { icon: Vote, color: "bg-indigo-50 text-indigo-600" },
  KYC_SUBMISSION: { icon: ShieldCheck, color: "bg-sky-50 text-sky-600" },
  HACKATHON_APPLIED: { icon: Sparkles, color: "bg-purple-50 text-purple-600" },
  APPLICATION_SUBMITTED: { icon: FileText, color: "bg-purple-50 text-purple-600" },
  APPLICATION_STATUS_CHANGED: { icon: Sparkles, color: "bg-amber-50 text-amber-600" },
  CHALLENGE_MEMBER_ADDED: { icon: Users, color: "bg-purple-50 text-purple-600" },
  JUDGE_ASSIGNED: { icon: Gavel, color: "bg-slate-100 text-slate-600" },
  JUDGE_UNASSIGNED: { icon: Gavel, color: "bg-slate-100 text-slate-600" },
  CHALLENGE_STATUS_CHANGED: { icon: Sparkles, color: "bg-amber-50 text-amber-600" },
  RESOURCE_ADDED: { icon: FolderPlus, color: "bg-blue-50 text-blue-600" },
  EVENT_CREATED: { icon: CalendarPlus, color: "bg-blue-50 text-blue-600" },
  ENROLLMENT_REQUEST: { icon: UserPlus, color: "bg-slate-100 text-slate-600" },
  // Indigo matches PROXY_ASSIGNED / PROXY_VOTE_CAST so the whole proxy family reads as one.
  PROXY_VOTE_BATCH_CAST: { icon: Vote, color: "bg-indigo-50 text-indigo-600" },
  // Purple matches the other challenge/application entries.
  CHALLENGE_APPLICATION_SUBMITTED: { icon: FileText, color: "bg-purple-50 text-purple-600" },
  BROADCAST: { icon: Megaphone, color: "bg-amber-50 text-amber-600" },
  EVENT_REMINDER: { icon: CalendarClock, color: "bg-blue-50 text-blue-600" },
};

const FALLBACK: NotificationStyle = {
  icon: Bell,
  color: "bg-foreground/[0.04] text-foreground/60",
};

// Matched case-insensitively so a backend switch to lowercase (or a mixed feed during a
// migration) degrades to the right icon rather than silently to the fallback.
export function notificationStyle(type?: string): NotificationStyle {
  if (!type) return FALLBACK;
  return STYLES[type.toUpperCase()] ?? FALLBACK;
}
