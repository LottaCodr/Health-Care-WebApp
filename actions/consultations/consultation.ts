
import { Consultation } from "./types";
import supabase from "@/utils/supabase/client";

/**
 * Create a new consultation in Supabase.
 * @param consultationData Consultation object (without id, createdAt, etc.)
 */
export async function createConsultation(consultationData: Omit<Consultation, "$id" | "$createdAt" | "$updatedAt">) {
    const { data, error } = await supabase
        .from("consultations")
        .insert([consultationData])
        .select()
        .single();

    if (error) {
        console.error("An error occurred while creating consultation:", error);
        throw new Error("Failed to create consultation.");
    }
    return data as unknown as Consultation;
}

/**
 * Fetch all consultations for a given patientId, ordered by consultationDate descending.
 * @param patientId The ID of the patient.
 */
export async function getPatientConsultations(patientId: string) {
    // const supabase = await createClient();
    const { data, error } = await supabase
        .from("consultations")
        .select("*")
        .eq("patient_id", patientId)      // ← snake_case
        .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
}

/**
 * Delete a consultation record by its id.
 * @param consultationId Consultation record id.
 */
export async function deleteConsultation(consultationId: string) {
    const { error } = await supabase
        .from("consultations")
        .delete()
        .eq("id", consultationId);

    if (error) {
        console.error("Error deleting consultation:", error);
        throw new Error("Failed to delete consultation.");
    }
    return { success: true };
}