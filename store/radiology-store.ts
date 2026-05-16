import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface RadiologyReportForm {
    technique: string;
    comparisonStudy: string;
    findings: string;
    impression: string;
    recommendation: string;
    criticalFindings: boolean;
    criticalNote: string;
}

export interface RadiologyInlineForm {
    resultText: string;
    isCritical: boolean;
    criticalNote: string;
}

export interface RadiologyState {
    // Advanced Form (Modal)
    advancedForms: Record<string, RadiologyReportForm>;

    // Inline Form (Dashboard)
    inlineForms: Record<string, RadiologyInlineForm>;
    inlineExpanded: Record<string, boolean>;

    // Dashboard UI
    dashboardActiveId: string | null;
}

export interface RadiologyActions {
    setField: <K extends keyof RadiologyState>(field: K, value: RadiologyState[K]) => void;

    // Advanced Form Helpers
    setAdvancedFormField: (reqId: string, field: keyof RadiologyReportForm, value: any) => void;
    clearAdvancedForm: (reqId: string) => void;

    // Inline Form Helpers
    setInlineFormField: (reqId: string, field: keyof RadiologyInlineForm, value: any) => void;
    toggleInlineExpanded: (reqId: string) => void;
    clearInlineForm: (reqId: string) => void;

    resetAll: () => void;
}

type RadiologyStore = RadiologyState & RadiologyActions;

const initialAdvancedForm: RadiologyReportForm = {
    technique: "",
    comparisonStudy: "",
    findings: "",
    impression: "",
    recommendation: "",
    criticalFindings: false,
    criticalNote: "",
};

const initialInlineForm: RadiologyInlineForm = {
    resultText: "",
    isCritical: false,
    criticalNote: "",
};

const initialState: RadiologyState = {
    advancedForms: {},
    inlineForms: {},
    inlineExpanded: {},
    dashboardActiveId: null,
};

export const useRadiologyStore = create<RadiologyStore>()(
    devtools(
        (set, get) => ({
            ...initialState,
            setField: (field, value) => set({ [field]: value }),

            setAdvancedFormField: (reqId, field, value) => {
                const currentForm = get().advancedForms[reqId] || { ...initialAdvancedForm };
                set({
                    advancedForms: {
                        ...get().advancedForms,
                        [reqId]: { ...currentForm, [field]: value }
                    }
                });
            },
            clearAdvancedForm: (reqId) => {
                const newForms = { ...get().advancedForms };
                delete newForms[reqId];
                set({ advancedForms: newForms });
            },

            setInlineFormField: (reqId, field, value) => {
                const currentForm = get().inlineForms[reqId] || { ...initialInlineForm };
                set({
                    inlineForms: {
                        ...get().inlineForms,
                        [reqId]: { ...currentForm, [field]: value }
                    }
                });
            },
            toggleInlineExpanded: (reqId) => {
                const isExpanded = get().inlineExpanded[reqId] ?? false;
                set({
                    inlineExpanded: {
                        ...get().inlineExpanded,
                        [reqId]: !isExpanded
                    }
                });
            },
            clearInlineForm: (reqId) => {
                const newForms = { ...get().inlineForms };
                delete newForms[reqId];
                const newExpanded = { ...get().inlineExpanded };
                delete newExpanded[reqId];
                set({ inlineForms: newForms, inlineExpanded: newExpanded });
            },

            resetAll: () => set({ ...initialState }),
        }),
        { name: "radiology-store" }
    )
);
