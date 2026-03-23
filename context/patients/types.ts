import { Staff } from "@/actions/staff/types";
import { Patient } from "@/types/models";


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

// export interface Patient {
//     id?: string; // Important: Appwrite adds this as a unique identifier
//     created_at?: string;
//     $updatedAt?: string;

//     // Step 1: Personal Information
//     name: string;
//     religion: string;
//     email: string;
//     phone: string;
//     birth_date: Date | null; // converted to Date when saving
//     gender: "Male" | "Female"; // from GenderOptions
//     occupation: string;
//     address: string;

//     // Step 2: Emergency Contact
//     emergencyContactName: string;
//     emergencyContactNumber: string;
//     emergencyContactRelationship: string;
//     emergencyContactEmail: string;
//     emergencyContactAddress: string;

//     // Step 3: General Medical History
//     allergies: string;
//     currentMedication?: string;
//     significantMedicationHistory: string;
//     longTermMedication: string;
//     covidVaccinationOptions: "Yes" | "No"; // from CovidVaccinationOptions
//     bloodGroup: string; // e.g. "O+", "A-"
//     genoType: string; // e.g. "AA", "AS", "SS"

//     // Step 4: Medical Insurance Detail
//     policyNumber: string;
//     hmo: boolean;
//     hmoName: string;
//     company: boolean;
//     companyName: string;
//     privateClient: boolean;

//     status: PatientStatus;
//     userId: string; // Creator (likely front desk staff)
//     // doctorId?: string; // Optional: Assigned doctor
//     notes?: string;

//     // Optional consultation fields if you want to store them here
//     symptoms?: string;
//     diagnosis?: string;
//     prescriptions?: string;
//     recommendations?: string;
// }

export interface SortConfig {
    key: keyof Patient;
    direction: 'asc' | 'desc';
}


export interface PatientState {
    patient: Patient[];
    doctorId?: string;
    notes: string;
    status: PatientStatus;
    recipientRole: string;
    recipientName: string | null;
    loading: boolean;

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
    | { type: "RESET_FORM" }
