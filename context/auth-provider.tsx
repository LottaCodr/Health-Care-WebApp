"use client";

import { createContext, useContext, useEffect, useState, useMemo, useRef, useCallback } from "react";
import supabase from "@/utils/supabase/client";
import { fetchStaffProfile } from "@/actions/staff/staff";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useFrontDeskStore } from "@/store/frontdesk-store";
import { useLabStore } from "@/store/lab-store";
import { useDischargeStore } from "@/store/discharge-store";
import { useNurseChartsStore } from "@/store/nurse-chart-store";
import { useAppointmentStore } from "@/store/appoointment-store";
import { useRadiologyStore } from "@/store/radiology-store";
import { useVitalsStore } from "@/store/vitals-store";
import { useConsultationStore } from "@/store/consultation-store";
import { usePharmacyStore } from "@/store/pharmacy-store";
import { usePatientStore } from "@/store/patient-store";
import { useCacheStore, useUserStore, useUIStore } from "@/store/store";
import { LogoutOverlay } from "@/components/layout/LogoutOverlay";
import { normalizeUserRole } from "@/lib/roles";

interface AuthContextType {
    user: any | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    loading?: boolean; // legacy alias used across components
    isLoggingOut: boolean;
    login: (
        email: string,
        password: string
    ) => Promise<{ success: boolean; message: string; staff?: any }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function buildStaffProfile(authUser: any, profile: any) {
    if (!profile) return null;
    return {
        ...profile,
        $id: profile.id || profile.$id || authUser?.id,
        role: normalizeUserRole(profile.role),
    };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const queryClient = useQueryClient();
    const isAuthenticatingRef = useRef(false);

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
                    const profile = buildStaffProfile(authUser, staff?.profile);
                    const validProfile = profile?.role ? profile : null;
                    setUser(validProfile);
                    if (typeof window !== "undefined" && validProfile) {
                        localStorage.setItem("nile_user_profile", JSON.stringify(validProfile));
                    } else if (typeof window !== "undefined") {
                        localStorage.removeItem("nile_user_profile");
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
                    const profile = buildStaffProfile(authUser, staff?.profile);
                    const validProfile = profile?.role ? profile : null;
                    setUser(validProfile);
                    if (typeof window !== "undefined" && validProfile) {
                        localStorage.setItem("nile_user_profile", JSON.stringify(validProfile));
                    } else if (typeof window !== "undefined") {
                        localStorage.removeItem("nile_user_profile");
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

    const login = useCallback(async (email: string, password: string) => {
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

                const profile = buildStaffProfile(data.user, staffResult.profile);
                if (!profile?.role) {
                    await supabase.auth.signOut();
                    return {
                        success: false,
                        message: "This staff account has an unsupported role. Please contact an administrator.",
                    };
                }
                setUser(profile);
                if (typeof window !== "undefined" && profile) {
                    localStorage.setItem("nile_user_profile", JSON.stringify(profile));
                }

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
    }, []);

    const logout = useCallback(async () => {
        // Show the logout overlay immediately for visual feedback
        setIsLoggingOut(true);

        try {
            // 1. Terminate Supabase session FIRST — this clears auth cookies
            //    so the server-side proxy won't redirect back to the dashboard.
            await supabase.auth.signOut();

            // 2. Clear persisted and in-memory state
            if (typeof window !== "undefined") {
                localStorage.removeItem("nile_user_profile");
            }
            setUser(null);

            // 3. Clear TanStack Query cache
            queryClient.clear();

            // 4. Reset Zustand stores
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
            useAppointmentStore.getState().resetAll();

            // Reset user and UI stores (persisted to localStorage)
            useUserStore.getState().clearUser();
            useUIStore.setState({ sidebarOpen: true, darkMode: false });

            // 5. Navigate to login — safe now that cookies are cleared
            router.replace("/login");
        } catch (error) {
            console.error("Logout error:", error);
            // Fallback: still try to send them to login
            setUser(null);
            router.replace("/login");
        } finally {
            // Always clear the overlay flag, otherwise the LogoutOverlay stays
            // mounted (and blocks the screen) on the login page if navigation
            // fails or if signOut errors after the flag was set.
            setIsLoggingOut(false);
        }
    }, [queryClient, router]);

    const contextValue: AuthContextType = useMemo(
        () => ({
            user,
            isAuthenticated: !!user,
            isLoading,
            loading: isLoading,
            isLoggingOut,
            login,
            logout,
        }),
        [user, isLoading, isLoggingOut, login, logout]
    );

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
            {isLoggingOut && <LogoutOverlay />}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
};