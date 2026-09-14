"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";
import { purgeLegacyStoredBvn } from "@/lib/kyc-progress";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  // An earlier build stored the user's BVN in localStorage. Nothing writes it any more,
  // but it is still sitting on every device that used the KYC flow before, so clear it
  // once on load. This wraps the whole app deliberately — a user with a leftover BVN may
  // never open the KYC pages again, so purging there would miss them.
  useEffect(() => {
    purgeLegacyStoredBvn();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Dev-only. `initialIsOpen={false}` still mounted (closed) the whole devtools panel for
          every real visitor — it isn't tree-shaken by that prop, only by this check, since
          `NODE_ENV` is statically known at build time and the branch below is fully eliminated
          from the production bundle. Also stops any visitor from opening the pane and reading
          live query keys/cache contents, which shipping it at all made possible. */}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
