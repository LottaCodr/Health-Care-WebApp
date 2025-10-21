"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth-provider";
import { PatientProvider } from "./patients/patient-context";
import { AppointmentProvider } from "./appointments/appointment.reducer";
import { EmployeeProvider } from "./employees/context";
import { ConsultationProvider } from "./consultation/consultation";
import { useState } from "react";

// Lazily create QueryClient to avoid recreating on every render
function useStableQueryClient() {
  const [client] = useState(() => new QueryClient());
  return client;
}

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const queryClient = useStableQueryClient();

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ConsultationProvider>
          <EmployeeProvider>
            <PatientProvider>
              <AppointmentProvider>
                {children}
              </AppointmentProvider>
            </PatientProvider>
          </EmployeeProvider>
        </ConsultationProvider>
      </QueryClientProvider>
    // </AuthProvider>
  );
}
