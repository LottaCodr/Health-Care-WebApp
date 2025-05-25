"use client"

import { useState, useEffect } from "react";

// Dummy implementation: Replace with your actual RBAC logic
export function useRole(): string {
    // For demonstration, always returns "lab-tech"
    // In a real app, fetch the user's role from context, API, or auth provider
    const [role, setRole] = useState<string>("");

    useEffect(() => {
        // Simulate async fetch
        setTimeout(() => setRole("lab-tech"), 100);
    }, []);

    return role;
}