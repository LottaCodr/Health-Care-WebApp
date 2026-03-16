import supabase from "@/utils/supabase/client";
import { Staff } from "./types";

export async function getAllStaffs(): Promise<Staff[]> {
    try {
        const { data, error } = await supabase
            .from("staffs")
            .select();

        if (error) {
            console.error('failed to get staff:', error);
            throw new Error('failed to get staff: ' + error.message);
        }

        return (data ?? []) as Staff[];
    } catch (error) {
        console.error('failed to get staff:', error);
        throw new Error('failed to get staff: ' + String(error));
    }
}