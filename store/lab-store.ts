import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface LabTest {
    id: string;
    test_name: string;
    test_code?: string;
    category: string;
    description?: string;
    price: number;
    sample_type?: string;
    turnaround_time?: string;
    normal_range?: string;
    instructions?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface LabResultUploadForm {
    results: string;
    normalRange: string;
    interpretation: string;
    remarks: string;
    resultFile: File | null;
}

export interface LabState {
    // Result Upload Form (keyed by request ID)
    uploadForms: Record<string, LabResultUploadForm>;
    uploadExpanded: Record<string, boolean>;

    // Catalog State
    catalogSearch: string;
    catalogCategory: string;
    editTarget: LabTest | null;
    deleteTarget: LabTest | null;
    showAdd: boolean;
    togglingId: string | null;

    // Report Page State
    reportSearch: string;
    reportPriority: string;
    reportDateRange: "today" | "week" | "month" | "all";
    reportSelected: any | null;

    // Dashboard State
    dashboardActiveId: string | null;
    dashboardResultText: Record<string, string>;
    dashboardSubmittingId: string | null;
}

export interface LabActions {
    setField: <K extends keyof LabState>(field: K, value: LabState[K]) => void;

    // Upload Form Helpers
    setUploadFormField: (reqId: string, field: keyof LabResultUploadForm, value: any) => void;
    toggleUploadExpanded: (reqId: string) => void;
    clearUploadForm: (reqId: string) => void;

    // Dashboard Helpers
    setDashboardResultText: (reqId: string, text: string) => void;

    resetAll: () => void;
}

type LabStore = LabState & LabActions;

const initialState: LabState = {
    uploadForms: {},
    uploadExpanded: {},

    catalogSearch: "",
    catalogCategory: "all",
    editTarget: null,
    deleteTarget: null,
    showAdd: false,
    togglingId: null,

    reportSearch: "",
    reportPriority: "all",
    reportDateRange: "all",
    reportSelected: null,

    dashboardActiveId: null,
    dashboardResultText: {},
    dashboardSubmittingId: null,
};

const initialUploadForm: LabResultUploadForm = {
    results: "",
    normalRange: "",
    interpretation: "",
    remarks: "",
    resultFile: null,
};

export const useLabStore = create<LabStore>()(
    devtools(
        (set, get) => ({
            ...initialState,
            setField: (field, value) => set({ [field]: value }),

            setUploadFormField: (reqId, field, value) => {
                const currentForm = get().uploadForms[reqId] || { ...initialUploadForm };
                set({
                    uploadForms: {
                        ...get().uploadForms,
                        [reqId]: { ...currentForm, [field]: value }
                    }
                });
            },
            toggleUploadExpanded: (reqId) => {
                const isExpanded = get().uploadExpanded[reqId] ?? true;
                set({
                    uploadExpanded: {
                        ...get().uploadExpanded,
                        [reqId]: !isExpanded
                    }
                });
            },
            clearUploadForm: (reqId) => {
                const newForms = { ...get().uploadForms };
                delete newForms[reqId];
                set({ uploadForms: newForms });
            },

            setDashboardResultText: (reqId, text) => {
                set({
                    dashboardResultText: {
                        ...get().dashboardResultText,
                        [reqId]: text
                    }
                });
            },

            resetAll: () => set({ ...initialState }),
        }),
        { name: "lab-store" }
    )
);
