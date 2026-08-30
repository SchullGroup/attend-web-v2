import { useQuery } from "@tanstack/react-query";
import { guestClient, GuestEventsQueryParams } from "./client";

export const useGetGuestEvents = (params?: GuestEventsQueryParams) => {
  return useQuery({
    queryKey: ["guest", "events", params],
    queryFn: () => guestClient.getEvents(params),
  });
};
