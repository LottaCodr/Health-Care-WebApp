/**
 * Core domain models for the Hospital EMR system
 * Aligned with Appwrite collections
 */

// Patient Status enum representing the patient journey
export enum PatientStatus {
    Registered = "registered",
    AwaitingConsultation = "awaiting-consultation",
    UnderConsultation = "under-consultation",
    SentToNurse = "sent-to-nurse",
    SentToLab = "sent-to-lab",
    SentToPharmacy = "sent-to-pharmacy",
    AwaitingPayment = "awaiting-payment",
    Admitted = "admitted",
    UnderObservation = "under-observation",
    Discharged = "discharged",
    NoStatus = "no-status",
    SentToRadiology = "sent-to-radiology",
}

// User Roles
export enum UserRole {
    FrontDesk = "FrontDesk",
    Doctor = "Doctor",
    Nurse = "Nurse",
    LabTechnician = "LabTechnician",
    Pharmacist = "Pharmacist",
    Radiologist = "Radiologist",
    Admin = "Admin",
}

// Patient entity
export interface Patient {
    id: string;
    name: string;
    email: string;
    phone: string;
    gender: "Male" | "Female" | "Other";
    birth_date: string;
    address: string;
    occupation?: string;
    religion: string;
    blood_group: string;
    geno_type: string;
    allergies: string;
    medical_history: string;
    emergency_contact_name: string;
    emergency_contact_email?: string;
    emergency_contact_address?: string;
    emergency_contact_number: string;
    emergency_contact_relationship: string;
    current_medication?: string;
    long_term_medication?: string;
    significant_medication_history?: string;
    covid_vaccination_options?: string;
    hmo?: boolean;
    hmo_name?: string;
    policy_number?: string;
    company?: boolean;
    company_name?: string;
    private_client?: boolean;
    status: PatientStatus;
    notes: string;
    facility_id?: string;
    portal_user_id?: string;
    portal_enabled?: boolean;
    /** Hospital number — one shared NVH-XXXXX series for EMR and bulk imports (e.g. NVH-00001). */
    hospital_number?: string;
    created_at?: string;
    updated_at?: string;
}

// Staff/User entity
export interface Staff {
    id: string;
    name: string;
    email: string;
    phone_number: string;
    role: UserRole;
    department: string;
    licenseNumber?: string;
    license_number?: string;
    registrationNumber?: string;
    registration_number?: string;
    dateJoined: string;
    date_joined?: string;
    status: "Active" | "Inactive";
    created_at?: string;
    updated_at?: string;
}

// Consultation entity
export interface Consultation {
    $id: any;
    startTime: string | number | Date;
    // Identity fields
    id: string;                  // Unique identifier
    patient_id: string;          // Patient's ID
    patient_name?: string | null;       // Denormalized patient name (when joined/denormalized)
    patientName?: string;        // camelCase variant
    patient_gender?: string | null;     // Joined patient gender (doctor dashboard)
    patient_birth_date?: string | null; // Joined patient date of birth
    patient_phone?: string | null;      // Joined patient phone
    doctor_id: string;           // Doctor's ID

    // Clinical content
    symptoms: string;
    diagnosis: string;
    prescriptions?: string | null;
    recommendations?: string | null;
    icd10_codes?: string[];

    // Routing
    referred_to?: string | null;         // Target department or staff role
    assigned_staff_id?: string | null;   // Assigned staff ID
    status: string;                      // Consultation status

    // Timestamps
    consultation_date: string;           // Date of consultation
    created_at: string;
    updated_at: string;
}

export interface ConsultationInput {
    patientId: string;
    doctorId: string;
    symptoms: string;
    diagnosis: string;
    prescriptions?: string;
    recommendations?: string;
    referredTo?: string;
    assignedStaffId?: string;
    status?: string;
}

// Prescription entity
export interface Prescription {
    id: string;
    consultationId: string;
    consultation_id?: string;
    patientId: string;
    patient_id?: string;
    nurseId: string;
    nurse_id?: string;
    pharmacist_id?: string;
    medications: PrescriptionMedication[];
    instructions: string;
    status: "Active" | "Dispensed" | "Completed";
    dispensed?: boolean;         // Tracks whether the prescription has been dispensed
    createdDate: string;
    created_date?: string;
    created_at?: string;
    updated_at?: string;
    price?: number;
}

// Prescription Medication details
export interface PrescriptionMedication {
    drugName: string;
    drug_name?: string;
    dosage: string;
    frequency: string;
    duration: string;
    note: string;
    route: string;
}

// Lab Request entity
export interface LabRequest {
    id: string;
    visit_id?: string;   // DB column (stores patient_id)
    patient_id?: string;
    requested_by?: string;
    test_type?: string;
    testType?: string;
    status: "pending" | "completed";
    priority?: string;
    notes?: string;
    result?: string;   // singular, matches DB
    completed_by?: string;   // add this
    completed_at?: string;   // add this
    created_at?: string;
}

