/**
 * Appwrite Service Layer
 * Centralized data access for all collections
 * Uses server-side functions for security
 */

"use server";

import { ID, Query } from "node-appwrite";
import { databases } from "@/lib/appwrite.config";
import {
    Patient,
    Staff,
    Consultation,
    Prescription,
    LabRequest,
    Payment,
    PatientStatus,
    UserRole,
} from "@/types/models";

const DB_ID = process.env.NEXT_PUBLIC_DATABASE_ID!;

// Collection IDs - ensure these match your Appwrite setup
const COLLECTIONS = {
    PATIENTS: process.env.NEXT_PUBLIC_PATIENT_COLLECTION_ID!,
    STAFF: "staff",
    CONSULTATIONS: "consultations",
    PRESCRIPTIONS: "prescriptions",
    LAB_REQUESTS: "lab_requests",
    PAYMENTS: "payments",
    APPOINTMENTS: "appointments",
    NURSING_ACTIONS: "nursing_actions",
    DRUG_INVENTORY: "drug_inventory",
    DRUG_DISPENSING: "drug_dispensing",
    AUDIT_LOGS: "audit_logs",
};

/**
 * PATIENT OPERATIONS
 */

export async function createPatient(patientData: Omit<Patient, "$id" | "$createdAt" | "$updatedAt">) {
    try {
        const document = await databases.createDocument(
            DB_ID,
            COLLECTIONS.PATIENTS,
            ID.unique(),
            {
                ...patientData,
            }
        );
        return document as unknown as Patient;
    } catch (error) {
        console.error("Failed to create patient:", error);
        throw error;
    }
}

export async function getPatientById(patientId: string): Promise<Patient | null> {
    try {
        const document = await databases.getDocument(
            DB_ID,
            COLLECTIONS.PATIENTS,
            patientId
        );
        return document as unknown as Patient;
    } catch (error) {
        console.error("Failed to get patient:", error);
        return null;
    }
}

export async function updatePatientStatus(patientId: string, status: PatientStatus) {
    try {
        const document = await databases.updateDocument(
            DB_ID,
            COLLECTIONS.PATIENTS,
            patientId,
            { status }
        );
        return document as unknown as Patient;
    } catch (error) {
        console.error("Failed to update patient status:", error);
        throw error;
    }
}

export async function listPatientsByStatus(status: PatientStatus): Promise<Patient[]> {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.PATIENTS,
            [Query.equal("status", status)]
        );
        return response.documents as unknown as Patient[];
    } catch (error) {
        console.error("Failed to list patients by status:", error);
        return [];
    }
}

export async function searchPatients(searchQuery: string): Promise<Patient[]> {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.PATIENTS,
            [
                Query.or([
                    Query.search("name", searchQuery),
                    Query.search("email", searchQuery),
                    Query.search("phone", searchQuery),
                ]),
            ]
        );
        return response.documents as unknown as Patient[];
    } catch (error) {
        console.error("Failed to search patients:", error);
        return [];
    }
}

/**
 * STAFF OPERATIONS
 */

export async function getStaffById(staffId: string): Promise<Staff | null> {
    try {
        const document = await databases.getDocument(
            DB_ID,
            COLLECTIONS.STAFF,
            staffId
        );
        return document as unknown as Staff;
    } catch (error) {
        console.error("Failed to get staff:", error);
        return null;
    }
}

export async function listStaffByRole(role: UserRole): Promise<Staff[]> {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.STAFF,
            [Query.equal("role", role)]
        );
        return response.documents as unknown as Staff[];
    } catch (error) {
        console.error("Failed to list staff by role:", error);
        return [];
    }
}

/**
 * CONSULTATION OPERATIONS
 */

export async function createConsultation(consultationData: Omit<Consultation, "$id" | "$createdAt" | "$updatedAt">) {
    try {
        const document = await databases.createDocument(
            DB_ID,
            COLLECTIONS.CONSULTATIONS,
            ID.unique(),
            consultationData
        );
        return document as unknown as Consultation;
    } catch (error) {
        console.error("Failed to create consultation:", error);
        throw error; 
    }
}

