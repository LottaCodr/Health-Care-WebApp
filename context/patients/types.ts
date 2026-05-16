import { Staff } from "@/actions/staff/types";
import { Patient, PatientStatus } from "@/types/models";



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
    | { type: "SET_STATUS"; payload: PatientStatus }
    | { type: "SET_RECIPIENT_ROLE"; payload: string }
    | { type: "SET_LOADING"; payload: boolean }
    | { type: "RESET_FORM" }

