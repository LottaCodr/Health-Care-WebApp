/**
 * Core domain models for the Hospital EMR system
 * Aligned with Appwrite collections
 */

// Patient Status enum representing the patient journey
export enum PatientStatus {
    Registered = "Registered",
    AwaitingConsultation = "AwaitingConsultation",
    UnderConsultation = "UnderConsultation",
    SentToNurse = "SentToNurse",
    SentToLab = "SentToLab",
    SentToPharmacy = "SentToPharmacy",
    AwaitingPayment = "AwaitingPayment",
    AwaitingDoctorReview = "AwaitingDoctorReview",
    AwaitingNextStep = "AwaitingNextStep",
    Discharged = "Discharged",
    Cancelled = "Cancelled",
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
    $id: string;
    name: string;
    email: string;
    phone: string;
    gender: "Male" | "Female" | "Other";
    dateOfBirth: string;
    address: string;
    city: string;
    state: string;
    bloodGroup: string;
    genotype: string;
    allergies: string;
    medicalHistory: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelationship: string;
    status: PatientStatus;
    registrationDate: string;
    registeredBy: string; // Staff ID (Front Desk)
    notes: string;
    $createdAt: string;
    $updatedAt: string;
}

// Staff/User entity
export interface Staff {
    $id: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    department: string;
    licenseNumber?: string;
    registrationNumber?: string;
    dateJoined: string;
    status: "Active" | "Inactive";
    $createdAt: string;
    $updatedAt: string;
}

// Consultation entity
export interface Consultation {
    $id: string;
    patientId: string;
    doctorId: string;
    startTime: string;
    endTime?: string;
    symptoms: string;
    diagnosis: string;
    notes: string;
    status: "Scheduled" | "InProgress" | "Completed" | "Cancelled";
    $createdAt: string;
    $updatedAt: string;
}

// Prescription entity
export interface Prescription {
    $id: string;
    consultationId: string;
    patientId: string;
    nurseId: string;
    medications: PrescriptionMedication[];
    instructions: string;
    status: "Active" | "Dispensed" | "Completed";
    createdDate: string;
    $createdAt: string;
    $updatedAt: string;
}

// Prescription Medication details
export interface PrescriptionMedication {
    drugName: string;
    dosage: string;
    frequency: string;
    duration: string;
    note: string;
    route: string;
}

// Lab Request entity
export interface LabRequest {
    $id: string;
    patientId: string;
    consultationId: string;
    doctorId: string;
    testType: string;
    testDescription: string;
    status: "Pending" | "InProgress" | "Completed" | "Cancelled";
    priority: "Normal" | "Urgent";
    requestDate: string;
    completionDate?: string;
    results?: string;
    $createdAt: string;
    $updatedAt: string;
}

// Payment entity
export interface Payment {
    $id: string;
    patientId: string;
    amount: number;
    paymentMethod: "Cash" | "Card" | "Transfer" | "Cheque";
    status: "Pending" | "Completed" | "Failed" | "Refunded";
    description: string;
    processedBy: string; // Staff ID (Front Desk)
    processedDate: string;
    $createdAt: string;
    $updatedAt: string;
}

// Appointment entity
export interface Appointment {
    $id: string;
    patientId: string;
    doctorId?: string;
    appointmentType: "Consultation" | "FollowUp" | "Procedure";
    appointmentDate: string;
    appointmentTime: string;
    duration: number; // in minutes
    status: "Scheduled" | "CheckedIn" | "Completed" | "Cancelled" | "NoShow";
    notes: string;
    $createdAt: string;
    $updatedAt: string;
}

// Nursing Action entity
export interface NursingAction {
    $id: string;
    patientId: string;
    consultationId: string;
    actionType: string; // e.g., "Vitals", "Injection", "Wound Dressing"
    description: string;
    status: "Pending" | "Completed";
    assignedNurse: string; // Staff ID
    completedBy?: string; // Staff ID
    completionTime?: string;
    $createdAt: string;
    $updatedAt: string;
}

// Drug/Medicine Inventory
export interface DrugInventory {
    $id: string;
    drugName: string;
    strength: string;
    unit: string;
    quantity: number;
    reorderLevel: number;
    expiryDate: string;
    batchNumber: string;
    supplier: string;
    cost: number;
    sellingPrice: number;
    $createdAt: string;
    $updatedAt: string;
}

// Drug Dispensing Record
export interface DrugDispensingRecord {
    $id: string;
    prescriptionId: string;
    patientId: string;
    pharmacistId: string;
    dispensedDate: string;
    dispensedMedications: DispensedMedication[];
    notes: string;
    $createdAt: string;
    $updatedAt: string;
}

// Dispensed Medication details
export interface DispensedMedication {
    drugId: string;
    drugName: string;
    quantityDispensed: number;
    quantityRemaining: number;
    expiryDate: string;
    batchNumber: string;
}

// Audit Log for tracking user actions
export interface AuditLog {
    $id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    changes: Record<string, any>;
    timestamp: string;
    $createdAt: string;
    $updatedAt: string;
}
