// ══════════════════════════════════════════════════════════════════════════════
// FILE: hooks/use-realtime.ts
// Supabase Realtime WebSocket hooks for live updates across all staff screens
// ══════════════════════════════════════════════════════════════════════════════
"use client";

import { useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import supabase from "@/utils/supabase/client";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface TableWatchConfig {
    table:    string;
    event?:   RealtimeEvent;
    filter?:  string;              // e.g. "patient_id=eq.123"
    queryKeys: string[][];         // TanStack Query keys to invalidate
    onEvent?: (payload: any) => void;
}

// ─── Core hook — watch any table ─────────────────────────────────────────────

export function useRealtimeTable({
    table, event = "*", filter, queryKeys, onEvent,
}: TableWatchConfig) {
    const queryClient = useQueryClient();
    const channelRef  = useRef<any>(null);

    useEffect(() => {
        const channelName = `${table}-${event}-${filter ?? "all"}-${Math.random()}`;

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
            .subscribe();

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

    useEffect(() => {
        const channel = supabase
            .channel("frontdesk-live")
            .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["patients"] });
                queryClient.invalidateQueries({ queryKey: ["patients-by-status"] });

                if (payload.eventType === "INSERT") {
                    toast.info(`New patient registered: ${payload.new?.name}`);
                } else if (payload.eventType === "UPDATE" && payload.new?.status !== payload.old?.status) {
                    toast.info(`${payload.new?.name} → ${payload.new?.status?.replace(/-/g, " ")}`);
                }
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["payments"] });
                queryClient.invalidateQueries({ queryKey: ["pending-payments"] });

                if (payload.eventType === "INSERT") {
                    toast.info("New payment pending confirmation.");
                } else if (payload.eventType === "UPDATE" && payload.new?.status === "paid") {
                    toast.success("Payment confirmed — patient discharged.");
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [queryClient]);
}

// ─── Doctor — patients + consultations ───────────────────────────────────────

export function useDoctorRealtime() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = supabase
            .channel("doctor-live")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "patients" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["patients"] });
                queryClient.invalidateQueries({ queryKey: ["patients-by-status"] });
                toast.info(`New patient in queue: ${payload.new?.name}`);
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "patients" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["patients"] });
                queryClient.invalidateQueries({ queryKey: ["patients-by-status"] });

                if (payload.new?.status === "awaiting-consultation") {
                    toast.info(`${payload.new?.name} is awaiting consultation.`);
                }
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "consultations" }, () => {
                queryClient.invalidateQueries({ queryKey: ["consultations"] });
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "lab_requests" }, () => {
                queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [queryClient]);
}

// ─── Nurse — nursing actions + patients ──────────────────────────────────────

export function useNurseRealtime() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = supabase
            .channel("nurse-live")
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "patients" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["patients"] });
                queryClient.invalidateQueries({ queryKey: ["patients-by-status"] });

                if (payload.new?.status === "sent-to-nurse") {
                    toast.info(`${payload.new?.name} has been sent to nursing.`);
                }
            })
            .on("postgres_changes", { event: "*", schema: "public", table: "nursing_actions" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["nursing-actions"] });

                if (payload.eventType === "INSERT") {
                    toast.info("New nursing task assigned.");
                } else if (payload.eventType === "UPDATE" && payload.new?.status === "Completed") {
                    toast.success("Nursing task completed.");
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [queryClient]);
}

// ─── Lab Tech — lab requests ──────────────────────────────────────────────────

export function useLabTechRealtime() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = supabase
            .channel("labtech-live")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "lab_requests" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
                queryClient.invalidateQueries({ queryKey: ["pending-lab-requests"] });

                const testType = payload.new?.test_type ?? "Lab test";
                if (!String(testType).startsWith("[RADIOLOGY]")) {
                    toast.info(`New lab request: ${testType}`);
                }
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lab_requests" }, () => {
                queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
                queryClient.invalidateQueries({ queryKey: ["pending-lab-requests"] });
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [queryClient]);
}

// ─── Radiologist — radiology requests ────────────────────────────────────────

export function useRadiologistRealtime() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = supabase
            .channel("radiologist-live")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "lab_requests" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
                queryClient.invalidateQueries({ queryKey: ["pending-lab-requests"] });

                const testType = payload.new?.test_type ?? "";
                if (String(testType).startsWith("[RADIOLOGY]")) {
                    const clean = testType.replace(/^\[RADIOLOGY\]\s*/, "");
                    toast.info(`New radiology request: ${clean}`);
                }
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "lab_requests" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["lab-requests"] });
                if (String(payload.new?.test_type ?? "").startsWith("[RADIOLOGY]") && payload.new?.status === "completed") {
                    toast.success("Radiology report submitted.");
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [queryClient]);
}

// ─── Pharmacist — prescriptions + drug inventory ─────────────────────────────

