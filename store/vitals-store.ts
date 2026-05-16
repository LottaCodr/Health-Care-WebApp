import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface VitalsForm {
    bloodPressure: string;
    temperature: string;
    pulse: string;
    respiration: string;
    spo2: string;
    weight: string;
    height: string;
    bmi: string;
    treatment: string;
    notes: string;
}

export interface VitalsState {
    form: VitalsForm;
}

export interface VitalsActions {
    setField: <K extends keyof VitalsForm>(field: K, value: VitalsForm[K]) => void;
    calculateBmi: () => void;
    resetForm: () => void;
}

type VitalsStore = VitalsState & VitalsActions;

const initialForm: VitalsForm = {
    bloodPressure: "",
    temperature: "",
    pulse: "",
    respiration: "",
    spo2: "",
    weight: "",
    height: "",
    bmi: "",
    treatment: "",
    notes: "",
};

export const useVitalsStore = create<VitalsStore>()(
    devtools(
        (set, get) => ({
            form: initialForm,
            setField: (field, value) => {
                set((state) => ({
                    form: { ...state.form, [field]: value }
                }));
                // Auto calculate BMI if weight or height changed
                if (field === "weight" || field === "height") {
                    get().calculateBmi();
                }
            },
            calculateBmi: () => {
                const { form } = get();
                const weight = parseFloat(form.weight);
                const height = parseFloat(form.height);
                if (!isNaN(weight) && !isNaN(height) && height > 0) {
                    const bmi = weight / (height / 100) ** 2;
                    set((state) => ({
                        form: { ...state.form, bmi: bmi.toFixed(1) }
                    }));
                } else {
                    set((state) => ({
                        form: { ...state.form, bmi: "" }
                    }));
                }
            },
            resetForm: () => set({ form: initialForm }),
        }),
        { name: "vitals-store" }
    )
);
