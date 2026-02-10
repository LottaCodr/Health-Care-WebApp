/**
 * Custom Store Hooks
 * Convenience hooks for using the store
 */

"use client";

import {
    useUserStore,
    useCacheStore,
    useLoadingStore,
    useErrorStore,
    useNotificationStore,
    useUIStore,
    NotificationType,
} from "@/store/store";

/**
 * Hook to use user store with automatic auth provider fallback
 */
export function useAppUser() {
    const { user, isLoading, error, setUser, clearUser } = useUserStore();
    return {
        user,
        isLoading,
        error,
        setUser,
        clearUser,
        isAuthenticated: !!user,
    };
}

/**
 * Hook for cache management
 */
export function useAppCache() {
    const cache = useCacheStore();
    return cache;
}

/**
 * Hook for loading state management
 */
export function useAppLoading() {
    const loading = useLoadingStore();
    return loading;
}

/**
 * Hook for error management
 */
export function useAppError() {
    const errors = useErrorStore();

    const addError = (
        key: string,
        message: string,
        code?: string,
        context?: Record<string, any>
    ) => {
        errors.addError(key, message, code, context);
    };

    return {
        ...errors,
        addError,
    };
}

/**
 * Hook for notifications
 */
export function useAppNotification() {
    const notifications = useNotificationStore();

    const notify = (
        type: NotificationType,
        message: string,
        duration?: number
    ) => {
        return notifications.addNotification({
            type,
            message,
            duration: duration ?? 3000,
        });
    };

    return {
        ...notifications,
        notify,
        success: (message: string) => notify("success", message),
        error: (message: string) => notify("error", message),
        warning: (message: string) => notify("warning", message),
        info: (message: string) => notify("info", message),
    };
}

/**
 * Hook for UI state management
 */
export function useAppUI() {
    const ui = useUIStore();
    return ui;
}

/**
 * Combined hook for quick access to most needed stores
 */
export function useAppState() {
    return {
        user: useAppUser(),
        notifications: useAppNotification(),
        errors: useAppError(),
        loading: useAppLoading(),
        cache: useAppCache(),
        ui: useAppUI(),
    };
}
