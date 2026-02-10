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
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const redirect = useRouter()

    useEffect(() => {
        // Check initial session
        const initSession = async () => {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();

                if (authUser) {
                    const staff = await fetchStaffProfile(authUser.id);
                    const profile = staff?.profile as any | undefined;
                    if (profile) {
                        profile.$id = profile.id || profile.$id;
                        // normalize role strings to PascalCase used elsewhere
                        if (typeof profile.role === "string") {
                            const r = String(profile.role).toLowerCase();
                            if (r.includes("front")) profile.role = "FrontDesk";
                            else if (r.includes("doc")) profile.role = "Doctor";
                            else if (r.includes("nurs")) profile.role = "Nurse";
                            else if (r.includes("lab")) profile.role = "LabTechnician";
                            else if (r.includes("pharm")) profile.role = "Pharmacist";
                            else profile.role = profile.role;
                        }

                        setUser(profile || null);
                    } else {
                        setUser(null);
                    }
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
                    const profile = staff?.profile as any | undefined;
                    if (profile) {
                        profile.$id = profile.id || profile.$id;
                        if (typeof profile.role === "string") {
                            const r = String(profile.role).toLowerCase();
                            if (r.includes("front")) profile.role = "FrontDesk";
                            else if (r.includes("doc")) profile.role = "Doctor";
                            else if (r.includes("nurs")) profile.role = "Nurse";
                            else if (r.includes("lab")) profile.role = "LabTechnician";
                            else if (r.includes("pharm")) profile.role = "Pharmacist";
                            else profile.role = profile.role;
                        }
                        setUser(profile || null);
                    } else {
                        setUser(null);
                    }
                } else {
                    setUser(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                return { success: false, message: error.message };
            }

            if (!data.user) {
                return { success: false, message: "Login failed" };
            }

            const staff = await fetchStaffProfile(data.user.id);

            if (!staff?.profile) {
                return { success: false, message: "Staff profile not found" };
            }

            setUser(staff.profile as any);

            return {
                success: true,
                message: "Login successful",
                staff: staff.profile as any
            };
        } catch (err: any) {
            return { success: false, message: err.message };
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        redirect.replace('/staff')
    };

    const value = useMemo(
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

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};