import { ApiResponse } from "./api";

export interface ParticipantDocument {
  id: string;
  title: string;
  eventId: string;
  eventTitle: string;
  documentType: string;
  fileType: string;
  sizeBytes: number;
  sizeLabel: string;
  downloadCount: number;
  downloadUrl: string;
}

export interface DocumentsData {
  totalCount: number;
  page: number;
  size: number;
  documents: ParticipantDocument[];
}

export type DocumentsResponse = ApiResponse<DocumentsData>;
