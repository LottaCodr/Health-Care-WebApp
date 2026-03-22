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
}

// User Roles
export enum UserRole {
    FrontDesk = "FrontDesk",
    Doctor = "Doctor",
    Nurse = "Nurse",
    LabTechnician = "LabTechnician",
    Pharmacist = "Pharmacist",
    Admin = "Admin",
}

// Patient entity
export interface Patient {
    id: string;
    name: string;
    email: string;
    phone: string;
    gender: "Male" | "Female" | "Other";
    dateOfBirth: string;
    date_of_birth?: string;
    address: string;
    occupation?: string;
    city: string;
    state: string;
    bloodGroup: string;
    blood_group?: string;
    geno_type: string;
    allergies: string;
    medicalHistory: string;
    medical_history?: string;
    emergencyContactName: string;
    emergency_contact_name?: string;
    emergency_contact_email?: string;
    emergency_contact_address?: string;
    emergencyContactPhone: string;
    emergency_contact_phone?: string;
    emergencyContactRelationship: string;
    emergency_contact_relationship?: string;
    current_medication?: string;
    long_term_medication?: string;
    significant_medication_history?: string;
    covid_vaccination_options?: boolean;
    hmo?: boolean;
    hmo_name?: string;
    policy_number?: string;
    company?: boolean;
    company_name?: string;
    private_client?: boolean;
    status: PatientStatus;
    registrationDate: string;
    registration_date?: string;
    registeredBy: string; // Staff ID (Front Desk)
    registered_by?: string;
    notes: string;
    created_at?: string;
    updated_at?: string;
}

// Staff/User entity
export interface Staff {
    id: string;
    name: string;
    email: string;
    phone: string;
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
    // Identity fields
    id: string;                  // Unique identifier
    patient_id: string;          // Patient's ID
    doctor_id: string;           // Doctor's ID

    // Clinical content
    symptoms: string;
    diagnosis: string;
    prescriptions?: string | null;
    recommendations?: string | null;

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
    createdDate: string;
    created_date?: string;
    created_at?: string;
    updated_at?: string;
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
    patientId: string;
    patient_id?: string;
    amount: number;
    paymentMethod: "Cash" | "Card" | "Transfer" | "Cheque";
    payment_method?: string;
    status: "Pending" | "Completed" | "Failed" | "Refunded";
    description: string;
    processedBy: string; // Staff ID (Front Desk)
    processed_by?: string;
    processedDate: string;
    processed_date?: string;
    created_at?: string;
    updated_at?: string;
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
