"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { MdDashboard, MdEventNote, MdSupportAgent } from "react-icons/md";
import { FiSettings, FiLogOut } from "react-icons/fi";
import { FaUserPlus, FaUserClock } from "react-icons/fa";
import { AiOutlineFileAdd } from "react-icons/ai";
import { BsPeople } from "react-icons/bs";

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { FrontDeskNavUser } from "./nav-user";

// Dummy role + badge logic
const getUserRole = () => "receptionist";
const getAppointmentsBadge = () => 3;
const getWaitingPatientsBadge = () => 5;

//Real Auth


// Navigation schema
const data = {
    user: {
        name: "Codehagen",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
        { title: "Dashboard", url: "/front-desk/dashboard", icon: MdDashboard, roles: ["receptionist", "admin"] },
        { title: "Register Patient", url: "/front-desk/register", icon: FaUserPlus, roles: ["receptionist"] },
        {
            title: "Appointment Booking",
            url: "/front-desk/appointment-booking",
            icon: MdEventNote,
            roles: ["receptionist"],
            badge: getAppointmentsBadge,
        },
        {
            title: "Patient Queue",
            url: "/front-desk/queue",
            icon: FaUserClock,
            roles: ["receptionist"],
            badge: getWaitingPatientsBadge,
        },
        // {
        //     title: "Patient Records",
        //     url: "/front-desk/patient-records",
        //     icon: AiOutlineFileAdd,
        //     roles: ["receptionist", "nurse"],
        // },
        {
            title: "Visitors & Walk-ins",
            url: "/front-desk/visitors",
            icon: BsPeople,
            roles: ["receptionist"],
        },
    ],
    navSecondary: [
        { title: "Support", url: "/front-desk/support", icon: MdSupportAgent },
        { title: "Settings", url: "/front-desk/settings", icon: FiSettings },
        { title: "Logout", url: "/front-desk/logout", icon: FiLogOut },
    ],
};

type NavLinkProps = {
    title: string;
    url: string;
    Icon: React.ElementType;
    isActive: boolean;
    badge?: number;
};

function NavLink({ title, url, Icon, isActive, badge }: NavLinkProps) {
    return (
        <a
            href={url}
            aria-current={isActive ? "page" : undefined}
            className={`group flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors
        ${isActive ? "bg-red-600 text-white font-semibold shadow-md" : "text-gray-700 hover:bg-red-50 hover:text-red-700"}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1`}
        >
            <div className="flex items-center gap-3">
                <Icon
                    className={`w-5 h-5 transition-colors ${isActive ? "text-white" : "text-gray-500 group-hover:text-red-600"}`}
                    aria-hidden="true"
                />
                {title}
            </div>

            {badge !== undefined && badge > 0 && (
                <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{badge}</span>
            )}
        </a>
    );
}

export function FrontDeskAppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const role = getUserRole();

    const navMain = useMemo(
        () =>
            data.navMain
                .filter((item) => item.roles.includes(role))
                .map((item) => ({
                    ...item,
                    isActive: pathname === item.url || pathname.startsWith(item.url + "/"),
                    badge: item.badge?.(),
                })),
        [pathname, role]
    );

    const navSecondary = useMemo(
        () =>
            data.navSecondary.map((item) => ({
                ...item,
                isActive: pathname === item.url || pathname.startsWith(item.url + "/"),
            })),
        [pathname]
    );

    return (
        <Sidebar variant="inset" {...props} aria-label="Sidebar for Front Desk Staff">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a
                                href="/dashboard"
                                className="flex items-center gap-3 rounded-lg p-2 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                                aria-label="Nile Hospital Homepage"
                            >
                                <div className="flex w-8 h-8 items-center justify-center rounded-lg bg-red-600 text-white">
                                    <MdDashboard className="w-5 h-5" />
                                </div>
                                <div className="leading-tight">
                                    <span className="block font-semibold text-sm text-red-900">Nile Mother & Child</span>
                                    <span className="block text-xs text-red-700/80">Hospital</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="flex flex-col">
                <nav aria-label="Primary Navigation" className="flex flex-col gap-1 px-2 pt-4">
                    {navMain.map(({ title, url, icon, isActive, badge }) => (
                        <NavLink key={url} title={title} url={url} Icon={icon} isActive={isActive} badge={badge} />
                    ))}
                </nav>

                <nav aria-label="Secondary Navigation" className="mt-auto flex flex-col gap-1 px-2 pb-4">
                    {navSecondary.map(({ title, url, icon, isActive }) => (
                        <NavLink key={url} title={title} url={url} Icon={icon} isActive={isActive} />
                    ))}
                </nav>
            </SidebarContent>

            <SidebarFooter>
                <FrontDeskNavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    );
}
