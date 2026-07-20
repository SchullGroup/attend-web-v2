import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { agmKeys } from "./hooks";
import { QuestionsResponse } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Real-time Q&A via STOMP over SockJS. Subscribes to /topic/qa.{eventId} and keeps
// the questions query in sync:
//   • QUESTION_APPROVED → refetch the list (a new question just became visible)
//   • QUESTION_ANSWERED → patch that question in place (answer/answeredBy/status)
// Polling stays on as a slow fallback in case the socket drops or is blocked.
export function useQaSocket(eventId: string, enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!enabled || !eventId || !apiUrl) return;

    let client: any = null;
    let cancelled = false;

    (async () => {
      // sockjs-client references `global`; define it before loading the lib.
      if (typeof (window as any).global === "undefined") (window as any).global = window;
      const SockJS = (await import("sockjs-client")).default;
      const { Client } = await import("@stomp/stompjs");
      if (cancelled) return;

      const token = Cookies.get("accessToken");
      client = new Client({
        webSocketFactory: () => new SockJS(`${apiUrl}/ws`),
        connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
        reconnectDelay: 5000,
        onConnect: () => {
          client.subscribe(`/topic/qa.${eventId}`, (message: any) => {
            let msg: any;
            try {
              msg = JSON.parse(message.body);
            } catch {
              return;
            }

            if (msg?.type === "QUESTION_APPROVED") {
              queryClient.invalidateQueries({ queryKey: agmKeys.questions(eventId) });
            } else if (msg?.type === "QUESTION_ANSWERED") {
              const p = msg.payload || {};
              queryClient.setQueryData<QuestionsResponse>(agmKeys.questions(eventId), (old) => {
                if (!old?.data?.questions) return old;
                return {
                  ...old,
                  data: {
                    ...old.data,
                    questions: old.data.questions.map((q) =>
                      q.id === p.questionId
                        ? {
                            ...q,
                            status: p.status ?? q.status,
                            answer: p.answer ?? q.answer,
                            answeredBy: p.answeredBy ?? q.answeredBy,
                            answeredAt: p.answeredAt ?? q.answeredAt,
                          }
                        : q,
                    ),
                  },
                };
              });
            }
          });
        },
      });
      client.activate();
    })();

    return () => {
      cancelled = true;
      client?.deactivate();
    };
  }, [eventId, enabled, queryClient]);
}
