import { useQuery } from "@tanstack/react-query";
import { documentsClient } from "./client";

export const documentKeys = {
  all: ["documents"] as const,
};

export const useGetDocuments = () => {
  return useQuery({
    queryKey: documentKeys.all,
    queryFn: () => documentsClient.getDocuments(),
  });
};
