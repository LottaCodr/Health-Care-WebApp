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
    const logoutInProgressRef = useRef(false);

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
        // Guard against double-clicks / concurrent calls (e.g., NavUser + Sidebar)
        if (logoutInProgressRef.current || isLoggingOut) return;
        logoutInProgressRef.current = true;

        // Show the overlay immediately for visual feedback
        setIsLoggingOut(true);

        /**
         * Purge every piece of persisted session / workflow state *optimistically*,
         * so the UI feels instant and the next login never sees the previous
         * user's data even if a network call hangs.
         */
        const clearClientState = () => {
            try {
                if (typeof window !== "undefined") {
                    // Supabase JS stores the session under `sb-<ref>-auth-token`
                    // (and legacy `sb:token`). Expire every matching key.
                    const lsKeysToRemove: string[] = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (!k) continue;
                        if (
                            k.startsWith("sb-") ||
                            k.startsWith("sb:") ||
                            k.includes("supabase") ||
                            k === "nile_user_profile" ||
                            k === "ui-store"
                        ) {
                            lsKeysToRemove.push(k);
                        }
                    }
                    lsKeysToRemove.forEach((k) => {
                        try {
                            localStorage.removeItem(k);
                        } catch {}
                    });
                    // Belt-and-suspenders for the two app keys we know about
                    try {
                        localStorage.removeItem("nile_user_profile");
                    } catch {}
                    try {
                        localStorage.removeItem("ui-store");
                    } catch {}

                    // SessionStorage may also hold a transient copy
                    try {
                        const ssKeys: string[] = [];
                        for (let i = 0; i < sessionStorage.length; i++) {
                            const k = sessionStorage.key(i);
                            if (!k) continue;
                            if (k.startsWith("sb-") || k.startsWith("sb:") || k.includes("supabase")) ssKeys.push(k);
                        }
                        ssKeys.forEach((k) => {
                            try {
                                sessionStorage.removeItem(k);
                            } catch {}
                        });
                    } catch {}

                    // Brute-force expire document.cookie entries for Supabase
                    // (covers cases where `supabase.auth.signOut()` hangs or the
                    // token was stored under a custom cookie name).
                    try {
                        if (typeof document !== "undefined" && document.cookie) {
                            document.cookie.split(";").forEach((c) => {
                                const eqPos = c.indexOf("=");
                                const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
                                if (!name) return;
                                if (name.startsWith("sb-") || name.startsWith("sb:") || name.includes("supabase")) {
                                    try {
                                        document.cookie = `${name}=; Max-Age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
                                        document.cookie = `${name}=; Max-Age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
                                    } catch {}
                                }
                            });
                        }
                    } catch {}
                }
            } catch {}

            setUser(null);

            try {
                queryClient.clear();
                // Cancel any in-flight fetches so they don't repopulate the cache
                // with the previous user's data after we've cleared it.
                queryClient.cancelQueries?.();
            } catch {}

            // Tear down any open Realtime channels so they don't leak after
            // the session is destroyed.
            try {
                // `removeAllChannels` is the fastest path; fall back to per-channel.
                const anySupabase = supabase as unknown as { removeAllChannels?: () => void };
                if (typeof anySupabase.removeAllChannels === "function") {
                    anySupabase.removeAllChannels();
                }
            } catch {}

            try {
                useFrontDeskStore.getState().resetForm();
                useLabStore.getState().resetAll();
                useRadiologyStore.getState().resetAll();
                useVitalsStore.getState().resetForm();
                useConsultationStore.getState().resetForm();
                usePharmacyStore.getState().resetForm();
                usePatientStore.getState().resetForm();
                useCacheStore.getState().clear();
                useDischargeStore.getState().resetForm();
                useNurseChartsStore.getState().resetDrugForm();
                useNurseChartsStore.getState().resetFluidForm();
                useAppointmentStore.getState().resetAll();
                useUserStore.getState().clearUser();
                useUIStore.setState({ sidebarOpen: true, darkMode: false });
                // Persist middleware writes `ui-store` synchronously after setState;
                // remove it again so the next mount starts clean.
                try {
                    localStorage.removeItem("ui-store");
                } catch {}
            } catch (err) {
                console.warn("[logout] store reset warning:", err);
            }
        };

        // Optimistic clear — user sees logged-out state instantly
        clearClientState();

        // Hard-navigate helper — guarantees the user leaves the protected page
        // even if `supabase.auth.signOut()` or `/api/auth/signout` hangs.
        let navigated = false;
        const hardNavigate = () => {
            if (navigated) return;
            navigated = true;
            if (typeof window !== "undefined") {
                // `replace` avoids pushing a history entry the user could "Back" into.
                window.location.replace("/login");
                // Fallback if the first replace was blocked (rare popup-blocker case)
                setTimeout(() => {
                    if (window.location.pathname !== "/login") {
                        window.location.href = "/login";
                    }
                }, 200);
                // If for any reason we're still on the page after 3s, drop the overlay
                // so the user isn't stuck behind an invisible modal.
                setTimeout(() => setIsLoggingOut(false), 3000);
            } else {
                router.replace("/login");
                setIsLoggingOut(false);
            }
            logoutInProgressRef.current = false;
        };

        // Safety net: never keep the overlay longer than 2.8s
        const fallbackTimer = setTimeout(hardNavigate, 2800);

        try {
            // 1. Browser Supabase session — race with a timeout so a stalled
            //    network (or the placeholder env) can't block the flow.
            try {
                await Promise.race([
                    (async () => {
                        try {
                            // `global` revokes refresh tokens server-side; fall back to `local`
                            await (supabase.auth.signOut as unknown as (opts?: { scope: string }) => Promise<unknown>)({ scope: "global" });
                        } catch {
                            try {
                                await supabase.auth.signOut();
                            } catch {}
                        }
                    })(),
                    new Promise<void>((resolve) => setTimeout(resolve, 1500)),
                ]);
            } catch {}

            // 2. Server-side cookie clear — POST to the Route Handler which
            //    expires httpOnly cookies via the `Set-Cookie` header. This is
            //    required because `proxy.ts` reads cookies on the server.
            try {
                await Promise.race([
                    fetch("/api/auth/signout", {
                        method: "POST",
                        credentials: "include",
                        cache: "no-store",
                    })
                        .then(() => undefined)
                        .catch(() => undefined),
                    new Promise<void>((resolve) => setTimeout(resolve, 1200)),
                ]);
            } catch {}
        } catch (error) {
            console.error("[logout] error (continuing to login):", error);
        } finally {
            clearTimeout(fallbackTimer);
            // Small grace period lets cookie-expiry Set-Cookie propagate before
            // the hard reload, without noticeably slowing the UX.
            setTimeout(hardNavigate, 400);
        }
    }, [queryClient, router, isLoggingOut]);

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