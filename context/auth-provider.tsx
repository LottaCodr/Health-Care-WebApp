"use client";

import { createContext, useContext, useEffect, useState, useMemo } from "react";
import supabase from "@/utils/supabase/client";
import { fetchStaffProfile } from "@/actions/staff/staff";
import { useRouter } from "next/navigation";

interface AuthContextType {
    user: any | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    loading?: boolean; // legacy alias used across components
    login: (
        email: string,
        password: string
    ) => Promise<{ success: boolean; message: string; staff?: any }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Normalize role strings
    const normalizeRole = (role: any): string => {
        if (typeof role !== "string") return role;
        const r = String(role).toLowerCase();
        if (r.includes("front")) return "FrontDesk";
        if (r.includes("doc")) return "Doctor";
        if (r.includes("nurse")) return "Nurse";
        if (r.includes("lab")) return "LabTechnician";
        if (r.includes("pharm")) return "Pharmacist";
        return role;
    };

    // Build normalized profile
    const buildProfile = (authUser: any, profile: any) => {
        if (!profile) return null;
        return {
            ...profile,
            $id: profile.id || profile.$id,
            role: normalizeRole(profile.role),
        };
    };

    // Supabase can transiently throw lock contention in dev when multiple
    // auth reads race. Retry once, then fall back to session user.
    const getAuthUserSafely = async () => {
        try {
            const { data } = await supabase.auth.getUser();
            return data.user ?? null;
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const isLockContention =
                msg.toLowerCase().includes("lock") &&
                msg.toLowerCase().includes("stole");

            if (!isLockContention) throw error;

            await new Promise((resolve) => setTimeout(resolve, 80));
            try {
                const { data } = await supabase.auth.getUser();
                return data.user ?? null;
            } catch {
                const { data } = await supabase.auth.getSession();
                return data.session?.user ?? null;
            }
        }
    };

    useEffect(() => {
        const initSession = async () => {
            setIsLoading(true);
            try {
                const authUser = await getAuthUserSafely();

                if (authUser) {
                    const staff = await fetchStaffProfile(authUser.id);
                    const profile = buildProfile(authUser, staff?.profile);
                    setUser(profile);
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.error("Session init error:", error);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        initSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (session?.user) {
                    const staff = await fetchStaffProfile(session.user.id);
                    const profile = buildProfile(session.user, staff?.profile);
                    setUser(profile);
                } else {
                    setUser(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setIsLoading(false);
                return { success: false, message: error.message };
            }

            if (data?.user) {
                const staffResult = await fetchStaffProfile(data.user.id);

                // Ensure we have a valid staff profile with a role before treating
                // the user as authenticated. This keeps post-login redirects reliable.
                if (!staffResult.success || !staffResult.profile?.role) {
                    setUser(null);
                    setIsLoading(false);
                    return {
                        success: false,
                        message:
                            staffResult.message ||
                            "No staff profile or role found. Please contact an administrator.",
                    };
                }

                const profile = buildProfile(data.user, staffResult.profile);
                setUser(profile);
                setIsLoading(false);

                console.log("staff detail", staffResult, profile);

                return {
                    success: true,
                    message: "Login successful",
                    staff: profile,
                };
            }

            throw new Error("Login failed");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Login failed";
            setIsLoading(false);
            return { success: false, message };
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
            setUser(null);
            router.push("/login");
        } catch (error) {
            const message = error instanceof Error ? error.message : "Logout failed";
            throw error;
        }
    };

    const contextValue: AuthContextType = useMemo(
        () => ({
            user,
            isAuthenticated: !!user,
            isLoading,
            loading: isLoading,
            login,
            logout,
        }),
        [user, isLoading]
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};