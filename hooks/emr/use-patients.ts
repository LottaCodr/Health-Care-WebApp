"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { patientKeys } from "../query-keys";
import * as PatientService from "@/lib/services/patient.service";
import type { Patient, PatientStatus } from "@/types/models";
import { startOfHospitalDayUtcIso } from "@/lib/utils/appointment.utils";
import { enqueueOfflineRegistration } from "@/components/layout/OfflineSync";

// ─── Cache config ─────────────────────────────────────────────────────────────

const LIST_STALE = 30_000;       // 30s  — queue changes often
const DETAIL_STALE = 60_000;       // 1min — patient detail
const GC_TIME = 10 * 60_000;  // 10min — keep in memory after unmount

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePatient(id: string, opts?: { enabled?: boolean }) {
    return useQuery({
        queryKey: patientKeys.detail(id),
        queryFn: () => PatientService.getPatientById(id),
        enabled: !!id && opts?.enabled !== false,
        staleTime: DETAIL_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

export function usePatientsByStatus(status: PatientStatus, opts?: { enabled?: boolean }) {
    return useQuery({
        queryKey: patientKeys.byStatus(status),
        queryFn: () => PatientService.listPatientsByStatus(status),
        enabled: opts?.enabled !== false,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}



export function useSearchPatients(query: string) {
    return useQuery({
        queryKey: patientKeys.search(query),
        queryFn: () => PatientService.searchPatients(query),
        enabled: query.trim().length >= 2,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
        placeholderData: (prev) => prev,   // keep showing previous results while new query fetches
    });
}

export function useAllPatients(opts?: { enabled?: boolean }) {
    return useQuery({
        queryKey: patientKeys.lists(),
        queryFn: () => PatientService.getAllPatients(),
        enabled: opts?.enabled !== false,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

/**
 * One server-paginated page of the registry — what the front-desk "All
 * Patients" tab renders.
 *
 * The database does the filtering/ordering/counting/slicing (see
 * `listPatientsPage`), so the browser holds one screen of patients instead of
 * every patient ever registered. `placeholderData` keeps the current page on
 * screen while the next one loads, so paging and typing in the search box do
 * not blank the table.
 */
export function usePatientsPage(
    input: { page: number; pageSize: number; search: string },
    opts?: { enabled?: boolean }
) {
    return useQuery({
        queryKey: patientKeys.page(input),
        queryFn: () => PatientService.listPatientsPage(input),
        enabled: opts?.enabled !== false,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
        placeholderData: (prev) => prev,
    });
}

/**
 * Lightweight per-status counts for the queue tab badges — a handful of
 * `count: exact, head: true` requests, never the patient rows themselves.
 * Used so the tab pills (and the "N patients" header) stay accurate even
 * when the active tab only loaded its own slice of the table (see
 * `usePatientsByStatus`), instead of requiring the whole table to be in
 * memory just to count it.
 */
export function usePatientStatusCounts() {
    return useQuery({
        queryKey: patientKeys.statusCounts(),
        queryFn: () => PatientService.getPatientStatusCounts(),
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

/**
 * Today's new arrivals, resolved entirely on the server:
 *  - `total`   — exact count of patients registered since the start of the
 *                hospital day (drives the "New Arrivals" stat card).
 *  - `patients`— the most recent arrivals (drives the "Today's Arrivals" list).
 *
 * The boundary is the start of the Africa/Lagos hospital day in UTC, so the
 * first hour of the day (00:00–01:00 WAT, when the UTC date lags the
 * hospital date) is counted correctly — and the dashboard no longer needs to
 * pull the whole patients table into the browser.
 */
export function useTodaysArrivals(limit = 50) {
    return useQuery({
        queryKey: patientKeys.arrivalsToday(),
        queryFn: async () => {
            const since = startOfHospitalDayUtcIso();
            const [patients, total] = await Promise.all([
                PatientService.listPatientsCreatedSince(since, limit),
                PatientService.countPatientsCreatedSince(since),
            ]);
            return { patients, total };
        },
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreatePatient() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (data: Parameters<typeof PatientService.createPatient>[0]) => {
            // Offline mode: park the registration locally and replay it when
            // the network returns (see components/layout/OfflineSync.tsx).
            if (typeof navigator !== "undefined" && !navigator.onLine) {
                enqueueOfflineRegistration(data as unknown as Record<string, any>);
                throw new Error(
                    "OFFLINE_QUEUED: You are offline. This registration was saved on this device and will sync to the hospital system automatically when the connection returns."
                );
            }
            // The server action returns its failures instead of throwing them
            // (a thrown Server Action message is redacted by Next.js), so the
            // friendly reason is turned into a client-side error HERE, where
            // the message still reaches the UI.
            const result = await PatientService.createPatient(data);
            if (!result.ok) throw new Error(result.message);
            return result.patient;
        },

        onSuccess: (patient) => {
            // Seed detail cache — instant navigation without extra request
            qc.setQueryData(patientKeys.detail(patient.id), patient);
            // Bust all patient lists
            qc.invalidateQueries({ queryKey: patientKeys.lists() });
        },
    });
}

export function useUpdatePatient() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Patient> }) =>
            PatientService.updatePatient(id, updates),

        onSuccess: (updated) => {
            qc.setQueryData(patientKeys.detail(updated.id), updated);
            qc.invalidateQueries({ queryKey: patientKeys.lists() });
        },
    });
}

export function useUpdatePatientStatus() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: PatientStatus }) =>
            PatientService.updatePatientStatus(id, status),

        // Optimistic: status badge updates instantly, rolls back on failure
        onMutate: async ({ id, status }) => {
            await qc.cancelQueries({ queryKey: patientKeys.detail(id) });
            const previous = qc.getQueryData<Patient>(patientKeys.detail(id));
            if (previous) qc.setQueryData(patientKeys.detail(id), { ...previous, status });
            return { previous, id };
        },

        onError: (_err, _vars, ctx) => {
            if (ctx?.previous) qc.setQueryData(patientKeys.detail(ctx.id), ctx.previous);
        },

        onSettled: (_data, _err, { id }) => {
            qc.invalidateQueries({ queryKey: patientKeys.detail(id) });
            qc.invalidateQueries({ queryKey: patientKeys.lists() });
        },
    });
}

/**
 * Admin bulk action — discharges patients from the consultation queue
 * (`closeConsultationQueue`). One guarded server-side UPDATE, so no optimistic
 * update here: the returned `closed`/`skipped` lists are the truth and the UI
 * reports them. `patientKeys.lists()` is the prefix of every `byStatus` key, so
 * one invalidation refreshes all queues and dashboards.
 */
export function useCloseConsultationQueue() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (input: Parameters<typeof PatientService.closeConsultationQueue>[0]) =>
            PatientService.closeConsultationQueue(input),

        onSuccess: () => {
            qc.invalidateQueries({ queryKey: patientKeys.lists() });
        },
    });
}