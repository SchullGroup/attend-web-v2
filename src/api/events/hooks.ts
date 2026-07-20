import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eventsClient } from "./client";
import { EventsQueryParams } from "@/types";

export const eventKeys = {
  all: ["events"] as const,
  list: (params?: EventsQueryParams) =>
    [...eventKeys.all, "list", params] as const,
  detail: (id: string) => [...eventKeys.all, "detail", id] as const,
  ticket: (id: string) => [...eventKeys.all, "ticket", id] as const,
  saved: () => [...eventKeys.all, "saved"] as const,
};

export const useGetEvents = (params?: EventsQueryParams) => {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: () => eventsClient.getEvents(params),
  });
};

export const useGetEvent = (id: string) => {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventsClient.getEvent(id),
    enabled: !!id,
  });
};

export const useGetStream = (id: string, enabled = true) => {
  return useQuery({
    queryKey: [...eventKeys.all, "stream", id] as const,
    queryFn: () => eventsClient.getStream(id),
    enabled: !!id && enabled,
    retry: false,
    refetchInterval: 15000,
  });
};

export const useGetCountdown = (id: string, enabled = true) => {
  return useQuery({
    queryKey: [...eventKeys.all, "countdown", id] as const,
    queryFn: () => eventsClient.getCountdown(id),
    enabled: !!id && enabled,
    retry: false,
    refetchInterval: 15000,
  });
};

export const useGetQuorum = (id: string, enabled = true) => {
  return useQuery({
    queryKey: [...eventKeys.all, "quorum", id] as const,
    queryFn: () => eventsClient.getQuorum(id),
    enabled: !!id && enabled,
    retry: false,
    refetchInterval: 10000,
  });
};

export const useJoinWaitlist = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => eventsClient.joinWaitlist(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) }),
  });
};

export const useGetMyTicket = (id: string) => {
  return useQuery({
    queryKey: eventKeys.ticket(id),
    queryFn: () => eventsClient.getMyTicket(id),
    enabled: !!id,
  });
};

export const useGetMyEvents = () => {
  return useQuery({
    queryKey: [...eventKeys.all, "mine"] as const,
    queryFn: () => eventsClient.getMyEvents(),
  });
};

export const useCheckIn = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => eventsClient.checkIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
    },
  });
};

export const useRsvp = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => eventsClient.rsvp(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
};

export const useCancelRsvp = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => eventsClient.cancelRsvp(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
};

export const useGetSavedEvents = () => {
  return useQuery({
    queryKey: eventKeys.saved(),
    queryFn: () => eventsClient.getSavedEvents(),
  });
};

export const useSaveEvent = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => eventsClient.saveEvent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.saved() }),
  });
};

export const useUnsaveEvent = (id: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => eventsClient.unsaveEvent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: eventKeys.saved() }),
  });
};

export const useGetActivePoll = (eventId: string, refetchInterval?: number, enabled = true) => {
  return useQuery({
    queryKey: [...eventKeys.detail(eventId), "poll"] as const,
    queryFn: () => eventsClient.getActivePoll(eventId),
    refetchInterval,
    enabled,
  });
};

export const useRespondToPoll = (eventId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      eventsClient.respondToPoll(eventId, pollId, optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...eventKeys.detail(eventId), "poll"] as const,
      });
    },
  });
};

export const useGetPressKit = (eventId: string, refetchInterval?: number, enabled = true) => {
  return useQuery({
    queryKey: [...eventKeys.detail(eventId), "press-kit"] as const,
    queryFn: () => eventsClient.getPressKit(eventId),
    refetchInterval,
    enabled,
  });
};
