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
import NetworkStatusBanner from "./NetworkStatusBanner";
import { usePathname } from "next/navigation";
import { normalizeUserRole } from "@/lib/roles";
import { NAV_CONFIG } from "./config";

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; dot: string }> = {
    Doctor: { label: "Doctor Console", dot: "bg-red-400" },
    Nurse: { label: "Nurse Console", dot: "bg-teal-400" },
    Pharmacist: { label: "Pharmacy Console", dot: "bg-violet-400" },
    LabTechnician: { label: "Lab Console", dot: "bg-indigo-400" },
    FrontDesk: { label: "Front Desk Console", dot: "bg-blue-400" },
    Admin: { label: "Admin Console", dot: "bg-amber-400" },
    Radiologist: { label: "Radiology Console", dot: "bg-fuchsia-400" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PremiumLayout({ children }: { children: React.ReactNode }) {
    const { isLoading, user } = useAuth();
    const pathname = usePathname();
    const userRole = normalizeUserRole(user?.role);
    const roleCfg = (userRole && ROLE_CONFIG[userRole]) || { label: "Staff Console", dot: "bg-gray-400" };
    const roleNav = userRole ? NAV_CONFIG[userRole] : undefined;
    const currentItem = [...(roleNav?.main ?? []), ...(roleNav?.secondary ?? [])]
        .sort((a, b) => b.url.length - a.url.length)
        .find((item) => pathname === item.url || pathname.startsWith(`${item.url}/`));
    const pageTitle = currentItem?.title ?? "Workspace";
    useRoleRealtime(userRole || undefined);

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

            <SidebarInset className="min-w-0 bg-slate-50/80 flex flex-col h-svh md:h-[calc(100svh-1rem)] overflow-hidden md:rounded-2xl">

                {/* ── Connection status banner (offline / reconnecting / slow) ── */}
                <NetworkStatusBanner />

                {/* ── Header ── */}
                <header className="z-40 shrink-0 flex min-h-14 items-center justify-between gap-3 px-3 sm:px-4 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-[0_1px_0_0_rgba(0,0,0,0.03)]">

                    {/* Left */}
                    <div className="flex min-w-0 items-center gap-3">
                        <SidebarTrigger
                            className="w-9 h-9 shrink-0 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 text-gray-500 hover:text-gray-800 transition-all shadow-sm flex items-center justify-center"
                            aria-label="Open navigation menu"
                        />
                        <div className="h-5 w-px bg-gray-100" />
                        <div className="min-w-0 py-2">
                            <p className="truncate text-sm font-bold text-gray-900 leading-tight">{pageTitle}</p>
                            <div className="hidden sm:flex items-center gap-1.5 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${roleCfg.dot}`} />
                                <p className="truncate text-[9px] font-black uppercase tracking-[0.16em] text-gray-400">
                                    {roleCfg.label}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right */}
                    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                        <NotificationBell />
                        <div className="hidden sm:block h-5 w-px bg-gray-100 mx-0.5" />
                        <NavUser />
                    </div>
                </header>

                {/* ── Content ── */}
                <main id="main-content" className="flex-1 overflow-x-hidden overflow-y-auto w-full px-3 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 remove-scrollbar">
                    <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                            key={pathname}
                            className="mx-auto w-full max-w-[1600px]"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}