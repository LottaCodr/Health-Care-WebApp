'use client';

import { SessionProvider } from "next-auth/react";
import { ReactNode, FC } from "react";

/**
 * Providers component to encapsulate global context providers.
 * Currently wraps children with NextAuth's SessionProvider.
 */
export const Providers: FC<{ children: ReactNode }> = ({ children }) => (
    <SessionProvider>
        {children}
    </SessionProvider>
);
