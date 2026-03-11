/**
 * Supabase Service Layer
 * Centralized data access for all tables
 * Uses Supabase SSR for security and performance
 */

"use server";

import { createClient } from "@/utils/supabase/server";
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
import { PostgrestResponse } from "@supabase/supabase-js";

/**
 * Helper to handle Supabase responses and errors
 */
async function handleResponse<T>(promise: Promise<PostgrestResponse<T>>) {
    const { data, error } = await promise;
    if (error) {
        console.error("Supabase Error:", error);
        throw new Error(error.message);
    }
    return data;
}

/**
 * PATIENT OPERATIONS
 */

export async function createPatient(patientData: Omit<Patient, "$id" | "$createdAt" | "$updatedAt">) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patients")
        .insert([patientData])
        .select()
        .single();

    if (error) {
        console.error("Failed to create patient:", error);
        throw error;
    }
    return data as unknown as Patient;
}

export async function getPatientById(patientId: string): Promise<Patient | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patients")
        .select()
        .eq("id", patientId)
        .single();

    if (error) {
        console.error("Failed to get patient:", error);
        return null;
    }
    return data as unknown as Patient;
}

export async function updatePatientStatus(patientId: string, status: PatientStatus) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patients")
        .update({ status })
        .eq("id", patientId)
        .select()
        .single();

    if (error) {
        console.error("Failed to update patient status:", error);
        throw error;
    }
    return data as unknown as Patient;
}

export async function listPatientsByStatus(status: PatientStatus): Promise<Patient[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patients")
        .select()
        .eq("status", status);

    if (error) {
        console.error("Failed to list patients by status:", error);
        return [];
    }
    return data as unknown as Patient[];
}

export async function searchPatients(searchQuery: string): Promise<Patient[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patients")
        .select()
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);

    if (error) {
        console.error("Failed to search patients:", error);
        return [];
    }
    return data as unknown as Patient[];
}

export async function getAllPatients(): Promise<Patient[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patients")
        .select()
        .limit(1000);

    if (error) {
        console.error("Failed to list all patients:", error);
        return [];
    }
    return data as unknown as Patient[];
}

/**
 * CONSULTATION OPERATIONS
 */

export async function createConsultation(consultationData: Omit<Consultation, "$id" | "$createdAt" | "$updatedAt">) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("consultations")
        .insert([consultationData])
        .select()
        .single();

    if (error) {
        console.error("Failed to create consultation:", error);
        throw error;
    }
    return data as unknown as Consultation;
}

export async function getConsultationById(consultationId: string): Promise<Consultation | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("consultations")
        .select()
        .eq("id", consultationId)
        .single();

    if (error) {
        console.error("Failed to get consultation:", error);
        return null;
    }
    return data as unknown as Consultation;
}

export async function listConsultationsByPatient(patientId: string): Promise<Consultation[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("consultations")
        .select()
        .eq("patient_id", patientId);

    if (error) {
        console.error("Failed to list consultations:", error);
        return [];
    }
    return data as unknown as Consultation[];
}

export async function listConsultationsByDoctor(doctorId: string): Promise<Consultation[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("consultations")
        .select()
        .eq("doctor_id", doctorId);

    if (error) {
        console.error("Failed to list doctor consultations:", error);
        return [];
    }
    return data as unknown as Consultation[];
}

export async function updateConsultation(consultationId: string, updates: Partial<Consultation>) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("consultations")
        .update(updates)
        .eq("id", consultationId)
        .select()
        .single();

    if (error) {
        console.error("Failed to update consultation:", error);
        throw error;
    }
    return data as unknown as Consultation;
}

/**
 * STAFF OPERATIONS
 */

export async function getStaffById(staffId: string): Promise<Staff | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("staffs")
        .select()
        .eq("id", staffId)
        .single();

    if (error) {
        console.error("Failed to get staff:", error);
        return null;
    }
    return data as unknown as Staff;
}

export async function listStaffByRole(role: UserRole): Promise<Staff[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("staffs")
        .select()
        .eq("role", role);

    if (error) {
        console.error("Failed to list staff by role:", error);
        return [];
    }
    return data as unknown as Staff[];
}

/**
 * PRESCRIPTION OPERATIONS
 */

export async function createPrescription(prescriptionData: Omit<Prescription, "$id" | "$createdAt" | "$updatedAt">) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("prescriptions")
        .insert([prescriptionData])
        .select()
        .single();

    if (error) {
        console.error("Failed to create prescription:", error);
        throw error;
    }
    return data as unknown as Prescription;
}

export async function getPrescriptionById(prescriptionId: string): Promise<Prescription | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("prescriptions")
        .select()
        .eq("id", prescriptionId)
        .single();

    if (error) {
        console.error("Failed to get prescription:", error);
        return null;
    }
    return data as unknown as Prescription;
}

export async function updatePrescription(prescriptionId: string, updates: Partial<Prescription>) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("prescriptions")
        .update(updates)
        .eq("id", prescriptionId)
        .select()
        .single();

    if (error) {
        console.error("Failed to update prescription:", error);
        throw error;
    }
    return data as unknown as Prescription;
}

