"use client";

import { ConsultationReferred } from "@/actions/consultations/types";
import { createContext, useContext, useReducer, useMemo } from "react";

interface ConsultationState {
    symptoms: string;
    diagnosis: string;
    prescriptions: string;
    recommendations: string;
    referredTo: ConsultationReferred | "";
    loading: boolean;
}

const initialState: ConsultationState = {
    symptoms: "",
    diagnosis: "",
    prescriptions: "",
    recommendations: "",
    referredTo: "",
    loading: false,
};

type Action =
    | { type: "SET_SYMPTOMS"; payload: string }
    | { type: "SET_DIAGNOSIS"; payload: string }
    | { type: "SET_PRESCRIPTIONS"; payload: string }
    | { type: "SET_RECOMMENDATIONS"; payload: string }
    | { type: "SET_REFERRED_TO"; payload: ConsultationReferred }
    | { type: "SET_LOADING"; payload: boolean }
    | { type: "RESET_FORM" };

function reducer(state: ConsultationState, action: Action): ConsultationState {
    switch (action.type) {
        case "SET_SYMPTOMS":
            return { ...state, symptoms: action.payload };
        case "SET_DIAGNOSIS":
            return { ...state, diagnosis: action.payload };
        case "SET_PRESCRIPTIONS":
            return { ...state, prescriptions: action.payload };
        case "SET_RECOMMENDATIONS":
            return { ...state, recommendations: action.payload };
        case "SET_REFERRED_TO":
            return { ...state, referredTo: action.payload };
        case "SET_LOADING":
            return { ...state, loading: action.payload };
        case "RESET_FORM":
            return initialState;
        default:
            return state;
    }
}

const ConsultationContext = createContext<{
    state: ConsultationState;
    dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

export function ConsultationProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);
    const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
    return (
        <ConsultationContext.Provider value={value}>
            {children}
        </ConsultationContext.Provider>
    );
}

export function useConsultationContext() {
    const context = useContext(ConsultationContext);
    if (!context) throw new Error("useConsultationContext must be used within ConsultationProvider");
    return context;
}
