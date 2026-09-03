"use server";

import { createClient } from "@/utils/supabase/server";
import { requireStaff } from "./auth-guard";

export interface CreateNotificationInput {
    /** Staff id (staffs.id) for a personal notification. */
    recipient_id?: string;
    /** Canonical role (e.g. "Doctor", "LabTechnician") for a role notification. */
    role?: string;
    /** When true, the notification is broadcast to ALL staff (recipient + role ignored). */
    broadcast?: boolean;
    title: string;
    message: string;
    type?: "info" | "alert" | "success" | "warning";
    link?: string;
}

export async function createNotification(input: CreateNotificationInput) {
    await requireStaff();
    const supabase = await createClient();
    const isBroadcast = input.broadcast === true;

    try {
        const { data, error } = await supabase
            .from("notifications")
            .insert([{
                // Broadcast → both null so every staff member sees it
                // (RLS policy "notifications select own" allows it).
                recipient_id: isBroadcast ? null : input.recipient_id ?? null,
                role: isBroadcast ? null : input.role ?? null,
                title: input.title,
                message: input.message,
                type: input.type ?? "info",
                link: input.link ?? null,
                read: false,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.error("[notification] create error:", error);
            return null; // Return null on error, don't throw to prevent interrupting core workflows
        }

        return data;
    } catch (error) {
        console.error("[notification] create exception:", error);
        return null;
    }
}

/** Notify every staff member (broadcast). */
export async function notifyAllStaff(input: Omit<CreateNotificationInput, "broadcast" | "recipient_id" | "role">) {
    return createNotification({ ...input, broadcast: true });
}

/** Notify an entire role/department. */
export async function notifyRole(role: string, input: Omit<CreateNotificationInput, "role" | "broadcast" | "recipient_id">) {
    return createNotification({ ...input, role });
}

/** Notify one staff member by id. */
export async function notifyUser(userId: string, input: Omit<CreateNotificationInput, "recipient_id" | "broadcast" | "role">) {
    return createNotification({ ...input, recipient_id: userId });
}