export async function listPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("prescriptions")
        .select()
        .eq("patient_id", patientId);

    if (error) {
        console.error("Failed to list prescriptions:", error);
        return [];
    }
    return data as unknown as Prescription[];
}

export async function listPendingPrescriptions(): Promise<Prescription[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("prescriptions")
        .select()
        .eq("status", "Active");

    if (error) {
        console.error("Failed to list pending prescriptions:", error);
        return [];
    }
    return data as unknown as Prescription[];
}

/**
 * LAB REQUEST OPERATIONS
 */

export async function createLabRequest(labRequestData: Omit<LabRequest, "$id" | "$createdAt" | "$updatedAt">) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .insert([labRequestData])
        .select()
        .single();

    if (error) {
        console.error("Failed to create lab request:", error);
        throw error;
    }
    return data as unknown as LabRequest;
}

export async function getLabRequestById(labRequestId: string): Promise<LabRequest | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .select()
        .eq("id", labRequestId)
        .single();

    if (error) {
        console.error("Failed to get lab request:", error);
        return null;
    }
    return data as unknown as LabRequest;
}

export async function listLabRequestsByPatient(patientId: string): Promise<LabRequest[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .select()
        .eq("patient_id", patientId);

    if (error) {
        console.error("Failed to list lab requests:", error);
        return [];
    }
    return data as unknown as LabRequest[];
}

export async function listPendingLabRequests(): Promise<LabRequest[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .select()
        .eq("status", "Pending");

    if (error) {
        console.error("Failed to list pending lab requests:", error);
        return [];
    }
    return data as unknown as LabRequest[];
}

export async function listCompletedLabRequests(): Promise<LabRequest[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .select()
        .eq("status", "Completed");

    if (error) {
        console.error("Failed to list completed lab requests:", error);
        return [];
    }
    return data as unknown as LabRequest[];
}

export async function updateLabRequest(labRequestId: string, updates: Partial<LabRequest>) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .update(updates)
        .eq("id", labRequestId)
        .select()
        .single();

    if (error) {
        console.error("Failed to update lab request:", error);
        throw error;
    }
    return data as unknown as LabRequest;
}

/**
 * PAYMENT OPERATIONS
 */

export async function createPayment(paymentData: Omit<Payment, "$id" | "$createdAt" | "$updatedAt">) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("payments")
        .insert([paymentData])
        .select()
        .single();

    if (error) {
        console.error("Failed to create payment:", error);
        throw error;
    }
    return data as unknown as Payment;
}

export async function getPaymentById(paymentId: string): Promise<Payment | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("payments")
        .select()
        .eq("id", paymentId)
        .single();

    if (error) {
        console.error("Failed to get payment:", error);
        return null;
    }
    return data as unknown as Payment;
}

export async function listPaymentsByPatient(patientId: string): Promise<Payment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("payments")
        .select()
        .eq("patient_id", patientId);

    if (error) {
        console.error("Failed to list payments:", error);
        return [];
    }
    return data as unknown as Payment[];
}

export async function listPendingPayments(): Promise<Payment[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("payments")
        .select()
        .eq("status", "Pending");

    if (error) {
        console.error("Failed to list pending payments:", error);
        return [];
    }
    return data as unknown as Payment[];
}

/**
 * NURSING ACTION OPERATIONS
 */

export async function createNursingAction(actionData: any) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("nursing_actions")
        .insert([actionData])
        .select()
        .single();

    if (error) {
        console.error("Failed to create nursing action:", error);
        throw error;
    }
    return data;
}

export async function getNursingActionById(actionId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("nursing_actions")
        .select()
        .eq("id", actionId)
        .single();

    if (error) {
        console.error("Failed to get nursing action:", error);
        return null;
    }
    return data;
}

export async function listPendingNursingActions() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("nursing_actions")
        .select()
        .eq("status", "Pending");

    if (error) {
        console.error("Failed to list pending nursing actions:", error);
        return [];
    }
    return data;
}

export async function listNursingActionsByPatient(patientId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("nursing_actions")
        .select()
        .eq("patient_id", patientId);

    if (error) {
        console.error("Failed to list nursing actions:", error);
        return [];
    }
    return data;
}

export async function updateNursingAction(actionId: string, updates: any) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("nursing_actions")
        .update(updates)
        .eq("id", actionId)
        .select()
        .single();

    if (error) {
        console.error("Failed to update nursing action:", error);
        throw error;
    }
    return data;
}

/**
 * DRUG DISPENSING OPERATIONS
 */

export async function createDrugDispensingRecord(dispensingData: any) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("drug_dispensing")
        .insert([dispensingData])
        .select()
        .single();

    if (error) {
        console.error("Failed to create drug dispensing record:", error);
        throw error;
    }
    return data;
}

export async function listDispensingByPatient(patientId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("drug_dispensing")
        .select()
        .eq("patient_id", patientId);

    if (error) {
        console.error("Failed to list dispensing records:", error);
        return [];
    }
    return data;
}

/**
 * AUDIT LOGGING
 */

export async function logAction(userId: string, action: string, entityType: string, entityId: string, changes?: any) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("audit_logs")
        .insert([{
            user_id: userId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            changes: changes || {},
            timestamp: new Date().toISOString()
        }]);

    if (error) {
        console.error("Failed to create audit log:", error);
    }
}
