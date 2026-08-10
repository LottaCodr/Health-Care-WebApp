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

/**
 * Create a new staff member.
 * 1. Creates a Supabase Auth user (so the staff can log in).
 * 2. Inserts a `staffs` row whose `id` equals the auth user's ID,
 *    so that `fetchStaffProfile(id)` / `loginStaff` can find the profile.
 */
export async function createStaff(
    input: Omit<Staff, "id" | "created_at"> & { password?: string }
): Promise<Staff> {
    const supabase = await createClient();

    // ── 1. Create the Supabase Auth user ──────────────────────────────────────
    const password = input.password ?? "";
    if (!password.trim()) {
        throw new Error("A temporary password is required to create a staff account.");
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: input.email,
        password: password,
        options: { data: { name: input.name } },
    });

    if (authError) {
        console.error("[staff] create auth user error:", authError);
        throw new Error("Could not create staff account: " + authError.message);
    }

    if (!authData?.user) {
        throw new Error("Could not create staff account: no auth user was returned.");
    }

    // ── 2. Insert the staff profile row (id = auth user id) ───────────────────
    // NOTE: the DB is snake_case (see CLAUDE.md) — PostgREST matches column
    // names exactly, so sending camelCase `dateJoined` here failed with
    // PGRST204 ("Could not find the 'dateJoined' column of 'staffs'").
    // Map to `date_joined`, and only include it when a value is provided so
    // the insert never breaks if the column doesn't exist or is nullable.
    const staffRecord: Record<string, unknown> = {
        id: authData.user.id,
        name: input.name,
        email: input.email,
        phone_number: input.phone_number ?? "",
        role: input.role,
        department: input.department ?? "",
        status: input.status ?? "Active",
    };

    const joined = input.date_joined ?? input.dateJoined;
    if (joined) staffRecord.date_joined = joined;

    const { data, error } = await supabase
        .from("staffs")
        .insert([staffRecord])
        .select()
        .single();

    if (error) {
        console.error("[staff] create DB error:", error);
        throw new Error("Could not create staff profile: " + error.message);
    }

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