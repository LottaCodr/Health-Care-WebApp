"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { MdDashboard, MdEventNote, MdSupportAgent } from "react-icons/md";
import { FaUserInjured, FaUsers } from "react-icons/fa";
import { FiRepeat, FiSettings, FiLogOut } from "react-icons/fi";

import { NavUser } from "@/components/doctor/sidebar-navigation/nav-user";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";

// Primary color: red
const PRIMARY = "red";
const PRIMARY_DARK = "red-700";
const PRIMARY_LIGHT = "red-100";
const PRIMARY_ACCENT = "red-500";
const PRIMARY_BORDER = "red-400";

const data = {
    navMain: [
        { title: "Dashboard", url: "/doctor/dashboard", icon: MdDashboard },
        { title: "Patients", url: "/doctor/patients", icon: FaUserInjured },
        { title: "Appointments", url: "/doctor/appointments", icon: MdEventNote },
        { title: "Transactions", url: "/doctor/transactions", icon: FiRepeat },
        { title: "Employees", url: "/doctor/employees", icon: FaUsers },
    ],
    navSecondary: [
        { title: "Support", url: "/doctor/support", icon: MdSupportAgent },
        { title: "Settings", url: "/doctor/settings", icon: FiSettings },
        { title: "Logout", icon: FiLogOut },
    ],
};

function NavLink({
    title,
    url,
    Icon,
    isActive,
}: {
    title: string;
    url?: string;
    Icon: React.ElementType;
    isActive: boolean;
}) {
    return (
        <a
            href={url}
            aria-current={isActive ? "page" : undefined}
            className={`
                group flex items-center gap-3 rounded-lg px-4 py-2 text-[15px] font-medium transition-all
                ${isActive
                    ? "bg-red-600 text-white font-semibold shadow-lg border-l-4 border-red-400"
                    : "text-gray-700 dark:text-gray-200 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700"
                }
                focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1
                relative
            `}
            tabIndex={0}
        >
            <Icon
                className={`
                    w-5 h-5 flex-shrink-0 transition-colors
                    ${isActive ? "text-white" : "text-red-400 group-hover:text-red-600"}
                `}
                aria-hidden="true"
                focusable="false"
            />
            <span className="truncate">{title}</span>
            {isActive && (
                <span
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-400 shadow"
                    aria-hidden="true"
                />
            )}
        </a>
    );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();

    // Mark active nav items based on current path
    const navMainWithActive = data.navMain.map((item) => ({
        ...item,
        isActive: pathname === item.url || pathname.startsWith(item.url + "/"),
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
            className="bg-white dark:bg-muted/80 border-r border-red-100 dark:border-red-900/40 shadow-xl"
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a
                                href="/doctor/dashboard"
                                className="flex items-center gap-3 rounded-xl p-3 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 transition"
                                aria-label="Hospital Logo and Title"
                            >
                                <div className="flex aspect-square w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-md">
                                    <MdDashboard className="w-6 h-6" aria-hidden="true" />
                                </div>
                                <div className="flex flex-col leading-tight">
                                    <span className="truncate font-bold text-lg text-red-900 dark:text-red-200 drop-shadow">
                                        Nile Mother & Child
                                    </span>
                                    <span className="truncate text-xs text-red-700/80 dark:text-red-300/80 tracking-wide">
                                        Hospital
                                    </span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="flex flex-col">
                {/* Main navigation */}
                <nav
                    aria-label="Primary Navigation"
                    className="flex flex-col gap-1 px-2 mt-2"
                >
                    {navMainWithActive.map(({ title, url, icon, isActive }) => (
                        <NavLink
                            key={url}
                            title={title}
                            url={url}
                            Icon={icon}
                            isActive={isActive}
                        />
                    ))}
                </nav>

                {/* Divider */}
                <div className="my-3 border-t border-red-100 dark:border-red-900/40" />

                {/* Secondary navigation (push to bottom) */}
                <nav
                    aria-label="Secondary Navigation"
                    className="mt-auto flex flex-col gap-1 px-2 pb-4"
                >
                    {navSecondaryWithActive.map(({ title, url, icon, isActive }) => (
                        <NavLink
                            key={title}
                            url={url}
                            title={title}
                            Icon={icon}
                            isActive={isActive}
                        />
                    ))}
                </nav>
            </SidebarContent>

            <SidebarFooter className="border-t border-red-100 dark:border-red-900/40 bg-red-50/40 dark:bg-red-900/10">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
