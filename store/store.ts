/**
 * Unified State Management Store
 * Centralized store for application state using Zustand
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// ============ User Store ============
interface UserState {
    user: any | null;
    isLoading: boolean;
    error: string | null;
    setUser: (user: any) => void;
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearUser: () => void;
}

export const useUserStore = create<UserState>()(
    devtools(
        (set) => ({
            user: null,
            isLoading: true,
            error: null,
            setUser: (user) =>
                set({
                    user,
                    isLoading: false,
                    error: null,
                }),
            setLoading: (isLoading) =>
                set({
                    isLoading,
                }),
            setError: (error) =>
                set({
                    error,
                    isLoading: false,
                }),
            clearUser: () =>
                set({
                    user: null,
                    isLoading: false,
                    error: null,
                }),
        }),
        { name: "user-store" }
    )
);

// ============ Cache Store ============
interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

interface CacheState {
    cache: Map<string, CacheEntry<any>>;
    set: <T>(key: string, data: T, ttl?: number) => void;
    get: <T>(key: string) => T | null;
    has: (key: string) => boolean;
    remove: (key: string) => void;
    clear: () => void;
    isExpired: (key: string) => boolean;
}

const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useCacheStore = create<CacheState>()(
    devtools(
        (set, get) => ({
            cache: new Map(),
            set: <T,>(key: string, data: T, ttl: number = DEFAULT_CACHE_TTL) => {
                set((state) => {
                    const newCache = new Map(state.cache);
                    newCache.set(key, {
                        data,
                        timestamp: Date.now(),
                        ttl,
                    });
                    return { cache: newCache };
                });
            },
            get: <T,>(key: string): T | null => {
                const state = get();
                const entry = state.cache.get(key);

                if (!entry) return null;

                // Check if expired
                if (Date.now() - entry.timestamp > entry.ttl) {
                    state.remove(key);
                    return null;
                }

                return entry.data as T;
            },
            has: (key: string) => {
                const state = get();
                return state.cache.has(key) && !state.isExpired(key);
            },
            remove: (key: string) => {
                set((state) => {
                    const newCache = new Map(state.cache);
                    newCache.delete(key);
                    return { cache: newCache };
                });
            },
            clear: () => {
                set({ cache: new Map() });
            },
            isExpired: (key: string) => {
                const state = get();
                const entry = state.cache.get(key);
                if (!entry) return true;
                return Date.now() - entry.timestamp > entry.ttl;
            },
        }),
        { name: "cache-store" }
    )
);

// ============ Loading State Store ============
interface LoadingState {
    loadingKeys: Set<string>;
    addLoading: (key: string) => void;
    removeLoading: (key: string) => void;
    isLoading: (key: string) => boolean;
    hasAnyLoading: () => boolean;
    clearAll: () => void;
}

export const useLoadingStore = create<LoadingState>()(
    devtools(
        (set, get) => ({
            loadingKeys: new Set(),
            addLoading: (key: string) => {
                set((state) => {
                    const newKeys = new Set(state.loadingKeys);
                    newKeys.add(key);
                    return { loadingKeys: newKeys };
                });
            },
            removeLoading: (key: string) => {
                set((state) => {
                    const newKeys = new Set(state.loadingKeys);
                    newKeys.delete(key);
                    return { loadingKeys: newKeys };
                });
            },
            isLoading: (key: string) => {
                return get().loadingKeys.has(key);
            },
            hasAnyLoading: () => {
                return get().loadingKeys.size > 0;
            },
            clearAll: () => {
                set({ loadingKeys: new Set() });
            },
        }),
        { name: "loading-store" }
    )
);

// ============ Error Store ============
interface ErrorEntry {
    message: string;
    code?: string;
    timestamp: number;
    context?: Record<string, any>;
}

interface ErrorState {
    errors: Map<string, ErrorEntry>;
    addError: (key: string, message: string, code?: string, context?: Record<string, any>) => void;
    removeError: (key: string) => void;
    getError: (key: string) => ErrorEntry | null;
    clearAll: () => void;
    getLastError: () => ErrorEntry | null;
}

export const useErrorStore = create<ErrorState>()(
    devtools(
        (set, get) => ({
            errors: new Map(),
            addError: (key: string, message: string, code?: string, context?: Record<string, any>) => {
                set((state) => {
                    const newErrors = new Map(state.errors);
                    newErrors.set(key, {
                        message,
                        code,
                        timestamp: Date.now(),
                        context,
                    });
                    return { errors: newErrors };
                });
            },
            removeError: (key: string) => {
                set((state) => {
                    const newErrors = new Map(state.errors);
                    newErrors.delete(key);
                    return { errors: newErrors };
                });
            },
            getError: (key: string) => {
                return get().errors.get(key) ?? null;
            },
            clearAll: () => {
                set({ errors: new Map() });
            },
            getLastError: () => {
                const errors = get().errors;
                if (errors.size === 0) return null;
                return Array.from(errors.values()).sort((a, b) => b.timestamp - a.timestamp)[0] ?? null;
            },
        }),
        { name: "error-store" }
    )
);

// ============ Notification Store ============
export type NotificationType = "success" | "error" | "warning" | "info";

interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    duration?: number;
}

interface NotificationState {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, "id">) => string;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
    devtools(
        (set) => ({
            notifications: [],
            addNotification: (notification) => {
                const id = `${Date.now()}-${Math.random()}`;
                set((state) => ({
                    notifications: [...state.notifications, { ...notification, id }],
                }));
                return id;
            },
            removeNotification: (id: string) => {
                set((state) => ({
                    notifications: state.notifications.filter((n) => n.id !== id),
                }));
            },
            clearAll: () => {
                set({ notifications: [] });
            },
        }),
        { name: "notification-store" }
    )
);

// ============ UI State Store ============
interface UIState {
    sidebarOpen: boolean;
    darkMode: boolean;
    setSidebarOpen: (open: boolean) => void;
    setDarkMode: (dark: boolean) => void;
    toggleSidebar: () => void;
    toggleDarkMode: () => void;
}

export const useUIStore = create<UIState>()(
    devtools(
        persist(
            (set) => ({
                sidebarOpen: true,
                darkMode: false,
                setSidebarOpen: (open) =>
                    set({ sidebarOpen: open }),
                setDarkMode: (dark) =>
                    set({ darkMode: dark }),
                toggleSidebar: () =>
                    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
                toggleDarkMode: () =>
                    set((state) => ({ darkMode: !state.darkMode })),
            }),
            { name: "ui-store" }
        ),
        { name: "ui-store" }
    )
);

