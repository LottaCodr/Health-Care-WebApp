"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode, FC } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export const Providers: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <SessionProvider>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </SessionProvider>
    );
};
