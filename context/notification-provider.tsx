"use client";

/**
 * Shared in-app notification store.
 *
 * A single provider owns the notifications state + one Realtime channel so the
 * bell, sidebar badge and any other consumer always agree on unread counts.
 * Previously each consumer ran its own hook → separate state and duplicate
 * WebSocket channels, which made the badge go stale after "mark all read".
 *
 * Delivery rules (mirrored by the RLS policies in
 * supabase/migrations/20260903_notifications_realtime_all.sql):
 *   • personal  → recipient_id equals the signed-in staff's id
 *   • role      → role matches the signed-in staff's canonical role
 *   • broadcast → recipient_id AND role are both null ("all staff")
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import supabase from "@/utils/supabase/client";
import { useAuth } from "@/context/auth-provider";
import { Notification } from "@/types/models";
import { normalizeUserRole } from "@/lib/roles";

const MAX_NOTIFICATIONS = 50;

interface NotificationContextValue {
    notifications: Notification[];
    loading: boolean;
    unreadCount: number;
    markRead: (id: string) => Promise<void>;
    markAllRead: () => Promise<void>;
    refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

/** Canonical role comparison — handles `LabTechnician` vs `lab technician` etc. */
function rolesMatch(a?: string | null, b?: string | null): boolean {
    if (!a || !b) return false;
    return normalizeUserRole(a) === normalizeUserRole(b) || a.toLowerCase() === b.toLowerCase();
}

/** Is this notification addressed to the given user (or broadcast to all staff)? */
function isMine(notification: Notification, user: any): boolean {
    // Admins can review every notification (mirrors the RLS policy).
    if (normalizeUserRole(user?.role) === "Admin") return true;

    const userId = user?.$id ?? user?.id;
    const personal = notification.recipient_id && userId && String(notification.recipient_id) === String(userId);
    const role = notification.role && user?.role && rolesMatch(notification.role, user.role);
    // Broadcast: no recipient and no role → everyone sees it.
    const broadcast = !notification.recipient_id && !notification.role;
    return Boolean(personal || role || broadcast);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const userRef = useRef(user);
    userRef.current = user;

    const refetch = useCallback(async () => {
        if (!user) {
            setNotifications([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from("notifications")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(MAX_NOTIFICATIONS);

        if (error) {
            console.error("[notifications] fetch error:", error);
            setNotifications([]);
            setLoading(false);
            return;
        }

        // Double-guard with RLS: only keep rows meant for this user.
        const mine = (data ?? []).filter((n: Notification) => isMine(n, user));
        setNotifications(mine.slice(0, MAX_NOTIFICATIONS));
        setLoading(false);
    }, [user]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    // ── Realtime: one channel, client-side matching so personal, role-based
    //    and broadcast notifications all arrive live. (The single
    //    `role=eq.x` filter used before silently missed personal/broadcast
    //    notifications.)
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel("notification-live")
            .on("postgres_changes", {
                event: "INSERT",
                schema: "public",
                table: "notifications",
            }, (payload) => {
                const incoming = payload.new as Notification;
                const currentUser = userRef.current;
                if (!currentUser || !isMine(incoming, currentUser)) return;
                setNotifications((prev) =>
                    prev.some((n) => n.id === incoming.id)
                        ? prev
                        : [incoming, ...prev].slice(0, MAX_NOTIFICATIONS)
                );
            })
            .on("postgres_changes", {
                event: "UPDATE",
                schema: "public",
                table: "notifications",
            }, (payload) => {
                const updated = payload.new as Notification;
                setNotifications((prev) =>
                    prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n))
                );
            })
            .on("postgres_changes", {
                event: "DELETE",
                schema: "public",
                table: "notifications",
            }, (payload) => {
                const removed = payload.old as Notification;
                setNotifications((prev) => prev.filter((n) => n.id !== removed.id));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const markRead = useCallback(async (id: string) => {
        // Optimistic update, then persist.
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
        try {
            const { error } = await supabase
                .from("notifications")
                .update({ read: true })
                .eq("id", id);
            if (error) console.error("[notifications] markRead error:", error);
        } catch (err) {
            console.error("[notifications] markRead exception:", err);
        }
    }, []);

    const markAllRead = useCallback(async () => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        try {
            // Update exactly the rows this user can see — no reliance on a
            // fragile `.or()` filter, and it works even where RLS is off.
            const ids = notifications.filter((n) => !n.read).map((n) => n.id);
            if (!ids.length) return;
            const { error } = await supabase
                .from("notifications")
                .update({ read: true })
                .in("id", ids);
            if (error) console.error("[notifications] markAllRead error:", error);
        } catch (err) {
            console.error("[notifications] markAllRead exception:", err);
        }
    }, [notifications]);

    const value = useMemo<NotificationContextValue>(() => ({
        notifications,
        loading,
        unreadCount: notifications.filter((n) => !n.read).length,
        markRead,
        markAllRead,
        refetch,
    }), [notifications, loading, markRead, markAllRead, refetch]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotificationContext(): NotificationContextValue {
    const ctx = useContext(NotificationContext);
    if (!ctx) {
        throw new Error("useNotificationContext must be used within <NotificationProvider>");
    }
    return ctx;
}
