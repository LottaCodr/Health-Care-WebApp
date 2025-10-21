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
import { PharmacyNavUser } from "./nav-user";

// 🔐 Assume this comes from auth context or zustand
const getUserRole = () => "pharmacist";

// 🔢 Dummy badge functions (replace with Zustand/React Query data)
const getWaitingPatientsBadge = () => 5;
const getPendingMedicationsBadge = () => 2;

// 🧠 Define nav items with RBAC and optional badges
const data = {
    user: {
        name: "Chuka Lotanna ",
        email: "lottanna47@gmail.com",
        avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
        {
            title: "Dashboard",
            url: "/pharmacist/dashboard",
            icon: MdDashboard,
            roles: ["pharmacist", "receptionist", "admin"],
        },
        {
            title: "Vitals & Check-in",
            url: "/pharmacist/vitals-checkin",
            icon: BiBarChartAlt2,
            roles: ["pharmacist"],
        },
        {
            title: "Patient Queue",
            url: "/pharmacist/queue",
            icon: FaUserClock,
            roles: ["pharmacist", "receptionist"],
            badge: getWaitingPatientsBadge,
        },
        {
            title: "Patient Records",
            url: "/pharmacist/patient-records",
            icon: AiOutlineFileAdd,
            roles: ["pharmacist", "receptionist"],
        },
        {
            title: "Ward Round Notes",
            url: "/pharmacist/ward-rounds",
            icon: MdEventNote,
            roles: ["pharmacist"],
        },
        {
            title: "Medication Requests",
            url: "/pharmacist/medication-requests",
            icon: FaUserPlus,
            roles: ["pharmacist"],
            badge: getPendingMedicationsBadge,
        },
        {
            title: "Workflow",
            url: "/pharmacist/pharmacist-workflow",
            icon: FaUserPlus,
            roles: ["pharmacist"],
            // badge: getPendingMedicationsBadge,
        },
        {
            title: "Visitors & Walk-ins",
            url: "/pharmacist/visitors",
            icon: BsPeople,
            roles: ["receptionist", "pharmacist"],
        },
    ],
    navSecondary: [
        {
            title: "Support",
            url: "/pharmacist/support",
            icon: MdSupportAgent,
        },
        {
            title: "Settings",
            url: "/pharmacist/settings",
            icon: FiSettings,
        },
        {
            title: "Logout",
            url: "/pharmacist/logout",
            icon: FiLogOut,
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
                group flex items-center justify-between rounded-lg px-3 py-2 text-[15px] font-medium transition-colors
                ${isActive
                    ? "bg-red-600 text-white font-semibold shadow-lg border-l-4 border-red-500"
                    : "text-gray-800 hover:bg-red-50 hover:text-red-700"
                }
                focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1
                relative
            `}
            tabIndex={0}
        >
            <div className="flex items-center gap-3">
                <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-white" : "text-gray-400 group-hover:text-red-600"}`}
                    aria-hidden="true"
                />
                <span className="truncate">{title}</span>
            </div>
            {typeof badge === "number" && badge > 0 && (
                <span className="ml-2 inline-block rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow">
                    {badge}
                </span>
            )}
        </a>
    );
}

export function PharmacyAppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        <Sidebar
            variant="inset"
            {...props}
            aria-label="Hospital Dashboard Sidebar"
            className="bg-white dark:bg-gray-900 border-r border-red-100 dark:border-gray-800 shadow-lg min-w-[270px] max-w-[320px]"
        >
            <SidebarHeader className="py-4 px-3 border-b border-red-100 dark:border-gray-800 bg-gradient-to-r from-red-50 to-white dark:from-gray-900 dark:to-gray-950">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a
                                href="/dashboard"
                                className="flex items-center gap-3 rounded-xl p-2 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 transition"
                                aria-label="Hospital Logo and Title"
                            >
                                <div className="flex aspect-square w-10 items-center justify-center rounded-lg bg-red-600 text-white shadow">
                                    <MdDashboard className="w-6 h-6" aria-hidden="true" />
                                </div>
                                <div className="flex flex-col leading-tight">
                                    <span className="truncate font-bold text-lg text-red-900 tracking-tight">Nile Mother & Child</span>
                                    <span className="truncate text-xs text-red-700/80 font-medium">Hospital</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="flex flex-col pt-2">
                <nav aria-label="Primary Navigation" className="flex flex-col gap-1 px-2">
                    {navMainFiltered.map(({ title, url, icon, isActive, badge }) => (
                        <NavLink key={url} title={title} url={url} Icon={icon} isActive={isActive} badge={badge} />
                    ))}
                </nav>
                <div className="my-4 border-t border-red-100 dark:border-gray-800" />
                <nav aria-label="Secondary Navigation" className="mt-auto flex flex-col gap-1 px-2 pb-4">
                    {navSecondaryWithActive.map(({ title, url, icon, isActive }) => (
                        <NavLink key={url} title={title} url={url} Icon={icon} isActive={isActive} />
                    ))}
                </nav>
            </SidebarContent>
            <SidebarFooter className="bg-gradient-to-t from-red-50 to-white dark:from-gray-900 dark:to-gray-950 border-t border-red-100 dark:border-gray-800 py-4 px-3">
                <PharmacyNavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    );
}