// Payment entity
export interface Payment {
    id: string;
    patientId?: string;
    patient_id?: string;
    amount: number;
    amount_kobo?: number;
    amount_paid_kobo?: number;
    paymentMethod?: "Cash" | "Card" | "Transfer" | "Cheque";
    payment_method?: string;
    method?: "cash" | "card" | "transfer" | "cheque" | string;
    status:
        | "pending" | "partial" | "paid" | "waived" | "refunded" | "failed"
        | "Pending" | "Completed" | "Failed" | "Refunded";
    category?: "consultation" | "lab" | "radiology" | "pharmacy" | "procedure" | "admission" | "deposit" | "other" | string;
    description: string;
    processedBy?: string; // Staff ID (Front Desk/cashier)
    processed_by?: string;
    processedDate?: string;
    processed_date?: string;
    paid_at?: string;
    invoice_no?: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
    // ── Billing workflow extensions ──────────────────────────────────────────
    // Payment type: full | partial | deposit (advance payment held as credit).
    payment_type?: "full" | "partial" | "deposit";
    paymentType?: "full" | "partial" | "deposit";
    // Discounts (stored in kobo; percent/flat kept for audit).
    discount_kobo?: number;
    discount_percent?: number;
    discount_amount_kobo?: number;
    // Payer auto-identified at settlement: private | hmo | company.
    payer?: "private" | "hmo" | "company" | string;
    payer_reference?: string; // HMO name / company name
    payer_code?: string;      // authorization / claim / corporate reference code
    // Deposit accounting: how much of a deposit row has been applied to bills.
    applied_kobo?: number;
    // Patients join (listPendingPayments enrichment).
    patients?: any;
}

// Appointment entity
export interface Appointment {
    id: string;
    patientId: string;
    patient_id?: string;
    doctorId?: string;
    doctor_id?: string;
    appointmentType: "Consultation" | "FollowUp" | "Procedure";
    appointment_type?: string;
    appointmentDate: string;
    appointment_date?: string;
    appointmentTime: string;
    appointment_time?: string;
    duration: number; // in minutes
    status: "Scheduled" | "CheckedIn" | "Completed" | "Cancelled" | "NoShow";
    notes: string;
    created_at?: string;
    updated_at?: string;
    
}

// Nursing Action entity
export interface NursingAction {
    id: string;
    patientId: string;
    patient_id?: string;
    consultationId: string;
    consultation_id?: string;
    actionType: string; // e.g., "Vitals", "Injection", "Wound Dressing"
    action_type?: string;
    description: string;
    status: "Pending" | "Completed" | "InProgress";
    assignedNurse: string; // Staff ID
    assigned_nurse?: string;
    completedBy?: string; // Staff ID
    completed_by?: string;
    completionTime?: string;
    completion_time?: string;
    created_at?: string;
    updated_at?: string;
}

// Drug/Medicine Inventory
export interface DrugInventory {
    id: string;
    drugName: string;
    drug_name?: string;
    strength: string;
    unit: string;
    quantity: number;
    reorderLevel: number;
    reorder_level?: number;
    expiryDate: string;
    expiry_date?: string;
    batchNumber: string;
    batch_number?: string;
    supplier: string;
    cost: number;
    sellingPrice: number;
    selling_price?: number;
    created_at?: string;
    updated_at?: string;
}

// Drug Dispensing Record
export interface DrugDispensingRecord {
    id: string;
    prescriptionId: string;
    prescription_id?: string;
    patientId: string;
    patient_id?: string;
    pharmacistId: string;
    pharmacist_id?: string;
    dispensedDate: string;
    dispensed_date?: string;
    dispensedMedications: DispensedMedication[];
    dispensed_medications?: DispensedMedication[];
    notes: string;
    created_at?: string;
    updated_at?: string;
}

// Dispensed Medication details
export interface DispensedMedication {
    drugId: string;
    drug_id?: string;
    drugName: string;
    drug_name?: string;
    quantityDispensed: number;
    quantity_dispensed?: number;
    quantityRemaining: number;
    quantity_remaining?: number;
    expiryDate: string;
    expiry_date?: string;
    batchNumber: string;
    batch_number?: string;
}

export interface DrugInventoryItem {
    id: string;
    drug_name: string;
    generic_name?: string;
    category?: string;
    unit: string;
    quantity: number;
    reorder_level: number;
    price: number;
    cost_price?: number;
    manufacturer?: string;
    dosage_form?: string;
    strength?: string;
    requires_prescription?: boolean;
    supplier?: string;
    expiry_date?: string;
    batch_number?: string;
    location?: string;
    notes?: string;
    is_active: boolean;
    created_by?: string;
    created_at: string;
    updated_at: string;
}


// Audit Log for tracking user actions
export interface AuditLog {
    id: string;
    userId: string;
    user_id?: string;
    action: string;
    entityType: string;
    entity_type?: string;
    entityId: string;
    entity_id?: string;
    changes: Record<string, any>;
    timestamp: string;
    created_at?: string;
    updated_at?: string;
}