export async function getConsultationById(consultationId: string): Promise<Consultation | null> {
    try {
        const document = await databases.getDocument(
            DB_ID,
            COLLECTIONS.CONSULTATIONS,
            consultationId
        );
        return document as unknown as Consultation;
    } catch (error) {
        console.error("Failed to get consultation:", error);
        return null;
    }
}

export async function listConsultationsByPatient(patientId: string): Promise<Consultation[]> {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.CONSULTATIONS,
            [Query.equal("patientId", patientId)]
        );
        return response.documents as unknown as Consultation[];
    } catch (error) {
        console.error("Failed to list consultations:", error);
        return [];
    }
}

export async function listConsultationsByDoctor(doctorId: string): Promise<Consultation[]> {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.CONSULTATIONS,
            [Query.equal("doctorId", doctorId)]
        );
        return response.documents as unknown as Consultation[];
    } catch (error) {
        console.error("Failed to list doctor consultations:", error);
        return [];
    }
}

export async function updateConsultation(consultationId: string, updates: Partial<Consultation>) {
    try {
        const document = await databases.updateDocument(
            DB_ID,
            COLLECTIONS.CONSULTATIONS,
            consultationId,
            updates
        );
        return document as unknown as Consultation;
    } catch (error) {
        console.error("Failed to update consultation:", error);
        throw error;
    }
}

/**
 * PRESCRIPTION OPERATIONS
 */

export async function createPrescription(prescriptionData: Omit<Prescription, "$id" | "$createdAt" | "$updatedAt">) {
    try {
        const document = await databases.createDocument(
            DB_ID,
            COLLECTIONS.PRESCRIPTIONS,
            ID.unique(),
            prescriptionData
        );
        return document as unknown as Prescription;
    } catch (error) {
        console.error("Failed to create prescription:", error);
        throw error;
    }
}

export async function getPrescriptionById(prescriptionId: string): Promise<Prescription | null> {
    try {
        const document = await databases.getDocument(
            DB_ID,
            COLLECTIONS.PRESCRIPTIONS,
            prescriptionId
        );
        return document as unknown as Prescription;
    } catch (error) {
        console.error("Failed to get prescription:", error);
        return null;
    }
}

export async function updatePrescription(prescriptionId: string, updates: Partial<Prescription>) {
    try {
        const document = await databases.updateDocument(
            DB_ID,
            COLLECTIONS.PRESCRIPTIONS,
            prescriptionId,
            updates
        );
        return document as unknown as Prescription;
    } catch (error) {
        console.error("Failed to update prescription:", error);
        throw error;
    }
}

export async function listPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.PRESCRIPTIONS,
            [Query.equal("patientId", patientId)]
        );
        return response.documents as unknown as Prescription[];
    } catch (error) {
        console.error("Failed to list prescriptions:", error);
        return [];
    }
}

/**
 * LAB REQUEST OPERATIONS
 */

export async function createLabRequest(labRequestData: Omit<LabRequest, "$id" | "$createdAt" | "$updatedAt">) {
    try {
        const document = await databases.createDocument(
            DB_ID,
            COLLECTIONS.LAB_REQUESTS,
            ID.unique(),
            labRequestData
        );
        return document as unknown as LabRequest;
    } catch (error) {
        console.error("Failed to create lab request:", error);
        throw error;
    }
}

export async function getLabRequestById(labRequestId: string): Promise<LabRequest | null> {
    try {
        const document = await databases.getDocument(
            DB_ID,
            COLLECTIONS.LAB_REQUESTS,
            labRequestId
        );
        return document as unknown as LabRequest;
    } catch (error) {
        console.error("Failed to get lab request:", error);
        return null;
    }
}

