import { ApiResponse } from "./api";
import { ApplicationMemberRequest } from "./hackathon";

// Door B — one-step innovation application (POST /innovation/challenges/{id}/applications).
export interface InnovationApplicationRequest {
  teamName: string;
  track: string;
  ideaTitle: string;
  ideaDescription: string;
  members: ApplicationMemberRequest[];
  sourceCodeUrl?: string;
  liveDemoUrl?: string;
  projectDescription?: string;
  pitchDeckUrl?: string;
  pitchVideoUrl?: string;
  demoVideoUrl?: string;
  additionalDocumentsUrl?: string;
}

export interface ChallengeApplicationConfigData {
  challengeId: string;
  challengeName: string;
  tracks: string[];
  minTeamSize: number;
  maxTeamSize: number;
  applicationOpen: boolean;
  alreadyApplied: boolean;
}

export interface ApplicationMemberResponse {
  fullName: string;
  role: string;
  position: number;
}

export interface InnovationApplicationData {
  id: string;
  challengeId: string;
  challengeName: string;
  teamName: string;
  track: string;
  ideaTitle: string;
  ideaDescription: string;
  status: string;
  submittedAt: string;
  members: ApplicationMemberResponse[];
}

export interface TeamMemberItem {
  name: string;
  email: string;
  role: string;
  lead: boolean;
}

export interface MyApplicationSummary {
  id: string;
  applicationCode: string;
  challengeId: string;
  challengeName: string;
  teamName: string;
  track: string;
  status: string;
  submittedAt: string;
  ideaTitle?: string;
  ideaDescription?: string;
  memberRole?: string;
  lead?: boolean;
  teamMembers?: TeamMemberItem[];
}

export type ChallengeApplicationConfigResponse = ApiResponse<ChallengeApplicationConfigData>;
export type InnovationApplicationResponse = ApiResponse<InnovationApplicationData>;
export type MyApplicationsResponse = ApiResponse<MyApplicationSummary[]>;
