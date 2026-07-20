import { apiClient } from "@/lib/api-client";
import { DocumentsResponse } from "@/types";

export const documentsClient = {
  getDocuments: async () => {
    const response = await apiClient.get<DocumentsResponse>(
      "/api/v1/participant/documents",
    );
    return response.data;
  },
};
