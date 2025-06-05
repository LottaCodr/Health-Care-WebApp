import { PatientState, PatientAction } from "./types";

export const initialPatientState: PatientState = {
    patient: null,
    notes: "",
    status: "",
    recipientName: "",
    recipientRole: "",
    loading: false
}

export function patientReducer(state: PatientState, action: PatientAction): PatientState {
    switch (action.type) {
        case "SET_PATIENT":
            return {
                ...state,
                patient: action.payload,
                status: action.payload.status || ""
            }
        case "UPDATE_NOTES":
            return { ...state, notes: action.payload }
        case "SET_STATUS":
            return { ...state, status: action.payload }
        case "SET_RECIPIENT_ROLE":
            const roleMap: Record<string, string> = {
                nurse: "Nurse Jane Doe",
                pharmacist: "Pharm TOlu Chukwuka",
                labtech: "Lab Tech Elon"
            }
            return {
                ...state,
                recipientName: roleMap[action.payload.toLowerCase()] ?? null,
                recipientRole: action.payload
            }
        case "SET_LOADING":
            return { ...state, loading: action.payload }
        case "RESET_FORM":
            return {
                ...state,
                notes: '',
                status: '',
                recipientName: '',
                recipientRole: " ",
                loading: false
            }
        default:
            return state
    }
}