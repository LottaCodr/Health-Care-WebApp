import supabase from "@/utils/supabase/client";
import { Staff } from "@/types/models";

/**
 * Update a staff record by its id using Supabase.
 * @param id The id of the staff to update.
 * @param updates Partial staff record with fields to change
 */
export async function updateStaff(id: string, updates: Partial<Staff>) {
    try {
        const { data, error } = await supabase
            .from("staffs")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Failed to update staff:", error);
            throw new Error("Could not update the staff: " + error.message);
        }

        return data;
    } catch (error) {
        console.error("Failed to update staff:", error);
        throw error;
    }
}

/**
 * Delete a staff record by its id using Supabase.
 * @param id The id of the staff to delete.
 */
export async function deleteStaff(id: string) {
    try {
        const { error } = await supabase
            .from("staffs")
            .delete()
            .eq("id", id);

        if (error) {
            throw new Error("Could not delete the staff: " + error.message);
        }

        return { success: true };
    } catch (error) {
        throw new Error('Could not delete the staff');
    }
}