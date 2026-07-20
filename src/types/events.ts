import { ApiResponse } from "./api";

export interface EventListItem {
  id: string;
  title: string;
  eventType: string;
  format: string;
  status: string;
  date: string;
  startTime: string;
  venue: string;
  streamUrl: string;
  organizerName: string;
  organizerLogo: string;
  registerId?: string;
  registerName?: string;
  maximumCapacity: number;
  rsvpEnabled?: boolean;
  /** Minutes after live start during which shareholders can still RSVP (0..120). Null = 30 default. */
  lateRsvpMinutes?: number | null;
  featured?: boolean;
  registered: boolean;
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
  streamUrl: string;
  organizerName: string;
  organizerLogo: string;
  organizerPrimaryColor: string;
  registerId?: string;
  registerName?: string;
  maximumCapacity: number;
  registeredCount: number;
  rsvpEnabled?: boolean;
  /** Minutes after live start during which shareholders can still RSVP (0..120). Null = 30 default. */
  lateRsvpMinutes?: number | null;
  featured?: boolean;
  registered: boolean;
  agmProxyEnabled: boolean;
  speakers?: SpeakerItem[];
  agenda?: AgendaItemDetail[];
  // Design-main UI fields — kept ready for when the backend provides them.
  tags?: string[];
  waitlisted?: boolean;
  pressKitReleased?: boolean;
}

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
  // The live API returns `name`; `title` was in the (outdated) Swagger schema —
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
