"use server";

import { createClient } from "@/utils/supabase/server";
import { Staff, UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";

/** Profile fields a staff member may edit on their OWN row. */
const SELF_EDITABLE_FIELDS = ["name", "email", "phone_number"] as const;

export async function getAllStaffs(): Promise<Staff[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("staffs")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) { console.error("[staff] getAll:", error); return []; }
    return data as unknown as Staff[];
}
export async function getStaffById(id: string): Promise<Staff | null> {
    await requireStaff();
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
    await requireStaff();
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
    // Only administrators may mint new staff accounts (and therefore assign
    // roles). Without this check ANY authenticated staff member could create
    // themselves an Admin account — full privilege escalation.
    const actor = await requireStaff([UserRole.Admin]);

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

    await logAction("STAFF_CREATED", "staffs", authData.user.id, {
        name: input.name,
        email: input.email,
        role: input.role,
        created_by: actor.userId,
    });

    return data as unknown as Staff;
}

export async function updateStaff(
    id: string,
    updates: Partial<Staff>
): Promise<Staff> {
    // Admin may update anyone. A staff member may only update their OWN row,
    // and only their profile fields — role/status/department changes are
    // admin-only, so nobody can promote themselves.
    const actor = await requireStaff();
    const isSelf = id === actor.userId;

    const safeUpdates: Partial<Staff> = { ...updates };

    if (!isSelf && actor.role !== UserRole.Admin) {
        throw new Error("FORBIDDEN: Only administrators can update other staff members.");
    }
    if (isSelf && actor.role !== UserRole.Admin) {
        for (const key of Object.keys(safeUpdates) as (keyof Staff)[]) {
            if (!(SELF_EDITABLE_FIELDS as readonly string[]).includes(String(key))) {
                delete safeUpdates[key];
            }
        }
    }

    const supabase = await createClient();
    const { data, error } = await supabase
        .from("staffs")
        .update(safeUpdates)
        .eq("id", id)
        .select()
        .single();

    if (error) { console.error("[staff] update:", error); throw error; }

    if (safeUpdates.role) {
        await logAction("STAFF_ROLE_CHANGED", "staffs", id, {
            new_role: safeUpdates.role,
            changed_by: actor.userId,
        });
    }

    return data as unknown as Staff;
}

/**
 * Self-service profile edit used by the Settings screen. The caller can only
 * ever edit their own row; the id is derived from the session, never from
 * the client.
 */
export async function updateOwnProfile(
    updates: Pick<Partial<Staff>, "name" | "email" | "phone_number">
): Promise<Staff> {
    const actor = await requireStaff();

    const safeUpdates: Partial<Staff> = {};
    for (const key of SELF_EDITABLE_FIELDS) {
        const value = (updates as Record<string, unknown>)[key];
        if (value !== undefined) (safeUpdates as Record<string, unknown>)[key] = value;
    }

    const supabase = await createClient();
    const { data, error } = await supabase
        .from("staffs")
        .update(safeUpdates)
        .eq("id", actor.userId)
        .select()
        .single();

    if (error) { console.error("[staff] updateOwnProfile:", error); throw error; }
    return data as unknown as Staff;
}

export async function deleteStaff(id: string): Promise<void> {
    const actor = await requireStaff([UserRole.Admin]);

    if (id === actor.userId) {
        // Prevent an admin from deleting their own row mid-session (use
        // Settings → Danger Zone → Delete account instead).
        throw new Error("You cannot delete your own account from the staff manager.");
    }

    const supabase = await createClient();
    const { error } = await supabase.from("staffs").delete().eq("id", id);
    if (error) { console.error("[staff] delete:", error); throw error; }

    await logAction("STAFF_DELETED", "staffs", id, { deleted_by: actor.userId });
}