import { createContext, useContext, useReducer, ReactNode, Dispatch, useMemo } from "react"
import { PatientAction, PatientState } from './types';
import { initialPatientState, patientReducer } from "./patient-reducer";

const PatientContext = createContext<{ state: PatientState; dispatch: Dispatch<PatientAction> } | undefined>(undefined)

export function PatientProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(patientReducer, initialPatientState)
    const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
    return (
        <PatientContext.Provider value={value}>
            {children}
        </PatientContext.Provider>
    )
}

export function usePatientContext() {
    const context = useContext(PatientContext)
    if (!context) {
        throw new Error("usePatientContext must be used within PatientProvider");
    }
    return context;
}