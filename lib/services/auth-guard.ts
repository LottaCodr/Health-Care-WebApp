"use server";

import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/models";
import { normalizeUserRole } from "@/lib/roles";

/**
 * Server-side authorization layer.
 *
 * Every mutating (and sensitive reading) server action must go through
 * `requireStaff(...)` BEFORE touching the database. This is the real RBAC
 * enforcement point — `proxy.ts` only redirects pages, it does not (and
 * cannot) protect the data itself.
 *
 * `getCurrentStaff()` is memoized per request via React `cache`, so a
 * request that calls several services pays the profile lookup only once.
 */

export interface StaffSession {
    userId: string;
    role: UserRole;
    email: string | null;
}

/** Resolve the calling staff member from the SSR session (per-request cache). */
export const getCurrentStaff = cache(async (): Promise<StaffSession | null> => {
    const supabase = await createClient();

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return null;

    const { data: staffRow } = await supabase
        .from("staffs")
        .select("role, email")
        .eq("id", user.id)
        .single();

    const role = normalizeUserRole(staffRow?.role);
    if (!role) return null; // auth user without a staff row/role is not hospital staff

    return {
        userId: user.id,
        role,
        email: staffRow?.email ?? user.email ?? null,
    };
});

/**
 * Require an authenticated staff member. Optionally restrict to a set of
 * roles (Admin is always allowed — it is the superuser role).
 *
 * Throws a plain Error with a machine-readable message prefix so callers
 * (and logs) can distinguish auth failures from operational errors.
 */
export async function requireStaff(allowedRoles?: UserRole[]): Promise<StaffSession> {
    const staff = await getCurrentStaff();
    if (!staff) {
        throw new Error(
            "UNAUTHORIZED: You must be signed in as hospital staff to perform this action."
        );
    }

    if (
        allowedRoles &&
        allowedRoles.length > 0 &&
        staff.role !== UserRole.Admin &&
        !allowedRoles.includes(staff.role)
    ) {
        throw new Error(
            `FORBIDDEN: Your role (${staff.role}) is not allowed to perform this action.`
        );
    }

    return staff;
}

/**
 * Shortcut for services that only need "any signed-in staff member".
 */
export async function requireAuthenticatedStaff(): Promise<StaffSession> {
    return requireStaff();
}
