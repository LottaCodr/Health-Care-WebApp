"use client";

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface LoginToastProps {
    message?: string;
    type?: "success" | "error";
}

export function LoginToast({ message, type }: LoginToastProps) {
    const toast = useToast();

    useEffect(() => {
        if (!message) return;
        if (type === "success") {
            toast.toast({
                title: "Login successful",
                description: message,
            });
        } else if (type === "error") {
            toast.toast({
                title: "Login failed",
                description: message,
                variant: "destructive",
            });
        }
    }, [message, type, toast]);

    return null; // nothing visual, just fires toast
}
