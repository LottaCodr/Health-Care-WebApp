

import { Patient, PatientStatus } from "@/types/models";
import supabase from "@/utils/supabase/client";


// ✅ Centralized field list
const PATIENT_SELECT = "*";

// ✅ Mapper: DB → Patient type
function mapPatient(row: any): Patient {
    return {
        ...row,
        status: row.status as PatientStatus,
    };
}

export async function getPatientById(id: string): Promise<Patient | null> {
    const { data, error } = await supabase
        .from("patients")
        .select(PATIENT_SELECT)
        .eq("id", id)
        .single();

    if (error) {
        console.error("Error fetching patient detail:", error);
        throw new Error(error.message);
    }

    return data ? mapPatient(data) : null;
}

export async function getAllPatients(): Promise<Patient[]> {
    const { data, error } = await supabase
        .from("patients")
        .select(PATIENT_SELECT)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching patients:", error);
        throw new Error(error.message);
    }



    if (!data) return [];
    // 🔄 Map DB fields -> Patient interface
    return data ? data.map(mapPatient) : [];

}