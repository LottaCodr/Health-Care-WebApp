"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as AS from "@/lib/services/appointment.service";
import { appointmentKeys, patientKeys } from "../query-keys";
import { Appointment } from "@/types/models";
import { AppointmentStatus } from "@/store/appoointment-store";


const STALE  = 30_000;
const GC     = 10 * 60_000;

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

export function useCreateAppointment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: AS.CreateAppointmentInput) => AS.createAppointment(input),
        onSuccess: (appt: any) => {
            qc.invalidateQueries({ queryKey: appointmentKeys.upcoming() });
            qc.invalidateQueries({ queryKey: appointmentKeys.byDate(appt.appointmentDate) });
            qc.invalidateQueries({ queryKey: appointmentKeys.byPatient(appt.patientId) });
        },
    });
}

export function useUpdateAppointment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<AS.CreateAppointmentInput> }) =>
            AS.updateAppointment(id, updates),
        onSuccess: (appt: any) => {
            qc.invalidateQueries({ queryKey: appointmentKeys.upcoming() });
            qc.invalidateQueries({ queryKey: appointmentKeys.byDate(appt.appointmentDate!) });
            qc.invalidateQueries({ queryKey: appointmentKeys.byPatient(appt.patientId) });
        },
    });
}

export function useUpdateAppointmentStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, status, reason }: { id: string; status: "Cancelled" | "CheckedIn" | "Completed" | "NoShow" | "Scheduled"; reason?: string }) =>
            AS.updateAppointmentStatus(id, status, reason),
        onSuccess: (appt: any) => {
            qc.invalidateQueries({ queryKey: appointmentKeys.upcoming() });
            qc.invalidateQueries({ queryKey: appointmentKeys.byDate(appt.appointmentDate!) });
            qc.invalidateQueries({ queryKey: appointmentKeys.byPatient(appt.patientId) });
            // When appointment is confirmed → patient queued for consultation
            if (appt.status === "CheckedIn") {
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