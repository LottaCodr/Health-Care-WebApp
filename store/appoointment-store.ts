import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type AppointmentPriority = "routine" | "urgent" | "emergency";
export type AppointmentStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
export type AppointmentDept = "Doctor" | "Nurse" | "Lab" | "Radiology" | "Pharmacy";

export interface AppointmentFormState {
    patientId: string;
    doctorId: string;
    appointmentDate: string;
    appointmentTime: string;
    reason: string;
    department: AppointmentDept;
    priority: AppointmentPriority;
    notes: string;
}

export interface AppointmentUIState {
    showForm: boolean;
    editTargetId: string | null;
    cancelTargetId: string | null;
    dateFilter: string;                // ISO date string or ""
    statusFilter: AppointmentStatus | "all";
    search: string;
}

export interface AppointmentActions {
    setFormField: <K extends keyof AppointmentFormState>(k: K, v: AppointmentFormState[K]) => void;
    setUI: <K extends keyof AppointmentUIState>(k: K, v: AppointmentUIState[K]) => void;
    resetForm: () => void;
    openEdit: (id: string, data: AppointmentFormState) => void;
    closeForm: () => void;
}

const initialForm: AppointmentFormState = {
    patientId: "",
    doctorId: "",
    appointmentDate: "",
    appointmentTime: "",
    reason: "",
    department: "Doctor",
    priority: "routine",
    notes: "",
};

const initialUI: AppointmentUIState = {
    showForm: false,
    editTargetId: null,
    cancelTargetId: null,
    dateFilter: "",
    statusFilter: "all",
    search: "",
};

type AppointmentStore = AppointmentFormState & AppointmentUIState & AppointmentActions;

export const useAppointmentStore = create<AppointmentStore>()(
    devtools(
        (set) => ({
            ...initialForm,
            ...initialUI,

            setFormField: (k, v) => set({ [k]: v } as any),
            setUI: (k, v) => set({ [k]: v } as any),

            resetForm: () => set({ ...initialForm, showForm: false, editTargetId: null }),

            openEdit: (id, data) => set({
                ...data,
                showForm: true,
                editTargetId: id,
            }),

            closeForm: () => set({ showForm: false, editTargetId: null }),
        }),
        { name: "appointment-store" }
    )
);