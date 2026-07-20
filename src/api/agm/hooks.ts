import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agmClient } from "./client";
import { AssignProxyRequest, CastVoteRequest, SubmitQuestionRequest } from "@/types";

export const agmKeys = {
  resolutions: (eventId: string) => ["agm", "resolutions", eventId] as const,
  proxy: (eventId: string) => ["agm", "proxy", eventId] as const,
  voteReceipt: (eventId: string) => ["agm", "vote-receipt", eventId] as const,
  questions: (eventId: string) => ["agm", "questions", eventId] as const,
  minutes: (eventId: string) => ["agm", "minutes", eventId] as const,
};

export const useGetMinutes = (eventId: string) => {
  return useQuery({
    queryKey: agmKeys.minutes(eventId),
    queryFn: () => agmClient.getMinutes(eventId),
    enabled: !!eventId,
    retry: false,
  });
};

export const useGetVoteReceipt = (eventId: string) => {
  return useQuery({
    queryKey: agmKeys.voteReceipt(eventId),
    queryFn: () => agmClient.getVoteReceipt(eventId),
    enabled: !!eventId,
    retry: false,
  });
};

export const useGetQuestions = (eventId: string, refetchInterval?: number) => {
  return useQuery({
    queryKey: agmKeys.questions(eventId),
    queryFn: () => agmClient.getQuestions(eventId),
    enabled: !!eventId,
    // During a live session we poll so new questions, answers and upvote counts
    // from other attendees show up without a reload.
    refetchInterval: refetchInterval ?? false,
  });
};

export const useSubmitQuestion = (eventId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmitQuestionRequest) => agmClient.submitQuestion(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agmKeys.questions(eventId) });
    },
  });
};

export const useUpvoteQuestion = (eventId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) => agmClient.upvoteQuestion(eventId, questionId),
    onMutate: async (questionId) => {
      await queryClient.cancelQueries({ queryKey: agmKeys.questions(eventId) });
      const previous = queryClient.getQueryData<any>(agmKeys.questions(eventId));
      
      if (previous?.data?.questions) {
        queryClient.setQueryData<any>(agmKeys.questions(eventId), {
          ...previous,
          data: {
            ...previous.data,
            questions: previous.data.questions.map((q: any) => {
              if (q.id === questionId) {
                const wasUpvoted = !!q.myUpvote;
                return {
                  ...q,
                  myUpvote: !wasUpvoted,
                  upvoteCount: q.upvoteCount + (wasUpvoted ? -1 : 1),
                };
              }
              return q;
            }),
          },
        });
      }
      return { previous };
    },
    onError: (err, newTodo, context) => {
      if (context?.previous) {
        queryClient.setQueryData(agmKeys.questions(eventId), context.previous);
      }
    },
  });
};

export const useGetResolutions = (eventId: string, refetchInterval?: number, enabled = true) => {
  return useQuery({
    queryKey: agmKeys.resolutions(eventId),
    queryFn: () => agmClient.getResolutions(eventId),
    // Only AGMs have resolutions — general live events skip this fetch.
    enabled: !!eventId && enabled,
    // During a live meeting we poll so countdown + tallies stay fresh.
    refetchInterval: refetchInterval ?? false,
  });
};

export const useCastVote = (eventId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ resolutionId, data }: { resolutionId: string; data: CastVoteRequest }) =>
      agmClient.castVote(eventId, resolutionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agmKeys.resolutions(eventId) });
    },
  });
};

export const useGetProxy = (eventId: string) => {
  return useQuery({
    queryKey: agmKeys.proxy(eventId),
    queryFn: () => agmClient.getProxy(eventId),
    enabled: !!eventId,
  });
};

export const useGetProxyHistory = () => {
  return useQuery({
    queryKey: ["agm", "proxy-history"] as const,
    queryFn: () => agmClient.getProxyHistory(),
  });
};

export const useAssignProxy = (eventId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AssignProxyRequest) => agmClient.assignProxy(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agmKeys.proxy(eventId) });
    },
  });
};
