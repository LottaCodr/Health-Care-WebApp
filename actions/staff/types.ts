import { Patient } from "@/context/patients/types";


export type StaffRole = "doctor" | "nurse" | "frontdesk" | "pharmacist" | "labtech" | "user";

export interface Staff {
    $id: string;
    id: string;
    role: StaffRole;
    phone_number?: string;
    department?: string;
    email: string;
    name: string;
    created_at: Date
    patient?: Patient[];
    status?: "active" | "inactive"
}
