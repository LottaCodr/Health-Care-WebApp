"use client";

/**
 * Legacy-compatible accessor for the shared notification store.
 *
 * All consumers (NotificationBell, AppSidebar, …) receive the same state from
 * the single <NotificationProvider> mounted in PremiumLayout, so unread counts
 * and read state stay in sync across screens.
 */

import { useNotificationContext } from "@/context/notification-provider";

export function useNotifications() {
    return useNotificationContext();
}
