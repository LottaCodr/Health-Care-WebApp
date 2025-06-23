import { Staff } from "@/actions/staff/types";


export type PatientStatus =
    | 'registered'
    | 'awaiting-consultation'
    | 'under-consultation'
    | 'sent-to-nurse'
    | 'sent-to-lab'
    | 'sent-to-pharmacy'
    | 'awaiting-payment'
    | 'admitted'
    | 'under-observation'
    | 'discharged'
    | 'no-status';

export interface Patient {
    $id?: string; // Important: Appwrite adds this as a unique identifier
    $createdAt?: string;
    $updatedAt?: string;

    name: string;
    email: string;
    phone: string;
    gender: string;
    address: string;
    occupation: string;
    birthDate: string | Date;

    privacyConsent: boolean;
    disclosureConsent: boolean;
    treatmentConsent: boolean;

    emergencyContactName: string;
    emergencyContactNumber: string;

    insuranceProvider: string;
    insurancePolicyNumber: string;

    allergies: string;
    currentMedication: string;
    familyMedicalHistory: string;
    pastMedicalHistory: string;
    primaryPhysician: string;

    identificationType: string;
    identificationNumber: string;
    identificationDocumentId: string | null;
    identificationDocumentUrl: string;

    status: PatientStatus;
    userId: string; // Creator (likely front desk staff)
    doctorId?: string; // Optional: Assigned doctor
    notes?: string;

    // Optional consultation fields if you want to store them here
    symptoms?: string;
    diagnosis?: string;
    prescriptions?: string;
    recommendations?: string;
}

export interface SortConfig {
    key: keyof Patient;
    direction: 'asc' | 'desc';
}


export interface PatientState {
    patient: Patient[];
    doctorId?: string;
    notes: string;
    status: string;
    recipientRole: string;
    recipientName: string | null;
    loading: boolean;
    symptoms: string;
    diagnosis: string;
    prescriptions: string;
    recommendations: string;
}

export type PatientAction =
    | { type: "SET_PATIENT"; payload: Patient[] }
    | { type: "ADD_PATIENT"; payload: Patient }
    | { type: "UPDATE_PATIENT"; payload: Patient }
    | { type: "DELETE_PATIENT"; payload: string }
    | { type: "SET_ASSIGNED_STAFF"; payload: Staff }
    | { type: "SET_ASSIGNED_DOCTOR"; payload: string }
    | { type: "UPDATE_NOTES"; payload: string }
    | { type: "SET_STATUS"; payload: string }
    | { type: "SET_RECIPIENT_ROLE"; payload: string }
    | { type: "SET_LOADING"; payload: boolean }
    | { type: "SET_RECIPIENT_NAME"; payload: string }
    | { type: "SET_SYMPTOMS", payload: string }
    | { type: "SET_DIAGNOSIS", payload: string }
    | { type: "SET_PRESCRIPTIONS", payload: string }
    | { type: "SET_RECOMMENDATIONS", payload: string }
    | { type: "RESET_FORM" }
