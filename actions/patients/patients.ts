

import { Patient, PatientStatus } from "@/context/patients/types";
import { supabase } from "@/utils/supabase/supabase.client";


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
  current_medication,
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
        $id: row.id,
        $createdAt: row.created_at,
        $updatedAt: row.updated_at,
        name: row.name,
        religion: row.religion,
        email: row.email,
        phone: row.phone,
        birthDate: row.birth_date ? new Date(row.birth_date) : null,
        gender: row.gender,
        occupation: row.occupation,
        address: row.address,
        emergencyContactName: row.emergency_contact_name,
        emergencyContactNumber: row.emergency_contact_number,
        emergencyContactRelationship: row.emergency_contact_relationship,
        emergencyContactEmail: row.emergency_contact_email,
        emergencyContactAddress: row.emergency_contact_address,
        allergies: row.allergies,
        currentMedication: row.current_medication,
        significantMedicationHistory: row.significant_medication_history,
        longTermMedication: row.long_term_medication,
        covidVaccinationOptions: row.covid_vaccination,
        bloodGroup: row.blood_group,
        genoType: row.geno_type,
        policyNumber: row.policy_number,
        hmo: row.hmo,
        hmoName: row.hmo_name,
        company: row.company,
        companyName: row.company_name,
        privateClient: row.private_client,
        status: row.status as PatientStatus,
        userId: row.user_id,
        notes: row.notes,
        symptoms: row.symptoms,
        diagnosis: row.diagnosis,
        prescriptions: row.prescriptions,
        recommendations: row.recommendations,
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