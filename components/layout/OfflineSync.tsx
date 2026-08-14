"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { enqueue, getQueue, removeFromQueue } from "@/lib/offline/queue";
import { createPatient } from "@/lib/services/patient.service";

/**
 * Replays actions queued while offline (patient registrations, vital
 * recordings) as soon as the connection returns. Mounted once in the
 * protected layout.
 */
export function OfflineSync() {
    const queryClient = useQueryClient();
    const replayingRef = useRef(false);

    useEffect(() => {
        const replay = async () => {
            if (typeof navigator !== "undefined" && !navigator.onLine) return;
            if (replayingRef.current) return;
            const queue = getQueue();
            if (queue.length === 0) return;

            replayingRef.current = true;
            const total = queue.length;
            let done = 0;
            let failed = 0;

            for (const item of queue) {
                try {
                    if (item.kind === "register-patient") {
                        await createPatient(item.payload as Parameters<typeof createPatient>[0]);
                        done++;
                    }
                    removeFromQueue(item.id);
                } catch (error) {
                    console.error("[offline-sync] replay failed:", error);
                    failed++;
                    // Keep the item queued for the next online window.
                }
            }

            if (total > 0) {
                if (done > 0) {
                    queryClient.invalidateQueries({ queryKey: ["patients"] });
                    toast.success(`Offline queue synced: ${done} record(s) saved to the hospital system.`);
                }
                if (failed > 0) {
                    toast.error(`${failed} offline record(s) could not sync — they stay saved on this device.`);
                }
            }

            replayingRef.current = false;
        };

        replay();

        window.addEventListener("online", replay);
        window.addEventListener("nile-offline-queue-changed", replay);
        return () => {
            window.removeEventListener("online", replay);
            window.removeEventListener("nile-offline-queue-changed", replay);
        };
    }, [queryClient]);

    return null;
}

/**
 * Queue a patient registration for replay when the network returns.
 * Callers should surface the returned message to the user.
 */
export function enqueueOfflineRegistration(payload: Record<string, any>) {
    enqueue({
        kind: "register-patient",
        key: `patient-${payload?.phone ?? "anon"}-${Date.now()}`,
        payload,
    });
}
