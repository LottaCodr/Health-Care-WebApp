"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi, Loader2 } from "lucide-react";
import { useNetworkStore } from "@/store/network-store";

/**
 * Slim connection banner shown when the user is offline or on a very slow
 * connection. Renders nothing when the connection is healthy.
 */
export default function NetworkStatusBanner() {
    const isOnline = useNetworkStore((s) => s.isOnline);
    const quality = useNetworkStore((s) => s.quality);
    const isRealtimeConnected = useNetworkStore((s) => s.isRealtimeConnected);
    const [dismissedSlow, setDismissedSlow] = useState(false);

    // Auto-hide the "slow connection" notice after 6s unless still slow.
    useEffect(() => {
        if (quality !== "slow" || !isOnline) return;
        const t = setTimeout(() => setDismissedSlow(true), 6000);
        return () => clearTimeout(t);
    }, [quality, isOnline]);

    if (!isOnline) {
        return (
            <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-red-600 text-white text-[11px] font-semibold">
                <WifiOff size={12} className="shrink-0" />
                <span>You&apos;re offline — live updates are paused. Reconnecting automatically…</span>
            </div>
        );
    }

    if (isOnline && !isRealtimeConnected) {
        return (
            <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-amber-500 text-white text-[11px] font-semibold">
                <Loader2 size={12} className="animate-spin shrink-0" />
                <span>Connecting to live updates…</span>
            </div>
        );
    }

    if (quality === "slow" && !dismissedSlow) {
        return (
            <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-amber-50 text-amber-700 text-[11px] font-semibold border-b border-amber-100">
                <Wifi size={12} className="shrink-0" />
                <span>Slow connection detected — updates may be delayed.</span>
            </div>
        );
    }

    return null;
}
