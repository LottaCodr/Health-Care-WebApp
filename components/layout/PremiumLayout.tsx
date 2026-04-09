"use client";

import React from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { NavUser } from "./NavUser";
import { useAuth } from "@/context/auth-provider";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useRoleRealtime } from "@/hooks/use-realtime";

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; dot: string }> = {
    Doctor: { label: "Doctor Console", dot: "bg-red-400" },
    Nurse: { label: "Nurse Console", dot: "bg-teal-400" },
    Pharmacist: { label: "Pharmacy Console", dot: "bg-violet-400" },
    Labtech: { label: "Lab Console", dot: "bg-indigo-400" },
    Frontdesk: { label: "Front Desk Console", dot: "bg-blue-400" },
    Admin: { label: "Admin Console", dot: "bg-amber-400" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PremiumLayout({ children }: { children: React.ReactNode }) {
    const { isLoading, user } = useAuth();
    const roleCfg = ROLE_CONFIG[user?.role ?? ""] ?? { label: "Console", dot: "bg-gray-400" };
    useRoleRealtime(user?.role); 

    // ── Loading ──
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative w-16 h-16">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 rounded-2xl border-2 border-white/8 border-t-blue-400"
                        />
                        <div className="absolute inset-2 rounded-xl bg-white/5 flex items-center justify-center">
                            <Stethoscope size={20} className="text-blue-400" />
                        </div>
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-white font-bold text-sm">Nile Valley Hospital</p>
                        <p className="text-blue-400/60 text-[9px] font-black uppercase tracking-[0.28em]">
                            Loading workspace...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <SidebarProvider>
            <AppSidebar />

            <SidebarInset className="bg-gray-50/50 flex flex-col h-screen overflow-hidden">

                {/* ── Header ── */}
                <header className="sticky top-0 z-40 shrink-0 flex h-14 items-center justify-between px-4 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">

                    {/* Left */}
                    <div className="flex items-center gap-3">
                        <SidebarTrigger className="w-8 h-8 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 text-gray-400 hover:text-gray-700 transition-all shadow-sm flex items-center justify-center" />
                        <div className="hidden md:flex items-center gap-2.5">
                            <div className="h-4 w-px bg-gray-100" />
                            <span className={`w-1.5 h-1.5 rounded-full ${roleCfg.dot} animate-pulse`} />
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                                {roleCfg.label}
                            </p>
                        </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-2">
                        <NotificationBell />
                        <div className="h-5 w-px bg-gray-100 mx-0.5" />
                        <NavUser />
                    </div>
                </header>

                {/* ── Content ── */}
                <main className="flex-1 overflow-y-auto w-full px-4 py-5 md:px-6 md:py-6 remove-scrollbar">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={user.$id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}