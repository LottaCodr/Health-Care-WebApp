"use server";

import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
    Staff,
    StaffEmailConfirmationInfo,
    StaffOnboardingMode,
    UserRole,
} from "@/types/models";
import { passwordSchema, validateEmail } from "@/lib/auth-utils";
import { normalizeUserRole } from "@/lib/roles";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";

/** Profile fields a staff member may edit on their OWN row. */
const SELF_EDITABLE_FIELDS = ["name", "phone_number"] as const;

export type CreateStaffInput = Omit<
    Staff,
    "id" | "created_at" | "status" | "dateJoined"
> & {
    status?: "Active" | "Inactive";
    dateJoined?: string;
    password?: string;
    onboardingMode?: StaffOnboardingMode;
};

export type CreateStaffResult = Staff & {
    onboardingMode: StaffOnboardingMode;
    confirmationEmailSent: boolean;
    confirmationWarning?: string;
};

/**
 * Resolve the current deployment origin so confirmation/invite links point
 * back to the active host (production domain, Vercel preview, or localhost).
 */
async function resolveAppOrigin(): Promise<string> {
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (configured && configured !== "http://localhost:3000") {
        return configured.replace(/\/+$/, "");
    }
    try {
        const h = await headers();
        const origin = h.get("origin");
        if (origin) return origin.replace(/\/+$/, "");
        const host = h.get("x-forwarded-host") || h.get("host");
        if (host) {
            const proto =
                h.get("x-forwarded-proto") ||
                (host.startsWith("localhost") || host.startsWith("127.0.0.1")
                    ? "http"
                    : "https");
            return `${proto}://${host}`;
        }
    } catch {
        // Outside an HTTP request (e.g. CLI verification harness)
    }
    return (configured || "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * Ephemeral anon client with zero cookie persistence so calling
 * `auth.resend()` / `auth.signInWithOtp()` on behalf of a new staff member
 * never touches the signed-in Administrator's session.
 */
function createEphemeralAnonClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;

    return createSupabaseClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    });
}

function formatMailerWarning(rawMessage?: string | null): string {
    const msg = String(rawMessage ?? "").trim();
    if (/rate limit|too many requests|429/i.test(msg)) {
        return (
            "Staff account was created, but Supabase's email rate limit was reached. " +
            "Click \"Resend Email\" on their row shortly (or configure custom SMTP in Supabase Auth)."
        );
    }
    if (/signups? not allowed|disabled/i.test(msg)) {
        return (
            "Staff account was created, but signup confirmation emails are disabled in Supabase Auth. " +
            "Use \"Invite by Email\" mode or enable email confirmations in Supabase."
        );
    }
    return msg
        ? `Staff account was created, but the confirmation email could not be sent (${msg}). You can retry with "Resend Email".`
        : "Staff account was created, but the confirmation email could not be sent. You can retry with \"Resend Email\".";
}

function isMissingColumnError(err: { code?: string; message?: string } | null): boolean {
    if (!err) return false;
    return err.code === "42703" || err.code === "PGRST204";
}

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
 * Admin-only: look up email-confirmation state from Supabase Auth for each
 * staff member so Staff Management can display "Pending confirmation" badges
 * and a one-click "Resend Email" button.
 */
export async function getStaffEmailConfirmationStatuses(): Promise<
    Record<string, StaffEmailConfirmationInfo>
> {
    await requireStaff([UserRole.Admin]);
    const admin = createAdminClient();
    if (!admin) return {};

    const result: Record<string, StaffEmailConfirmationInfo> = {};
    try {
        let page = 1;
        const perPage = 1000;
        while (page <= 10) {
            const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
            if (error || !data?.users?.length) break;

            for (const u of data.users) {
                const rawMode = (u.user_metadata as Record<string, unknown> | undefined)
                    ?.onboarding_mode;
                const onboardingMode: StaffOnboardingMode | null =
                    rawMode === "invite" || rawMode === "temp_password"
                        ? rawMode
                        : u.invited_at
                            ? "invite"
                            : null;

                result[u.id] = {
                    emailConfirmedAt: u.email_confirmed_at ?? null,
                    invitedAt: u.invited_at ?? null,
                    lastSignInAt: u.last_sign_in_at ?? null,
                    onboardingMode,
                };
            }

            if (data.users.length < perPage) break;
            page += 1;
        }
    } catch (err) {
        console.error("[staff] getStaffEmailConfirmationStatuses:", err);
    }
    return result;
}

/**
 * Create a new staff member (Admin-only) and send an email confirmation /
 * onboarding link via Supabase Auth.
 *
 * Supports two onboarding modes:
 *   1. `"invite"` (default): calls `admin.auth.admin.inviteUserByEmail(...)`.
 *      Supabase sends an invite/confirmation email; the staff member clicks
 *      the link to verify their email and set their own password on
 *      `/auth/confirm`. Works even when public sign-ups are disabled.
 *   2. `"temp_password"`: calls `admin.auth.admin.createUser({ email_confirm: false })`
 *      with the Admin's temporary password and immediately dispatches a signup
 *      confirmation email via an isolated ephemeral anon client (`auth.resend`).
 *      The staff member cannot sign in until they confirm their email.
 */
