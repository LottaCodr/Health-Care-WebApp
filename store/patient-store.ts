import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Patient, PatientStatus } from "@/types/models";
import { Staff } from "@/actions/staff/types";

export interface SortConfig {
    key: keyof Patient;
    direction: 'asc' | 'desc';
}

export interface PatientState {
    patient: Patient[];
    doctorId?: string;
    notes: string;
    status: PatientStatus;
    recipientRole: string;
    recipientName: string | null;
    loading: boolean;
}

export interface PatientActions {
    setPatient: (patient: Patient[]) => void;
    addPatient: (patient: Patient) => void;
    updatePatient: (patient: Patient) => void;
    deletePatient: (id: string) => void;
    setAssignedStaff: (staff: Staff) => void;
    setAssignedDoctor: (doctorId: string) => void;
    updateNotes: (notes: string) => void;
    setStatus: (status: PatientStatus) => void;
    setRecipientRole: (role: string) => void;
    setRecipientName: (name: string) => void;
    setLoading: (loading: boolean) => void;
    resetForm: () => void;
}

type PatientStore = PatientState & PatientActions;

const initialState: PatientState = {
    patient: [],
    notes: "",
    status: PatientStatus.NoStatus,
    recipientRole: "",
    recipientName: "",
    loading: false,
    doctorId: undefined,
};

export const usePatientStore = create<PatientStore>()(
    devtools(
        (set) => ({
            ...initialState,
            setPatient: (patient) => set({ patient }),
            addPatient: (p) => set((state) => ({ patient: [...state.patient, p] })),
            updatePatient: (p) => set((state) => ({
                patient: state.patient.map((existing) => existing.id === p.id ? p : existing)
            })),
            deletePatient: (id) => set((state) => ({
                patient: state.patient.filter((p) => p.id !== id)
            })),
            setAssignedStaff: (staff) => set({ /* optional handling */ }),
            setAssignedDoctor: (doctorId) => set({ doctorId }),
            updateNotes: (notes) => set({ notes }),
            setStatus: (status) => set({ status }),
            setRecipientRole: (recipientRole) => set({ recipientRole }),
            setRecipientName: (recipientName) => set({ recipientName }),
            setLoading: (loading) => set({ loading }),
            resetForm: () => set({
                notes: '',
                status: PatientStatus.NoStatus,
                recipientName: '',
                recipientRole: '',
                loading: false,
            }),
        }),
        { name: "patient-store" }
    )
);
