import { parseStringify } from "@/app/lib/utils";
import { Patient } from "@/context/patients/types";
import { RegisterUserParams } from "@/types";
import supabase from "@/utils/supabase/client";

/**
 * Register a new patient
 */
export async function registerPatient({ ...patient }: RegisterUserParams): Promise<Patient | null> {
    try {
        const { data, error } = await supabase
            .from("patients")
            .insert([{ ...patient }])
            .select()
            .single();
        console.log("Trying to submit patient: ", patient)

        if (error) {
            console.error("Error registering patient:", error.message);
            throw new Error(error.message || "Registration failed");
        }

        if (!data) {
            return null;
        }

        const registeredPatient = parseStringify(data) as Patient;
        return registeredPatient;
    } catch (error: any) {
        console.error("Unexpected error registering patient:", error);
        throw new Error(error.message || "Registration failed");
    }
}

// initiate a new visit record for a patient

export async function startVisit(patientId: string) {
    const { data, error } = await supabase
        .from('visits')
        .insert([{ patient_id: patientId, status: 'awaiting_vitals' }])
        .select();
    return { data, error }
}

// record payment after consultation or treatment

export async function recordPayment(visitId: string, paymentInfo: string) {
    const { data, error } = await supabase
        .from('payments')
        .insert([{ visit_id: visitId, paymentInfo }])
        .select();
    return { data, error };
}

/**
 * Get all patients
 */
export async function getAllPatients(): Promise<Patient[]> {
    try {
        const { data, error } = await supabase.from("patients").select("*");

        if (error) {
            console.error("Error fetching patients:", error.message);
            return [];
        }

        return parseStringify(data) as Patient[];
    } catch (error) {
        console.error("Unexpected error fetching patients:", error);
        return [];
    }
}

/**
 * Get a patient by userId
 */
export const getPatientById = async (userId: string): Promise<Patient | null> => {
    if (!userId || userId.trim() === "") {
        console.error("Invalid userId provided to getPatient.");
        return null;
    }

    console.log("Received userId:", userId);

    try {
        const { data, error } = await supabase
            .from("patients")
            .select("*")
            .eq("id", userId)
            .single();

        if (error) {
            console.error("Error fetching patient:", error.message);
            return null;
        }

        if (!data) {
            console.warn("No patient found for userId:", userId);
            return null;
        }

        const patient = parseStringify(data) as Patient;
        console.log("Fetched patient:", patient);
        return patient;
    } catch (error) {
        console.error("Unexpected error getting patient:", error);
        return null;
    }
};

/**
 * Update a patient record
 */
export const updatePatient = async (
    patientId: string,
    data: Partial<Patient>
): Promise<Patient | null> => {
    try {
        const { data: updatedData, error } = await supabase
            .from("patients")
            .update(data)
            .eq("id", patientId)
            .select()
            .single();

        if (error) {
            console.error("Error updating patient:", error.message);
            return null;
        }

        const updatedPatient = parseStringify(updatedData) as Patient;
        return updatedPatient;
    } catch (error) {
        console.error("Unexpected error updating patient:", error);
        return null;
    }
};
