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

/**
 * Why a staff lookup came back empty. `requireStaff` turns this into a precise
 * message — "you are not signed in" and "the database could not be reached
 * just now" used to be the SAME `null`, so a transient Supabase hiccup
 * told every department their login had expired.
 */
type StaffResolution =
    | { staff: StaffSession; failure: null; detail?: undefined }
    | {
          staff: null;
          failure: "no-session" | "no-staff-row" | "unknown-role" | "lookup-failed";
          detail?: string;
      };

function isTransientAuthError(err: any): boolean {
    const status = Number(err?.status ?? 0);
    const name = String(err?.name ?? "");
    return (
        name === "AuthRetryableFetchError" ||
        status === 429 ||
        status >= 500 ||
        /fetch failed|timeout|econn|network|socket hang up/i.test(String(err?.message ?? ""))
    );
}

const resolveStaff = cache(async (): Promise<StaffResolution> => {
    const supabase = await createClient();

    // One retry on a transient failure (rate limit, 5xx, dropped socket): the
    // second attempt almost always lands, and the alternative is telling a
    // signed-in nurse to sign in again.
    let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
    for (let attempt = 0; attempt < 2; attempt++) {
        const { data, error } = await supabase.auth.getUser();
        if (!error && data.user) {
            user = data.user;
            break;
        }
        if (error && isTransientAuthError(error)) {
            if (attempt === 0) continue;
            return { staff: null, failure: "lookup-failed", detail: `sign-in service: ${error.message}` };
        }
        // 401 / missing session / invalid JWT → genuinely not signed in.
        return { staff: null, failure: "no-session" };
    }
    if (!user) return { staff: null, failure: "no-session" };

    let staffRow: { role?: string | null; email?: string | null } | null = null;
    let lastError: { code?: string; message?: string } | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
        const { data, error } = await supabase
            .from("staffs")
            .select("role, email")
            .eq("id", user.id)
            .maybeSingle();
        if (!error) {
            staffRow = data;
            lastError = null;
            break;
        }
        lastError = error;
    }
    if (lastError) {
        console.error("[auth-guard] staffs lookup failed:", lastError);
        return {
            staff: null,
            failure: "lookup-failed",
            detail: `staff profile read: ${lastError.code ? `${lastError.code} ` : ""}${lastError.message ?? "unknown error"}`,
        };
    }
    if (!staffRow) return { staff: null, failure: "no-staff-row" }; // auth user is not hospital staff

    const role = normalizeUserRole(staffRow.role);
    if (!role) {
        return { staff: null, failure: "unknown-role", detail: `role "${String(staffRow.role ?? "")}"` };
    }

    return {
        staff: {
            userId: user.id,
            role,
            email: staffRow.email ?? user.email ?? null,
        },
        failure: null,
    };
});

/** Resolve the calling staff member from the SSR session (per-request cache). */
export const getCurrentStaff = cache(async (): Promise<StaffSession | null> => {
    return (await resolveStaff()).staff;
});

/**
 * Require an authenticated staff member. Optionally restrict to a set of
 * roles (Admin is always allowed — it is the superuser role).
 *
 * Throws a plain Error with a machine-readable message prefix so callers
 * (and logs) can distinguish auth failures from operational errors.
 */
export async function requireStaff(allowedRoles?: UserRole[]): Promise<StaffSession> {
    const resolution = await resolveStaff();
    const staff = resolution.staff;
    if (!staff) {
        // The reason matters: only "no-session" means "sign in again".
        switch (resolution.failure) {
            case "lookup-failed":
                throw new Error(
                    `STAFF_LOOKUP_FAILED: Could not verify your staff account just now (${resolution.detail ?? "unknown error"}). ` +
                        "You are probably still signed in — please try again in a moment."
                );
            case "no-staff-row":
                throw new Error(
                    "UNAUTHORIZED: You are signed in, but your login has no matching staff profile. Ask an administrator to add you to the staff list."
                );
            case "unknown-role":
                throw new Error(
                    `UNAUTHORIZED: Your staff profile has a ${resolution.detail ?? "role"} that the system does not recognise. Ask an administrator to correct it.`
                );
            default:
                throw new Error(
                    "UNAUTHORIZED: You must be signed in as hospital staff to perform this action."
                );
        }
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
