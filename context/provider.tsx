"use client";

import { ReactNode, FC } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth-provider";
import { PatientProvider } from "./patients/patient-context";
import { AppointmentProvider } from "./appointments/appointment.reducer";

const queryClient = new QueryClient();

export const Providers: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <PatientProvider>
                        <AppointmentProvider>
                            {children}
                        </AppointmentProvider>
                    </PatientProvider>
                </AuthProvider>
            </QueryClientProvider>
        </>
    );
};
