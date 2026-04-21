"use server";

import { createClient } from "@/utils/supabase/server";
import { Staff, UserRole } from "@/types/models";

export async function getAllStaffs(): Promise<Staff[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("staffs")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) { console.error("[staff] getAll:", error); return []; }
    return data as unknown as Staff[];
}

export async function getStaffById(id: string): Promise<Staff | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("staffs")
        .select("*")
        .eq("id", id)
        .single();

    if (error) { console.error("[staff] getById:", error); return null; }
    return data as unknown as Staff;
}

export async function getStaffByRole(role: UserRole | string): Promise<Staff[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("staffs")
        .select("*")
        .eq("role", role);

    if (error) { console.error("[staff] getByRole:", error); return []; }
    return data as unknown as Staff[];
}

export async function createStaff(
    staff: Omit<Staff, "id" | "created_at">
): Promise<Staff> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("staffs")
        .insert([staff])
        .select()
        .single();

    if (error) { console.error("[staff] create:", error); throw error; }
    return data as unknown as Staff;
}

export async function updateStaff(
    id: string,
    updates: Partial<Staff>
): Promise<Staff> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("staffs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if (error) { console.error("[staff] update:", error); throw error; }
    return data as unknown as Staff;
}

export async function deleteStaff(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from("staffs").delete().eq("id", id);
    if (error) { console.error("[staff] delete:", error); throw error; }
}