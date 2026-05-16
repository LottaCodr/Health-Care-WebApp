
"use client";

import { useState, useEffect, useCallback } from "react";
import supabase from "@/utils/supabase/client"; // ← your singleton
import { useAuth } from "@/context/auth-provider";
import { Notification } from "@/types/models";



export function useNotifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);


    // ── Fetch existing notifications ──────────────────────────────────────────

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        const { data } = await supabase
            .from("notifications")
            .select("*")
            .or(`recipient_id.eq.${user.$id},role.eq.${user.role}`)
            .order("created_at", { ascending: false })
            .limit(50);

        setNotifications(data ?? []);
        setLoading(false);
    }, [user]);

    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    // ── Real-time subscription ────────────────────────────────────────────────

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel("notifications")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `role=eq.${user.role}`,
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications((prev) => [newNotif, ...prev]);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    // ── Mark as read ──────────────────────────────────────────────────────────

    const markRead = useCallback(async (id: string) => {
        await supabase
            .from("notifications")
            .update({ read: true })
            .eq("id", id);

        setNotifications((prev) =>
            prev.map((n) => n.id === id ? { ...n, read: true } : n)
        );
    }, []);

    const markAllRead = useCallback(async () => {
        if (!user) return;
        await supabase
            .from("notifications")
            .update({ read: true })
            .or(`recipient_id.eq.${user.$id},role.eq.${user.role}`)
            .eq("read", false);

        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }, [user]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    return { notifications, loading, unreadCount, markRead, markAllRead, refetch: fetchNotifications };
}