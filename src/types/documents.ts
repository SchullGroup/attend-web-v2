import { ApiResponse } from "./api";

/**
 * One row from `GET /api/v1/participant/documents`.
 *
 * The deployed response is wider than the spec's `DocumentItem`, which lists only id, title,
 * documentType, fileType, sizeBytes, originalFilename, fileUrl and uploadedAt. `sizeLabel` and
 * `eventTitle` do come back ΓÇö both render on /profile/documents ΓÇö so they stay here, but anything
 * the spec does not guarantee is optional and the page reads it through a fallback.
 */
export interface ParticipantDocument {
  id: string;
  /**
   * The name the admin gave the document. Required on `UploadDocumentRequest`, and declared there
   * separately from `originalFilename` ΓÇö so this is always the right field to display, and a title
   * that looks like a filename is a filename the admin entered, not the wrong field being read.
   */
  title?: string;
  /** The uploaded file's own name. Only a fallback for a title that was never filled in. */
  originalFilename?: string;
  eventId?: string;
  eventTitle?: string;
  /** What the spec calls eventTitle. */
  eventName?: string;
  documentType?: string;
  fileType?: string;
  sizeBytes?: number;
  sizeLabel?: string;
  downloadCount?: number;
  downloadUrl?: string;
  /** What the spec calls downloadUrl. */
  fileUrl?: string;
  uploadedAt?: string;
}

export interface DocumentsData {
  totalCount: number;
  page: number;
  size: number;
  documents: ParticipantDocument[];
}

export type DocumentsResponse = ApiResponse<DocumentsData>;