export async function listLabRequestsByPatient(patientId: string): Promise<LabRequest[]> {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.LAB_REQUESTS,
            [Query.equal("patientId", patientId)]
        );
        return response.documents as unknown as LabRequest[];
    } catch (error) {
        console.error("Failed to list lab requests:", error);
        return [];
    }
}

export async function listPendingLabRequests(): Promise<LabRequest[]> {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.LAB_REQUESTS,
            [Query.equal("status", "Pending")]
        );
        return response.documents as unknown as LabRequest[];
    } catch (error) {
        console.error("Failed to list pending lab requests:", error);
        return [];
    }
}

export async function listCompletedLabRequests(): Promise<LabRequest[]> {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.LAB_REQUESTS,
            [Query.equal("status", "Completed")]
        );
        return response.documents as unknown as LabRequest[];
    } catch (error) {
        console.error("Failed to list completed lab requests:", error);
        return [];
    }
}

export async function updateLabRequest(labRequestId: string, updates: Partial<LabRequest>) {
    try {
        const document = await databases.updateDocument(
            DB_ID,
            COLLECTIONS.LAB_REQUESTS,
            labRequestId,
            updates
        );
        return document as unknown as LabRequest;
    } catch (error) {
        console.error("Failed to update lab request:", error);
        throw error;
    }
}

/**
 * PAYMENT OPERATIONS
 */

export async function createPayment(paymentData: Omit<Payment, "$id" | "$createdAt" | "$updatedAt">) {
    try {
        const document = await databases.createDocument(
            DB_ID,
            COLLECTIONS.PAYMENTS,
            ID.unique(),
            paymentData
        );
        return document as unknown as Payment;
    } catch (error) {
        console.error("Failed to create payment:", error);
        throw error;
    }
}

export async function getPaymentById(paymentId: string): Promise<Payment | null> {
    try {
        const document = await databases.getDocument(
            DB_ID,
            COLLECTIONS.PAYMENTS,
            paymentId
        );
        return document as unknown as Payment;
    } catch (error) {
        console.error("Failed to get payment:", error);
        return null;
    }
}

export async function listPaymentsByPatient(patientId: string): Promise<Payment[]> {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.PAYMENTS,
            [Query.equal("patientId", patientId)]
        );
        return response.documents as unknown as Payment[];
    } catch (error) {
        console.error("Failed to list payments:", error);
        return [];
    }
}

export async function listPendingPayments(): Promise<Payment[]> {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.PAYMENTS,
            [Query.equal("status", "Pending")]
        );
        return response.documents as unknown as Payment[];
    } catch (error) {
        console.error("Failed to list pending payments:", error);
        return [];
    }
}

/**
 * NURSING ACTIONS OPERATIONS
 */

export async function createNursingAction(actionData: Omit<any, "$id" | "$createdAt" | "$updatedAt">) {
    try {
        const document = await databases.createDocument(
            DB_ID,
            COLLECTIONS.NURSING_ACTIONS,
            ID.unique(),
            actionData
        );
        return document;
    } catch (error) {
        console.error("Failed to create nursing action:", error);
        throw error;
    }
}

export async function getNursingActionById(actionId: string) {
    try {
        const document = await databases.getDocument(
            DB_ID,
            COLLECTIONS.NURSING_ACTIONS,
            actionId
        );
        return document;
    } catch (error) {
        console.error("Failed to get nursing action:", error);
        return null;
    }
}

export async function listNursingActionsByPatient(patientId: string) {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.NURSING_ACTIONS,
            [Query.equal("patientId", patientId)]
        );
        return response.documents;
    } catch (error) {
        console.error("Failed to list nursing actions:", error);
        return [];
    }
}

export async function listPendingNursingActions() {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.NURSING_ACTIONS,
            [Query.equal("status", "Pending")]
        );
        return response.documents;
    } catch (error) {
        console.error("Failed to list pending nursing actions:", error);
        return [];
    }
}

