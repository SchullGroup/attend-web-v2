import { ApiResponse } from "./api";
import { EventListItem, EventBranding } from "./events";

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
}

export interface Submission {
  id: string;
  title: string;
  description: string;
  repositoryUrl: string;
  demoUrl: string;
  status: string;
}

export interface TeamData {
  id: string;
  name: string;
  description: string;
  eventId: string;
  leader: TeamMember;
  members: TeamMember[];
  submission: Submission | null;
}

export interface ChallengesListData {
  totalCount: number;
  page: number;
  size: number;
  events: EventListItem[];
}

export interface ApplicationMemberRequest {
  fullName: string;
  role: string;
  email: string;
}

export interface CreateTeamRequest {
  name: string;
  description: string;
  track?: string;
  ideaTitle?: string;
  ideaDescription?: string;
  members?: ApplicationMemberRequest[];
}

export interface SubmitProjectRequest {
  title: string;
  description: string;
  repositoryUrl: string;
  demoUrl: string;
  pitchDeckUrl?: string;
  demoVideoUrl?: string;
}

export type TeamResponse = ApiResponse<TeamData>;
export type ChallengesListResponse = ApiResponse<ChallengesListData>;

export interface ChallengeMyTeamSummary {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  submissionStatus: string;
}

export interface PrizeTierItem {
  position: string;
  reward: string;
}

export interface SubmissionRequirements {
  requireSourceCode: boolean;
  requireLiveDemoUrl: boolean;
  requireProjectDescription: boolean;
  requirePitchDeck: boolean;
  requirePitchVideoUrl: boolean;
  requireDemoVideo: boolean;
  requireAdditionalDocuments: boolean;
}

export interface ChallengeDetailData {
  id: string;
  title: string;
  description: string;
  eventType: string;
  status: string;
  date: string;
  startTime: string;
  venue: string;
  organizerName: string;
  /** See the note on EventListItem.registered ΓÇö eligibility, not necessarily an RSVP. */
  registered: boolean;
  /** True only once a real RSVP (`EventRegistration` row) exists. */
  hasRsvped?: boolean;
  applicationsOpen?: boolean;
  resourceCount: number;
  tracks?: string[];
  minTeamSize?: number;
  maxTeamSize?: number;
  problemStatement?: string;
  expectedDeliverable?: string;
  eligibilityCriteria?: string;
  allowedTechStack?: string;
  participationType?: string;
  applicationDeadline?: string;
  prizeTiers?: PrizeTierItem[];
  submissionRequirements?: SubmissionRequirements;
  myTeam: ChallengeMyTeamSummary | null;
  branding?: EventBranding;
  bannerUrl?: string | null;
  brandPrimary?: string | null;
  brandAccent?: string | null;
}

export interface ChallengeResource {
  id: string;
  title: string;
  description: string;
  category?: string;
  resourceType: string;
  url: string;
  fileType: string;
  sizeBytes: number;
  originalFilename: string;
}

export interface ChallengeCertificateData {
  eventId: string;
  eventTitle: string;
  participantName: string;
  teamName: string;
  applicationStatus: string;
  /** Would qualify for a certificate ΓÇö not the same as one existing. */
  eligible: boolean;
  /** A certificate has actually been issued (an organiser ran the issuance). */
  issued: boolean;
  certificateId?: string;
  certificateNumber?: string;
  /** Winner shown first when a participant holds both. Missing ΓåÆ treat as PARTICIPATION. */
  certificateType?: "WINNER" | "PARTICIPATION";
  /** false ΓåÆ the PDF is still generating; poll again shortly. */
  downloadReady?: boolean;
  /** e.g. "/api/v1/public/certificates/{id}/download" */
  downloadPath?: string;
  message: string;
}

export interface MyTeamItem {
  teamId: string;
  teamName: string;
  eventId: string;
  eventTitle: string;
  eventType: string;
  eventStatus: string;
  eventDate: string;
  leader: boolean;
  memberCount: number;
  submissionStatus: string;
}

export interface MyTeamsData {
  totalCount: number;
  teams: MyTeamItem[];
}

export type ChallengeDetailResponse = ApiResponse<ChallengeDetailData>;
export type ChallengeResourcesResponse = ApiResponse<ChallengeResource[]>;
export type ChallengeCertificateResponse = ApiResponse<ChallengeCertificateData>;
export type MyTeamsResponse = ApiResponse<MyTeamsData>;
