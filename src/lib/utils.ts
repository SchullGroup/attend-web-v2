import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// The backend returns UTC timestamps with no timezone marker (e.g.
// "2026-06-19T13:30:15.8163"). JS parses a bare date-time as LOCAL time, so in a
// UTC+ offset (e.g. Nigeria, UTC+1) every time reads ~1h in the past. Append "Z"
// to date-time strings that have no timezone so they're parsed as UTC.
export function parseApiDate(d: string): Date {
  const isDateTime = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(d);
  const hasTz = /(Z|[+-]\d{2}:?\d{2})$/.test(d);
  return new Date(isDateTime && !hasTz ? `${d}Z` : d);
}

// A display name for a press-kit / document file: its title, else the file name
// pulled from the download URL, else a generic label. Keeps the UI from showing a
// blank row when the admin uploaded a file without naming it.
export function fileDisplayName(
  file: { name?: string | null; title?: string | null; downloadUrl?: string | null },
  fallback = "Press kit file",
): string {
  const label = file.name?.trim() || file.title?.trim();
  if (label) return label;
  const url = file.downloadUrl;
  if (url) {
    try {
      const last = new URL(url).pathname.split("/").filter(Boolean).pop() || "";
      const name = decodeURIComponent(last).split("?")[0];
      if (name) return name;
    } catch {
      /* not a parseable URL */
    }
  }
  return fallback;
}

// Admins paste whatever stream link they have (often a YouTube/Vimeo *watch*
// URL). Watch URLs can't be iframed, so convert known providers to their embed
// form; anything else is returned unchanged (assumed already embeddable).
export function toEmbedUrl(raw: string): string {
  if (!raw) return raw;
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtube.com") {
      const id = u.searchParams.get("v") || u.pathname.match(/\/(?:embed|live|shorts)\/([\w-]+)/)?.[1];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    // not a parseable URL — fall through and return as-is
  }
  return raw;
}

export function formatDate(d: string) {
  return parseApiDate(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatShortDate(d: string) {
  return parseApiDate(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatRelativeTime(d: string) {
  const now = new Date().getTime();
  const then = parseApiDate(d).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(d);
}

export function initialsFor(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function greetingByHour() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Normalise backend/mock event formats (IN_PERSON / virtual / HYBRID) to a label.
export function formatEventFormat(f: string) {
  const key = (f || "").toLowerCase();
  if (key === "in_person" || key === "in-person") return "In-person";
  if (key === "virtual") return "Virtual";
  if (key === "hybrid") return "Hybrid";
  return key.replace(/_/g, "-");
}
