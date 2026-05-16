import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { ConsultationReferred } from "@/actions/consultations/types";

export type RequestPriority = "routine" | "urgent" | "stat";

export interface ConsultationState {
    presentingComplaint: string;
    symptomsAnalysis: string;
    aetiology: string;
    historyComplications: string;
    historyTreatment: string;
    antenatalHistory: string;
    nutritionalHistory: string;
    developmentalMilestones: string;
    immunisationHistory: string;
    pastMedicalHistory: string;
    drugHistory: string;
    familySocialHistory: string;
    
    imp: string;
    lmp: string;
    ega: string;
    eod: string;
    gravidity: string;
    parity: string;
    
    generalExam: string;
    respiratory: string;
    cardiovascular: string;
    gastrointestinal: string;
    
    summary: string;
    assessment: string;
    investigations: string;
    prescriptions: string;
    recommendations: string;
    
    referredTo: string;
    statusOverride: string;
    
    labTestType: string;
    labPriority: RequestPriority;
    labNotes: string;
    
    radTestType: string;
    radPriority: RequestPriority;
    radNotes: string;
    
    loading: boolean;
}

export interface ConsultationActions {
    setField: <K extends keyof ConsultationState>(field: K, value: ConsultationState[K]) => void;
    resetForm: () => void;
}

type ConsultationStore = ConsultationState & ConsultationActions;

const initialState: ConsultationState = {
    presentingComplaint: "",
    symptomsAnalysis: "",
    aetiology: "",
    historyComplications: "",
    historyTreatment: "",
    antenatalHistory: "",
    nutritionalHistory: "",
    developmentalMilestones: "",
    immunisationHistory: "",
    pastMedicalHistory: "",
    drugHistory: "",
    familySocialHistory: "",
    
    imp: "",
    lmp: "",
    ega: "",
    eod: "",
    gravidity: "",
    parity: "",
    
    generalExam: "",
    respiratory: "",
    cardiovascular: "",
    gastrointestinal: "",
    
    summary: "",
    assessment: "",
    investigations: "",
    prescriptions: "",
    recommendations: "",
    
    referredTo: "",
    statusOverride: "",
    
    labTestType: "",
    labPriority: "routine",
    labNotes: "",
    
    radTestType: "",
    radPriority: "routine",
    radNotes: "",
    
    loading: false,
};

export const useConsultationStore = create<ConsultationStore>()(
    devtools(
        (set) => ({
            ...initialState,
            setField: (field, value) => set({ [field]: value }),
            resetForm: () => set(initialState),
        }),
        { name: "consultation-store" }
    )
);
