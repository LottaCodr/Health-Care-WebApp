// types/patients.ts

export type PatientStatus = 'admitted' | 'discharged' | 'under observation' | '';

export interface Patient {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
    $permissions: string[];
    $databaseId: string;
    $collectionId: string;

    fullName: string;
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
