"use server";

import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/models";
import { getCurrentStaff, requireStaff } from "./auth-guard";

/**
 * Central audit trail for the EMR.
 *
 * `logAction` derives the actor from the SSR session — it NEVER trusts a
 * client-supplied user id. Audit entries are written best-effort: a logging
 * failure must never break the clinical operation it accompanies.
 */
export async function logAction(
    action: string,
    entityType: string,
    entityId: string,
    changes?: Record<string, any>
): Promise<void> {
    try {
        const staff = await getCurrentStaff();
        if (!staff) return; // anonymous actions are rejected by the guards anyway

        const supabase = await createClient();
        const { error } = await supabase.from("audit_logs").insert([
            {
                user_id: staff.userId,
                action,
                entity_type: entityType,
                entity_id: entityId,
                changes: changes ?? {},
                timestamp: new Date().toISOString(),
            },
        ]);

        if (error) console.error("[audit] logAction insert:", error);
    } catch (error) {
        console.error("[audit] logAction:", error);
    }
}

/**
 * List audit entries — ADMIN ONLY. The audit trail is sensitive (it reveals
 * which staff member did what), so it is not exposed to other roles.
 */
export async function listAuditLogs(limit = 500): Promise<any[]> {
    await requireStaff([UserRole.Admin]);

    const supabase = await createClient();
    const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(Math.min(Math.max(limit, 1), 1000));

    if (error) {
        console.error("[audit] listAuditLogs:", error);
        return [];
    }

    const rows = data ?? [];

    // Attach staff display names so the audit trail shows who acted without
    // exposing raw staff IDs in the UI.
    const staffIds = [...new Set(rows.map((l: any) => l.user_id).filter(Boolean))];
    if (staffIds.length) {
        const { data: staff } = await supabase
            .from("staffs")
            .select("id, name, role, email")
            .in("id", staffIds);
        const staffMap = Object.fromEntries((staff ?? []).map((s: any) => [s.id, s]));
        rows.forEach((l: any) => {
            const member = staffMap[l.user_id];
            l.staff_name = member?.name ?? null;
            l.staff_email = member?.email ?? null;
            l.staff_role = member?.role ?? null;
        });
    }
    return rows;
}
