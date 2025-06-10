
import { Staff } from "@/types/appwrite.types";

export type PatientStatus = 'admitted' | 'discharged' | 'under observation' | 'no status';

export interface Patient {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    $permissions: string[];
    $databaseId: string;
    $collectionId: string;

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

    status: PatientStatus
    userId: string;
    doctorId?: string;
    notes?: string;
    staff?: string
}
export interface SortConfig {
    key: keyof Patient;
    direction: 'asc' | 'desc';
}


export interface PatientState {
    patient: Patient | null;
    doctorId?: string;
    notes: string;
    status: string;
    recipientRole: string;
    recipientName: string | null;
    loading: boolean;
    staff?: (Staff | string)[] | null
}

export type PatientAction =
    | { type: "SET_PATIENT"; payload: Patient }
    | { type: "SET_ASSIGNED_STAFF"; payload: Staff }
    | { type: "SET_ASSIGNED_DOCTOR"; payload: string }
    | { type: "UPDATE_NOTES"; payload: string }
    | { type: "SET_STATUS"; payload: string }
    | { type: "SET_RECIPIENT_ROLE"; payload: string }
    | { type: "SET_LOADING"; payload: boolean }
    | { type: "SET_RECIPIENT_NAME"; payload: string }
    | { type: "RESET_FORM" }
