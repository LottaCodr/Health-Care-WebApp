"use server";


import { createClient } from "@/utils/supabase/server";

export async function logAction(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    changes?: Record<string, any>
): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
        .from("audit_logs")
        .insert([{
            user_id: userId,
            action,
            entity_type: entityType,
            entity_id: entityId,
            changes: changes ?? {},
            timestamp: new Date().toISOString(),
        }]);

    if (error) console.error("[audit] logAction:", error);
    // Never throw — audit failures must never break the primary operation
}