// ══════════════════════════════════════════════════════════════════════════════
// FILE: hooks/use-realtime.ts
// Supabase Realtime WebSocket hooks for live updates across all staff screens
// ══════════════════════════════════════════════════════════════════════════════
"use client";

import { useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import supabase from "@/utils/supabase/client";
import { toast } from "sonner";
import { useNetworkStore } from "@/store/network-store";
import { isBrowserOnline } from "@/lib/utils/network";

// ─── Types ────────────────────────────────────────────────────────────────────

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface TableWatchConfig {
    table:    string;
    event?:   RealtimeEvent;
    filter?:  string;              // e.g. "patient_id=eq.123"
    queryKeys: string[][];         // TanStack Query keys to invalidate
    onEvent?: (payload: any) => void;
}

// ─── Notification preferences ────────────────────────────────────────────────
// The Settings page persists these in the Auth user's `user_metadata.notification_prefs`.
// `shouldNotify()` gates NON-CRITICAL in-app toasts; critical alerts (stock
// levels, confirmed payments) intentionally bypass it so nobody misses them.
// Fail-open: before prefs load (or when a channel is missing), toasts show.

type NotificationChannel = "email" | "sms" | "push";

interface NotificationPrefs {
    email: boolean;
    sms: boolean;
    push: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { email: true, sms: false, push: true };

let notificationPrefs: NotificationPrefs = DEFAULT_NOTIFICATION_PREFS;

function parseNotificationPrefs(user: any): NotificationPrefs {
    const stored = user?.user_metadata?.notification_prefs;
    return {
        email: typeof stored?.email === "boolean" ? stored.email : DEFAULT_NOTIFICATION_PREFS.email,
        sms:   typeof stored?.sms   === "boolean" ? stored.sms   : DEFAULT_NOTIFICATION_PREFS.sms,
        push:  typeof stored?.push  === "boolean" ? stored.push  : DEFAULT_NOTIFICATION_PREFS.push,
    };
}

/** Gate for routine toasts — respects the user's In-App notification pref. */
function shouldNotify(channel: NotificationChannel = "push"): boolean {
    return notificationPrefs[channel];
}

/** (Re)load the current user's notification prefs into the cache. */
export async function refreshNotificationPrefs(): Promise<void> {
    try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) notificationPrefs = parseNotificationPrefs(data.user);
    } catch {
        // fail-open: keep showing notifications
    }
}

/**
 * Loads prefs on mount and re-syncs on every Supabase auth event (e.g.
 * USER_UPDATED fires when the Settings page saves new preferences, so toasts
 * respect the new choice immediately).
 */
function useNotificationPrefs() {
    useEffect(() => {
        refreshNotificationPrefs();
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            refreshNotificationPrefs();
        });
        return () => subscription.unsubscribe();
    }, []);
}

// ─── Realtime connection status handling ─────────────────────────────────────
// Supabase Realtime reconnects automatically, but on poor networks channels
// can flap between SUBSCRIBED / CHANNEL_ERROR / CLOSED. We surface that state
// (banner + throttled toasts) instead of silently dropping live updates.

let realtimeWarnedAt = 0;
let realtimeWasDown = false;

function handleChannelStatus(status: string, label: string) {
    const connected = status === "SUBSCRIBED";
    useNetworkStore.getState().setRealtimeConnected(connected);

    if (connected) {
        if (realtimeWasDown) {
            realtimeWasDown = false;
            toast.success("Live updates restored.");
        }
        return;
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        const now = Date.now();
        // Throttle to one warning per 10s so a flapping connection doesn't
        // toast-spam the user.
        if (isBrowserOnline() && now - realtimeWarnedAt > 10_000) {
            realtimeWarnedAt = now;
            realtimeWasDown = true;
            toast.warning("Live updates disconnected — reconnecting…");
        }
        if (!isBrowserOnline()) {
            realtimeWasDown = true;
        }
    }
}

// ─── Core hook — watch any table ─────────────────────────────────────────────

export function useRealtimeTable({
    table, event = "*", filter, queryKeys, onEvent,
}: TableWatchConfig) {
    const queryClient = useQueryClient();
    const channelRef  = useRef<any>(null);

    useEffect(() => {
        // Stable channel name per config — a random suffix created duplicate
        // channels on every effect re-run, multiplying WebSocket traffic
        // (painful on slow connections).
        const channelName = `watch-${table}-${event}-${filter ?? "all"}`;

        const config: any = {
            event,
            schema: "public",
            table,
        };
        if (filter) config.filter = filter;

        channelRef.current = supabase
            .channel(channelName)
            .on("postgres_changes", config, (payload: any) => {
                // Invalidate all related query keys so TanStack refetches
                queryKeys.forEach((key) => {
                    queryClient.invalidateQueries({ queryKey: key });
                });
                onEvent?.(payload);
            })
            .subscribe((status: string) => {
                // Report connection state to the global network store so the
                // banner can show "connecting…" while the channel is down.
                useNetworkStore.getState().setRealtimeConnected(status === "SUBSCRIBED");
                if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
                    console.warn(`[realtime] channel ${channelName} ${status} — will retry`);
                }
            });

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [table, event, filter]);
}

