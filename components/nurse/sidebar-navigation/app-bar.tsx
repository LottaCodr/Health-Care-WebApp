"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

// Icons
import { MdDashboard, MdEventNote, MdSupportAgent } from "react-icons/md";
import { FiSettings } from "react-icons/fi";
import { FaUserPlus, FaUserClock } from "react-icons/fa";
import { BiBarChartAlt2 } from "react-icons/bi";
import { AiOutlineFileAdd } from "react-icons/ai";
import { BsPeople } from "react-icons/bs";

// Sidebar components
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NurseNavUser } from "./nav-user";

// 🔐 Assume this comes from auth context or zustand
const getUserRole = () => "nurse";

// 🔢 Dummy badge functions (replace with Zustand/React Query data)
const getWaitingPatientsBadge = () => 5;

// 🧠 Define nav items with RBAC and optional badges
const data = {
    navMain: [
        {
            title: "Dashboard",
            url: "/nurse/dashboard",
            icon: MdDashboard,
            roles: ["nurse"],
        },
        {
            title: "Patient Queue",
            url: "/nurse/queue",
            icon: FaUserClock,
            roles: ["nurse"],
            // badge: getWaitingPatientsBadge,
        },
    ],
    navSecondary: [
        { title: "Support", url: "/nurse/support", icon: MdSupportAgent },
        { title: "Settings", url: "/nurse/settings", icon: FiSettings },
    ],
};

// 🔗 Reusable nav link with improved accessibility and visual feedback
function NavLink({
    title,
    url,
    Icon,
    isActive,
    badge,
}: {
    title: string;
    url: string;
    Icon: React.ElementType;
    isActive: boolean;
    badge?: number;
}) {
    return (
        <a
            href={url}
            aria-current={isActive ? "page" : undefined}
            className={`
                group flex items-center justify-between rounded-lg px-3 py-2 text-[15px] font-medium transition
                ${isActive
                    ? "bg-red-600 text-white font-semibold shadow-lg border-l-4 border-red-400"
                    : "text-gray-700 hover:bg-red-100 hover:text-red-700"
                }
                focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1
                relative
                duration-150
            `}
            tabIndex={0}
        >
            <div className="flex items-center gap-3">
                <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-colors duration-150 ${isActive ? "text-white" : "text-gray-400 group-hover:text-red-600"}`}
                    aria-hidden="true"
                />
                <span className="truncate">{title}</span>
            </div>
            {typeof badge === "number" && badge > 0 && (
                <span
                    className="ml-2 inline-block rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow animate-bounce"
                    aria-label={`${badge} new`}
                >
                    {badge}
                </span>
            )}
            {isActive && (
                <span className="absolute right-0 top-0 h-full w-1 rounded-l bg-red-700 animate-pulse" aria-hidden="true" />
            )}
        </a>
    );
}

export function NurseAppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const role = getUserRole();

    const navMainFiltered = data.navMain
        .filter((item) => item.roles?.includes(role))
        .map((item) => ({
            ...item,
            isActive: pathname === item.url || pathname.startsWith(item.url + "/"),
            // badge: item.badge?.(),
        }));

    const navSecondaryWithActive = data.navSecondary.map((item) => ({
        ...item,
        isActive: pathname === item.url || pathname.startsWith(item.url + "/"),
    }));

    return (
        <Sidebar
            variant="inset"
            className="bg-gradient-to-b from-red-50 via-white to-white border-r border-red-100 shadow-xl min-h-screen"
            {...props}
            aria-label="Hospital Dashboard Sidebar"
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a
                                href="/dashboard"
                                className="flex items-center gap-3 rounded-xl p-2 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 transition"
                                aria-label="Hospital Logo and Title"
                            >
                                <div className="flex aspect-square w-10 items-center justify-center rounded-lg bg-red-600 text-white shadow-md">
                                    <MdDashboard className="w-6 h-6" aria-hidden="true" />
                                </div>
                                <div className="flex flex-col leading-tight">
                                    <span className="truncate font-bold text-base text-red-900 tracking-tight">Nile Mother & Child</span>
                                    <span className="truncate text-xs text-red-700/80 font-medium">Hospital</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="flex flex-col">
                <nav aria-label="Primary Navigation" className="flex flex-col gap-1 px-2 mt-2">
                    {navMainFiltered.length === 0 ? (
                        <span className="text-gray-400 text-sm px-3 py-2">No navigation items</span>
                    ) : (
                        navMainFiltered.map(({ title, url, icon, isActive }) => (
                            <NavLink key={url} title={title} url={url} Icon={icon} isActive={isActive} />
                        ))
                    )}
                </nav>

                <div className="my-4 border-t border-red-100" aria-hidden="true" />

                <nav aria-label="Secondary Navigation" className="mt-auto flex flex-col gap-1 px-2 pb-4">
                    {navSecondaryWithActive.map(({ title, url, icon, isActive }) => (
                        <NavLink key={url} title={title} url={url} Icon={icon} isActive={isActive} />
                    ))}
                </nav>
            </SidebarContent>

            <SidebarFooter>
                <div className="px-3 py-2">
                    <NurseNavUser />
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
