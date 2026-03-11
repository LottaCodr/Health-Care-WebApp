"use client";

import React from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { NavUser } from "./NavUser";
import { useAuth } from "@/context/auth-provider";
import { LoadingSkeleton } from "@/components/emr";
import { motion, AnimatePresence } from "framer-motion";

export function PremiumLayout({ children }: { children: React.ReactNode }) {
    const { isLoading, user } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-blue-50/20">
                <div className="flex flex-col items-center gap-6">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full shadow-xl shadow-blue-100"
                    />
                    <div className="text-center space-y-2">
                        <p className="text-xl font-black text-gray-900 tracking-tight">Nile Valley Hospital</p>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-[0.3em]">Secure Access Point</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="bg-blue-50/30 overflow-hidden flex flex-col h-screen">
                <header className="flex h-20 items-center justify-between px-8 bg-white/40 backdrop-blur-2xl border-b border-blue-100/50 sticky top-0 z-40 shrink-0">
                    <div className="flex items-center gap-6">
                        <SidebarTrigger className="w-10 h-10 rounded-2xl bg-white border border-gray-100 shadow-sm hover:bg-blue-50 hover:text-blue-600 transition-all" />
                        <div className="h-6 w-px bg-gray-200 hidden md:block" />
                        <div className="hidden md:block">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{user.role} Console</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <NavUser />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto w-full p-8 md:p-12 remove-scrollbar">
                    <AnimatePresence mode="wait">
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
