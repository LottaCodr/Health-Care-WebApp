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
