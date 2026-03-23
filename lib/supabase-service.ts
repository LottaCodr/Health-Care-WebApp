/**
 * Supabase Service Layer
 * Centralized data access for all tables
 * Uses Supabase SSR for security and performance
 */

"use server";

import { createClient } from "@/utils/supabase/server";
import {
    Staff,
    Consultation,
    Prescription,
    LabRequest,
    Payment,
    PatientStatus,
    UserRole,
    ConsultationInput,
    Patient,
} from "@/types/models";
import { PostgrestResponse } from "@supabase/supabase-js";
// import { Patient } from "@/context/patients/types";

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

export async function createConsultation(data: ConsultationInput) {
    const supabase = await createClient();
    const { data: result, error } = await supabase
        .from("consultations")
        .insert([{
            patient_id: data.patientId,
            doctor_id: data.doctorId,
            symptoms: data.symptoms,
            diagnosis: data.diagnosis,
            prescriptions: data.prescriptions ?? null,
            recommendations: data.recommendations ?? null,
            referred_to: data.referredTo ?? null,
            assigned_staff_id: data.assignedStaffId ?? null,
            status: data.status ?? 'underConsultation',
            // consultation_date, created_at, updated_at — let DB default
        }])
        .select()
        .single();

    if (error) { console.error("Failed to create consultation:", error); throw error; }
    return result;
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

// REPLACE the existing createPrescription function with this:

export async function createPrescription(data: {
    patientId: string;
    pharmacistId?: string;
    drugName: string;
    dosage: string;
    duration?: string;
    price: number;
    notes?: string;
    dispensed?: boolean;
}) {
    const supabase = await createClient();

    const { data: result, error } = await supabase
        .from("prescriptions")
        .insert([{
            patient_id: data.patientId,
            pharmacist_id: data.pharmacistId ?? null,
            drug_name: data.drugName,       // ← snake_case
            dosage: data.dosage,
            duration: data.duration ?? null,
            price: data.price,
            notes: data.notes ?? null,
            status: "Active",
            dispensed: data.dispensed ?? false,
            dispensed_at: data.dispensed ? new Date().toISOString() : null,
        }])
        .select()
        .single();

    if (error) {
        console.error("Failed to create prescription:", error);
        throw error;
    }
    return result;
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
        .select("*, patients(name, phone, gender)")
        .eq("status", "Active")
        .order("created_at", { ascending: false });

    if (error) { console.error("Failed to list pending prescriptions:", error); return []; }
    return data as unknown as Prescription[];
}

/**
 * LAB REQUEST OPERATIONS
 */

export async function createLabRequest(data: {
    patientId: string;
    requestedBy?: string;
    testType?: string;
    priority?: string;
    notes?: string;
    status?: string;
}) {
    const supabase = await createClient();
    const { data: result, error } = await supabase
        .from("lab_requests")
        .insert([{
            visit_id: data.patientId,
            requested_by: data.requestedBy ?? null,
            test_type: data.testType ?? null,
            priority: data.priority ?? 'routine',
            notes: data.notes ?? null,
            status: data.status ?? 'pending',
        }])
        .select()
        .single();

    if (error) { console.error(error); throw error; }
    return result;
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
        .eq("visit_id", patientId);   // ← was patient_id

    if (error) { console.error("Failed to list lab requests:", error); return []; }
    return data as unknown as LabRequest[];
}

export async function listCompletedLabRequests(): Promise<LabRequest[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .select()
        .eq("status", "completed");

    if (error) {
        console.error("Failed to list completed lab requests:", error);
        return [];
    }
    return data as unknown as LabRequest[];
}

export async function listPendingLabRequests(): Promise<LabRequest[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests").select().eq("status", "pending");
    if (error) { console.error(error); return []; }
    return data as unknown as LabRequest[];
}

export async function updateLabRequest(labRequestId: string, updates: {
    status?: string;
    result?: string;
    completed_by?: string;
    completed_at?: string;
    priority?: string;
    notes?: string;
}) {
    const supabase = await createClient();

    // Only map fields that were actually provided
    const mapped: Record<string, any> = {};
    if (updates.status !== undefined) mapped.status = updates.status;
    if (updates.result !== undefined) mapped.result = updates.result;
    if (updates.completed_by !== undefined) mapped.completed_by = updates.completed_by;
    if (updates.completed_at !== undefined) mapped.completed_at = updates.completed_at;
    if (updates.priority !== undefined) mapped.priority = updates.priority;
    if (updates.notes !== undefined) mapped.notes = updates.notes;

    const { data, error } = await supabase
        .from("lab_requests")
        .update(mapped)
        .eq("id", labRequestId)
        .select()
        .single();

    if (error) { console.error("Failed to update lab request:", error); throw error; }
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

export async function confirmPayment(paymentId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("payments")
        .update({
            status: "paid",
            paid_at: new Date().toISOString(),
        })
        .eq("id", paymentId)
        .select()
        .single();

    if (error) { console.error("Failed to confirm payment:", error); throw error; }

    // Discharge the patient
    if (data?.patient_id) {
        await supabase
            .from("patients")
            .update({ status: "discharged" })
            .eq("id", data.patient_id);
    }

    return data;
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

export async function listPendingPayments() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("status", "pending")
        .eq("reference_type", "prescription")  // only prescription payments
        .order("created_at", { ascending: false });

    if (error) { console.error("Failed to list pending payments:", error); return []; }
    if (!data?.length) return [];

    // Fetch patient names separately for each unique patient_id
    const patientIds = [...new Set(data.map((p) => p.patient_id).filter(Boolean))];
    const { data: patients } = await supabase
        .from("patients")
        .select("id, name, phone")
        .in("id", patientIds);

    const patientMap = Object.fromEntries((patients ?? []).map((p) => [p.id, p]));

    // Attach patient data to each payment row
    return data.map((payment) => ({
        ...payment,
        patients: patientMap[payment.patient_id] ?? null,
    }));

}

/**
 * NURSING ACTION OPERATIONS
 */

export async function createNursingAction(actionData: {
    patientId: string;
    actionType: string;
    description?: string;
    status: string;
    assignedNurse?: string;
    completedBy?: string;
    completionTime?: string;
}) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("nursing_actions")
        .insert([{
            patient_id: actionData.patientId,
            action_type: actionData.actionType,
            description: actionData.description,
            status: actionData.status,
            assigned_nurse: actionData.assignedNurse,
            completed_by: actionData.completedBy,
            completion_time: actionData.completionTime,
        }])
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

export async function updateNursingAction(actionId: string, updates: {
    status?: string;
    description?: string;
    completedBy?: string;
    completionTime?: string;
}) {
    const supabase = await createClient();

    // Map only the fields that were actually provided
    const mapped: Record<string, any> = {};
    if (updates.status !== undefined) mapped.status = updates.status;
    if (updates.description !== undefined) mapped.description = updates.description;
    if (updates.completedBy !== undefined) mapped.completed_by = updates.completedBy;
    if (updates.completionTime !== undefined) mapped.completion_time = updates.completionTime;

    const { data, error } = await supabase
        .from("nursing_actions")
        .update(mapped)
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
