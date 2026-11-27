"use client";

import { ReactNode, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth-provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { initNetworkMonitor } from "@/store/network-store";

export function useStableQueryClient() {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // data fresh for 60s; Realtime invalidates live on changes
        gcTime: 15 * 60 * 1000, // keep in memory 15 mins for instant back/tab navigation
        // Poor-network hardening: more retries with exponential backoff +
        // jitter so a flaky connection self-heals, and automatic refetch
        // when the browser reconnects. TanStack pauses in-flight queries
        // while offline and resumes them on reconnect (networkMode online).
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000) + Math.random() * 400,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
        networkMode: "online",
      },
      mutations: {
        // Never auto-retry writes — a retried mutation could double-create
        // records (patients, staff, payments). Surface the error and let the
        // user retry deliberately.
        retry: 0,
      },
    },
  }));
  return client;
}


interface ProvidersProps {
  children: ReactNode;
}


export function Providers({ children }: ProvidersProps) {
  const queryClient = useStableQueryClient();

  // Track online/offline + connection quality globally (drives the
  // NetworkStatusBanner and offline guards in forms).
  useEffect(() => {
    initNetworkMonitor();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
