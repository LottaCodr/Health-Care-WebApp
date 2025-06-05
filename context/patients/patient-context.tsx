import { createContext, useContext, useReducer, ReactNode, Dispatch } from "react"
import { PatientAction, PatientState } from './types';
import { initialPatientState, patientReducer } from "./patient-reducer";

const PatientContext = createContext<{ state: PatientState; dispatch: Dispatch<PatientAction> } | undefined>(undefined)

export function PatientProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(patientReducer, initialPatientState)

    return (
        <PatientContext.Provider value={{ state, dispatch }}>
            {children}
        </PatientContext.Provider>
    )
}

export function usePatientContext() {
    const context = useContext(PatientContext)

    if (!context) {
        throw new Error("usePatient Context must be used inside patient provider")
    }

    return context;
}