export async function createStaff(
    input: CreateStaffInput
): Promise<CreateStaffResult> {
    const actor = await requireStaff([UserRole.Admin]);

    if (!input || typeof input !== "object") {
        throw new Error("Staff details are required.");
    }

    const name = typeof input.name === "string" ? input.name.trim() : "";
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const password = typeof input.password === "string" ? input.password : "";
    const onboardingMode: StaffOnboardingMode =
        input.onboardingMode === "temp_password" ||
        (!input.onboardingMode && password.length > 0)
            ? "temp_password"
            : "invite";

    if (name.length < 2) {
        throw new Error("Enter the staff member's full name.");
    }
    if (!validateEmail(email)) {
        throw new Error("Enter a valid work email address.");
    }

    if (onboardingMode === "temp_password") {
        const passwordCheck = passwordSchema.safeParse(password);
        if (!passwordCheck.success) {
            throw new Error(
                passwordCheck.error.issues[0]?.message ?? "Enter a secure temporary password."
            );
        }
    }

    const role = normalizeUserRole(input.role);
    if (!role) {
        throw new Error("Select a valid staff role.");
    }

    const status = input.status ?? "Active";
    if (status !== "Active" && status !== "Inactive") {
        throw new Error("Select a valid staff status.");
    }

    const admin = createAdminClient();
    if (!admin) {
        throw new Error(
            "Staff account creation is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the server environment and try again."
        );
    }

    const origin = await resolveAppOrigin();
    const confirmRedirectUrl = `${origin}/auth/confirm?mode=${
        onboardingMode === "invite" ? "invite" : "signup"
    }`;

    let authUser: { id: string } | null = null;
    let confirmationEmailSent = false;
    let confirmationWarning: string | undefined;

    if (onboardingMode === "invite") {
        const { data: inviteData, error: inviteError } =
            await admin.auth.admin.inviteUserByEmail(email, {
                data: {
                    name,
                    role,
                    onboarding_mode: "invite",
                },
                redirectTo: confirmRedirectUrl,
            });

        if (inviteError) {
            console.error("[staff] invite auth user error:", inviteError);
            const duplicateEmail =
                /already (?:been )?registered|already exists|email.*taken|user already/i.test(
                    inviteError.message
                );
            throw new Error(
                duplicateEmail
                    ? "A login already exists for this email address. Use a different work email."
                    : "Could not send staff invitation: " + inviteError.message
            );
        }

        authUser = inviteData?.user ?? null;
        confirmationEmailSent = true;
    } else {
        const { data: authData, error: authError } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: false,
            user_metadata: {
                name,
                role,
                onboarding_mode: "temp_password",
            },
        });

        if (authError) {
            console.error("[staff] create auth user error:", authError);
            const duplicateEmail =
                /already (?:been )?registered|already exists|email.*taken|user already/i.test(
                    authError.message
                );
            throw new Error(
                duplicateEmail
                    ? "A login already exists for this email address. Use a different work email."
                    : "Could not create staff login: " + authError.message
            );
        }

        authUser = authData?.user ?? null;

        if (authUser) {
            const ephemeral = createEphemeralAnonClient();
            if (!ephemeral) {
                confirmationEmailSent = false;
                confirmationWarning = formatMailerWarning(
                    "NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured"
                );
            } else {
                const { error: resendError } = await ephemeral.auth.resend({
                    type: "signup",
                    email,
                    options: { emailRedirectTo: confirmRedirectUrl },
                });

                if (resendError) {
                    console.warn("[staff] confirmation resend error:", resendError);
                    confirmationEmailSent = false;
                    confirmationWarning = formatMailerWarning(resendError.message);
                } else {
                    confirmationEmailSent = true;
                }
            }
        }
    }

    if (!authUser) {
        throw new Error("Could not create staff login: no Auth user was returned.");
    }

    // ── Insert the staff profile row (id = Auth user id) ─────────────────────
    const supabase = await createClient();
    const baseStaffRecord: Record<string, unknown> = {
        id: authUser.id,
        name,
        email,
        phone_number: typeof input.phone_number === "string" ? input.phone_number.trim() : "",
        role,
        department: typeof input.department === "string" ? input.department.trim() : "",
        is_active: status === "Active",
    };

    let createdProfile: unknown = null;
    let profileError: { code?: string; message: string } | null = null;
    try {
        let result = await supabase
            .from("staffs")
            .insert([baseStaffRecord])
            .select()
            .single();

        // Compatibility fallback if a schema uses `status` instead of `is_active`
        if (result.error && isMissingColumnError(result.error)) {
            const legacyRecord: Record<string, unknown> = {
                id: authUser.id,
                name,
                email,
                phone_number: baseStaffRecord.phone_number,
                role,
                department: baseStaffRecord.department,
                status,
            };
            const joined = input.date_joined ?? input.dateJoined;
            if (typeof joined === "string" && joined.trim()) {
                legacyRecord.date_joined = joined.trim();
            }
            result = await supabase
                .from("staffs")
                .insert([legacyRecord])
                .select()
                .single();
        }

        createdProfile = result.data;
        profileError = result.error;
    } catch (error) {
        profileError = {
            message: error instanceof Error ? error.message : String(error),
        };
    }

    if (profileError || !createdProfile) {
        const profileErrorMessage =
            profileError?.message ?? "The database did not return the created staff profile.";
        console.error("[staff] create DB error:", profileErrorMessage);

        let rollbackErrorMessage: string | null = null;
        try {
            const { error: rollbackError } = await admin.auth.admin.deleteUser(authUser.id);
            rollbackErrorMessage = rollbackError?.message ?? null;
        } catch (error) {
            rollbackErrorMessage = error instanceof Error ? error.message : String(error);
        }

        if (rollbackErrorMessage) {
            console.error(
                "[staff] Auth rollback failed after profile insert error:",
                rollbackErrorMessage
            );
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
        onboarding_mode: onboardingMode,
        confirmation_email_sent: confirmationEmailSent,
        created_by: actor.userId,
    });

    return {
        ...(createdProfile as Staff),
        onboardingMode,
        confirmationEmailSent,
        ...(confirmationWarning ? { confirmationWarning } : {}),
    };
}

