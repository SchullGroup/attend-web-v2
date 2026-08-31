import { apiClient } from "@/lib/api-client";
import { DocumentsResponse } from "@/types";

export const documentsClient = {
  getDocuments: async () => {
    const response = await apiClient.get<DocumentsResponse>(
      "/api/v1/participant/documents",
    );
    return response.data;
  },

  /**
   * Fetches the file through the endpoint that counts the download, rather than linking
   * `downloadUrl`/`fileUrl` directly ΓÇö those are bare Cloudinary URLs a browser can open
   * without ever touching this backend, so nothing server-side could count them (┬º27).
   * This endpoint 302s to the same Cloudinary URL after incrementing the count; axios
   * follows that redirect transparently and hands back the actual file as a blob.
   */
  downloadDocument: async (id: string) => {
    const response = await apiClient.get(
      `/api/v1/participant/documents/${id}/download`,
      { responseType: "blob" },
    );
    return response.data as Blob;
  },
};
