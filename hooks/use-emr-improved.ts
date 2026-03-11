/**
 * Refactored EMR Hooks using Zustand Store
 * Provides better caching and state management
 */

"use client";

import { useData, useMutation, useInfiniteQuery } from "./use-data";
import {
    Patient,
    Consultation,
    Prescription,
    LabRequest,
    Payment,
    PatientStatus,
} from "@/types/models";
import {
    getPatientById,
    listPatientsByStatus,
    searchPatients,
    createConsultation,
    getConsultationById,
    listConsultationsByPatient,
    listConsultationsByDoctor,
    updateConsultation,
    createPrescription,
    getPrescriptionById,
    listPrescriptionsByPatient,
    createLabRequest,
    listLabRequestsByPatient,
    listPendingLabRequests,
    listCompletedLabRequests,
    updateLabRequest,
    createPayment,
    listPaymentsByPatient,
    listPendingPayments,
    updatePatientStatus,
    createNursingAction,
    listPendingNursingActions,
    listNursingActionsByPatient,
    updateNursingAction,
    createDrugDispensingRecord,
    listDispensingByPatient,
    listPendingPrescriptions,
    updatePrescription,
    logAction,
    getNursingActionById,
    getLabRequestById,
} from "@/lib/supabase-service";

/**
 * PATIENT HOOKS
 */

export function usePatient(patientId: string) {
    return useData(
        () => getPatientById(patientId),
        {
            cacheKey: `patient-${patientId}`,
            cacheTTL: 10 * 60 * 1000, // 10 minutes
        }
    );
}

export function usePatientsByStatus(status: PatientStatus) {
    return useData(
        () => listPatientsByStatus(status),
        {
            cacheKey: `patients-${status}`,
            cacheTTL: 5 * 60 * 1000,
        }
    );
}

export function useSearchPatients(query: string) {
    return useData(
        () => searchPatients(query),
        {
            cacheKey: `search-patients-${query}`,
            cacheTTL: 2 * 60 * 1000,
        }
    );
}

/**
 * CONSULTATION HOOKS
 */

export function useConsultation(consultationId: string) {
    return useData(
        () => getConsultationById(consultationId),
        {
            cacheKey: `consultation-${consultationId}`,
            cacheTTL: 10 * 60 * 1000,
        }
    );
}

export function useConsultationsByPatient(patientId: string) {
    return useData(
        () => listConsultationsByPatient(patientId),
        {
            cacheKey: `consultations-patient-${patientId}`,
            cacheTTL: 5 * 60 * 1000,
        }
    );
}

export function useConsultationsByDoctor(doctorId: string) {
    return useData(
        () => listConsultationsByDoctor(doctorId),
        {
            cacheKey: `consultations-doctor-${doctorId}`,
            cacheTTL: 5 * 60 * 1000,
        }
    );
}

export function useCreateConsultation() {
    return useMutation({
        mutationFn: createConsultation,
        invalidateKeys: ["consultations-*"],
    });
}

export function useUpdateConsultation() {
    return useMutation({
        mutationFn: ({
            consultationId,
            data,
        }: {
            consultationId: string;
            data: any;
        }) => updateConsultation(consultationId, data),
        invalidateKeys: ["consultations-*"],
    });
}

/**
 * PRESCRIPTION HOOKS
 */

export function usePrescription(prescriptionId: string) {
    return useData(
        () => getPrescriptionById(prescriptionId),
        {
            cacheKey: `prescription-${prescriptionId}`,
            cacheTTL: 10 * 60 * 1000,
        }
    );
}

export function usePrescriptionsByPatient(patientId: string) {
    return useData(
        () => listPrescriptionsByPatient(patientId),
        {
            cacheKey: `prescriptions-${patientId}`,
            cacheTTL: 5 * 60 * 1000,
        }
    );
}

export function usePendingPrescriptions() {
    return useData(
        () => listPendingPrescriptions(),
        {
            cacheKey: "pending-prescriptions",
            cacheTTL: 2 * 60 * 1000,
        }
    );
}

export function useCreatePrescription() {
    return useMutation({
        mutationFn: createPrescription,
        invalidateKeys: ["prescriptions-*", "pending-prescriptions"],
    });
}

export function useUpdatePrescription() {
    return useMutation({
        mutationFn: ({
            prescriptionId,
            data,
        }: {
            prescriptionId: string;
            data: any;
        }) => updatePrescription(prescriptionId, data),
        invalidateKeys: ["prescriptions-*", "pending-prescriptions"],
    });
}

/**
 * LAB REQUEST HOOKS
 */

