"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useCallback } from "react";
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
    onNavigate?: (url: string) => void;
};

function NavLink({ title, url, Icon, isActive, badge, onNavigate }: NavLinkProps) {
    // Keyboard accessibility: allow Enter/Space to trigger navigation
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (onNavigate && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onNavigate(url);
            }
        },
        [onNavigate, url]
    );

    return (
        <button
            type="button"
            aria-current={isActive ? "page" : undefined}
            className={`group flex items-center justify-between rounded-lg px-4 py-2 text-base font-medium transition-all w-full
        ${isActive ? "bg-gradient-to-r from-red-600 to-red-400 text-white font-bold shadow-lg scale-[1.03]" : "text-gray-700 hover:bg-red-100 hover:text-red-700"}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1`}
            tabIndex={0}
            onClick={() => onNavigate && onNavigate(url)}
            onKeyDown={handleKeyDown}
            aria-label={title}
        >
            <div className="flex items-center gap-3 min-w-0">
                <span
                    className={`flex items-center justify-center rounded-md transition-colors
                        ${isActive ? "bg-white/20" : "bg-gray-100 group-hover:bg-red-200"}
                        w-8 h-8`}
                >
                    <Icon
                        className={`w-5 h-5 transition-colors ${isActive ? "text-white" : "text-red-600 group-hover:text-red-700"}`}
                        aria-hidden="true"
                    />
                </span>
                <span className="truncate">{title}</span>
            </div>
            {badge !== undefined && badge > 0 && (
                <span
                    className="ml-2 flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white shadow"
                    aria-label={`${badge} new ${title.toLowerCase()}`}
                >
                    {badge}
                </span>
            )}
        </button>
    );
}

export function FrontDeskAppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const router = useRouter();
    const role = getUserRole();

    // Memoize navigation data for performance
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

    // Navigation handler for better SPA experience
    const handleNavigate = useCallback(
        (url: string) => {
            if (url !== pathname) {
                router.push(url);
            }
        },
        [router, pathname]
    );

    // Keyboard shortcut: Focus sidebar with Alt+S
    // (Improves accessibility for keyboard users)
    // Optionally, you could add a skip link for even better UX

    return (
        <Sidebar
            variant="inset"
            {...props}
            aria-label="Sidebar for Front Desk Staff"
            className="bg-gradient-to-b from-white via-red-50 to-red-100 border-r border-red-200 shadow-lg"
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <button
                                type="button"
                                onClick={() => handleNavigate("/dashboard")}
                                className="flex items-center gap-3 rounded-xl p-3 bg-gradient-to-r from-red-600 to-red-400 shadow-md hover:from-red-700 hover:to-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-all w-full"
                                aria-label="Nile Hospital Homepage"
                            >
                                <div className="flex w-10 h-10 items-center justify-center rounded-xl bg-white/20 text-white shadow">
                                    <MdDashboard className="w-6 h-6" />
                                </div>
                                <div className="leading-tight text-left">
                                    <span className="block font-extrabold text-lg text-white drop-shadow">Nile Mother & Child</span>
                                    <span className="block text-xs text-white/80 tracking-wide">Hospital</span>
                                </div>
                            </button>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="flex flex-col">
                <nav aria-label="Primary Navigation" className="flex flex-col gap-2 px-3 pt-6">
                    {navMain.map(({ title, url, icon, isActive, badge }) => (
                        <NavLink
                            key={url}
                            title={title}
                            url={url}
                            Icon={icon}
                            isActive={isActive}
                            badge={badge}
                            onNavigate={handleNavigate}
                        />
                    ))}
                </nav>

                <div className="my-4 border-t border-red-200" />

                <nav aria-label="Secondary Navigation" className="flex flex-col gap-2 px-3 pb-6">
                    {navSecondary.map(({ title, url, icon, isActive }) => (
                        <NavLink
                            key={url}
                            title={title}
                            url={url}
                            Icon={icon}
                            isActive={isActive}
                            onNavigate={handleNavigate}
                        />
                    ))}
                </nav>
            </SidebarContent>

            <SidebarFooter>
                <div className="px-4 py-3">
                    <FrontDeskNavUser user={data.user} />
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
