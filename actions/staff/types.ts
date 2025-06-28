import { Patient } from "@/context/patients/types";
import { Models } from "node-appwrite";


export type StaffRole = "doctor" | "nurse" | "front-desk" | "pharmacist" | "lab-tech" | "user";

export interface Staff extends Models.Document {
    staff_id: string;
    role: StaffRole;
    phone_number: string;
    department: string;
    email: string;
    full_name: string;
    created_at: Date
    patient: Patient[];
    status?: "active" | "inactive"
}
