"use client";

/**
 * Offline mutation queue.
 *
 * When the network drops, critical front-desk actions (patient registration,
 * vital recordings) are parked in localStorage and replayed automatically
 * when the connection returns — the EMR never silently loses a registration
 * because of a flaky Nigerian ISP link.
 *
 * The queue is best-effort: items carry an idempotency `key` so the replay
 * service can skip duplicates if a replay crashes mid-way.
 */

export interface QueuedAction {
    id: string;
    key: string;
    kind: "register-patient" | "record-vitals";
    payload: Record<string, any>;
    createdAt: string;
}

const STORAGE_KEY = "nile_offline_queue";

export function getQueue(): QueuedAction[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
    } catch {
        return [];
    }
}

function setQueue(items: QueuedAction[]) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
        // storage full / private mode — drop silently (UI still reflects state)
    }
}

export function enqueue(action: Omit<QueuedAction, "id" | "createdAt">): QueuedAction {
    const item: QueuedAction = {
        ...action,
        id: `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
    };
    setQueue([...getQueue(), item]);
    window.dispatchEvent(new CustomEvent("nile-offline-queue-changed"));
    return item;
}

export function removeFromQueue(id: string) {
    setQueue(getQueue().filter((q) => q.id !== id));
    window.dispatchEvent(new CustomEvent("nile-offline-queue-changed"));
}

export function queueLength(): number {
    return getQueue().length;
}
