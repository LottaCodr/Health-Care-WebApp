"use client";

import { createContext, useContext, useEffect, useState, useMemo, useRef } from "react";
import supabase from "@/utils/supabase/client";
import { fetchStaffProfile } from "@/actions/staff/staff";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useFrontDeskStore } from "@/store/frontdesk-store";
import { useLabStore } from "@/store/lab-store";
import { useDischargeStore } from "@/store/discharge-store";
import { useNurseChartsStore } from "@/store/nurse-chart-store";
import { useBulkUploadStore } from "@/store/bulk-upload-store";
import { useAppointmentStore } from "@/store/appoointment-store";
import { useRadiologyStore } from "@/store/radiology-store";
import { useVitalsStore } from "@/store/vitals-store";
import { useConsultationStore } from "@/store/consultation-store";
import { usePharmacyStore } from "@/store/pharmacy-store";
import { usePatientStore } from "@/store/patient-store";
import { useCacheStore } from "@/store/store";

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
    const queryClient = useQueryClient();
    const isAuthenticatingRef = useRef(false);

    // Normalize role strings
    const normalizeRole = (role: any): string => {
        if (typeof role !== "string") return role;
        const r = String(role).toLowerCase();
        if (r.includes("front")) return "FrontDesk";
        if (r.includes("doc")) return "Doctor";
        if (r.includes("nurse")) return "Nurse";
        if (r.includes("lab")) return "LabTechnician";
        if (r.includes("pharm")) return "Pharmacist";
        if (r.includes("radio")) return "Radiologist";
        if (r.includes("admin")) return "Admin";
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

    // Supabase can transiently throw lock contention in dev when` multiple
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
            // Optimistic Auth Hydration: Read cache for instant paint
            if (typeof window !== "undefined") {
                const cached = localStorage.getItem("nile_user_profile");
                if (cached) {
                    try {
                        setUser(JSON.parse(cached));
                        setIsLoading(false);
                    } catch {
                        localStorage.removeItem("nile_user_profile");
                    }
                } else {
                    setIsLoading(true);
                }
            } else {
                setIsLoading(true);
            }

            try {
                const authUser = await getAuthUserSafely();

                if (authUser) {
                    const staff = await fetchStaffProfile(authUser.id);
                    const profile = buildProfile(authUser, staff?.profile);
                    setUser(profile);
                    if (typeof window !== "undefined" && profile) {
                        localStorage.setItem("nile_user_profile", JSON.stringify(profile));
                    }
                } else {
                    setUser(null);
                    if (typeof window !== "undefined") {
                        localStorage.removeItem("nile_user_profile");
                    }
                }
            } catch (error) {
                console.error("Session init error:", error);
                setUser(null);
                if (typeof window !== "undefined") {
                    localStorage.removeItem("nile_user_profile");
                }
            } finally {
                setIsLoading(false);
            }
        };

        initSession();
        
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // If we are currently in the middle of a manual login() call, 
                // ignore this event to prevent double-fetching the profile.
                if (isAuthenticatingRef.current) return;

                const authUser = session?.user ?? (await getAuthUserSafely());

                if (authUser) {
                    const staff = await fetchStaffProfile(authUser.id);
                    const profile = buildProfile(authUser, staff?.profile);
                    setUser(profile);
                    if (typeof window !== "undefined" && profile) {
                        localStorage.setItem("nile_user_profile", JSON.stringify(profile));
                    }
                } else {
                    setUser(null);
                    if (typeof window !== "undefined") {
                        localStorage.removeItem("nile_user_profile");
                    }
                }
                
                if (event === "SIGNED_OUT") {
                    setIsLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        isAuthenticatingRef.current = true; // Block onAuthStateChange from double-fetching
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                return { success: false, message: error.message };
            }

            if (data?.user) {
                const staffResult = await fetchStaffProfile(data.user.id);

                // Ensure we have a valid staff profile with a role before treating
                // the user as authenticated. This keeps post-login redirects reliable.
                if (!staffResult.success || !staffResult.profile?.role) {
                    setUser(null);
                    return {
                        success: false,
                        message:
                            staffResult.message ||
                            "No staff profile or role found. Please contact an administrator.",
                    };
                }

                const profile = buildProfile(data.user, staffResult.profile);
                setUser(profile);
                if (typeof window !== "undefined" && profile) {
                    localStorage.setItem("nile_user_profile", JSON.stringify(profile));
                }

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
            return { success: false, message };
        } finally {
            isAuthenticatingRef.current = false;
        }
    };

    const logout = async () => {
        try {
            // 1. Immediate redirect and UI reset for instant feedback
            if (typeof window !== "undefined") {
                localStorage.removeItem("nile_user_profile");
            }
            router.replace("/login");
            setUser(null);
            
            // 2. Clear TanStack Query cache
            queryClient.clear();
            
            // 3. Reset Zustand stores
            useFrontDeskStore.getState().resetForm();
            useLabStore.getState().resetAll();
            useRadiologyStore.getState().resetAll();
            useVitalsStore.getState().resetForm();
            useConsultationStore.getState().resetForm();
            usePharmacyStore.getState().resetForm();
            usePatientStore.getState().resetForm();
            useCacheStore.getState().clear();

            // Additional session stores
            useDischargeStore.getState().resetForm();
            useNurseChartsStore.getState().resetDrugForm();
            useNurseChartsStore.getState().resetFluidForm();
            useBulkUploadStore.getState().reset();
            useAppointmentStore.getState().resetForm();

            // 4. Perform session termination in background
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Logout error:", error);
            router.replace("/login");
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