"use client";

import { ReactNode, FC } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth-provider";

const queryClient = new QueryClient();

export const Providers: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </QueryClientProvider>
        </>
    );
};
