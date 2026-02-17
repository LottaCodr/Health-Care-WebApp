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
        if (r.includes("nurs")) return "Nurse";
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

    useEffect(() => {
        const initSession = async () => {
            setIsLoading(true);
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();

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
                const staff = await fetchStaffProfile(data.user.id);
                const profile = buildProfile(data.user, staff?.profile);
                setUser(profile);
                setIsLoading(false);

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