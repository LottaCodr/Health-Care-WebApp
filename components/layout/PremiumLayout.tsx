"use client";

import React from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { NavUser } from "./NavUser";
import { useAuth } from "@/context/auth-provider";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, Bell } from "lucide-react";

export function PremiumLayout({ children }: { children: React.ReactNode }) {
    const { isLoading, user } = useAuth();

    // ── Loading ──
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0f1c3a]">
                <div className="flex flex-col items-center gap-5">
                    {/* Animated logo mark */}
                    <div className="relative w-16 h-16">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 rounded-2xl border-2 border-white/10 border-t-blue-400"
                        />
                        <div className="absolute inset-2 rounded-xl bg-white/5 flex items-center justify-center">
                            <Stethoscope size={20} className="text-blue-400" />
                        </div>
                    </div>

                    <div className="text-center space-y-1.5">
                        <p className="text-white font-bold text-base tracking-tight">Nile Valley Hospital</p>
                        <p className="text-blue-400/70 text-[10px] font-bold uppercase tracking-[0.25em]">
                            Loading your workspace...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!user) return null;

    const formattedRole = user.role
        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
        : "Staff";

    return (
        <SidebarProvider>
            <AppSidebar />

            <SidebarInset className="bg-gray-50/60 flex flex-col h-screen overflow-hidden">

                {/* ── Top header bar ── */}
                <header className="sticky top-0 z-40 shrink-0 flex h-16 items-center justify-between px-5 bg-white border-b border-gray-100 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]">

                    {/* Left */}
                    <div className="flex items-center gap-3">
                        <SidebarTrigger className="w-9 h-9 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 text-gray-500 hover:text-gray-800 transition-all shadow-sm" />

                        <div className="hidden md:flex items-center gap-2.5 pl-1">
                            <div className="h-4 w-px bg-gray-200" />
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    {formattedRole} Console
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right */}
                    <div className="flex items-center gap-2">
                        {/* Notification bell */}
                        <button className="relative w-9 h-9 rounded-xl border border-gray-100 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-200 transition-all shadow-sm">
                            <Bell size={15} />
                            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500 ring-1 ring-white" />
                        </button>

                        {/* Divider */}
                        <div className="h-5 w-px bg-gray-100 mx-1" />

                        <NavUser />
                    </div>
                </header>

                {/* ── Page content ── */}
                <main className="flex-1 overflow-y-auto w-full px-4 py-6 md:px-8 md:py-8 remove-scrollbar">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={user.$id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}