export function useLabRequest(labRequestId: string) {
    return useData(
        () => getLabRequestById(labRequestId),
        {
            cacheKey: `lab-request-${labRequestId}`,
            cacheTTL: 10 * 60 * 1000,
        }
    );
}

export function useLabRequestsByPatient(patientId: string) {
    return useData(
        () => listLabRequestsByPatient(patientId),
        {
            cacheKey: `lab-requests-${patientId}`,
            cacheTTL: 5 * 60 * 1000,
        }
    );
}

export function usePendingLabRequests() {
    return useData(
        () => listPendingLabRequests(),
        {
            cacheKey: "pending-lab-requests",
            cacheTTL: 2 * 60 * 1000,
        }
    );
}

export function useCompletedLabRequests() {
    return useData(
        () => listCompletedLabRequests(),
        {
            cacheKey: "completed-lab-requests",
            cacheTTL: 5 * 60 * 1000,
        }
    );
}

export function useCreateLabRequest() {
    return useMutation({
        mutationFn: createLabRequest,
        invalidateKeys: ["lab-requests-*", "pending-lab-requests"],
    });
}

export function useUpdateLabRequest() {
    return useMutation({
        mutationFn: ({
            labRequestId,
            data,
        }: {
            labRequestId: string;
            data: any;
        }) => updateLabRequest(labRequestId, data),
        invalidateKeys: ["lab-requests-*", "pending-lab-requests", "completed-lab-requests"],
    });
}

/**
 * PAYMENT HOOKS
 */

export function usePaymentsByPatient(patientId: string) {
    return useData(
        () => listPaymentsByPatient(patientId),
        {
            cacheKey: `payments-${patientId}`,
            cacheTTL: 5 * 60 * 1000,
        }
    );
}

export function usePendingPayments() {
    return useData(
        () => listPendingPayments(),
        {
            cacheKey: "pending-payments",
            cacheTTL: 2 * 60 * 1000,
        }
    );
}

export function useCreatePayment() {
    return useMutation({
        mutationFn: createPayment,
        invalidateKeys: ["payments-*", "pending-payments"],
    });
}

/**
 * NURSING ACTION HOOKS
 */

export function useNursingAction(actionId: string) {
    return useData(
        () => getNursingActionById(actionId),
        {
            cacheKey: `nursing-action-${actionId}`,
            cacheTTL: 10 * 60 * 1000,
        }
    );
}

export function useNursingActionsByPatient(patientId: string) {
    return useData(
        () => listNursingActionsByPatient(patientId),
        {
            cacheKey: `nursing-actions-${patientId}`,
            cacheTTL: 5 * 60 * 1000,
        }
    );
}

export function usePendingNursingActions() {
    return useData(
        () => listPendingNursingActions(),
        {
            cacheKey: "pending-nursing-actions",
            cacheTTL: 2 * 60 * 1000,
        }
    );
}

export function useCreateNursingAction() {
    return useMutation({
        mutationFn: createNursingAction,
        invalidateKeys: ["nursing-actions-*", "pending-nursing-actions"],
    });
}

export function useUpdateNursingAction() {
    return useMutation({
        mutationFn: ({
            actionId,
            data,
        }: {
            actionId: string;
            data: any;
        }) => updateNursingAction(actionId, data),
        invalidateKeys: ["nursing-actions-*", "pending-nursing-actions"],
    });
}

/**
 * DISPENSING HOOKS
 */

export function useDispensingRecordsByPatient(patientId: string) {
    return useData(
        () => listDispensingByPatient(patientId),
        {
            cacheKey: `dispensing-${patientId}`,
            cacheTTL: 5 * 60 * 1000,
        }
    );
}

export function useCreateDispensingRecord() {
    return useMutation({
        mutationFn: createDrugDispensingRecord,
        invalidateKeys: ["dispensing-*", "pending-prescriptions"],
    });
}

/**
 * PATIENT STATUS HOOKS
 */

export function useUpdatePatientStatus() {
    return useMutation({
        mutationFn: ({
            patientId,
            status,
        }: {
            patientId: string;
            status: PatientStatus;
        }) => updatePatientStatus(patientId, status),
        invalidateKeys: ["patient-*", "patients-*"],
    });
}

/**
 * AUDIT HOOKS
 */

export function useCreateAuditLog() {
    return useMutation({
        mutationFn: ({
            userId,
            action,
            entityType,
            entityId,
            changes,
        }: {
            userId: string;
            action: string;
            entityType: string;
            entityId: string;
            changes?: any;
        }) => logAction(userId, action, entityType, entityId, changes),
    });
}
