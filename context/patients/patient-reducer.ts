import { PatientState, PatientAction } from "./types";

export const initialPatientState: PatientState = {
    patient: null,
    notes: "",
    status: "",
    recipientName: "",
    recipientRole: "",
    loading: false,
    staff: null
}

export function patientReducer(state: PatientState, action: PatientAction): PatientState {
    switch (action.type) {

        case "SET_PATIENT":
            return {
                ...state,
                patient: action.payload,
                status: action.payload.status || ""
            }
        case "SET_ASSIGNED_STAFF":
            return {
                ...state,
                staff: Array.isArray(action.payload) ? action.payload : null
            }
        case "UPDATE_NOTES":
            return {
                ...state,
                notes: action.payload
            }
        case "SET_STATUS":
            return {
                ...state,
                status: action.payload
            }
        case "SET_RECIPIENT_ROLE":
            
            return {
                ...state,
                recipientRole: action.payload
            }
        case "SET_RECIPIENT_NAME":
            return { ...state, recipientName: action.payload };
        case "SET_LOADING":
            return {
                ...state,
                loading: action.payload
            }
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