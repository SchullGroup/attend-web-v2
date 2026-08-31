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
  // once on load. This wraps the whole app deliberately ΓÇö a user with a leftover BVN may
  // never open the KYC pages again, so purging there would miss them.
  useEffect(() => {
    purgeLegacyStoredBvn();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
