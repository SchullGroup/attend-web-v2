import { useMutation } from "@tanstack/react-query";
import { uploadClient } from "./client";

export const useUploadFile = () =>
  useMutation({
    mutationFn: ({ file, folder }: { file: File; folder?: string }) =>
      uploadClient.upload(file, folder),
  });
