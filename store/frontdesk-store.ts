import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface FrontDeskState {
    currentStep: number;
    childClass: string;
    parentInfo: string;
    referralInfo: string;
}

export interface FrontDeskActions {
    setField: <K extends keyof FrontDeskState>(field: K, value: FrontDeskState[K]) => void;
    nextStep: (maxSteps: number) => void;
    prevStep: () => void;
    resetForm: () => void;
}

type FrontDeskStore = FrontDeskState & FrontDeskActions;

const initialState: FrontDeskState = {
    currentStep: 0,
    childClass: "",
    parentInfo: "",
    referralInfo: "",
};

export const useFrontDeskStore = create<FrontDeskStore>()(
    devtools(
        (set) => ({
            ...initialState,
            setField: (field, value) => set({ [field]: value }),
            nextStep: (maxSteps) => set((state) => ({ currentStep: Math.min(state.currentStep + 1, maxSteps - 1) })),
            prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 0) })),
            resetForm: () => set({ ...initialState }),
        }),
        { name: "frontdesk-store" }
    )
);
