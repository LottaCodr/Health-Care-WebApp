"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth-provider";
import { PatientProvider } from "./patients/patient-context";
// import { AppointmentProvider } from "./appointments/appointment.reducer";
import { EmployeeProvider } from "./employees/context";
import { ConsultationProvider } from "./consultation/consultation";
// import { ErrorBoundary } from "@/components/error-boundary";
import { useState } from "react";

// Lazily create QueryClient to avoid recreating on every render
function useStableQueryClient() {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, //data fresh for 1 min - no refresh on ta focus
        gcTime: 5 * 60 * 1000, // keep in memmory 5 mins
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 1,
      },
    },
  }));
  return client;
}

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Unified Provider Component
 * Combines all context providers with error boundary
 */
export function Providers({ children }: ProvidersProps) {
  const queryClient = useStableQueryClient();

  return (
    // <ErrorBoundary>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ConsultationProvider>
          <EmployeeProvider>
            <PatientProvider>
              {/* <AppointmentProvider> */}
                {children}
              {/* </AppointmentProvider> */}
            </PatientProvider>
          </EmployeeProvider>
        </ConsultationProvider>
      </QueryClientProvider>
    </AuthProvider>
    // </ErrorBoundary>
  );
}