export async function updateNursingAction(actionId: string, updates: any) {
    try {
        const document = await databases.updateDocument(
            DB_ID,
            COLLECTIONS.NURSING_ACTIONS,
            actionId,
            updates
        );
        return document;
    } catch (error) {
        console.error("Failed to update nursing action:", error);
        throw error;
    }
}

/**
 * LAB REQUEST OPERATIONS (Extended)
 */
/**
 * DRUG DISPENSING OPERATIONS
 */
/**
 * DRUG DISPENSING OPERATIONS
 */

export async function createDrugDispensingRecord(dispensingData: Omit<any, "$id" | "$createdAt" | "$updatedAt">) {
    try {
        const document = await databases.createDocument(
            DB_ID,
            COLLECTIONS.DRUG_DISPENSING,
            ID.unique(),
            dispensingData
        );
        return document;
    } catch (error) {
        console.error("Failed to create drug dispensing record:", error);
        throw error;
    }
}

export async function getDrugDispensingById(recordId: string) {
    try {
        const document = await databases.getDocument(
            DB_ID,
            COLLECTIONS.DRUG_DISPENSING,
            recordId
        );
        return document;
    } catch (error) {
        console.error("Failed to get drug dispensing record:", error);
        return null;
    }
}

export async function listDispensingByPatient(patientId: string) {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.DRUG_DISPENSING,
            [Query.equal("patientId", patientId)]
        );
        return response.documents;
    } catch (error) {
        console.error("Failed to list dispensing records:", error);
        return [];
    }
}

export async function listPendingPrescriptions() {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.PRESCRIPTIONS,
            [Query.equal("status", "Active")]
        );
        return response.documents as unknown as Prescription[];
    } catch (error) {
        console.error("Failed to list pending prescriptions:", error);
        return [];
    }
}

/**
 * AUDIT LOGGING OPERATIONS
 */

export async function createAuditLog(logData: Omit<any, "$id" | "$createdAt" | "$updatedAt">) {
    try {
        const document = await databases.createDocument(
            DB_ID,
            COLLECTIONS.AUDIT_LOGS,
            ID.unique(),
            {
                ...logData,
                timestamp: new Date().toISOString(),
            }
        );
        return document;
    } catch (error) {
        console.error("Failed to create audit log:", error);
        // Don't throw - audit logs should not break main workflow
    }
}

export async function logAction(userId: string, action: string, entityType: string, entityId: string, changes?: any) {
    return createAuditLog({
        userId,
        action,
        entityType,
        entityId,
        changes: changes || {},
        timestamp: new Date().toISOString(),
    });
}

/**
 * EXTENDED OPERATIONS FOR COMPLETE WORKFLOW
 */

/**
 * Get all patients (for queue management)
 */
export async function getAllPatients(): Promise<Patient[]> {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.PATIENTS,
            [Query.limit(1000)] // Adjust limit as needed
        );
        return response.documents as unknown as Patient[];
    } catch (error) {
        console.error("Failed to list all patients:", error);
        return [];
    }
}

/**
 * Get pending prescriptions by pharmacist
 */
export async function listPrescriptionsByPharmacist(pharmacistId: string): Promise<Prescription[]> {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.PRESCRIPTIONS,
            [
                Query.equal("status", "Active"),
                // Note: May need to add pharmacistId field to prescriptions if not present
            ]
        );
        return response.documents as unknown as Prescription[];
    } catch (error) {
        console.error("Failed to list prescriptions for pharmacist:", error);
        return [];
    }
}

/**
 * Get pending lab requests assigned to a lab tech
 */
export async function listLabRequestsForTech(techId: string): Promise<LabRequest[]> {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.LAB_REQUESTS,
            [Query.equal("status", "Pending")]
        );
        return response.documents as unknown as LabRequest[];
    } catch (error) {
        console.error("Failed to list lab requests for tech:", error);
        return [];
    }
}

/**
 * Get nursing actions assigned to a nurse
 */
