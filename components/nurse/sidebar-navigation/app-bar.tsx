"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

// Icons
import { MdDashboard, MdEventNote, MdSupportAgent } from "react-icons/md";
import { FiSettings, FiLogOut } from "react-icons/fi";
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
const getUserRole = () => "receptionist";

// 🔢 Dummy badge functions (replace with Zustand/React Query data)
const getWaitingPatientsBadge = () => 5;

// 🧠 Define nav items with RBAC and optional badges
const data = {
    user: {
        name: "Codehagen",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
        {
            title: "Dashboard",
            url: "/nurse/dashboard",
            icon: MdDashboard,
            roles: ["nurse", "receptionist", "admin"],
        },
        {
            title: "Vitals & Check-in",
            url: "/nurse/vitals-checkin",
            icon: BiBarChartAlt2,
            roles: ["nurse"],
        },
        {
            title: "Patient Queue",
            url: "/nurse/queue",
            icon: FaUserClock,
            roles: ["nurse", "receptionist"],
            badge: getWaitingPatientsBadge,
        },
        {
            title: "Patient Records",
            url: "/nurse/patient-records",
            icon: AiOutlineFileAdd,
            roles: ["nurse", "receptionist"],
        },
        {
            title: "Ward Round Notes",
            url: "/nurse/ward-rounds",
            icon: MdEventNote,
            roles: ["nurse"],
        },
        {
            title: "Medication Requests",
            url: "/nurse/medication-requests",
            icon: FaUserPlus,
            roles: ["nurse"],
        },
        {
            title: "Visitors & Walk-ins",
            url: "/nurse/visitors",
            icon: BsPeople,
            roles: ["receptionist", "nurse"],
        },
    ],

    navSecondary: [
        { title: "Support", url: "/nurse/support", icon: MdSupportAgent },
        { title: "Settings", url: "/nurse/settings", icon: FiSettings },
        { title: "Logout", url: "/nurse/logout", icon: FiLogOut },
    ],

};

// 🔗 Reusable nav link
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
                group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors
                ${isActive
                    ? "bg-blue-600 text-white font-semibold shadow-md border-l-4 border-blue-400"
                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                }
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1
            `}
        >
            <div className="flex items-center gap-3">
                <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-white" : "text-gray-500 group-hover:text-blue-600"}`}
                    aria-hidden="true"
                />
                {title}
            </div>

            {typeof badge === "number" && badge > 0 && (
                <span className="ml-2 inline-block rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                    {badge}
                </span>
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
            badge: item.badge?.(),
        }));

    const navSecondaryWithActive = data.navSecondary.map((item) => ({
        ...item,
        isActive: pathname === item.url || pathname.startsWith(item.url + "/"),
    }));

    return (
        <Sidebar variant="inset" {...props} aria-label="Hospital Dashboard Sidebar">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a
                                href="/dashboard"
                                className="flex items-center gap-3 rounded-lg p-2 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                                aria-label="Hospital Logo and Title"
                            >
                                <div className="flex aspect-square w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                                    <MdDashboard className="w-5 h-5" aria-hidden="true" />
                                </div>
                                <div className="flex flex-col leading-tight">
                                    <span className="truncate font-semibold text-base text-blue-900">Nile Mother & Child</span>
                                    <span className="truncate text-xs text-blue-700/80">Hospital</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="flex flex-col">
                <nav aria-label="Primary Navigation" className="flex flex-col gap-1 px-2">
                    {navMainFiltered.map(({ title, url, icon, isActive, badge }) => (
                        <NavLink key={url} title={title} url={url} Icon={icon} isActive={isActive} badge={badge} />
                    ))}
                </nav>

                <nav aria-label="Secondary Navigation" className="mt-auto flex flex-col gap-1 px-2 pb-4">
                    {navSecondaryWithActive.map(({ title, url, icon, isActive }) => (
                        <NavLink key={url} title={title} url={url} Icon={icon} isActive={isActive} />
                    ))}
                </nav>
            </SidebarContent>

            <SidebarFooter>
                <NurseNavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    );
}
