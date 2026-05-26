import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type AppointmentPriority  = "routine" | "urgent" | "emergency";
export type AppointmentStatus    = "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
export type AppointmentDept      = "Doctor" | "Nurse" | "Lab" | "Radiology" | "Pharmacy";
export type RecurringFrequency   = "weekly" | "biweekly" | "monthly";

export interface AppointmentFormState {
    patientId:          string;
    patientName:        string;
    isExternalPatient:  boolean;
    doctorId:           string;
    doctorName:         string;
    appointmentDate:    string;
    appointmentTime:    string;
    reason:             string;
    department:         AppointmentDept;
    priority:           AppointmentPriority;
    notes:              string;
    // Recurring
    isRecurring:        boolean;
    recurringFrequency: RecurringFrequency;
    recurringCount:     number;
}

export interface AppointmentUIState {
    showForm:       boolean;
    editTargetId:   string | null;
    cancelTargetId: string | null;
    dateFilter:     string;
    statusFilter:   AppointmentStatus | "all";
    search:         string;
    viewMode:       "list" | "calendar";
    doctorFilter:   string;   // staff ID or "" for all
}

export interface AppointmentActions {
    setFormField: <K extends keyof AppointmentFormState>(k: K, v: AppointmentFormState[K]) => void;
    setUI:        <K extends keyof AppointmentUIState>(k: K, v: AppointmentUIState[K]) => void;
    resetForm:    () => void;
    openEdit:     (id: string, data: AppointmentFormState) => void;
    closeForm:    () => void;
}

const initialForm: AppointmentFormState = {
    patientId:          "",
    patientName:        "",
    isExternalPatient:  false,
    doctorId:           "",
    doctorName:         "",
    appointmentDate:    "",
    appointmentTime:    "",
    reason:             "",
    department:         "Doctor",
    priority:           "routine",
    notes:              "",
    isRecurring:        false,
    recurringFrequency: "weekly",
    recurringCount:     4,
};

const initialUI: AppointmentUIState = {
    showForm:       false,
    editTargetId:   null,
    cancelTargetId: null,
    dateFilter:     new Date().toISOString().slice(0, 10),
    statusFilter:   "all",
    search:         "",
    viewMode:       "list",
    doctorFilter:   "",
};

type AppointmentStore = AppointmentFormState & AppointmentUIState & AppointmentActions;

export const useAppointmentStore = create<AppointmentStore>()(
    devtools(
        (set) => ({
            ...initialForm,
            ...initialUI,
            setFormField: (k, v) => set({ [k]: v } as any),
            setUI:        (k, v) => set({ [k]: v } as any),
            resetForm:    () => set({ ...initialForm, showForm: false, editTargetId: null }),
            openEdit: (id, data) => set({ ...data, showForm: true, editTargetId: id }),
            closeForm: () => set({ showForm: false, editTargetId: null }),
        }),
        { name: "appointment-store" }
    )
);