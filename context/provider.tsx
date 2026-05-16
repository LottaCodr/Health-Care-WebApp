"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth-provider";
// import { ErrorBoundary } from "@/components/error-boundary";
import { useState } from "react";

export function useStableQueryClient() {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, //data fresh for 30 seconds - no refresh on ta focus
        gcTime: 10 * 60 * 1000, // keep in memmory 10 mins
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: true,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
      },
      mutations: {
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


  return (
    // <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
    // </ErrorBoundary>
  );
}
