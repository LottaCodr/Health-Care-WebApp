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

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const userRole = user?.role;

    const nav = userRole ? NAV_CONFIG[userRole] : null;

    if (!nav) return null;

    return (
        <Sidebar variant="inset" {...props} className="border-r border-blue-50/50 bg-white/40 backdrop-blur-3xl">
            <SidebarHeader className="p-6">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" className="h-auto p-0 hover:bg-transparent">
                            <div onClick={() => router.push("/")} className="flex items-center gap-3 bg-blue-600 p-4 rounded-3xl shadow-xl shadow-blue-100 cursor-pointer group transition-all hover:scale-[1.02]">
                                <div className="p-2 bg-white rounded-2xl group-hover:rotate-12 transition-transform">
                                    <Image src="/assets/icons/nilelogo.jpeg" alt="Logo" width={40} height={40} className="rounded-xl" />
                                </div>
                                <div>
                                    <p className="text-white font-black text-lg leading-none tracking-tight">Nile Valley</p>
                                    <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mt-1">EMR Platform</p>
                                </div>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="px-4 py-8 space-y-8">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 px-4">Management</p>
                    <ul className="space-y-2">
                        {nav.main.map((item) => {
                            const isActive = pathname.startsWith(item.url);
                            return (
                                <li key={item.url}>
                                    <button onClick={() => router.push(item.url)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all relative group ${isActive ? "bg-white shadow-premium text-blue-600" : "text-gray-500 hover:text-blue-500"}`}>
                                        {isActive && <motion.div layoutId="sidebar-hover" className="absolute inset-0 bg-white rounded-2xl -z-10 shadow-premium" />}
                                        <item.icon size={22} className={`${isActive ? "text-blue-600" : "group-hover:text-blue-500"} transition-colors`} />
                                        <span className="font-bold text-sm tracking-tight">{item.title}</span>
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </div>

                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 px-4">Configuration</p>
                    <ul className="space-y-2">
                        {nav.secondary.map((item) => {
                            const isActive = pathname.startsWith(item.url);
                            return (
                                <li key={item.url}>
                                    <button onClick={() => router.push(item.url)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${isActive ? "bg-white shadow-premium text-blue-600" : "text-gray-500 hover:text-blue-500"}`}>
                                        <item.icon size={22} />
                                        <span className="font-bold text-sm tracking-tight">{item.title}</span>
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            </SidebarContent>

            <SidebarFooter className="p-6 border-t border-gray-50 bg-gray-50/30">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center font-bold text-blue-600">
                        {user?.name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-gray-900 truncate">{user?.name}</p>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{user?.role}</p>
                    </div>
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