export interface Notification {
    id: string;
    recipient_id: string;
    role?: string;
    title: string;
    message: string;
    type: "info" | "alert" | "success" | "warning";
    read: boolean;
    link?: string;
    created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// EMR completeness modules (2026-08-14)
// ─────────────────────────────────────────────────────────────────────────────

export interface PatientAllergy {
    id: string;
    patient_id: string;
    allergen: string;
    category: "drug" | "food" | "environmental" | "other";
    reaction?: string;
    severity: "mild" | "moderate" | "severe" | "life-threatening";
    status: "active" | "resolved";
    onset_date?: string;
    recorded_by?: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Immunization {
    id: string;
    patient_id: string;
    vaccine: string;
    dose_number: number;
    administered_date: string;
    administered_by?: string;
    site?: string;
    route?: string;
    lot_number?: string;
    manufacturer?: string;
    next_due_date?: string;
    notes?: string;
    created_at?: string;
}

export type SurgeryStatus = "scheduled" | "in-progress" | "completed" | "cancelled";

export interface Surgery {
    id: string;
    patient_id: string;
    surgeon_id?: string;
    anaesthetist_id?: string;
    procedure_name: string;
    urgency: "elective" | "urgent" | "emergency";
    status: SurgeryStatus;
    theatre?: string;
    scheduled_at?: string;
    started_at?: string;
    completed_at?: string;
    pre_op_diagnosis?: string;
    post_op_diagnosis?: string;
    anaesthesia_type?: string;
    findings?: string;
    procedure_details?: string;
    complications?: string;
    blood_loss_ml?: number;
    disposition?: string;
    notes?: string;
    created_at?: string;
    updated_at?: string;
}

export interface Referral {
    id: string;
    patient_id: string;
    referred_by?: string;
    referred_to_facility: string;
    referred_to_department?: string;
    referred_to_doctor?: string;
    reason: string;
    clinical_summary?: string;
    urgency: "routine" | "urgent" | "emergency";
    status: "pending" | "sent" | "accepted" | "declined" | "completed";
    sent_at?: string;
    response_notes?: string;
    created_at?: string;
}

export type SpecimenStatus = "collected" | "received" | "processing" | "completed" | "rejected";

export interface LabSpecimen {
    id: string;
    lab_request_id?: string;
    patient_id: string;
    specimen_type: string;
    container?: string;
    barcode: string;
    collection_at?: string;
    collected_by?: string;
    received_at?: string;
    received_by?: string;
    status: SpecimenStatus;
    rejection_reason?: string;
    notes?: string;
    created_at?: string;
}

export interface Ward {
    id: string;
    name: string;
    department?: string;
    total_beds: number;
    is_active: boolean;
    created_at?: string;
}

export interface DrugBatch {
    id: string;
    drug_id: string;
    batch_number: string;
    manufacturer?: string;
    expiry_date: string;
    quantity: number;
    received_at?: string;
    received_by?: string;
    notes?: string;
    created_at?: string;
}

export interface MedReconciliation {
    id: string;
    patient_id: string;
    admission_id?: string;
    encounter_type: "admission" | "discharge" | "transfer";
    medications: MedReconciliationItem[];
    changes_summary?: string;
    performed_by?: string;
    performed_at?: string;
    created_at?: string;
}

export interface MedReconciliationItem {
    drugName: string;
    dosage: string;
    frequency: string;
    route: string;
    action: "continue" | "stop" | "change" | "start";
}

export type ConsentType = "treatment" | "procedure" | "data_privacy" | "research" | "photography";

export interface ConsentRecord {
    id: string;
    patient_id: string;
    consent_type: ConsentType;
    version: number;
    status: "signed" | "declined" | "withdrawn";
    signed_by_patient: boolean;
    witness_id?: string;
    signed_at?: string;
    expires_at?: string;
    document_id?: string;
    notes?: string;
    created_at?: string;
}

export interface DeathCertificate {
    id: string;
    patient_id: string;
    certifying_doctor?: string;
    date_of_death: string;
    time_of_death?: string;
    place_of_death?: string;
    immediate_cause?: string;
    icd10_immediate?: string;
    antecedent_cause?: string;
    icd10_antecedent?: string;
    other_conditions?: string;
    manner_of_death: "natural" | "accident" | "suicide" | "homicide" | "undetermined";
    issued_at?: string;
    created_at?: string;
}

export interface BirthCertificate {
    id: string;
    child_name: string;
    sex?: "male" | "female";
    date_of_birth: string;
    time_of_birth?: string;
    place_of_birth?: string;
    weight_kg?: number;
    mother_patient_id?: string;
    father_name?: string;
    attending_staff?: string;
    created_at?: string;
}

export interface Facility {
    id: string;
    name: string;
    code: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    is_active: boolean;
    created_at?: string;
}

