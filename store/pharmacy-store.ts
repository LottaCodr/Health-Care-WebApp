import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface Drug {
    id: string;
    drug_name: string;
    generic_name?: string;
    category?: string;
    dosage_form?: string;
    strength?: string;
    manufacturer?: string;
    unit: string;
    quantity: number;
    reorder_level?: number;
    price: number;
    cost_price?: number;
    expiry_date?: string;
    requires_prescription: boolean;
    is_active: boolean;
    created_at?: string;
}

export type ViewMode = "catalog" | "inventory";
export type PharmacyTab = "queue" | "dispense" | "inventory";

export interface PharmacyState {
    // PharmacySuite
    activeTab: PharmacyTab;
    dispensingId: string | null;
    query: string;
    patientId: string | null;
    restockId: string | null;
    restockQty: string;
    restocking: boolean;
    
    // PhaarmacistInventory
    viewMode: ViewMode;
    search: string;
    category: string;
    stockFilter: string;
    editTarget: Drug | null;
    deleteTarget: Drug | null;
    restockTarget: Drug | null;
    showAdd: boolean;
    toggling: string | null;
}

export interface PharmacyActions {
    setField: <K extends keyof PharmacyState>(field: K, value: PharmacyState[K]) => void;
    resetForm: () => void;
}

type PharmacyStore = PharmacyState & PharmacyActions;

const initialState: PharmacyState = {
    activeTab: "queue",
    dispensingId: null,
    query: "",
    patientId: null,
    restockId: null,
    restockQty: "",
    restocking: false,
    viewMode: "inventory",
    search: "",
    category: "",
    stockFilter: "all",
    editTarget: null,
    deleteTarget: null,
    restockTarget: null,
    showAdd: false,
    toggling: null,
};

export const usePharmacyStore = create<PharmacyStore>()(
    devtools(
        (set) => ({
            ...initialState,
            setField: (field, value) => set({ [field]: value }),
            resetForm: () => set(initialState),
        }),
        { name: "pharmacy-store" }
    )
);
