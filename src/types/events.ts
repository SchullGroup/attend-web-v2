import { ApiResponse } from "./api";

export interface EventBranding {
  logoUrl?: string | null;
  brandColor?: string | null;
}

export interface EventListItem {
  id: string;
  title: string;
  eventType: string;
  format: string;
  status: string;
  date: string;
  startTime: string;
  venue: string;
  /**
   * Null until the organiser sets a link. Since Zoom links are no longer created
   * at event-creation time, a VIRTUAL/HYBRID event can legitimately have no join
   * link right up to (and past) its start time ΓÇö gate "Join" on this being set.
   */
  streamUrl: string | null;
  organizerName: string;
  organizerLogo: string;
  registerId?: string;
  registerName?: string;
  maximumCapacity: number;
  rsvpEnabled?: boolean;
  featured?: boolean;
  /**
   * Eligible via the shareholder register (AGMs) or invited ΓÇö not necessarily an actual
   * RSVP. Use `hasRsvped` to gate RSVP/Cancel-RSVP-style actions; this alone isn't enough
   * for that (confirmed 2026-08-17, after it drove a "confirmed" badge + a Cancel RSVP
   * button that failed with "not registered" for someone who was only on the register).
   */
  registered: boolean;
  /** True only once a real RSVP (`EventRegistration` row) exists. */
  hasRsvped?: boolean;
  branding?: EventBranding;
  flyerUrl?: string | null;
  bannerUrl?: string | null;
  brandPrimary?: string | null;
  brandAccent?: string | null;
}

export interface SpeakerItem {
  id: string;
  name: string;
  roleTitle: string;
  bio: string;
}

export interface AgendaItemDetail {
  id: string;
  time: string;
  title: string;
  speaker: string;
  orderIndex: number;
  durationMinutes?: number;
}

export interface EventDetail {
  id: string;
  title: string;
  description: string;
  eventType: string;
  format: string;
  status: string;
  date: string;
  startTime: string;
  venue: string;
  /** Null until the organiser sets a link ΓÇö see the note on `EventListItem.streamUrl`. */
  streamUrl: string | null;
  organizerName: string;
  organizerLogo: string;
  organizerPrimaryColor: string;
  registerId?: string;
  registerName?: string;
  maximumCapacity: number;
  registeredCount: number;
  rsvpEnabled?: boolean;
  featured?: boolean;
  /** See the note on `EventListItem.registered` ΓÇö eligibility, not necessarily an RSVP. */
  registered: boolean;
  /** True only once a real RSVP (`EventRegistration` row) exists. */
  hasRsvped?: boolean;
  agmProxyEnabled: boolean;
  speakers?: SpeakerItem[];
  agenda?: AgendaItemDetail[];
  // Design-main UI fields ΓÇö kept ready for when the backend provides them.
  tags?: string[];
  waitlisted?: boolean;
  pressKitReleased?: boolean;
  branding?: EventBranding;
  flyerUrl?: string | null;
  bannerUrl?: string | null;
  brandPrimary?: string | null;
  brandAccent?: string | null;
}

// Public guest browse (`GET /guest/events`) returns a deliberately slim event ΓÇö no
// module, capacity or registration state, since the caller isn't authenticated yet.
export interface GuestEventListItem {
  id: string;
  title: string;
  date: string;
  startTime: string;
  branding?: EventBranding;
  eventType?: string;
  status?: string;
  flyerUrl?: string | null;
  bannerUrl?: string | null;
}

export interface GuestEventsListData {
  events: GuestEventListItem[];
  page: number;
  size: number;
  totalCount: number;
}

export type GuestEventsListResponse = ApiResponse<GuestEventsListData>;

export interface MyTicket {
  registrationId: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  participantName: string;
  participantEmail: string;
  qrToken: string;
  checkedIn: boolean;
  checkedInAt: string;
  registeredAt: string;
}

export interface EventsListData {
  totalCount: number;
  page: number;
  size: number;
  events: EventListItem[];
}

export interface EventsQueryParams {
  search?: string;
  eventType?: string;
  status?: string;
  page?: number;
  size?: number;
}

export type EventsListResponse = ApiResponse<EventsListData>;
export type EventDetailResponse = ApiResponse<EventDetail>;
export type MyTicketResponse = ApiResponse<MyTicket>;

export interface ActivePollOption {
  id: string;
  text: string;
}

export interface ActivePollResponse {
  id: string;
  question: string;
  options: ActivePollOption[];
  myResponse: string | null;
  status: "OPEN" | "CLOSED";
}

export interface FileItem {
  id: string;
  // The live API returns `name`; `title` was in the (outdated) Swagger schema ΓÇö
  // keep it optional as a fallback.
  name: string;
  title?: string;
  sizeLabel: string;
  status: "RELEASED" | "EMBARGOED";
  releaseMode: "MANUAL" | "SCHEDULED";
  scheduledReleaseAt: string | null;
  releasedAt: string | null;
  uploadedAt: string;
  downloadUrl: string;
}

export interface PressKitResponse {
  releasedCount: number;
  totalCount: number;
  files: FileItem[];
}

export type ApiResponseActivePollResponse = ApiResponse<ActivePollResponse>;
export type ApiResponsePressKitResponse = ApiResponse<PressKitResponse>;
