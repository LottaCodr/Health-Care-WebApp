"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

// Import icons from react-icons
import { MdDashboard, MdEventNote, MdSupportAgent } from "react-icons/md";
import { FaUserInjured, FaUsers } from "react-icons/fa";
import { FiRepeat, FiSettings, FiLogOut } from "react-icons/fi";
import { AiOutlineFileText } from "react-icons/ai";
import { BiBarChartAlt2 } from "react-icons/bi";

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

const data = {

    navMain: [
        { title: "Dashboard", url: "/doctor/dashboard", icon: MdDashboard },
        { title: "Patients", url: "/doctor/patients", icon: FaUserInjured },
        { title: "Appointments", url: "/doctor/appointments", icon: MdEventNote },
        { title: "Transactions", url: "/doctor/transactions", icon: FiRepeat },
        { title: "Employees", url: "/doctor/employees", icon: FaUsers },
        // { title: "Health Records", url: "/doctor/health-records", icon: AiOutlineFileText },
        // { title: "Analysis", url: "/doctor/analysis", icon: BiBarChartAlt2 },
    ],
    navSecondary: [
        { title: "Support", url: "/doctor/support", icon: MdSupportAgent },
        { title: "Settings", url: "/doctor/settings", icon: FiSettings },
        { title: "Logout", url: "/doctor/logout", icon: FiLogOut },
    ],
};

function NavLink({ title, url, Icon, isActive }: { title: string; url: string; Icon: React.ElementType; isActive: boolean }) {
    return (
        <a
            href={url}
            aria-current={isActive ? "page" : undefined}
            className={`
        group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
        ${isActive
                    ? "bg-blue-600 text-white font-semibold shadow-md border-l-4 border-blue-400"
                    : "text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                }
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1
      `}
        >
            <Icon
                className={`
          w-5 h-5 flex-shrink-0 transition-colors
          ${isActive ? "text-white" : "text-gray-500 group-hover:text-blue-600"}
        `}
                aria-hidden="true"
                focusable="false"
            />
            {title}
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
                                    <span className="truncate font-semibold text-base text-blue-900">
                                        Nile Mother & Child
                                    </span>
                                    <span className="truncate text-xs text-blue-700/80">Hospital</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="flex flex-col">
                {/* Main navigation */}
                <nav aria-label="Primary Navigation" className="flex flex-col gap-1 px-2">
                    {navMainWithActive.map(({ title, url, icon, isActive }) => (
                        <NavLink key={url} title={title} url={url} Icon={icon} isActive={isActive} />
                    ))}
                </nav>

                {/* Secondary navigation (push to bottom) */}
                <nav aria-label="Secondary Navigation" className="mt-auto flex flex-col gap-1 px-2 pb-4">
                    {navSecondaryWithActive.map(({ title, url, icon, isActive }) => (
                        <NavLink key={url} title={title} url={url} Icon={icon} isActive={isActive} />
                    ))}
                </nav>
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
