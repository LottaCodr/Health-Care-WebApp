"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { radiologyKeys, patientKeys } from "../query-keys";
import * as RS from "@/lib/services/radiology.service";

const LIST_STALE = 30_000;
const GC_TIME = 10 * 60_000;

// ─── Queries ──────────────────────────────────────────────────────────────────

/** All pending radiology requests — for the Radiologist dashboard queue */
export function usePendingRadiologyRequests() {
    return useQuery({
        queryKey: radiologyKeys.pending(),
        queryFn: RS.listPendingRadiologyRequests,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
        refetchInterval: 60_000,   // auto-refresh every 60s; radiologist queue is live
    });
}

/** Completed radiology requests — for the "Completed Reports" section */
export function useCompletedRadiologyRequests() {
    return useQuery({
        queryKey: radiologyKeys.completed(),
        queryFn: RS.listCompletedRadiologyRequests,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

/** All radiology requests for a specific patient — for the patient detail tab */
export function useRadiologyRequestsByPatient(
    patientId: string,
    opts?: { enabled?: boolean }
) {
    return useQuery({
        queryKey: radiologyKeys.byPatient(patientId),
        queryFn: () => RS.listRadiologyRequestsByPatient(patientId),
        enabled: !!patientId && opts?.enabled !== false,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

/** Single radiology request by ID */
export function useRadiologyRequest(id: string) {
    return useQuery({
        queryKey: radiologyKeys.detail(id),
        queryFn: () => RS.getRadiologyRequestById(id),
        enabled: !!id,
        staleTime: 60_000,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Doctor creates a radiology request for a patient */
export function useCreateRadiologyRequest() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (input: RS.CreateRadiologyRequestInput) =>
            RS.createRadiologyRequest(input),

        onSuccess: (request) => {
            qc.setQueryData(radiologyKeys.detail(request.id), request);
            // Bust the patient's radiology list and the pending queue
            qc.invalidateQueries({ queryKey: radiologyKeys.byPatient(request.visit_id) });
            qc.invalidateQueries({ queryKey: radiologyKeys.pending() });
            // Patient status likely changed (sent-to-radiology)
            qc.invalidateQueries({ queryKey: patientKeys.lists() });
        },
    });
}

/** Radiologist submits a completed report — optimistic status flip */
export function useSubmitRadiologyReport() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({
            id,
            report,
        }: {
            id: string;
            report: RS.SubmitRadiologyReportInput;
        }) => RS.submitRadiologyReport(id, report),

        // Optimistic: move the request from pending to completed in the UI immediately
        onMutate: async ({ id }) => {
            await qc.cancelQueries({ queryKey: radiologyKeys.pending() });

            const previousPending = qc.getQueryData(radiologyKeys.pending());
            const previousCompleted = qc.getQueryData(radiologyKeys.completed());

            // Remove from pending list
            qc.setQueryData<any[]>(radiologyKeys.pending(),
                (old = []) => old.filter(r => r.id !== id)
            );

            return { previousPending, previousCompleted, id };
        },

        onError: (_err, _vars, ctx) => {
            // Roll back both caches on failure
            if (ctx?.previousPending) {
                qc.setQueryData(radiologyKeys.pending(), ctx.previousPending);
            }
            if (ctx?.previousCompleted) {
                qc.setQueryData(radiologyKeys.completed(), ctx.previousCompleted);
            }
        },

        onSuccess: (updated) => {
            // Seed the detail cache with the returned record
            qc.setQueryData(radiologyKeys.detail(updated.id), updated);

            // Add to the completed list inline (no extra request)
            qc.setQueryData<any[]>(radiologyKeys.completed(), (old = []) =>
                [updated, ...old]
            );

            // Bust the patient's radiology tab
            qc.invalidateQueries({
                queryKey: radiologyKeys.byPatient(updated.visit_id),
            });

            // After a report is filed, patient returns to the doctor
            // Bust patient lists so the doctor's queue updates
            qc.invalidateQueries({ queryKey: patientKeys.lists() });
        },

        onSettled: () => {
            // Always re-sync both queues from the server to be safe
            qc.invalidateQueries({ queryKey: radiologyKeys.pending() });
            qc.invalidateQueries({ queryKey: radiologyKeys.completed() });
        },
    });
}