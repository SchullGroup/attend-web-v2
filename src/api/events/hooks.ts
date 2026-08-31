import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { eventsClient } from "./client";
import { EventsQueryParams, SubmitQuestionRequest, CastVoteRequest } from "@/types";

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

export const useGetEvent = (id: string, enabled = true) => {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => eventsClient.getEvent(id),
    enabled: !!id && enabled,
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
    // Check-in is done by event staff scanning this ticket, so it changes server-side with
    // nothing for the participant's browser to react to. Poll while they wait at the gate,
    // and stop the moment it lands ΓÇö the flag never goes back to false.
    refetchInterval: (query) => (query.state.data?.data?.checkedIn ? false : 10_000),
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

export const useGuestBrowseEvents = (params: {
  search?: string;
  eventType?: string;
  page?: number;
  size?: number;
}) => {
  return useQuery({
    queryKey: [...eventKeys.all, "guest-browse", params] as const,
    queryFn: () => eventsClient.guestBrowseEvents(params),
    retry: false,
  });
};

export const useGuestJoin = (eventId: string) => {
  return useMutation({
    mutationFn: ({ code, name }: { code: string; name?: string }) =>
      eventsClient.guestJoinEvent(eventId, code, name),
  });
};

export const useGuestResolutions = (
  eventId: string,
  guestToken: string,
  enabled = true,
  refetchInterval?: number,
) => {
  return useQuery({
    queryKey: [...eventKeys.detail(eventId), "guest-resolutions"] as const,
    queryFn: () => eventsClient.guestGetResolutions(eventId, guestToken),
    enabled: !!eventId && !!guestToken && enabled,
    retry: false,
    refetchInterval: refetchInterval ?? false,
  });
};

export const useGuestEventView = (eventId: string, guestToken: string, enabled = true) => {
  return useQuery({
    queryKey: [...eventKeys.detail(eventId), "guest-view"] as const,
    queryFn: () => eventsClient.guestGetView(eventId, guestToken),
    enabled: !!eventId && !!guestToken && enabled,
    retry: false,
    refetchInterval: 15000,
  });
};

export const useGuestQuestions = (
  eventId: string,
  guestToken: string,
  refetchInterval?: number,
  enabled = true,
) => {
  return useQuery({
    queryKey: [...eventKeys.detail(eventId), "guest-questions", guestToken] as const,
    queryFn: () => eventsClient.guestGetQuestions(eventId, guestToken),
    enabled: !!eventId && !!guestToken && enabled,
    refetchInterval: refetchInterval ?? false,
  });
};

export const useGuestSubmitQuestion = (eventId: string, guestToken: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmitQuestionRequest) =>
      eventsClient.guestSubmitQuestion(eventId, guestToken, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...eventKeys.detail(eventId), "guest-questions"] as const,
      });
      queryClient.invalidateQueries({
        queryKey: ["agm", "questions", eventId],
      });
    },
  });
};

export const useGuestUpvoteQuestion = (eventId: string, guestToken: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) =>
      eventsClient.guestUpvoteQuestion(eventId, guestToken, questionId),
    onMutate: async (questionId) => {
      const qKey = [...eventKeys.detail(eventId), "guest-questions", guestToken] as const;
      await queryClient.cancelQueries({ queryKey: qKey });
      const previous = queryClient.getQueryData<any>(qKey);
      if (previous?.data?.questions) {
        queryClient.setQueryData<any>(qKey, {
          ...previous,
          data: {
            ...previous.data,
            questions: previous.data.questions.map((q: any) => {
              if (q.id === questionId) {
                const wasUpvoted = !!q.myUpvote;
                return {
                  ...q,
                  myUpvote: !wasUpvoted,
                  upvoteCount: Math.max(0, (q.upvoteCount ?? 0) + (wasUpvoted ? -1 : 1)),
                };
              }
              return q;
            }),
          },
        });
      }
      return { previous };
    },
    onError: (_err, _questionId, context) => {
      if (context?.previous) {
        const qKey = [...eventKeys.detail(eventId), "guest-questions", guestToken] as const;
        queryClient.setQueryData(qKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: [...eventKeys.detail(eventId), "guest-questions"] as const,
      });
    },
  });
};

// Guest polls (┬º9) ΓÇö guests can view and vote on live polls.
export const useGuestPolls = (
  eventId: string,
  guestToken: string,
  refetchInterval?: number,
  enabled = true,
) => {
  return useQuery({
    queryKey: [...eventKeys.detail(eventId), "guest-polls", guestToken] as const,
    queryFn: () => eventsClient.guestGetPolls(eventId, guestToken),
    enabled: !!eventId && !!guestToken && enabled,
    refetchInterval: refetchInterval ?? false,
  });
};

export const useGuestRespondToPoll = (eventId: string, guestToken: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      eventsClient.guestRespondToPoll(eventId, guestToken, pollId, optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...eventKeys.detail(eventId), "guest-polls"] as const,
      });
    },
  });
};

// Unified proxy voting (┬º11) ΓÇö a proxy session (canVote: true) casts without a code.
export const useGuestVote = (eventId: string, guestToken: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      resolutionId,
      data,
    }: {
      resolutionId: string;
      data: CastVoteRequest;
    }) => eventsClient.guestVote(eventId, guestToken, resolutionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...eventKeys.detail(eventId), "guest-resolutions"] as const,
      });
    },
  });
};

// Guest proxy voting (┬º10) ΓÇö cast a resolution vote using a proxy code.
export const useGuestProxyVote = (eventId: string, guestToken: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      resolutionId,
      proxyCode,
      data,
    }: {
      resolutionId: string;
      proxyCode: string;
      data: CastVoteRequest;
    }) => eventsClient.guestProxyVote(eventId, guestToken, resolutionId, proxyCode, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [...eventKeys.detail(eventId), "guest-resolutions"] as const,
      });
    },
  });
};

