import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { Staff } from '@/actions/staff/types';

export interface EmployeeState {
    employees: Staff[];
    loading: boolean;
}

export interface EmployeeActions {
    setEmployees: (employees: Staff[]) => void;
    addEmployee: (employee: Staff) => void;
    updateEmployee: (employee: Staff) => void;
    deleteEmployee: (id: string) => void;
    setLoading: (loading: boolean) => void;
}

type EmployeeStore = EmployeeState & EmployeeActions;

const initialState: EmployeeState = {
    employees: [],
    loading: false,
};

export const useEmployeeStore = create<EmployeeStore>()(
    devtools(
        (set) => ({
            ...initialState,
            setEmployees: (employees) => set({ employees }),
            addEmployee: (employee) => set((state) => ({ employees: [...state.employees, employee] })),
            updateEmployee: (employee) => set((state) => ({
                employees: state.employees.map((e) => e.id === employee.id ? employee : e)
            })),
            deleteEmployee: (id) => set((state) => ({
                employees: state.employees.filter((e) => e.id !== id)
            })),
            setLoading: (loading) => set({ loading }),
        }),
        { name: "employee-store" }
    )
);