// ══════════════════════════════════════════════════════════════════════════════
// ROLE-SPECIFIC HOOKS
// Each hook subscribes to the tables relevant to that role
// ══════════════════════════════════════════════════════════════════════════════

// ─── Front Desk — patients + payments ────────────────────────────────────────

export function useFrontDeskRealtime() {
    const queryClient = useQueryClient();
    useNotificationPrefs();

    useEffect(() => {
        const channel = supabase
            .channel("frontdesk-live")
            .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["patients"] });
                queryClient.invalidateQueries({ queryKey: ["patients-by-status"] });

                if (payload.eventType === "INSERT" && shouldNotify()) {
                    toast.info(`New patient registered: ${payload.new?.name}`);
                } else if (payload.eventType === "UPDATE" && payload.new?.status !== payload.old?.status && shouldNotify()) {
                    toast.info(`${payload.new?.name} → ${payload.new?.status?.replace(/-/g, " ")}`);
                }
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["payments"] });
                queryClient.invalidateQueries({ queryKey: ["payments", "pending"] });

                if (payload.eventType === "INSERT" && shouldNotify()) {
                    toast.info("New payment pending confirmation.");
                } else if (payload.eventType === "UPDATE" && payload.new?.status === "paid") {
                    // CRITICAL — always on: confirmed payments gate billing/discharge.
                    toast.success("Payment confirmed — patient discharged.");
                }
            })
            .subscribe((status: string) => handleChannelStatus(status, "frontdesk-live"));

        return () => { supabase.removeChannel(channel); };
    }, [queryClient]);
}

// ─── Doctor — patients + consultations ───────────────────────────────────────

export function useDoctorRealtime() {
    const queryClient = useQueryClient();
    useNotificationPrefs();

    useEffect(() => {
        const channel = supabase
            .channel("doctor-live")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "patients" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["patients"] });
                queryClient.invalidateQueries({ queryKey: ["patients-by-status"] });
                if (shouldNotify()) toast.info(`New patient in queue: ${payload.new?.name}`);
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "patients" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["patients"] });
                queryClient.invalidateQueries({ queryKey: ["patients-by-status"] });

                if (payload.new?.status === "awaiting-consultation" && shouldNotify()) {
                    toast.info(`${payload.new?.name} is awaiting consultation.`);
                }
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "consultations" }, () => {
                queryClient.invalidateQueries({ queryKey: ["consultations"] });
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "lab_requests" }, () => {
                queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
            })
            .subscribe((status: string) => handleChannelStatus(status, "doctor-live"));

        return () => { supabase.removeChannel(channel); };
    }, [queryClient]);
}

// ─── Nurse — nursing actions + patients ──────────────────────────────────────

export function useNurseRealtime() {
    const queryClient = useQueryClient();
    useNotificationPrefs();

    useEffect(() => {
        const channel = supabase
            .channel("nurse-live")
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "patients" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["patients"] });
                queryClient.invalidateQueries({ queryKey: ["patients-by-status"] });

                if (payload.new?.status === "sent-to-nurse" && shouldNotify()) {
                    toast.info(`${payload.new?.name} has been sent to nursing.`);
                }
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "nursing_actions" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["nursing-actions"] });

                if (payload.eventType === "INSERT" && shouldNotify()) {
                    toast.info("New nursing task assigned.");
                } else if (payload.eventType === "UPDATE" && payload.new?.status === "Completed" && shouldNotify()) {
                    toast.success("Nursing task completed.");
                }
            })
            .subscribe((status: string) => handleChannelStatus(status, "nurse-live"));

        return () => { supabase.removeChannel(channel); };
    }, [queryClient]);
}

// ─── Lab Tech — lab requests ──────────────────────────────────────────────────

export function useLabTechRealtime() {
    const queryClient = useQueryClient();
    useNotificationPrefs();

    useEffect(() => {
        const channel = supabase
            .channel("labtech-live")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "lab_requests" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
                queryClient.invalidateQueries({ queryKey: ["pending-lab-requests"] });

                const testType = payload.new?.test_type ?? "Lab test";
                if (!String(testType).startsWith("[RADIOLOGY]") && shouldNotify()) {
                    toast.info(`New lab request: ${testType}`);
                }
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lab_requests" }, () => {
                queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
                queryClient.invalidateQueries({ queryKey: ["pending-lab-requests"] });
            })
            .subscribe((status: string) => handleChannelStatus(status, "labtech-live"));

        return () => { supabase.removeChannel(channel); };
    }, [queryClient]);
}

