import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type DischargeType = "regular" | "ama" | "transfer" | "deceased";
export type ConditionOnDischarge = "stable" | "improved" | "critical" | "deceased" | "transferred";

export interface DischargeFormState {
    finalDiagnosis: string;
    conditionOnDischarge: ConditionOnDischarge;
    hospitalCourse: string;
    medicationsOnDischarge: string;
    followUpDate: string;
    followUpInstructions: string;
    activityRestrictions: string;
    dietInstructions: string;
    emergencyReturnCriteria: string;
    dischargeType: DischargeType;
    transferredTo: string;
}

export interface DischargeUIState {
    showForm: boolean;
    patientId: string | null;
    consultationId: string | null;
    submitting: boolean;
}

export interface DischargeActions {
    setField: <K extends keyof DischargeFormState>(k: K, v: DischargeFormState[K]) => void;
    setUI: <K extends keyof DischargeUIState>(k: K, v: DischargeUIState[K]) => void;
    openForm: (patientId: string, consultationId?: string) => void;
    closeForm: () => void;
    resetForm: () => void;
}

const initialForm: DischargeFormState = {
    finalDiagnosis: "",
    conditionOnDischarge: "stable",
    hospitalCourse: "",
    medicationsOnDischarge: "",
    followUpDate: "",
    followUpInstructions: "",
    activityRestrictions: "",
    dietInstructions: "",
    emergencyReturnCriteria: "",
    dischargeType: "regular",
    transferredTo: "",
};

const initialUI: DischargeUIState = {
    showForm: false,
    patientId: null,
    consultationId: null,
    submitting: false,
};

type DischargeStore = DischargeFormState & DischargeUIState & DischargeActions;

export const useDischargeStore = create<DischargeStore>()(
    devtools(
        (set) => ({
            ...initialForm,
            ...initialUI,

            setField: (k, v) => set({ [k]: v } as any),
            setUI: (k, v) => set({ [k]: v } as any),

            openForm: (patientId, consultationId) =>
                set({ showForm: true, patientId, consultationId: consultationId ?? null }),

            closeForm: () =>
                set({ showForm: false, patientId: null, consultationId: null }),

            resetForm: () => set({ ...initialForm, ...initialUI }),
        }),
        { name: "discharge-store" }
    )
);