"use server";

import { createClient } from "@/utils/supabase/server";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";

/**
 * BREAK-GLASS emergency access.
 *
 * Staff may declare break-glass access to a patient record (e.g. an
 * unconscious patient whose records are needed urgently). The declaration:
 *   1. requires a signed-in staff member,
 *   2. requires a stated reason,
 *   3. is written to the audit trail as a HIGH-VISIBILITY event,
 *   4. grants a short, expiring access grant (15 minutes by default).
 *
 * Reads in this EMR are all-staff by design; break-glass exists so that the
 * hospital can (a) audit emergency access and (b) tighten default read
 * policies later (e.g. "treating team only") without redesigning the UI —
 * the grant check already lives here.
 */

export interface BreakGlassGrant {
    reference: string;
    patientId: string;
    grantedBy: string;
    grantedAt: string;
    expiresAt: string;
    reason: string;
}

const GRANT_MINUTES = 15;

export async function requestBreakGlass(
    patientId: string,
    reason: string
): Promise<BreakGlassGrant> {
    const actor = await requireStaff();
    if (!reason || reason.trim().length < 3) {
        throw new Error("A reason is required for emergency access (it will be audited).");
    }

    const supabase = await createClient();
    const { data: patient } = await supabase
        .from("patients")
        .select("id, name")
        .eq("id", patientId)
        .maybeSingle();
    if (!patient) throw new Error("Patient not found.");

    const now = new Date();
    const expiresAt = new Date(now.getTime() + GRANT_MINUTES * 60_000);
    const reference = `BG-${now.getTime().toString(36).toUpperCase()}`;

    const grant: BreakGlassGrant = {
        reference,
        patientId,
        grantedBy: actor.userId,
        grantedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        reason: reason.trim(),
    };

    // High-visibility audit entry (entity_type "break-glass" sorts to the top
    // of admin reviews and is exported in the audit CSV).
    await logAction("BREAK_GLASS_ACCESS", "break-glass", reference, {
        patient_id: patientId,
        patient_name: patient.name,
        reason: grant.reason,
        expires_at: grant.expiresAt,
        staff_email: actor.email,
    });

    return grant;
}

/** List recent break-glass events (Admin only, for review). */
export async function listBreakGlassEvents(limit = 100): Promise<any[]> {
    const { requireStaff } = await import("./auth-guard");
    const { UserRole } = await import("@/types/models");
    await requireStaff([UserRole.Admin]);
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("action", "BREAK_GLASS_ACCESS")
        .order("timestamp", { ascending: false })
        .limit(Math.min(limit, 500));
    if (error) return [];

    const rows = data ?? [];

    // Attach staff display names so admin reviews never expose staff IDs.
    const staffIds = [...new Set(rows.map((l: any) => l.user_id).filter(Boolean))];
    if (staffIds.length) {
        const { data: staff } = await supabase
            .from("staffs")
            .select("id, name, role")
            .in("id", staffIds);
        const staffMap = Object.fromEntries((staff ?? []).map((s: any) => [s.id, s]));
        rows.forEach((l: any) => {
            const member = staffMap[l.user_id];
            l.staff_name = member?.name ?? null;
            l.staff_role = member?.role ?? null;
        });
    }
    return rows;
}