// ─── Radiologist — radiology requests ────────────────────────────────────────

export function useRadiologistRealtime() {
    const queryClient = useQueryClient();
    useNotificationPrefs();

    useEffect(() => {
        const channel = supabase
            .channel("radiologist-live")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "lab_requests" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
                queryClient.invalidateQueries({ queryKey: ["pending-lab-requests"] });

                const testType = payload.new?.test_type ?? "";
                if (String(testType).startsWith("[RADIOLOGY]") && shouldNotify()) {
                    const clean = testType.replace(/^\[RADIOLOGY\]\s*/, "");
                    toast.info(`New radiology request: ${clean}`);
                }
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lab_requests" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
                if (String(payload.new?.test_type ?? "").startsWith("[RADIOLOGY]") && payload.new?.status === "completed" && shouldNotify()) {
                    toast.success("Radiology report submitted.");
                }
            })
            .subscribe((status: string) => handleChannelStatus(status, "radiologist-live"));

        return () => { supabase.removeChannel(channel); };
    }, [queryClient]);
}

// ─── Pharmacist — prescriptions + drug inventory ─────────────────────────────

export function usePharmacistRealtime() {
    const queryClient = useQueryClient();
    useNotificationPrefs();

    useEffect(() => {
        const channel = supabase
            .channel("pharmacist-live")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "prescriptions" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
                queryClient.invalidateQueries({ queryKey: ["pending-prescriptions"] });
                if (shouldNotify()) toast.info(`New prescription: ${payload.new?.drug_name}`);
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "prescriptions" }, () => {
                queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
                queryClient.invalidateQueries({ queryKey: ["pending-prescriptions"] });
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "drug_inventory" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["drug-inventory"] });
                const item = payload.new;
                // CRITICAL — always on: stock-outs block dispensing entirely.
                if (item?.quantity <= item?.reorder_level && item?.quantity > 0) {
                    toast.warning(`Low stock: ${item.drug_name} (${item.quantity} ${item.unit} left)`);
                } else if (item?.quantity === 0) {
                    toast.error(`Out of stock: ${item?.drug_name}`);
                }
            })
            .subscribe((status: string) => handleChannelStatus(status, "pharmacist-live"));

        return () => { supabase.removeChannel(channel); };
    }, [queryClient]);
}

// ─── Admin — everything ───────────────────────────────────────────────────────

export function useAdminRealtime() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = supabase
            .channel("admin-live")
            .on("postgres_changes", { event: "*", schema: "public", table: "patients" },       () => { queryClient.invalidateQueries({ queryKey: ["patients"] }); })
            .on("postgres_changes", { event: "*", schema: "public", table: "consultations" },  () => { queryClient.invalidateQueries({ queryKey: ["consultations"] }); })
            .on("postgres_changes", { event: "*", schema: "public", table: "prescriptions" },  () => { queryClient.invalidateQueries({ queryKey: ["prescriptions"] }); })
            .on("postgres_changes", { event: "*", schema: "public", table: "lab_requests" },   () => { queryClient.invalidateQueries({ queryKey: ["lab-requests"] }); })
            .on("postgres_changes", { event: "*", schema: "public", table: "payments" },       () => { queryClient.invalidateQueries({ queryKey: ["payments"] }); })
            .on("postgres_changes", { event: "*", schema: "public", table: "nursing_actions"}, () => { queryClient.invalidateQueries({ queryKey: ["nursing-actions"] }); })
            .on("postgres_changes", { event: "*", schema: "public", table: "drug_inventory" }, () => { queryClient.invalidateQueries({ queryKey: ["drug-inventory"] }); })
            .subscribe((status: string) => handleChannelStatus(status, "admin-live"));

        return () => { supabase.removeChannel(channel); };
    }, [queryClient]);
}

// ══════════════════════════════════════════════════════════════════════════════
// MASTER HOOK — auto-selects the right subscriptions based on role
// Use this in PremiumLayout.tsx — one hook handles everything
// ══════════════════════════════════════════════════════════════════════════════

