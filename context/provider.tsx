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
        staleTime: 30_000, //data fresh for 30 seconds - no refresh on ta focus
        gcTime: 10 * 60 * 1000, // keep in memmory 10 mins
        // Poor-network hardening: more retries with exponential backoff +
        // jitter so a flaky connection self-heals, and automatic refetch
        // when the browser reconnects. TanStack pauses in-flight queries
        // while offline and resumes them on reconnect (networkMode online).
        retry: 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000) + Math.random() * 500,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
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
