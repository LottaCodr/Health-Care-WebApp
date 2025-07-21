"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useCallback, useRef, useEffect } from "react";
import { MdDashboard, MdEventNote, MdSupportAgent } from "react-icons/md";
import { FiSettings } from "react-icons/fi";
import { FaUserPlus, FaUserClock } from "react-icons/fa";

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
        // {
        //     title: "Visitors & Walk-ins",
        //     url: "/front-desk/visitors",
        //     icon: BsPeople,
        //     roles: ["receptionist"],
        // },
    ],
    navSecondary: [
        { title: "Support", url: "/front-desk/support", icon: MdSupportAgent },
        { title: "Settings", url: "/front-desk/settings", icon: FiSettings },
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
            className={`group flex items-center justify-between rounded-xl px-4 py-2 text-base font-semibold transition-all w-full
        ${isActive ? "bg-gradient-to-r from-red-600 to-red-400 text-white font-bold shadow-xl scale-[1.04]" : "text-gray-700 hover:bg-red-50 hover:text-red-700"}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2`}
            tabIndex={0}
            onClick={() => onNavigate && onNavigate(url)}
            onKeyDown={handleKeyDown}
            aria-label={title}
        >
            <div className="flex items-center gap-3 min-w-0">
                <span
                    className={`flex items-center justify-center rounded-lg transition-colors
                        ${isActive ? "bg-white/30" : "bg-gray-100 group-hover:bg-red-100"}
                        w-9 h-9 shadow-sm`}
                >
                    <Icon
                        className={`w-6 h-6 transition-colors ${isActive ? "text-white" : "text-red-600 group-hover:text-red-700"}`}
                        aria-hidden="true"
                    />
                </span>
                <span className="truncate text-base">{title}</span>
            </div>
            {badge !== undefined && badge > 0 && (
                <span
                    className="ml-2 flex items-center justify-center rounded-full bg-gradient-to-tr from-red-500 to-red-400 px-2 py-0.5 text-xs font-bold text-white shadow-lg animate-bounce"
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
    const sidebarRef = useRef<HTMLDivElement>(null);

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
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.altKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
                e.preventDefault();
                sidebarRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Skip to main content link for accessibility
    // (visually hidden but accessible to screen readers and keyboard users)
    const skipLinkId = "main-content";

    return (
        <>
            <a
                href={`#${skipLinkId}`}
                className="sr-only focus:not-sr-only absolute top-2 left-2 z-50 bg-white text-red-700 font-bold px-4 py-2 rounded shadow transition"
                tabIndex={0}
            >
                Skip to main content
            </a>
            <Sidebar
                ref={sidebarRef}
                tabIndex={-1}
                variant="inset"
                {...props}
                aria-label="Sidebar for Front Desk Staff"
                className="bg-gradient-to-b from-white via-red-50 to-red-100 border-r border-red-200 shadow-2xl min-h-screen"
            >
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild>
                                <button
                                    type="button"
                                    onClick={() => handleNavigate("/front-desk/dashboard")}
                                    className="flex items-center gap-3 rounded-2xl p-3 bg-gradient-to-r from-red-600 to-red-400 shadow-lg hover:from-red-700 hover:to-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all w-full"
                                    aria-label="Nile Hospital Homepage"
                                >
                                    <div className="flex w-12 h-12 items-center justify-center rounded-2xl bg-white/30 text-white shadow-lg">
                                        <MdDashboard className="w-7 h-7" />
                                    </div>
                                    <div className="leading-tight text-left">
                                        <span className="block font-extrabold text-xl text-white drop-shadow">Nile Mother & Child</span>
                                        <span className="block text-xs text-white/80 tracking-wide">Hospital</span>
                                    </div>
                                </button>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent className="flex flex-col">
                    <nav aria-label="Primary Navigation" className="flex flex-col gap-2 px-3 pt-8">
                        <span className="text-xs font-semibold text-red-500 uppercase tracking-widest px-2 pb-1 select-none">
                            Main
                        </span>
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

                    <div className="my-6 border-t border-red-200" />

                    <nav aria-label="Secondary Navigation" className="flex flex-col gap-2 px-3 pb-8">
                        <span className="text-xs font-semibold text-red-400 uppercase tracking-widest px-2 pb-1 select-none">
                            More
                        </span>
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
                    <div className="px-4 py-4 border-t border-red-100 bg-gradient-to-t from-red-50/80 to-transparent">
                        <FrontDeskNavUser user={data.user} />
                        <div className="mt-2 text-xs text-gray-400 text-center">
                            <span>
                                <kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700">Alt</kbd>
                                +<kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700">S</kbd> to focus sidebar
                            </span>
                        </div>
                    </div>
                </SidebarFooter>
            </Sidebar>
        </>
    );
}
