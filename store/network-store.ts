"use client";

import { create } from "zustand";

/**
 * Global network state — online/offline + estimated connection quality.
 *
 * `initNetworkMonitor()` should be called once at app bootstrap (see
 * `context/provider.tsx`). Components (banner, forms) read this store to
 * show connection status and skip doomed network calls while offline.
 */

export type ConnectionQuality = "fast" | "slow" | "unknown";

interface NetworkState {
    isOnline: boolean;
    quality: ConnectionQuality;
    effectiveType: string | null;
    saveData: boolean;
    /** Whether the Supabase Realtime channel is currently connected. */
    isRealtimeConnected: boolean;
    setOnline: (online: boolean) => void;
    setQuality: (quality: ConnectionQuality, effectiveType: string | null, saveData: boolean) => void;
    setRealtimeConnected: (connected: boolean) => void;
}

function getInitialOnline(): boolean {
    if (typeof navigator === "undefined") return true;
    return navigator.onLine;
}

function detectQuality(): { quality: ConnectionQuality; effectiveType: string | null; saveData: boolean } {
    if (typeof navigator === "undefined" || !("connection" in navigator)) {
        return { quality: "unknown", effectiveType: null, saveData: false };
    }
    const conn = (navigator as any).connection as
        | { effectiveType?: string; saveData?: boolean; type?: string }
        | undefined;
    const effectiveType = conn?.effectiveType ?? null;
    const saveData = !!conn?.saveData;

    let quality: ConnectionQuality = "unknown";
    if (effectiveType === "slow-2g" || effectiveType === "2g" || saveData) quality = "slow";
    else if (effectiveType === "3g") quality = "slow"; // 3g is usable but flaky
    else if (effectiveType === "4g" || effectiveType === "5g") quality = "fast";

    return { quality, effectiveType, saveData };
}

let monitorStarted = false;

/** Wire up browser `online`/`offline` + Network Information API listeners. */
export function initNetworkMonitor(): void {
    if (typeof window === "undefined" || monitorStarted) return;
    monitorStarted = true;

    const sync = () => {
        useNetworkStore.setState({
            isOnline: getInitialOnline(),
            ...detectQuality(),
        });
    };

    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);

    const conn = (navigator as any)?.connection as { addEventListener?: (t: string, cb: () => void) => void } | undefined;
    conn?.addEventListener?.("change", sync);

    sync();
}

export const useNetworkStore = create<NetworkState>()((set) => ({
    isOnline: getInitialOnline(),
    quality: "unknown",
    effectiveType: null,
    saveData: false,
    isRealtimeConnected: false,
    setOnline: (online) => set({ isOnline: online }),
    setQuality: (quality, effectiveType, saveData) => set({ quality, effectiveType, saveData }),
    setRealtimeConnected: (connected) => set({ isRealtimeConnected: connected }),
}));
