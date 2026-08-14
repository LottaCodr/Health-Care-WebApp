"use server";

import { createClient } from "@/utils/supabase/server";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";

export interface DeleteAccountResult {
    success: boolean;
    message: string;
}

/**
 * Self-service account deletion for the Settings → Danger Zone.
 *
 * 1. Removes the staff profile row — once it's gone, `fetchStaffProfile`
 *    returns nothing, so the account can no longer log in.
 * 2. Best-effort: also deletes the Auth user when `SUPABASE_SERVICE_ROLE_KEY`
 *    is configured (requires a DELETE policy on `staffs` for RLS, plus the
 *    service-role key to remove the Auth user itself).
 */
export async function deleteOwnAccount(): Promise<DeleteAccountResult> {
    await requireStaff();
    const supabase = await createClient();

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, message: "You must be logged in to delete your account." };
    }

    // ── 1. Delete the staff profile row (id = auth user id) ──────────────────
    const { error: deleteError } = await supabase
        .from("staffs")
        .delete()
        .eq("id", user.id);

    if (deleteError) {
        console.error("[account] delete staff row:", deleteError);
        return {
            success: false,
            message:
                "Could not delete your account: " + deleteError.message +
                " (an admin needs to add a DELETE policy on the staffs table)",
        };
    }

    // ── 2. Best-effort: delete the Auth user via the admin API ───────────────
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const { createAdminClient } = await import("@/utils/supabase/admin");
        const admin = createAdminClient();

        if (admin) {
            const { error: adminError } = await admin.auth.admin.deleteUser(user.id);
            if (adminError) {
                console.error("[account] admin deleteUser:", adminError);
            }
        }
    } else {
        console.warn(
            "[account] SUPABASE_SERVICE_ROLE_KEY not set — Auth user kept, but the staff profile was removed so login is disabled."
        );
    }

    await logAction("ACCOUNT_SELF_DELETED", "staffs", user.id);
    return { success: true, message: "Your account has been deleted." };
}
