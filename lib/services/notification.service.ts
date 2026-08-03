"use server";

import { createClient } from "@/utils/supabase/server";

export interface CreateNotificationInput {
    recipient_id?: string;
    role?: string;
    title: string;
    message: string;
    type?: "info" | "alert" | "success" | "warning";
    link?: string;
}

export async function createNotification(input: CreateNotificationInput) {
    const supabase = await createClient();

    try {
        const { data, error } = await supabase
            .from("notifications")
            .insert([{
                recipient_id: input.recipient_id ?? null,
                role: input.role ?? null,
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
