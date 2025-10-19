"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useCallback, useRef, useEffect } from "react";
import { MdDashboard } from "react-icons/md";
import { FiSettings } from "react-icons/fi";
import { FaUserPlus, FaUserClock, FaUserCheck, FaUserNurse } from "react-icons/fa";

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { useAuth } from "@/context/auth-provider";

// Dummy role + badge logic




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
            className={` flex items-center justify-between rounded-xl px-4 py-2 text-base font-semibold w-full
        ${isActive ? "bg-primary text-white font-bold scale-[1.04]" : "text-gray-700 hover:bg-red-50 hover:text-primary"}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2`}
            tabIndex={0}
            onClick={() => onNavigate && onNavigate(url)}
            onKeyDown={handleKeyDown}
            aria-label={title}
        >
            <div className="flex items-center gap-3 min-w-0">
                <span
                    className={`flex items-center justify-center rounded-lg
                        ${isActive ? "bg-transparent" : "bg-gray-100 "}
                        w-9 h-9`}
                >
                    <Icon
                        className={`w-6 h-6 transition-colors ${isActive ? "text-white" : "text-primary"}`}
                        aria-hidden="true"
                    />
                </span>
                <span className="truncate text-base">{title}</span>
            </div>

        </button>
    );
}

export function FrontDeskAppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const router = useRouter();
    const user = useAuth()
    const getUserRole = user?.user?.role ?? "";



    // role-based navigation schema
    const navConfig: Record<
        string,
        {
            navMain: { title: string; url: string; icon: React.ElementType; badge?: () => number }[];
            navSecondary: { title: string; url: string; icon: React.ElementType }[];
        }
    > = {
        frontdesk: {
            navMain: [
                { title: "Dashboard", url: "/frontdesk/dashboard", icon: MdDashboard },
                { title: "Patients", url: "/frontdesk/patient", icon: FaUserPlus },
                {
                    title: "Payments",
                    url: "/frontdesk/queue",
                    icon: FaUserClock,
                    badge: () => 0, // dynamic badge
                },
            ],
            navSecondary: [
                // { title: "Support", url: "/frontdesk/support", icon: MdSupportAgent },
                { title: "Settings", url: "/frontdesk/settings", icon: FiSettings },
            ],
        },
        nurse: {
            navMain: [
                {
                    title: "Dashboard",
                    url: "/nurse/dashboard",
                    icon: MdDashboard,
                },
                {
                    title: "Patients Queue",
                    url: "/nurse/queue",
                    icon: FaUserClock,
                    badge: () => 0, // dynamically shows number of patients awaiting vitals
                },

                {
                    title: "Completed",
                    url: "/nurse/completed",
                    icon: FaUserCheck,
                },
            ],
            navSecondary: [
                {
                    title: "Settings",
                    url: "/nurse/settings",
                    icon: FiSettings,
                },
            ],
        },

        doctor: {
            navMain: [
                { title: "Dashboard", url: "/doctor/dashboard", icon: MdDashboard },
                { title: "Patients", url: "/doctor/patients", icon: FaUserPlus },
                { title: "Reports", url: "/doctor/reports", icon: FaUserClock },
            ],
            navSecondary: [
                // { title: "Support", url: "/doctor/support", icon: MdSupportAgent },
                { title: "Settings", url: "/doctor/settings", icon: FiSettings },
            ],
        },
        pharmacist: {
            navMain: [
                { title: "Dashboard", url: "/pharmacist/dashboard", icon: MdDashboard },
                { title: "Patients Queue", url: "/pharmacist/queue", icon: FaUserPlus },
                { title: "Reports", url: "/pharmacist/completed", icon: FaUserClock },
            ],
            navSecondary: [

                { title: "Settings", url: "/pharmacist/settings", icon: FiSettings },
            ],
        },

        admin: {
            navMain: [
                { title: "Dashboard", url: "/admin/dashboard", icon: MdDashboard },
                { title: "Users", url: "/admin/users", icon: FaUserPlus },
                { title: "Reports", url: "/admin/reports", icon: FaUserClock },
            ],
            navSecondary: [
                // { title: "Support", url: "/admin/support", icon: MdSupportAgent },
                { title: "Settings", url: "/admin/settings", icon: FiSettings },
            ],
        },
    };

    const { navMain: roleNavMain, navSecondary: roleNavSecondary } =
        (getUserRole && navConfig[getUserRole])
            ? navConfig[getUserRole]
            : { navMain: [], navSecondary: [] };
    const getWaitingPatientsBadge = () => 5; const sidebarRef = useRef<HTMLDivElement>(null);

    // Memoize navigation data for performance
    // Show all navMain items (make the navMain titles display)
    const navMain = useMemo(
        () =>
            roleNavMain.map((item) => ({
                ...item,
                isActive: pathname === item.url || pathname.startsWith(item.url + "/"),
                badge: item.badge?.(),
            })),
        [pathname, getUserRole]
    );

    const navSecondary = useMemo(
        () =>
            roleNavSecondary.map((item) => ({
                ...item,
                isActive: pathname === item.url || pathname.startsWith(item.url + "/"),
            })),
        [pathname, getUserRole]
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
                className="sr-only focus:not-sr-only absolute top-2 left-2 z-50 bg-white dark:bg-gray-900 text-black dark:text-red-200 font-bold px-4 py-2 rounded shadow transition"
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
                className="dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen"
            >
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="sm" asChild>
                                <button
                                    type="button"
                                    onClick={() => handleNavigate("/front-desk/dashboard")}
                                    className="items-center gap-3 rounded-2xl p-6 dark:from-red-900 dark:to-primary hover:from-red-700 hover:to-red-500 dark:hover:from-red-800 dark:hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all w-full h-auto"
                                    aria-label="Nile Hospital Homepage"
                                >
                                    <div className="flex w-fit h-fit items-center justify-center rounded-full dark:bg-gray-800 text-black">
                                        <Image src="/assets/icons/nilelogo.jpeg" alt="Logo" width={66} height={66} className="h-14 w-auto" priority />
                                    </div>
                                    <div className=" text-left">
                                        <span className="block font-extrabold text-xl text-primary">Nile Mother & Child</span>
                                        <span className="block text-xs text-grey-300 tracking-wide">Hospital</span>
                                    </div>
                                </button>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent className="flex flex-col">
                    <nav aria-label="Primary Navigation" className="flex flex-col gap-2 px-3 pt-8">

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

                    {/* <div className="my-6 border-t border-black dark:border-gray-800" /> */}

                    <nav aria-label="Secondary Navigation" className="flex flex-col gap-2 px-3 pb-8">

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


            </Sidebar>
        </>
    );
}
