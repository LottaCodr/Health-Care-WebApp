"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { Staff, UserRole } from "@/types/models";
import { passwordSchema, validateEmail } from "@/lib/auth-utils";
import { normalizeUserRole } from "@/lib/roles";
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
 *
 * The Auth user and the public.staffs profile are created together. Auth's
 * admin API is used deliberately: calling `auth.signUp()` with the admin's
 * cookie-backed client can replace the admin's session, and public sign-ups
 * may be disabled in production. The staff row keeps the Auth user ID so
 * login and profile lookup resolve the same account.
 */
export async function createStaff(
    input: Omit<Staff, "id" | "created_at"> & { password?: string }
): Promise<Staff> {
    // Only administrators may mint new staff accounts (and therefore assign
    // roles). Without this check ANY authenticated staff member could create
    // themselves an Admin account — full privilege escalation.
    const actor = await requireStaff([UserRole.Admin]);

    if (!input || typeof input !== "object") {
        throw new Error("Staff details are required.");
    }

    const name = typeof input.name === "string" ? input.name.trim() : "";
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const password = typeof input.password === "string" ? input.password : "";

    if (name.length < 2) {
        throw new Error("Enter the staff member's full name.");
    }
    if (!validateEmail(email)) {
        throw new Error("Enter a valid work email address.");
    }

    const passwordCheck = passwordSchema.safeParse(password);
    if (!passwordCheck.success) {
        throw new Error(passwordCheck.error.issues[0]?.message ?? "Enter a secure temporary password.");
    }

    const role = normalizeUserRole(input.role);
    if (!role) {
        throw new Error("Select a valid staff role.");
    }

    const status = input.status ?? "Active";
    if (status !== "Active" && status !== "Inactive") {
        throw new Error("Select a valid staff status.");
    }

    // The elevated client is only used for Supabase Auth administration. It
    // has no browser session and cannot change the currently signed-in admin.
    const admin = createAdminClient();
    if (!admin) {
        throw new Error(
            "Staff account creation is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the server environment and try again."
        );
    }

    const supabase = await createClient();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
        email,
        password,
        // The admin supplied a temporary password, so the staff member can
        // sign in immediately instead of being stranded in an unconfirmed
        // account. Public sign-ups can remain disabled.
        email_confirm: true,
        user_metadata: { name },
    });

    if (authError) {
        console.error("[staff] create auth user error:", authError);
        const duplicateEmail = /already (?:been )?registered|already exists|email.*taken|user already/i.test(authError.message);
        throw new Error(
            duplicateEmail
                ? "A login already exists for this email address. Use a different work email."
                : "Could not create staff login: " + authError.message
        );
    }

    const authUser = authData?.user;
    if (!authUser) {
        throw new Error("Could not create staff login: no Auth user was returned.");
    }

    // ── Insert the staff profile row (id = Auth user id) ─────────────────────
    // The request-scoped client retains the administrator's session, so the
    // `staffs insert admin` RLS policy remains in force for this write.
    // The database uses snake_case; only include date_joined when provided.
    const staffRecord: Record<string, unknown> = {
        id: authUser.id,
        name,
        email,
        phone_number: typeof input.phone_number === "string" ? input.phone_number.trim() : "",
        role,
        department: typeof input.department === "string" ? input.department.trim() : "",
        status,
    };

    const joined = input.date_joined ?? input.dateJoined;
    if (typeof joined === "string" && joined.trim()) {
        staffRecord.date_joined = joined.trim();
    }

    let createdProfile: unknown = null;
    let profileError: { message: string } | null = null;
    try {
        const result = await supabase
            .from("staffs")
            .insert([staffRecord])
            .select()
            .single();
        createdProfile = result.data;
        profileError = result.error;
    } catch (error) {
        profileError = {
            message: error instanceof Error ? error.message : String(error),
        };
    }

    if (profileError || !createdProfile) {
        const profileErrorMessage = profileError?.message ?? "The database did not return the created staff profile.";
        console.error("[staff] create DB error:", profileErrorMessage);

        // Auth and Postgres cannot share a transaction. Roll back the login if
        // the staff profile write fails so there is no orphaned sign-in that
        // cannot access the EMR.
        let rollbackErrorMessage: string | null = null;
        try {
            const { error: rollbackError } = await admin.auth.admin.deleteUser(authUser.id);
            rollbackErrorMessage = rollbackError?.message ?? null;
        } catch (error) {
            rollbackErrorMessage = error instanceof Error ? error.message : String(error);
        }

        if (rollbackErrorMessage) {
            console.error("[staff] Auth rollback failed after profile insert error:", rollbackErrorMessage);
            throw new Error(
                `Could not create staff profile: ${profileErrorMessage}. The login was created but could not be removed; contact an administrator.`
            );
        }

        throw new Error("Could not create staff profile: " + profileErrorMessage);
    }

    await logAction("STAFF_CREATED", "staffs", authUser.id, {
        name,
        email,
        role,
        created_by: actor.userId,
    });

    return createdProfile as Staff;
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