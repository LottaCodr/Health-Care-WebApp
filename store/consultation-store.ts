import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type RequestPriority = "routine" | "urgent" | "stat";
export type AdmissionType   = "ward" | "surgical" | "icu" | "maternity" | "";

export interface PrescriptionItem {
    id:        string;   // client-only key
    drugName:  string;
    dosage:    string;
    frequency: string;
    duration:  string;
    notes:     string;
}

interface ConsultationState {
    // ── Section A — History ──────────────────────────────────────────────────
    presentingComplaint:     string;
    symptomsAnalysis:        string;
    aetiology:               string;
    historyComplications:    string;
    historyTreatment:        string;
    // Paediatric
    antenatalHistory:        string;
    nutritionalHistory:      string;
    developmentalMilestones: string;
    immunisationHistory:     string;
    // General
    pastMedicalHistory:      string;
    drugHistory:             string;
    familySocialHistory:     string;
    // Obstetric
    imp:      string;
    // Pregnancy status gates the LMP → EGA/EDD auto-calculation:
    // "" (not answered) | "yes" | "no" | "unknown"
    pregnancyStatus: string;
    lmp:      string;
    ega:      string;
    eod:      string;
    gravidity:string;
    parity:   string;
    // ── Section B — General Exam ─────────────────────────────────────────────
    generalExam: string;
    // ── Section C — Systemic Exam ────────────────────────────────────────────
    respiratory:     string;
    cardiovascular:  string;
    gastrointestinal:string;
    // ── Section D — Summary ──────────────────────────────────────────────────
    summary: string;
    // ── Section E — Assessment ───────────────────────────────────────────────
    assessment: string;
    // ── Section F — Management ───────────────────────────────────────────────
    investigations:  string;
    prescriptions:   string;    // free-text treatment plan
    recommendations: string;
    // ── Routing ──────────────────────────────────────────────────────────────
    referredTo:     string;
    statusOverride: string;
    // Lab request
    labTestType: string[];
    labPriority: RequestPriority;
    labNotes:    string;
    // Radiology request
    radTestType: string[];
    radPriority: RequestPriority;
    radNotes:    string;
    // ── Admission (front-desk routing) ───────────────────────────────────────
    admissionType:       AdmissionType;
    admissionUrgency:    "routine" | "urgent" | "emergency";
    admissionWard:       string;
    admissionIndication: string;
    admissionNotes:      string;
    // ── Structured prescriptions (pharmacist routing) ─────────────────────────
    prescriptionItems: PrescriptionItem[];
    // ── UI ───────────────────────────────────────────────────────────────────
    loading: boolean;
}

interface ConsultationActions {
    setField:               <K extends keyof ConsultationState>(k: K, v: ConsultationState[K]) => void;
    resetForm:              () => void;
    addPrescriptionItem:    () => void;
    updatePrescriptionItem: (id: string, field: keyof PrescriptionItem, value: string) => void;
    removePrescriptionItem: (id: string) => void;
}

const initial: ConsultationState = {
    presentingComplaint: "", symptomsAnalysis: "", aetiology: "",
    historyComplications: "", historyTreatment: "",
    antenatalHistory: "", nutritionalHistory: "",
    developmentalMilestones: "", immunisationHistory: "",
    pastMedicalHistory: "", drugHistory: "", familySocialHistory: "",
    imp: "", pregnancyStatus: "", lmp: "", ega: "", eod: "", gravidity: "", parity: "",
    generalExam: "",
    respiratory: "", cardiovascular: "", gastrointestinal: "",
    summary: "",
    assessment: "",
    investigations: "", prescriptions: "", recommendations: "",
    referredTo: "", statusOverride: "",
    labTestType: [], labPriority: "routine", labNotes: "",
    radTestType: [], radPriority: "routine", radNotes: "",
    admissionType:       "",
    admissionUrgency:    "routine",
    admissionWard:       "",
    admissionIndication: "",
    admissionNotes:      "",
    prescriptionItems:   [],
    loading:             false,
};

function newRxItem(): PrescriptionItem {
    return { id: crypto.randomUUID(), drugName: "", dosage: "", frequency: "BD", duration: "", notes: "" };
}

export type ConsultationStore = ConsultationState & ConsultationActions;
export const useConsultationStore = create<ConsultationStore>()(
    devtools(
        (set) => ({
            ...initial,

            setField: (k, v) => set({ [k]: v } as any),

            resetForm: () => set({ ...initial }),

            addPrescriptionItem: () =>
                set(s => ({ prescriptionItems: [...s.prescriptionItems, newRxItem()] })),

            updatePrescriptionItem: (id, field, value) =>
                set(s => ({
                    prescriptionItems: s.prescriptionItems.map(item =>
                        item.id === id ? { ...item, [field]: value } : item
                    ),
                })),

            removePrescriptionItem: (id) =>
                set(s => ({
                    prescriptionItems: s.prescriptionItems.filter(item => item.id !== id),
                })),
        }),
        { name: "consultation-store" }
    )
);