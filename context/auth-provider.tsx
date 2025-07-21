"use client";

import { Staff } from "@/actions/staff/types";
import { account, databases } from "@/lib/appwrite.config";
import { authService, SessionData } from "@/lib/auth-service";
import { logSecurityEvent } from "@/lib/auth-utils";
import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

interface AuthContextType {
    user: Staff | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    session: SessionData | null;
    login: (email: string, password: string) => Promise<{ success: boolean; message: string; redirectTo?: string }>;
    logout: () => Promise<void>;
    refreshSession: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<Staff | null>(null);
    const [session, setSession] = useState<SessionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;
    const staffCollectionId = process.env.NEXT_PUBLIC_STAFF_COLLECTION_ID!;

    // Load user and session on mount
    useEffect(() => {
        const loadUser = async () => {
            try {
                // Check for existing session
                const storedSession = localStorage.getItem('auth_session');
                if (storedSession) {
                    const sessionData = JSON.parse(storedSession);
                    if (authService.validateSession(sessionData.sessionId)) {
                        setSession(sessionData);

                        // Get user details
                        const userDoc = await databases.getDocument<Staff>(
                            databaseId,
                            staffCollectionId,
                            sessionData.userId
                        );
                        setUser(userDoc);

                        logSecurityEvent('SESSION_RESTORED', {
                            sessionId: sessionData.sessionId,
                            userId: sessionData.userId
                        });
                    } else {
                        // Clear invalid session
                        localStorage.removeItem('auth_session');
                        logSecurityEvent('INVALID_SESSION_CLEARED', { sessionId: sessionData.sessionId });
                    }
                } else {
                    // Try to get current Appwrite session
                    const appwriteSession = await account.get();
                    const userDoc = await databases.getDocument<Staff>(
                        databaseId,
                        staffCollectionId,
                        appwriteSession.$id
                    );

                    if (userDoc) {
                        setUser(userDoc);

                        // Create new session
                        const newSession = authService.createSecureSession(appwriteSession.$id, userDoc.role);
                        setSession(newSession);
                        localStorage.setItem('auth_session', JSON.stringify(newSession));

                        logSecurityEvent('SESSION_CREATED_FROM_APPWRITE', {
                            sessionId: newSession.sessionId,
                            userId: appwriteSession.$id
                        });
                    }
                }
            } catch (error) {
                // Clear any invalid session data
                localStorage.removeItem('auth_session');
                sessionStorage.removeItem('auth_session');
                setUser(null);
                setSession(null);

                logSecurityEvent('SESSION_LOAD_ERROR', { error: error.message });
            } finally {
                setIsLoading(false);
            }
        };

        loadUser();
    }, [databaseId, staffCollectionId]);

    // Session refresh interval
    useEffect(() => {
        if (!session) return;

        const refreshInterval = setInterval(() => {
            if (session && authService.validateSession(session.sessionId)) {
                const refreshedSession = authService.refreshSession(session.sessionId);
                if (refreshedSession) {
                    setSession(refreshedSession);
                    localStorage.setItem('auth_session', JSON.stringify(refreshedSession));
                }
            }
        }, 30 * 60 * 1000); // Refresh every 30 minutes

        return () => clearInterval(refreshInterval);
    }, [session]);

    // Enhanced login function
    const login = async (email: string, password: string) => {
        try {
            const result = await authService.login(email, password);

            if (result.success && result.user && result.sessionId) {
                setUser(result.user);
                setSession({
                    sessionId: result.sessionId,
                    userId: result.user.$id,
                    role: result.role!,
                    expiresAt: Date.now() + (8 * 60 * 60 * 1000), // 8 hours
                    createdAt: Date.now(),
                });

                // Store session
                localStorage.setItem('auth_session', JSON.stringify({
                    sessionId: result.sessionId,
                    userId: result.user.$id,
                    role: result.role,
                    expiresAt: Date.now() + (8 * 60 * 60 * 1000),
                    createdAt: Date.now(),
                }));
            }

            return result;
        } catch (error: any) {
            logSecurityEvent('LOGIN_ERROR', { error: error.message });
            return {
                success: false,
                message: "Login failed. Please try again.",
            };
        }
    };

    // Enhanced logout function
    const logout = async () => {
        try {
            await authService.logout(session?.sessionId);

            // Clear local state
            setUser(null);
            setSession(null);

            // Clear stored session data
            localStorage.removeItem('auth_session');
            sessionStorage.removeItem('auth_session');

            logSecurityEvent('LOGOUT_COMPLETED', { sessionId: session?.sessionId });
        } catch (error) {
            console.error("Logout failed", error);
            logSecurityEvent('LOGOUT_ERROR', { error: error.message });
        }
    };

    // Refresh session manually
    const refreshSession = () => {
        if (session && authService.validateSession(session.sessionId)) {
            const refreshedSession = authService.refreshSession(session.sessionId);
            if (refreshedSession) {
                setSession(refreshedSession);
                localStorage.setItem('auth_session', JSON.stringify(refreshedSession));
            }
        }
    };

    const value = useMemo(() => ({
        user,
        isAuthenticated: !!user,
        isLoading,
        session,
        login,
        logout,
        refreshSession,
    }), [user, isLoading, session, login, logout, refreshSession]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};
