"use client";

import React, { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    Sidebar, SidebarContent, SidebarHeader,
    SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { useAuth } from "@/context/auth-provider";
import { NAV_CONFIG } from "./config";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ChevronRight } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";

// ─── Role config ──────────────────────────────────────────────────────────────
// Keys must match the exact DB values from staffs.role (case-sensitive in Postgres).
// The normaliseRole() helper below handles case variations from the auth context.

const ROLE_CONFIG: Record<string, { accent: string; gradient: string; label: string }> = {
    Doctor: { accent: "text-red-400", gradient: "from-red-500     to-red-700", label: "Doctor" },
    Nurse: { accent: "text-teal-400", gradient: "from-teal-500    to-teal-700", label: "Nurse" },
    Pharmacist: { accent: "text-violet-400", gradient: "from-violet-500  to-violet-700", label: "Pharmacist" },
    Labtech: { accent: "text-indigo-400", gradient: "from-indigo-500  to-indigo-700", label: "Lab Technician" },
    Frontdesk: { accent: "text-blue-400", gradient: "from-blue-500    to-blue-700", label: "Front Desk" },
    Admin: { accent: "text-amber-400", gradient: "from-amber-500   to-amber-700", label: "Administrator" },
    Radiologist: { accent: "text-fuchsia-400", gradient: "from-fuchsia-500 to-fuchsia-700", label: "Radiologist" },
};

// ─── Normalise role ───────────────────────────────────────────────────────────
// Converts any casing the auth context might store ("frontdesk", "FRONTDESK",
// "front_desk") into the canonical DB form ("Frontdesk").
// Steps: lower-case everything → capitalise first letter.
// This handles all known variants without requiring exhaustive aliases.

function normaliseRole(raw?: string): string {
    if (!raw) return "";
    const lower = raw.toLowerCase().replace(/[_\s-]/g, ""); // strip separators
    return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout } = useAuth();
    const { unreadCount } = useNotifications();
    const [showLogout, setShowLogout] = useState(false);

    // Normalise so lookups work regardless of auth context casing
    const userRole = normaliseRole(user?.role);

    const nav = userRole ? NAV_CONFIG[userRole] ?? NAV_CONFIG[user?.role ?? ""] : null;
    const roleCfg = ROLE_CONFIG[userRole] ?? ROLE_CONFIG[user?.role ?? ""] ?? ROLE_CONFIG.Admin;

    if (!nav) return null;

    return (
        <Sidebar
            variant="inset"
            {...props}
            className="bg-[#0a1628] border-r border-white/5 flex flex-col"
        >
            {/* ── Logo ── */}
            <SidebarHeader className="px-4 pt-5 pb-2 shrink-0">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            className="h-auto p-0 hover:bg-transparent"
                            onClick={() => router.push("/")}
                        >
                            <div className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-white/5 active:bg-white/8 transition-all duration-200 group cursor-pointer">

                                {/* Logo mark with online indicator */}
                                <div className="relative shrink-0">
                                    <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-white/10 group-hover:ring-white/25 transition-all duration-200 shadow-lg shadow-black/20">
                                        <Image
                                            src="/assets/icons/nilelogo.jpeg"
                                            alt="Nile Valley Hospital"
                                            width={36}
                                            height={36}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#0a1628]" />
                                </div>

                                {/* Text */}
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-white font-bold text-[13px] leading-tight tracking-tight truncate">
                                        Nile Valley
                                    </p>
                                    <p className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">
                                        Mother & Child · Hospital EMR
                                    </p>
                                </div>

                                {/* Hover arrow */}
                                <svg
                                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                                    className="shrink-0 text-white/15 group-hover:text-white/35 transition-colors duration-200"
                                >
                                    <path
                                        d="M2 6h8M6 2l4 4-4 4"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                {/* Role badge + notification count */}
                <div className="flex items-center gap-2 px-3 py-2 mt-2 rounded-xl bg-white/4 border border-white/5">
                    <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${roleCfg.gradient} shrink-0`} />
                    <p className={`text-[10px] font-black uppercase tracking-widest flex-1 ${roleCfg.accent}`}>
                        {roleCfg.label}
                    </p>
                    {unreadCount > 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/20">
                            {unreadCount} new
                        </span>
                    )}
                </div>
            </SidebarHeader>

            {/* ── Divider ── */}
            <div className="px-4 py-2">
                <div className="h-px bg-white/5" />
            </div>

            {/* ── Nav ── */}
            <SidebarContent className="flex-1 px-3 overflow-y-auto space-y-5 pb-4">
                <NavSection label="Main Menu">
                    {nav.main.map((item) => (
                        <NavItem
                            key={item.url}
                            item={item}
                            isActive={pathname.startsWith(item.url)}
                            onClick={() => router.push(item.url)}
                        />
                    ))}
                </NavSection>

                <NavSection label="Preferences">
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

            {/* ── Footer ── */}
            <SidebarFooter className="px-3 py-4 shrink-0">
                <div className="h-px bg-white/5 mb-3" />

                {/* User card */}
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/5 border border-white/5">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${roleCfg.gradient} flex items-center justify-center font-black text-white text-sm shrink-0`}>
                        {user?.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold truncate leading-tight">{user?.name ?? "Staff"}</p>
                        <p className="text-white/30 text-[9px] font-medium truncate mt-0.5">{user?.email}</p>
                    </div>
                    <button
                        onClick={() => setShowLogout(true)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
                        aria-label="Log out"
                    >
                        <LogOut size={13} />
                    </button>
                </div>

                {/* Logout confirmation */}
                <AnimatePresence>
                    {showLogout && (
                        <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="mt-2 px-3 py-3 rounded-2xl bg-[#0f1c3a] border border-white/10 space-y-2.5"
                        >
                            <p className="text-xs text-white/50 font-medium text-center">Sign out of EMR?</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowLogout(false)}
                                    className="flex-1 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-xs font-semibold transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { logout?.(); setShowLogout(false); }}
                                    className="flex-1 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-xs font-bold transition-all border border-red-500/20"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </SidebarFooter>
        </Sidebar>
    );
}

// ─── Nav section ──────────────────────────────────────────────────────────────

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[9px] font-black text-white/18 uppercase tracking-[0.22em] mb-1.5 px-3">
                {label}
            </p>
            <ul className="space-y-0.5">{children}</ul>
        </div>
    );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
    item, isActive, onClick,
}: {
    item: { icon: React.ElementType; title: string; url: string; badge?: number };
    isActive: boolean;
    onClick: () => void;
}) {
    const Icon = item.icon;
    return (
        <li>
            <button
                onClick={onClick}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150
                    ${isActive ? "text-white" : "text-white/35 hover:text-white/65 hover:bg-white/4"}`}
            >
                {isActive && (
                    <motion.div
                        layoutId="sidebar-active-bg"
                        className="absolute inset-0 bg-white/8 rounded-xl border border-white/8"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                )}
                {isActive && (
                    <motion.div
                        layoutId="sidebar-accent-bar"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-400 rounded-full"
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                )}

                <Icon size={16} className={`relative shrink-0 transition-colors ${isActive ? "text-blue-400" : "text-white/25"}`} />
                <span className="relative flex-1 text-left tracking-tight">{item.title}</span>

                {item.badge != null && item.badge > 0 && (
                    <span className="relative text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/20 shrink-0">
                        {item.badge}
                    </span>
                )}

                {isActive && <ChevronRight size={12} className="relative text-white/20 shrink-0" />}
            </button>
        </li>
    );
}