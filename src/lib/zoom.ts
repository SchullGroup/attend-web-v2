// Zoom Meeting SDK utilities — URL parsing and fresh stream fetching.
//
// The SDK itself now loads inside public/zoom-meeting.html (Client View in an
// iframe). This file no longer touches the SDK bundle at all.
/* eslint-disable @typescript-eslint/no-explicit-any */

import { apiClient } from "@/lib/api-client";
import { ApiResponse } from "@/types";

export type ZoomJoinTarget = { meetingNumber: string; passcode: string };

// Detect a Zoom join link and pull out the meeting number (+ pwd if present).
// Returns null for non-Zoom URLs so callers fall back to the iframe embed.
// Meetings are `/j/<id>`, webinars `/w/<id>` — the number is the id to join with either way.
// The URL's `pwd` is Zoom's encoded token, not always the plain passcode the SDK wants, so
// this is only the fallback — resolveZoomJoin prefers the backend's own fields.
export function parseZoomUrl(url: string | undefined | null): ZoomJoinTarget | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    if (!/(^|\.)zoom\.us$/i.test(u.hostname)) return null;
    const m = u.pathname.match(/\/[jw]\/(\d+)/);
    if (!m) return null;
    return { meetingNumber: m[1], passcode: u.searchParams.get("pwd") || "" };
  } catch {
    return null;
  }
}

// What to join with. The backend's zoomMeetingNumber + zoomPassword (added 2026-09-28) win:
// link formats vary, and zoomPassword is the real passcode. Falls back to parsing the link
// for payloads that don't carry them yet (guest /view before LIVE, older responses).
export function resolveZoomJoin(
  fields: { zoomMeetingNumber?: number | string | null; zoomPassword?: string | null } | null | undefined,
  streamUrl: string | undefined | null,
): ZoomJoinTarget | null {
  const parsed = parseZoomUrl(streamUrl);
  const num = fields?.zoomMeetingNumber;
  if (num != null && String(num).trim()) {
    return {
      meetingNumber: String(num).trim(),
      passcode: fields?.zoomPassword ?? parsed?.passcode ?? "",
    };
  }
  return parsed;
}

// Fetch a fresh streamUrl from the backend for a given event.
// Used by ZoomStage's retry-once logic: if joining fails with "meeting not found",
// re-fetch the stream URL (which may have rotated) and retry with fresh values.
export async function fetchStreamUrl(eventId: string): Promise<string | null> {
  try {
    const response = await apiClient.get<ApiResponse<Record<string, unknown>>>(
      `/api/v1/participant/events/${eventId}/stream`,
    );
    const url = response.data?.data?.streamUrl;
    return typeof url === "string" ? url : null;
  } catch {
    return null;
  }
}
