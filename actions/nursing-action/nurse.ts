import supabase from "@/utils/supabase/client";
import { NursingAction } from "./types";
import { parseStringify } from "@/app/lib/utils";

export async function getAssignedPatient(nurseId: string): Promise<NursingAction[] | null> {
    try {
        const { data, error } = await supabase
            .from('visits')
            .select("*");

        if (error) {
            console.error("Error fetching patients:", error.message);
            return [];
        }
        return parseStringify(data)
    } catch (error) {
        console.error("Unexpected error fetching patients:", error)
    }
}

export async function submitVitalsRecording(patient: []) {
    try {
        const { data, error } = await supabase
            .from('vitals')
            .insert([{ ...patient }])
            .select()
            .single();

        console.log("Submitting patient vital recordings:", patient)

        if (error) {
            console.log("Error submitting patient vitals:", error.message)
        }

        if (!data) { return null }



    } catch (error) {
        console.error("Unexpected error submiting nurse recordings:", error)
    }
}