export async function listNursingActionsForNurse(nurseId: string): Promise<any[]> {
    try {
        const response = await databases.listDocuments(
            DB_ID,
            COLLECTIONS.NURSING_ACTIONS,
            [
                Query.equal("status", "Pending"),
                Query.equal("assignedNurse", nurseId),
            ]
        );
        return response.documents;
    } catch (error) {
        console.error("Failed to list nursing actions for nurse:", error);
        return [];
    }
}

/**
 * Complete a lab request and update patient status
 */
export async function completeLabRequest(
    labRequestId: string,
    results: string,
    patientId: string,
    nextStatus: PatientStatus = PatientStatus.AwaitingPayment
): Promise<{ labRequest: LabRequest; patient: Patient } | null> {
    try {
        // Update lab request
        const updatedLabRequest = await updateLabRequest(labRequestId, {
            status: "Completed",
            results,
            completionDate: new Date().toISOString(),
        });

        // Update patient status
        const updatedPatient = await updatePatientStatus(patientId, nextStatus);

        return {
            labRequest: updatedLabRequest as unknown as LabRequest,
            patient: updatedPatient as unknown as Patient,
        };
    } catch (error) {
        console.error("Failed to complete lab request:", error);
        throw error;
    }
}

/**
 * Complete a nursing action and update patient status
 */
export async function completeNursingAction(
    actionId: string,
    patientId: string,
    completionNotes?: string,
    nextStatus: PatientStatus = PatientStatus.AwaitingPayment
): Promise<{ action: any; patient: Patient } | null> {
    try {
        // Update nursing action
        const updatedAction = await updateNursingAction(actionId, {
            status: "Completed",
            completionTime: new Date().toISOString(),
            completionNotes,
        });

        // Update patient status
        const updatedPatient = await updatePatientStatus(patientId, nextStatus);

        return {
            action: updatedAction,
            patient: updatedPatient as unknown as Patient,
        };
    } catch (error) {
        console.error("Failed to complete nursing action:", error);
        throw error;
    }
}

/**
 * Dispense prescription and create dispensing record
 */
export async function dispensePrescription(
    prescriptionId: string,
    patientId: string,
    pharmacistId: string,
    dispensedMedications: any[],
    nextStatus: PatientStatus = PatientStatus.AwaitingPayment
): Promise<{ prescription: Prescription; dispensing: any; patient: Patient } | null> {
    try {
        // Update prescription status
        const updatedPrescription = await updatePrescription(prescriptionId, {
            status: "Dispensed",
        });

        // Create dispensing record
        const dispensingRecord = await createDrugDispensingRecord({
            prescriptionId,
            patientId,
            pharmacistId,
            dispensedDate: new Date().toISOString(),
            dispensedMedications,
            notes: "",
        });

        // Update patient status
        const updatedPatient = await updatePatientStatus(patientId, nextStatus);

        return {
            prescription: updatedPrescription as unknown as Prescription,
            dispensing: dispensingRecord,
            patient: updatedPatient as unknown as Patient,
        };
    } catch (error) {
        console.error("Failed to dispense prescription:", error);
        throw error;
    }
}

/**
 * Route patient after consultation
 * Based on what services are needed, update patient status accordingly
 */
export async function routePatientAfterConsultation(
    patientId: string,
    hasNursingActions: boolean,
    hasLabRequests: boolean,
    hasPrescription: boolean
): Promise<Patient | null> {
    try {
        let nextStatus = PatientStatus.AwaitingPayment;

        if (hasNursingActions) {
            nextStatus = PatientStatus.SentToNurse;
        } else if (hasLabRequests) {
            nextStatus = PatientStatus.SentToLab;
        } else if (hasPrescription) {
            nextStatus = PatientStatus.SentToPharmacy;
        }

        return await updatePatientStatus(patientId, nextStatus);
    } catch (error) {
        console.error("Failed to route patient:", error);
        throw error;
    }
}