/**
 * Resend an invitation or confirmation email for an unconfirmed staff member
 * (Admin-only).
 */
export async function resendStaffConfirmation(staffId: string): Promise<
    | { ok: true; message: string }
    | { ok: false; message: string }
> {
    try {
        const actor = await requireStaff([UserRole.Admin]);
        const id = typeof staffId === "string" ? staffId.trim() : "";
        if (!id) {
            return { ok: false, message: "Invalid staff ID." };
        }

        const admin = createAdminClient();
        if (!admin) {
            return {
                ok: false,
                message: "SUPABASE_SERVICE_ROLE_KEY is required on the server to resend confirmations.",
            };
        }

        const { data: userRes, error: getErr } = await admin.auth.admin.getUserById(id);
        if (getErr || !userRes?.user) {
            return {
                ok: false,
                message: getErr?.message ?? "Could not find this staff member's login record.",
            };
        }

        const authUser = userRes.user;
        if (authUser.email_confirmed_at) {
            return {
                ok: false,
                message: "This staff member has already confirmed their email address.",
            };
        }

        const email = authUser.email?.trim().toLowerCase();
        if (!email) {
            return { ok: false, message: "No email address is attached to this login." };
        }

        const origin = await resolveAppOrigin();
        const rawMode = (authUser.user_metadata as Record<string, unknown> | undefined)
            ?.onboarding_mode;
        const isInvite = rawMode !== "temp_password";

        const ephemeral = createEphemeralAnonClient();
        if (!ephemeral) {
            return {
                ok: false,
                message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.",
            };
        }

        if (!isInvite) {
            const { error: resendErr } = await ephemeral.auth.resend({
                type: "signup",
                email,
                options: { emailRedirectTo: `${origin}/auth/confirm?mode=signup` },
            });
            if (resendErr) {
                return { ok: false, message: formatMailerWarning(resendErr.message) };
            }
        } else {
            // Try inviteUserByEmail first; if GoTrue reports the unconfirmed user
            // already exists, send a magic-link confirmation pointing to mode=invite
            // so confirming also prompts them to set their password.
            const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
                data: authUser.user_metadata ?? { onboarding_mode: "invite" },
                redirectTo: `${origin}/auth/confirm?mode=invite`,
            });

            if (inviteErr) {
                const alreadyExists =
                    /already (?:been )?registered|already exists|user already/i.test(
                        inviteErr.message
                    );
                if (!alreadyExists) {
                    return { ok: false, message: formatMailerWarning(inviteErr.message) };
                }

                const { error: otpErr } = await ephemeral.auth.signInWithOtp({
                    email,
                    options: {
                        shouldCreateUser: false,
                        emailRedirectTo: `${origin}/auth/confirm?mode=invite`,
                    },
                });
                if (otpErr) {
                    return { ok: false, message: formatMailerWarning(otpErr.message) };
                }
            }
        }

        await logAction("STAFF_CONFIRMATION_RESENT", "staffs", id, {
            email,
            resent_by: actor.userId,
        });

        return {
            ok: true,
            message: `Confirmation email sent to ${email}.`,
        };
    } catch (error: any) {
        return {
            ok: false,
            message: error?.message ?? "Could not resend the confirmation email.",
        };
    }
}

export async function updateStaff(
    id: string,
    updates: Partial<Staff>
): Promise<Staff> {
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
 * Self-service profile edit used by the Settings screen.
 */
export async function updateOwnProfile(
    updates: Pick<Partial<Staff>, "name" | "phone_number">
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
        throw new Error("You cannot delete your own account from the staff manager.");
    }

    const supabase = await createClient();
    const { error } = await supabase.from("staffs").delete().eq("id", id);
    if (error) { console.error("[staff] delete:", error); throw error; }

    await logAction("STAFF_DELETED", "staffs", id, { deleted_by: actor.userId });
}