export function useRoleRealtime(role?: string) {
    // Each is a no-op if role doesn't match — React rules of hooks require
    // calling all hooks unconditionally, so we pass 'enabled' flag internally
    const queryClient = useQueryClient();
    useNotificationPrefs();

    useEffect(() => {
        if (!role) return;

        const ROLE_TABLE_MAP: Record<string, { table: string; keys: readonly unknown[][] }[]> = {
            FrontDesk: [
                { table: "patients",     keys: [["patients"]] },
                { table: "payments",     keys: [["payments"]] },
                { table: "appointments", keys: [["appointments"]] },
            ],
            Doctor: [
                { table: "patients",      keys: [["patients"]] },
                { table: "consultations", keys: [["consultations"]] },
                { table: "lab_requests",  keys: [["lab"], ["radiology"]] },
                { table: "appointments",  keys: [["appointments"]] },
            ],
            Nurse: [
                { table: "patients",        keys: [["patients"]] },
                { table: "nursing_actions", keys: [["nursing"]] },
            ],
            LabTechnician: [
                { table: "lab_requests", keys: [["lab"]] },
            ],
            Radiologist: [
                { table: "lab_requests", keys: [["radiology"]] },
            ],
            Pharmacist: [
                { table: "prescriptions",  keys: [["pharmacy", "prescriptions"]] },
                { table: "drug_inventory", keys: [["pharmacy", "inventory"]] },
            ],
            Admin: [
                { table: "patients",        keys: [["patients"]] },
                { table: "consultations",   keys: [["consultations"]] },
                { table: "prescriptions",   keys: [["pharmacy", "prescriptions"]] },
                { table: "lab_requests",    keys: [["lab"], ["radiology"]] },
                { table: "payments",        keys: [["payments"]] },
                { table: "nursing_actions", keys: [["nursing"]] },
                { table: "drug_inventory",  keys: [["pharmacy", "inventory"]] },
                { table: "appointments",    keys: [["appointments"]] },
            ],
        };

        const tables = ROLE_TABLE_MAP[role] ?? [];
        if (!tables.length) return;

        const channel = supabase.channel(`${role.toLowerCase()}-realtime`);

        tables.forEach(({ table }) => {
            channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload: any) => {
                const entry = tables.find(t => t.table === table);
                entry?.keys.forEach(queryKey => {
                    queryClient.invalidateQueries({ queryKey });
                });

                // Smart toast messages (non-critical — respect the user's
                // In-App notification pref; critical alerts below bypass it)
                if (table === "patients" && payload.eventType === "UPDATE") {
                    const status = payload.new?.status;
                    const name   = payload.new?.name ?? "Patient";
                    const roleRoutes: Record<string, string[]> = {
                        FrontDesk:    ["registered", "awaiting-payment", "discharged"],
                        Doctor:       ["awaiting-consultation"],
                        Nurse:        ["sent-to-nurse"],
                        LabTechnician:["sent-to-lab"],
                        Radiologist:  ["sent-to-radiology"],
                        Pharmacist:   ["sent-to-pharmacy"],
                    };
                    if (roleRoutes[role]?.includes(status) && shouldNotify()) {
                        toast.info(`${name} → ${status.replace(/-/g, " ")}`);
                    }
                }
                if (table === "lab_requests" && payload.eventType === "INSERT" && role === "LabTechnician") {
                    const t = payload.new?.test_type ?? "";
                    if (!t.startsWith("[RADIOLOGY]") && shouldNotify()) toast.info(`New lab request: ${t}`);
                }
                if (table === "lab_requests" && payload.eventType === "INSERT" && role === "Radiologist") {
                    const t = payload.new?.test_type ?? "";
                    if (t.startsWith("[RADIOLOGY]") && shouldNotify()) toast.info(`New radiology request: ${t.replace(/^\[RADIOLOGY\]\s*/, "")}`);
                }
                if (table === "prescriptions" && payload.eventType === "INSERT" && role === "Pharmacist") {
                    if (shouldNotify()) toast.info(`New prescription: ${payload.new?.drug_name}`);
                }
                if (table === "drug_inventory" && payload.eventType === "UPDATE" && role === "Pharmacist") {
                    const item = payload.new;
                    // CRITICAL — always on: stock-outs block dispensing.
                    if (item?.quantity === 0) toast.error(`Out of stock: ${item?.drug_name}`);
                    else if (item?.quantity <= item?.reorder_level) toast.warning(`Low stock: ${item?.drug_name} (${item?.quantity} left)`);
                }
                if (table === "nursing_actions" && payload.eventType === "INSERT" && role === "Nurse") {
                    if (shouldNotify()) toast.info("New nursing task assigned.");
                }
            });
        });

        channel.subscribe((status: string) => handleChannelStatus(status, `${role.toLowerCase()}-realtime`));
        return () => { supabase.removeChannel(channel); };
    }, [role, queryClient]);
}
