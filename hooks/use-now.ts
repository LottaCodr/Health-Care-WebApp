"use client";

import { useEffect, useState } from "react";

/**
 * A ticking clock for countdown UI (the amendment window chip).
 *
 * Returns `null` until the component has mounted: server rendering and the
 * first client paint must agree, and "ms left of a 24h window" never does.
 * Once mounted it re-renders on an interval so a closing window is visible
 * without a page refresh.
 */
export function useNow(intervalMs = 60_000): number | null {
    const [now, setNow] = useState<number | null>(null);

    useEffect(() => {
        setNow(Date.now());
        const id = window.setInterval(() => setNow(Date.now()), intervalMs);
        return () => window.clearInterval(id);
    }, [intervalMs]);

    return now;
}
