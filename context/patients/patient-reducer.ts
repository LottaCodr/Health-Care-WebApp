import { PatientState, PatientAction } from "./types";



export const initialPatientState: PatientState = {
    patient: [],
    notes: "",
    status: "",
    recipientName: "",
    recipientRole: "",
    loading: false,
    staff: null,
    symptoms: '',
    diagnosis: "",
    prescriptions: '',
    recommendations: ''
}

export function patientReducer(state: PatientState, action: PatientAction): PatientState {
    switch (action.type) {
        case "SET_PATIENT":
            return { ...state, patient: action.payload }
        case "ADD_PATIENT":
            return { ...state, patient: [...state.patient, action.payload] }
        case "UPDATE_PATIENT":
            return { ...state, patient: state.patient.map(p => p.userId == action.payload.userId ? action.payload : p) }
        case 'DELETE_PATIENT':
            return { ...state, patient: state.patient.filter((p) => p.userId !== action.payload) }
        case "SET_ASSIGNED_STAFF":
            return { ...state, staff: Array.isArray(action.payload) ? action.payload : null }
        case "UPDATE_NOTES":
            return { ...state, notes: action.payload }
        case "SET_STATUS":
            return { ...state, status: action.payload }
        case "SET_RECIPIENT_ROLE":
            return { ...state, recipientRole: action.payload }
        case "SET_RECIPIENT_NAME":
            return { ...state, recipientName: action.payload }
        case "SET_LOADING":
            return { ...state, loading: action.payload }

        // ✅ Add these missing handlers:
        case "SET_SYMPTOMS":
            return { ...state, symptoms: action.payload }
        case "SET_DIAGNOSIS":
            return { ...state, diagnosis: action.payload }
        case "SET_PRESCRIPTIONS":
            return { ...state, prescriptions: action.payload }
        case "SET_RECOMMENDATIONS":
            return { ...state, recommendations: action.payload }

        case "RESET_FORM":
            return {
                ...state,
                notes: '',
                status: '',
                recipientName: '',
                recipientRole: '',
                loading: false,
                symptoms: '',
                diagnosis: '',
                prescriptions: '',
                recommendations: ''
            }

        default:
            return state;
    }
}
