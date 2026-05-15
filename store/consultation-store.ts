import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { ConsultationReferred } from "@/actions/consultations/types";

export interface ConsultationState {
    symptoms: string;
    diagnosis: string;
    prescriptions: string;
    recommendations: string;
    referredTo: ConsultationReferred | "";
    loading: boolean;
}

export interface ConsultationActions {
    setSymptoms: (symptoms: string) => void;
    setDiagnosis: (diagnosis: string) => void;
    setPrescriptions: (prescriptions: string) => void;
    setRecommendations: (recommendations: string) => void;
    setReferredTo: (referredTo: ConsultationReferred) => void;
    setLoading: (loading: boolean) => void;
    resetForm: () => void;
}

type ConsultationStore = ConsultationState & ConsultationActions;

const initialState: ConsultationState = {
    symptoms: "",
    diagnosis: "",
    prescriptions: "",
    recommendations: "",
    referredTo: "",
    loading: false,
};

export const useConsultationStore = create<ConsultationStore>()(
    devtools(
        (set) => ({
            ...initialState,
            setSymptoms: (symptoms) => set({ symptoms }),
            setDiagnosis: (diagnosis) => set({ diagnosis }),
            setPrescriptions: (prescriptions) => set({ prescriptions }),
            setRecommendations: (recommendations) => set({ recommendations }),
            setReferredTo: (referredTo) => set({ referredTo }),
            setLoading: (loading) => set({ loading }),
            resetForm: () => set(initialState),
        }),
        { name: "consultation-store" }
    )
);
