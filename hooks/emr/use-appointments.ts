"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as AS from "@/lib/services/appointment.service";
import { appointmentKeys, patientKeys } from "../query-keys";

const STALE = 30_000;
const GC    = 10 * 60_000;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useUpcomingAppointments(opts?: { enabled?: boolean }) {
    return useQuery({
        queryKey:             appointmentKeys.upcoming(),
        queryFn:              AS.listUpcomingAppointments,
        enabled:              opts?.enabled !== false,
        staleTime:            STALE,
        gcTime:               GC,
        refetchOnWindowFocus: false,
        refetchInterval:      60_000,
    });
}

export function useAppointmentsByDate(date: string, opts?: { enabled?: boolean }) {
    return useQuery({
        queryKey:             appointmentKeys.byDate(date),
        queryFn:              () => AS.listAppointmentsByDate(date),
        enabled:              !!date && opts?.enabled !== false,
        staleTime:            STALE,
        gcTime:               GC,
        refetchOnWindowFocus: false,
    });
}

export function useAppointmentsByPatient(patientId: string, opts?: { enabled?: boolean }) {
    return useQuery({
        queryKey:             appointmentKeys.byPatient(patientId),
        queryFn:              () => AS.listAppointmentsByPatient(patientId),
        enabled:              !!patientId && opts?.enabled !== false,
        staleTime:            STALE,
        gcTime:               GC,
        refetchOnWindowFocus: false,
    });
}

// Helper — ensure we only access appointment properties on real objects, not errors
function isAppointment(obj: any): obj is { appointment_date: string; patient_id?: string; status?: string } {
    return obj && typeof obj === "object" && "appointment_date" in obj;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateAppointment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: AS.CreateAppointmentInput) => AS.createAppointment(input),
        onSuccess: () => {
            // Invalidate the complete appointment namespace so old date/patient
            // caches are also refreshed after a create or recurring batch.
            qc.invalidateQueries({ queryKey: appointmentKeys.all() });
        },
    });
}

export function useUpdateAppointment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<AS.CreateAppointmentInput> }) =>
            AS.updateAppointment(id, updates),
        onSuccess: () => {
            // A reschedule can affect both the old and new date caches.
            qc.invalidateQueries({ queryKey: appointmentKeys.all() });
        },
    });
}

export function useUpdateAppointmentStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            id, status, reason,
        }: { id: string; status: string; reason?: string }) =>
            AS.updateAppointmentStatus(id, status, reason),
        onSuccess: (appt) => {
            qc.invalidateQueries({ queryKey: appointmentKeys.all() });
            // Confirmed check-in moves the patient into the clinical queue.
            if (isAppointment(appt) && appt.status === "in_progress") {
                qc.invalidateQueries({ queryKey: patientKeys.lists() });
            }
        },
    });
}

export function useDeleteAppointment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => AS.deleteAppointment(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: appointmentKeys.all() });
        },
    });
}