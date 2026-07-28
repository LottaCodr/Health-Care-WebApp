import supabase from "@/utils/supabase/client";
import { NursingAction } from "./types";
import { parseStringify } from "@/utils/utils";

export async function getAssignedPatient(nurseId: string): Promise<NursingAction[]> {
    try {
        const { data, error } = await supabase
            .from('visits')
            .select("*");

        if (error) {
            console.error("Error fetching patients:", error.message);
            return [];
        }
        return parseStringify(data) as NursingAction[];
    } catch (error) {
        console.error("Unexpected error fetching patients:", error);
        return [];
    }
}

export async function submitVitalsRecording(patient: Record<string, unknown>) {
    try {
        const { data, error } = await supabase
            .from('vitals')
            .insert([{ ...patient }])
            .select()
            .single();

        if (error) {
            console.error("Error submitting patient vitals:", error.message);
            return null;
        }

        return data;
    } catch (error) {
        console.error("Unexpected error submitting nurse recordings:", error);
        return null;
    }
}