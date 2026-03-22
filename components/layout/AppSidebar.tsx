"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarFooter,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { useAuth } from "@/context/auth-provider";
import { NAV_CONFIG } from "./config";
import { motion } from "framer-motion";
import { LogOut, ChevronRight } from "lucide-react";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const userRole = user?.role;
    const nav = userRole ? NAV_CONFIG[userRole] : null;

    if (!nav) return null;

    return (
        <Sidebar
            variant="inset"
            {...props}
            className="bg-[#0f1c3a] border-r border-white/5 flex flex-col"
        >
            {/* ── Logo ── */}
            <SidebarHeader className="px-5 pt-6 pb-4 shrink-0">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" className="h-auto p-0 hover:bg-transparent">
                            <button
                                onClick={() => router.push("/")}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/8 transition-all duration-200 group"
                            >
                                <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 ring-2 ring-white/10 group-hover:ring-white/20 transition-all">
                                    <Image
                                        src="/assets/icons/nilelogo.jpeg"
                                        alt="Logo"
                                        width={36}
                                        height={36}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="text-left">
                                    <p className="text-white font-bold text-sm leading-tight">Nile Valley Hospital</p>
                                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] mt-0.5">
                                        EMR System
                                    </p>
                                </div>
                            </button>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            {/* ── Nav ── */}
            <SidebarContent className="flex-1 px-4 py-2 overflow-y-auto space-y-6">

                {/* Main nav */}
                <NavSection label="Navigation">
                    {nav.main.map((item) => (
                        <NavItem
                            key={item.url}
                            item={item}
                            isActive={pathname.startsWith(item.url)}
                            onClick={() => router.push(item.url)}
                        />
                    ))}
                </NavSection>

                {/* Secondary nav */}
                <NavSection label="Settings">
                    {nav.secondary.map((item) => (
                        <NavItem
                            key={item.url}
                            item={item}
                            isActive={pathname.startsWith(item.url)}
                            onClick={() => router.push(item.url)}
                        />
                    ))}
                </NavSection>

            </SidebarContent>

            {/* ── Footer / user card ── */}
            <SidebarFooter className="px-4 py-5 shrink-0 border-t border-white/5">
                <div className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center font-black text-white text-sm shrink-0 shadow-lg shadow-blue-900/40">
                        {user?.name?.[0]?.toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold truncate leading-tight">
                            {user?.name}
                        </p>
                        <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest mt-0.5 truncate">
                            {user?.role}
                        </p>
                    </div>

                    {/* Log out icon */}
                    <LogOut
                        size={14}
                        className="text-white/20 group-hover:text-white/60 transition-colors shrink-0"
                    />
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}

// ─── Nav section ──────────────────────────────────────────────────────────────

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[9px] font-black text-white/25 uppercase tracking-[0.22em] mb-2 px-3">
                {label}
            </p>
            <ul className="space-y-0.5">
                {children}
            </ul>
        </div>
    );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
    item,
    isActive,
    onClick,
}: {
    item: { icon: React.ElementType; title: string; url: string };
    isActive: boolean;
    onClick: () => void;
}) {
    const Icon = item.icon;

    return (
        <li>
            <button
                onClick={onClick}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
                    ${isActive
                        ? "text-white"
                        : "text-white/40 hover:text-white/80 hover:bg-white/5"
                    }`}
            >
                {/* Active background */}
                {isActive && (
                    <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 bg-white/10 rounded-xl border border-white/10"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                )}

                {/* Active left accent bar */}
                {isActive && (
                    <motion.div
                        layoutId="sidebar-accent"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-400 rounded-full"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                )}

                <Icon
                    size={17}
                    className={`relative shrink-0 transition-colors ${isActive ? "text-blue-400" : "text-white/30"}`}
                />

                <span className="relative flex-1 text-left tracking-tight">{item.title}</span>

                {isActive && (
                    <ChevronRight size={13} className="relative text-white/30 shrink-0" />
                )}
            </button>
        </li>
    );
}