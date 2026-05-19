import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─── Drug Chart ───────────────────────────────────────────────────────────────

export type DrugRoute = "oral" | "IV" | "IM" | "SC" | "topical" | "sublingual" | "rectal" | "inhaled";
export type DrugFrequency = "OD" | "BD" | "TDS" | "QDS" | "PRN" | "STAT" | "nocte" | "mane";
export type AdminStatus = "pending" | "given" | "missed" | "refused" | "held";

export interface DrugChartForm {
    drugName: string;
    genericName: string;
    dose: string;
    route: DrugRoute;
    frequency: DrugFrequency;
    startDate: string;
    endDate: string;
    notes: string;
}

// ─── Fluid Balance ────────────────────────────────────────────────────────────

export interface FluidEntryForm {
    recordDate: string;
    recordTime: string;
    // Input
    oralMl: string;
    ivMl: string;
    ngMl: string;
    otherInputMl: string;
    otherInputType: string;
    // Output
    urineMl: string;
    aspirateMl: string;
    vomitMl: string;
    bowelMl: string;
    drainMl: string;
    otherOutputMl: string;
    notes: string;
}

// ─── Store State ──────────────────────────────────────────────────────────────

export interface NurseChartsState {
    // Active chart tab
    activeChartTab: "vitals" | "drug_chart" | "fluid_balance";

    // Drug chart form
    drugForm: DrugChartForm;
    showDrugForm: boolean;
    editDrugId: string | null;

    // Drug admin logging
    loggingAdminId: string | null;   // drug_administration_record id being updated

    // Fluid balance form
    fluidForm: FluidEntryForm;
    showFluidForm: boolean;
    editFluidId: string | null;

    // Fluid date filter
    fluidDateFilter: string;          // ISO date or "" for today
}

export interface NurseChartsActions {
    setActiveTab: (tab: NurseChartsState["activeChartTab"]) => void;
    setDrugField: <K extends keyof DrugChartForm>(k: K, v: DrugChartForm[K]) => void;
    openDrugForm: (existing?: { id: string } & DrugChartForm) => void;
    closeDrugForm: () => void;
    resetDrugForm: () => void;
    setFluidField: <K extends keyof FluidEntryForm>(k: K, v: FluidEntryForm[K]) => void;
    openFluidForm: (existing?: { id: string } & FluidEntryForm) => void;
    closeFluidForm: () => void;
    resetFluidForm: () => void;
    setFluidDate: (date: string) => void;
    setLoggingAdmin: (id: string | null) => void;
}

const initialDrugForm: DrugChartForm = {
    drugName: "",
    genericName: "",
    dose: "",
    route: "oral",
    frequency: "OD",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    notes: "",
};

const initialFluidForm: FluidEntryForm = {
    recordDate: new Date().toISOString().slice(0, 10),
    recordTime: new Date().toTimeString().slice(0, 5),
    oralMl: "",
    ivMl: "",
    ngMl: "",
    otherInputMl: "",
    otherInputType: "",
    urineMl: "",
    aspirateMl: "",
    vomitMl: "",
    bowelMl: "",
    drainMl: "",
    otherOutputMl: "",
    notes: "",
};

const initialState: NurseChartsState = {
    activeChartTab: "vitals",
    drugForm: initialDrugForm,
    showDrugForm: false,
    editDrugId: null,
    loggingAdminId: null,
    fluidForm: initialFluidForm,
    showFluidForm: false,
    editFluidId: null,
    fluidDateFilter: new Date().toISOString().slice(0, 10),
};

type NurseChartsStore = NurseChartsState & NurseChartsActions;

export const useNurseChartsStore = create<NurseChartsStore>()(
    devtools(
        (set) => ({
            ...initialState,

            setActiveTab: (tab) => set({ activeChartTab: tab }),

            setDrugField: (k, v) =>
                set((s) => ({ drugForm: { ...s.drugForm, [k]: v } })),

            openDrugForm: (existing) => existing
                ? set({ showDrugForm: true, editDrugId: existing.id, drugForm: { ...existing } })
                : set({ showDrugForm: true, editDrugId: null, drugForm: { ...initialDrugForm } }),

            closeDrugForm: () => set({ showDrugForm: false, editDrugId: null }),
            resetDrugForm: () => set({ drugForm: { ...initialDrugForm } }),

            setFluidField: (k, v) =>
                set((s) => ({ fluidForm: { ...s.fluidForm, [k]: v } })),

            openFluidForm: (existing) => existing
                ? set({ showFluidForm: true, editFluidId: existing.id, fluidForm: { ...existing } })
                : set({
                    showFluidForm: true, editFluidId: null, fluidForm: {
                        ...initialFluidForm,
                        recordDate: new Date().toISOString().slice(0, 10),
                        recordTime: new Date().toTimeString().slice(0, 5),
                    }
                }),

            closeFluidForm: () => set({ showFluidForm: false, editFluidId: null }),
            resetFluidForm: () => set({ fluidForm: { ...initialFluidForm } }),
            setFluidDate: (date) => set({ fluidDateFilter: date }),
            setLoggingAdmin: (id) => set({ loggingAdminId: id }),
        }),
        { name: "nurse-charts-store" }
    )
);