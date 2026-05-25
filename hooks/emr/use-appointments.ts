"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as AS from "@/lib/services/appointment.service";
import { appointmentKeys, patientKeys } from "@/hooks/query-keys";

const STALE = 30_000;
const GC    = 10 * 60_000;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useUpcomingAppointments() {
    return useQuery({
        queryKey:             appointmentKeys.upcoming(),
        queryFn:              AS.listUpcomingAppointments,
        staleTime:            STALE,
        gcTime:               GC,
        refetchOnWindowFocus: false,
        refetchInterval:      60_000,
    });
}

export function useAppointmentsByDate(date: string) {
    return useQuery({
        queryKey:             appointmentKeys.byDate(date),
        queryFn:              () => AS.listAppointmentsByDate(date),
        enabled:              !!date,
        staleTime:            STALE,
        gcTime:               GC,
        refetchOnWindowFocus: false,
    });
}

export function useAppointmentsByPatient(patientId: string) {
    return useQuery({
        queryKey:             appointmentKeys.byPatient(patientId),
        queryFn:              () => AS.listAppointmentsByPatient(patientId),
        enabled:              !!patientId,
        staleTime:            STALE,
        gcTime:               GC,
        refetchOnWindowFocus: false,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateAppointment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: AS.CreateAppointmentInput) => AS.createAppointment(input),
        onSuccess: (appt) => {
            qc.invalidateQueries({ queryKey: appointmentKeys.upcoming() });
            qc.invalidateQueries({ queryKey: appointmentKeys.byDate(appt.appointment_date) });
            // Only invalidate patient-specific cache if it was a registered patient
            if (appt.patient_id) {
                qc.invalidateQueries({ queryKey: appointmentKeys.byPatient(appt.patient_id) });
            }
        },
    });
}

export function useUpdateAppointment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<AS.CreateAppointmentInput> }) =>
            AS.updateAppointment(id, updates),
        onSuccess: (appt) => {
            qc.invalidateQueries({ queryKey: appointmentKeys.upcoming() });
            qc.invalidateQueries({ queryKey: appointmentKeys.byDate(appt.appointment_date) });
            if (appt.patient_id) {
                qc.invalidateQueries({ queryKey: appointmentKeys.byPatient(appt.patient_id) });
            }
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
            qc.invalidateQueries({ queryKey: appointmentKeys.upcoming() });
            qc.invalidateQueries({ queryKey: appointmentKeys.byDate(appt.appointment_date) });
            if (appt.patient_id) {
                qc.invalidateQueries({ queryKey: appointmentKeys.byPatient(appt.patient_id) });
            }
            // Confirmed check-in → patient enters consultation queue
            if (appt.status === "in_progress") {
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