export function usePharmacistRealtime() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const channel = supabase
            .channel("pharmacist-live")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "prescriptions" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
                queryClient.invalidateQueries({ queryKey: ["pending-prescriptions"] });
                toast.info(`New prescription: ${payload.new?.drug_name}`);
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "prescriptions" }, () => {
                queryClient.invalidateQueries({ queryKey: ["prescriptions"] });
                queryClient.invalidateQueries({ queryKey: ["pending-prescriptions"] });
            })
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "drug_inventory" }, (payload: any) => {
                queryClient.invalidateQueries({ queryKey: ["drug-inventory"] });
                const item = payload.new;
                if (item?.quantity <= item?.reorder_level && item?.quantity > 0) {
                    toast.warning(`Low stock: ${item.drug_name} (${item.quantity} ${item.unit} left)`);
                } else if (item?.quantity === 0) {
                    toast.error(`Out of stock: ${item?.drug_name}`);
                }
            })
            .subscribe();

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
            .subscribe();

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

    useEffect(() => {
        if (!role) return;

        const ROLE_TABLE_MAP: Record<string, { table: string; keys: string[] }[]> = {
            Frontdesk: [
                { table: "patients",  keys: ["patients", "patients-by-status"] },
                { table: "payments",  keys: ["payments", "pending-payments"]    },
            ],
            Doctor: [
                { table: "patients",      keys: ["patients", "patients-by-status"] },
                { table: "consultations", keys: ["consultations"]                  },
                { table: "lab_requests",  keys: ["lab-requests"]                   },
            ],
            Nurse: [
                { table: "patients",        keys: ["patients", "patients-by-status"] },
                { table: "nursing_actions", keys: ["nursing-actions"]                },
            ],
            Labtech: [
                { table: "lab_requests", keys: ["lab-requests", "pending-lab-requests"] },
            ],
            Radiologist: [
                { table: "lab_requests", keys: ["lab-requests", "pending-lab-requests"] },
            ],
            Pharmacist: [
                { table: "prescriptions",  keys: ["prescriptions", "pending-prescriptions"] },
                { table: "drug_inventory", keys: ["drug-inventory"]                         },
            ],
            Admin: [
                { table: "patients",        keys: ["patients"]          },
                { table: "consultations",   keys: ["consultations"]     },
                { table: "prescriptions",   keys: ["prescriptions"]     },
                { table: "lab_requests",    keys: ["lab-requests"]      },
                { table: "payments",        keys: ["payments"]          },
                { table: "nursing_actions", keys: ["nursing-actions"]   },
                { table: "drug_inventory",  keys: ["drug-inventory"]    },
            ],
        };

        const tables = ROLE_TABLE_MAP[role] ?? [];
        if (!tables.length) return;

        const channel = supabase.channel(`${role.toLowerCase()}-realtime`);

        tables.forEach(({ table }) => {
            channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload: any) => {
                const entry = tables.find(t => t.table === table);
                entry?.keys.forEach(key => {
                    queryClient.invalidateQueries({ queryKey: [key] });
                });

                // Smart toast messages
                if (table === "patients" && payload.eventType === "UPDATE") {
                    const status = payload.new?.status;
                    const name   = payload.new?.name ?? "Patient";
                    const roleRoutes: Record<string, string[]> = {
                        Frontdesk:  ["registered", "awaiting-payment", "discharged"],
                        Doctor:     ["awaiting-consultation"],
                        Nurse:      ["sent-to-nurse"],
                        Labtech:    ["sent-to-lab"],
                        Radiologist:["sent-to-radiology"],
                        Pharmacist: ["sent-to-pharmacy"],
                    };
                    if (roleRoutes[role]?.includes(status)) {
                        toast.info(`${name} → ${status.replace(/-/g, " ")}`);
                    }
                }
                if (table === "lab_requests" && payload.eventType === "INSERT" && role === "Labtech") {
                    const t = payload.new?.test_type ?? "";
                    if (!t.startsWith("[RADIOLOGY]")) toast.info(`New lab request: ${t}`);
                }
                if (table === "lab_requests" && payload.eventType === "INSERT" && role === "Radiologist") {
                    const t = payload.new?.test_type ?? "";
                    if (t.startsWith("[RADIOLOGY]")) toast.info(`New radiology request: ${t.replace(/^\[RADIOLOGY\]\s*/, "")}`);
                }
                if (table === "prescriptions" && payload.eventType === "INSERT" && role === "Pharmacist") {
                    toast.info(`New prescription: ${payload.new?.drug_name}`);
                }
                if (table === "drug_inventory" && payload.eventType === "UPDATE" && role === "Pharmacist") {
                    const item = payload.new;
                    if (item?.quantity === 0) toast.error(`Out of stock: ${item?.drug_name}`);
                    else if (item?.quantity <= item?.reorder_level) toast.warning(`Low stock: ${item?.drug_name} (${item?.quantity} left)`);
                }
                if (table === "nursing_actions" && payload.eventType === "INSERT" && role === "Nurse") {
                    toast.info("New nursing task assigned.");
                }
            });
        });

        channel.subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [role, queryClient]);
}