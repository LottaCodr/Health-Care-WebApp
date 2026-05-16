

import { Patient, PatientStatus } from "@/context/patients/types";
import supabase from "@/utils/supabase/client";


// ✅ Centralized field list
const PATIENT_SELECT = `
  id,
  created_at,
  updated_at,
  name,
  religion,
  email,
  phone,
  birth_date,
  gender,
  occupation,
  address,
  emergency_contact_name,
  emergency_contact_number,
  emergency_contact_relationship,
  emergency_contact_email,
  emergency_contact_address,
  allergies,
//   current_medication,
  significant_medication_history,
  long_term_medication,
  covid_vaccination,
  blood_group,
  geno_type,
  policy_number,
  hmo,
  hmo_name,
  company,
  company_name,
  private_client,
  status,
  user_id,
  notes,
  symptoms,
  diagnosis,
  prescriptions,
  recommendations
`;

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