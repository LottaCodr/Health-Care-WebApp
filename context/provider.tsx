"use client";

import { ReactNode, FC } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth-provider";
import { PatientProvider } from "./patients/patient-context";
import { AppointmentProvider } from "./appointments/appointment.reducer";
import { EmployeeProvider } from "./employees/context";
import { ConsultationProvider } from "./consultation/consultation";

const queryClient = new QueryClient();

export const Providers: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <ConsultationProvider>
                        <EmployeeProvider>
                            <PatientProvider>
                                <AppointmentProvider>
                                    {children}
                                </AppointmentProvider>
                            </PatientProvider>
                        </EmployeeProvider>
                    </ConsultationProvider>
                </AuthProvider>
            </QueryClientProvider>
        </>
    );
};
