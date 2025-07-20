"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

// Icons
import { MdDashboard, MdSupportAgent } from "react-icons/md";
import { FiSettings } from "react-icons/fi";
import { FaUserClock } from "react-icons/fa";
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
import { LabTechNavUser } from "./nav-user";

// 🔐 Assume this comes from auth context or zustand
const getUserRole = () => "lab-tech";

// 🔢 Dummy badge functions (replace with Zustand/React Query data)
const getWaitingPatientsBadge = () => 5;

// 🧠 Define nav items with RBAC and optional badges
const data = {
    
    navMain: [
        {
            title: "Dashboard",
            url: "/lab-tech/dashboard",
            icon: MdDashboard,
            roles: ["lab-tech"],
        },
        // {
        //     title: "Vitals & Check-in",
        //     url: "/lab-tech/vitals-checkin",
        //     icon: BiBarChartAlt2,
        //     roles: ["lab-tech"],
        // },
        // {
        //     title: "Patient Queue",
        //     url: "/lab-tech/queue",
        //     icon: FaUserClock,
        //     roles: ["lab-tech"],
        //     badge: getWaitingPatientsBadge,
        // },
        // {
        //     title: "Patient Records",
        //     url: "/lab-tech/patient-records",
        //     icon: AiOutlineFileAdd,
        //     roles: ["lab-tech"],
        // },
        // {
        //     title: "Lab Workflow",
        //     url: "/lab-tech/lab-tech-workflow",
        //     icon: BiBarChartAlt2,
        //     roles: ["lab-tech"],
        // },
        // {
        //     title: "Visitors & Walk-ins",
        //     url: "/lab-tech/visitors",
        //     icon: BsPeople,
        //     roles: ["lab-tech"],
        // },
    ],

    navSecondary: [
        {
            title: "Support",
            url: "/lab-tech/support",
            icon: MdSupportAgent,
        },
        {
            title: "Settings",
            url: "/lab-tech/settings",
            icon: FiSettings,
        },

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
                group flex items-center justify-between rounded-lg px-3 py-2 text-[15px] font-medium transition-all
                ${isActive
                    ? "bg-gradient-to-r from-red-600 to-red-500 text-white font-bold shadow-lg border-l-4 border-red-400"
                    : "text-gray-700 hover:bg-red-50 hover:text-red-700"
                }
                focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1
                relative
            `}
            tabIndex={0}
        >
            <div className="flex items-center gap-3">
                <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-white drop-shadow" : "text-red-400 group-hover:text-red-600"}`}
                    aria-hidden="true"
                />
                <span className="truncate">{title}</span>
            </div>
            {typeof badge === "number" && badge > 0 && (
                <span className="ml-2 inline-block rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow">
                    {badge}
                </span>
            )}
            {isActive && (
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-red-400 rounded-l-full shadow-md" aria-hidden="true"></span>
            )}
        </a>
    );
}

export function LabTechAppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
            {...props}
            aria-label="Lab Tech Dashboard Sidebar"
            className="bg-gradient-to-b from-red-50 via-white to-white border-r border-red-100 shadow-xl"
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a
                                href="/lab-tech/dashboard"
                                className="flex items-center gap-3 rounded-xl p-2 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-400 transition"
                                aria-label="Hospital Logo and Title"
                            >
                                <div className="flex aspect-square w-10 h-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-red-400 text-white shadow-lg">
                                    <MdDashboard className="w-6 h-6" aria-hidden="true" />
                                </div>
                                <div className="flex flex-col leading-tight">
                                    <span className="truncate font-extrabold text-lg text-red-700 drop-shadow">Nile Mother & Child</span>
                                    <span className="truncate text-xs text-red-500/80 font-medium">Hospital</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="flex flex-col">
                <nav aria-label="Primary Navigation" className="flex flex-col gap-1 px-2 mt-2">
                    {navMainFiltered.map(({ title, url, icon, isActive }) => (
                        <NavLink key={url} title={title} url={url} Icon={icon} isActive={isActive}  />
                    ))}
                </nav>

                <nav aria-label="Secondary Navigation" className="mt-auto flex flex-col gap-1 px-2 pb-4">
                    <div className="border-t border-red-100 my-2" />
                    {navSecondaryWithActive.map(({ title, url, icon, isActive }) => (
                        <NavLink key={url} title={title} url={url} Icon={icon} isActive={isActive} />
                    ))}
                </nav>
            </SidebarContent>

            <SidebarFooter className="bg-gradient-to-t from-red-50 via-white to-transparent border-t border-red-100">
                <LabTechNavUser  />
            </SidebarFooter>
        </Sidebar>
    );
}
