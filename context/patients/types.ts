// types/patients.ts

export type PatientStatus = 'admitted' | 'discharged' | 'under observation' | '';

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
}
export interface SortConfig {
    key: keyof Patient;
    direction: 'asc' | 'desc';
}


export interface PatientState {
    patient: Patient | null;
    notes: string;
    status: string;
    recipientRole: string;
    recipientName: string | null;
    loading: boolean;
}

export type PatientAction =
    | { type: "SET_PATIENT"; payload: Patient }
    | { type: "UPDATE_NOTES"; payload: string }
    | { type: "SET_STATUS"; payload: string }
    | { type: "SET_RECIPIENT_ROLE"; payload: string }
    | { type: "SET_LOADING"; payload: boolean }
    | { type: "RESET_FORM" }
