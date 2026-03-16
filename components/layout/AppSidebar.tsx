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

// Only use tailwindcss standard colors and avoid custom palette shorthands
// Use "primary" color instead of "blue"
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
            className="bg-primary border-r border-primary-900/40"
        >
            <SidebarHeader className="p-6">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" className="h-auto p-0 hover:bg-transparent">
                            <div
                                onClick={() => router.push("/")}
                                className="flex items-center gap-3 bg-white p-4 rounded-3xl shadow-xl shadow-primary-200 cursor-pointer group transition-all hover:scale-[1.02]"
                            >
                                <div className="p-2 bg-primary-100 rounded-2xl group-hover:rotate-12 transition-transform">
                                    <Image
                                        src="/assets/icons/nilelogo.jpeg"
                                        alt="Logo"
                                        width={40}
                                        height={40}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div>
                                    <p className="text-primary font-black text-lg leading-none tracking-tight">Nile Valley Hospital</p>
                                    <p className="text-primary-400 text-[10px] font-bold uppercase tracking-widest mt-1">EMR</p>
                                </div>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="px-4 py-8 space-y-8">
                <div>
                    <p className="text-[10px] font-black text-primary-200 uppercase tracking-[0.2em] mb-6 px-4">Management</p>
                    <ul className="space-y-2">
                        {nav.main.map((item) => {
                            const isActive = pathname.startsWith(item.url);
                            return (
                                <li key={item.url}>
                                    <button
                                        onClick={() => router.push(item.url)}
                                        className={
                                            `w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all relative group font-bold text-sm tracking-tight
                                             ${isActive
                                                ? "bg-white text-primary shadow-[0_2px_8px_0_rgba(59,130,246,0.18)]"
                                                : "text-primary-100 hover:text-white hover:bg-primary-600/70 hover:shadow-primary-100/20"}
                                            `
                                        }
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="sidebar-hover"
                                                className="absolute inset-0 bg-white rounded-2xl -z-10 shadow-[0_2px_8px_0_rgba(59,130,246,0.18)]"
                                            />
                                        )}
                                        <item.icon
                                            size={22}
                                            className={`${isActive ? "text-primary" : "group-hover:text-white text-primary-200"} transition-colors`}
                                        />
                                        <span>{item.title}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div>
                    <p className="text-[10px] font-black text-primary-200 uppercase tracking-[0.2em] mb-6 px-4">Configuration</p>
                    <ul className="space-y-2">
                        {nav.secondary.map((item) => {
                            const isActive = pathname.startsWith(item.url);
                            return (
                                <li key={item.url}>
                                    <button
                                        onClick={() => router.push(item.url)}
                                        className={
                                            `w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm tracking-tight
                                             ${isActive
                                                ? "bg-white text-primary shadow-[0_2px_8px_0_rgba(59,130,246,0.18)]"
                                                : "text-primary-100 hover:text-white hover:bg-primary-600/70 hover:shadow-primary-100/20"}
                                            `
                                        }
                                    >
                                        <item.icon
                                            size={22}
                                            className={`${isActive ? "text-primary" : "text-primary-200 group-hover:text-white"} transition-colors`}
                                        />
                                        <span>{item.title}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </SidebarContent>

            <SidebarFooter className="p-6 border-t border-primary-900/10 bg-primary-100/20">
                <div className="bg-primary-900/80 p-4 rounded-2xl border border-primary-900/20 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-bold text-primary">
                        {user?.name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-white truncate">{user?.name}</p>
                        <p className="text-[10px] font-bold text-primary-200 uppercase tracking-widest">
                            {user?.role}
                        </p>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
