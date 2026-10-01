"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { carePackageKeys } from "../query-keys";
import * as CPS from "@/lib/services/care-packages.service";

const LIST_STALE = 30_000;
const GC_TIME = 10 * 60_000;

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Packages the desk can sell (the antenatal package today). */
export function useCarePackages(opts?: { enabled?: boolean }) {
    return useQuery({
        queryKey: carePackageKeys.catalog(),
        queryFn: CPS.listCarePackages,
        enabled: opts?.enabled !== false,
        // The catalog changes rarely, and the registration form is opened often.
        staleTime: 10 * 60_000,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

/** Everything the patient's Care Packages panel needs, in one round trip. */
export function usePatientPackages(patientId: string, opts?: { enabled?: boolean }) {
    return useQuery({
        queryKey: carePackageKeys.summary(patientId),
        queryFn: () => CPS.getPatientPackagesSummary(patientId),
        enabled: !!patientId && opts?.enabled !== false,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

/** The patient's enrolments only (used where the ledger is not needed). */
export function usePatientEnrolments(patientId: string, opts?: { enabled?: boolean }) {
    return useQuery({
        queryKey: carePackageKeys.byPatient(patientId),
        queryFn: () => CPS.listEnrolmentsByPatient(patientId),
        enabled: !!patientId && opts?.enabled !== false,
        staleTime: LIST_STALE,
        gcTime: GC_TIME,
        refetchOnWindowFocus: false,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

function bust(qc: ReturnType<typeof useQueryClient>, patientId?: string) {
    qc.invalidateQueries({ queryKey: carePackageKeys.all() });
    if (patientId) {
        qc.invalidateQueries({ queryKey: carePackageKeys.byPatient(patientId) });
        qc.invalidateQueries({ queryKey: carePackageKeys.summary(patientId) });
    }
}

/** Sell a package to a patient (front desk / Admin). */
export function useEnrolPatientInPackage() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (input: CPS.EnrolPatientInput) => {
            // Expected failures come back as data (see enrolPatientInPackage);
            // re-throwing in the browser keeps the real reason in the toast.
            const result = await CPS.enrolPatientInPackage(input);
            if (!result.ok) throw new Error(result.message);
            return result.enrolment;
        },
        onSuccess: (enrolment) => bust(qc, enrolment.patient_id),
    });
}

/** Close, cancel or extend an enrolment. */
export function useUpdateEnrolment() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async (input: CPS.UpdateEnrolmentInput) => {
            const result = await CPS.updateEnrolment(input);
            if (!result.ok) throw new Error(result.message);
            return result.enrolment;
        },
        onSuccess: (enrolment) => bust(qc, enrolment.patient_id),
    });
}
