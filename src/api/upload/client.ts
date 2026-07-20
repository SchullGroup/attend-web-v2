import { apiClient } from "@/lib/api-client";
import { ApiResponse } from "@/types";

// POST /api/v1/upload — multipart (field: file) → uploads to Cloudinary, returns the URL.
// The response data is a generic string→object map, so the URL key isn't fixed; we pick
// it defensively (url / secureUrl / first http(s) string value).
export const uploadClient = {
  upload: async (file: File, folder?: string): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    if (folder) fd.append("folder", folder);

    const res = await apiClient.post<ApiResponse<Record<string, unknown>>>(
      "/api/v1/upload",
      fd,
      { headers: { "Content-Type": "multipart/form-data" } },
    );

    const data = (res.data?.data ?? {}) as Record<string, unknown>;
    const url =
      (data.url as string) ||
      (data.secureUrl as string) ||
      (data.secure_url as string) ||
      (data.fileUrl as string) ||
      (Object.values(data).find(
        (v) => typeof v === "string" && /^https?:\/\//.test(v),
      ) as string | undefined);

    if (!url || typeof url !== "string") {
      throw new Error("Upload succeeded but no URL was returned.");
    }
    return url;
  },
};
