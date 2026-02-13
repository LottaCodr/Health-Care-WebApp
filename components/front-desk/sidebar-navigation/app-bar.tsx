"use client";

import React, { useMemo, useCallback, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MdDashboard } from "react-icons/md";
import { FiSettings } from "react-icons/fi";
import { FaUserPlus, FaUserClock, FaUserCheck } from "react-icons/fa";
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

/**
 * NavLink component for navigation links in the sidebar.
 * Provides keyboard accessibility, badge support, and active styling.
 */
type NavLinkProps = {
    title: string;
    url: string;
    Icon: React.ElementType;
    isActive: boolean;
    badge?: number;
    onNavigate?: (url: string) => void;
};

const NavLink: React.FC<NavLinkProps> = ({
    title,
    url,
    Icon,
    isActive,
    badge,
    onNavigate,
}) => {
    // Enables navigation on Enter/Space keys
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (onNavigate && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onNavigate(url);
            }
        },
        [onNavigate, url]
    );

    // For aria-describedby if badge exists
    const badgeId =
        badge !== undefined
            ? `${title.replace(/\s+/g, "-").toLowerCase()}-badge`
            : undefined;

    return (
        <li role="none" className="w-full">
            <button
                type="button"
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center justify-between rounded-xl px-4 py-2 text-base font-semibold w-full
                    ${isActive ? "bg-white text-primary font-bold scale-[1.04]" : "text-white hover:bg-red-50 hover:text-primary"}
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2`}
                tabIndex={0}
                onClick={() => onNavigate && onNavigate(url)}
                onKeyDown={handleKeyDown}
                aria-label={
                    badge !== undefined ? `${title}, ${badge} items` : title
                }
                aria-describedby={badgeId}
            >
                <div className="flex items-center gap-3 min-w-0 hover:text-primary">
                    <span
                        className={`flex items-center justify-center rounded-lg ${
                            isActive
                                ? "bg-transparent border border-primary"
                                : "bg-transparent"
                        } w-9 h-9`}
                    >
                        <Icon
                            className={`w-6 h-6 transition-colors ${
                                isActive ? "text-primary" : "text-white"
                            }`}
                            aria-hidden="true"
                        />
                    </span>
                    <span className="truncate text-base">{title}</span>
                </div>
                {badge !== undefined && badge > 0 && (
                    <span
                        id={badgeId}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white ml-3"
                        aria-label={`${badge} new items`}
                    >
                        {badge}
                    </span>
                )}
            </button>
        </li>
    );
};

/**
 * FrontDeskAppSidebar displays a role-based sidebar for authenticated users.
 * Navigation links and sections are dynamically rendered depending on role.
 */
export function FrontDeskAppSidebar(
    props: React.ComponentProps<typeof Sidebar>
) {
    const pathname = usePathname();
    const router = useRouter();
    const auth = useAuth();
    const user = auth?.user;
    const userRole = user?.role ?? "";

    // Define navigation schema per role
    const navConfig: Record<
        string,
        {
            navMain: {
                title: string;
                url: string;
                icon: React.ElementType;
                badge?: () => number;
            }[];
            navSecondary: {
                title: string;
                url: string;
                icon: React.ElementType;
            }[];
        }
    > = {
        Frontdesk: {
            navMain: [
                { title: "Dashboard", url: "/frontdesk/dashboard", icon: MdDashboard },
                { title: "Patients", url: "/frontdesk/patient", icon: FaUserPlus },
                {
                    title: "Payments",
                    url: "/frontdesk/queue",
                    icon: FaUserClock,
                    badge: () => 0, // Replace with real badge logic if available
                },
            ],
            navSecondary: [
                { title: "Settings", url: "/frontdesk/settings", icon: FiSettings },
            ],
        },
        Nurse: {
            navMain: [
                { title: "Dashboard", url: "/nurse/dashboard", icon: MdDashboard },
                {
                    title: "Patients Queue",
                    url: "/nurse/queue",
                    icon: FaUserClock,
                    badge: () => 0,
                },
                {
                    title: "Completed",
                    url: "/nurse/completed",
                    icon: FaUserCheck,
                },
            ],
            navSecondary: [
                { title: "Settings", url: "/nurse/settings", icon: FiSettings },
            ],
        },
        Doctor: {
            navMain: [
                { title: "Dashboard", url: "/doctor/dashboard", icon: MdDashboard },
                { title: "Patients", url: "/doctor/patients", icon: FaUserPlus },
                { title: "Reports", url: "/doctor/reports", icon: FaUserClock },
            ],
            navSecondary: [
                { title: "Settings", url: "/doctor/settings", icon: FiSettings },
            ],
        },
        Pharmacist: {
            navMain: [
                { title: "Dashboard", url: "/pharmacist/dashboard", icon: MdDashboard },
                { title: "Patients Queue", url: "/pharmacist/queue", icon: FaUserPlus },
                { title: "Reports", url: "/pharmacist/completed", icon: FaUserClock },
            ],
            navSecondary: [
                { title: "Settings", url: "/pharmacist/settings", icon: FiSettings },
            ],
        },
        Admin: {
            navMain: [
                { title: "Dashboard", url: "/admin/dashboard", icon: MdDashboard },
                { title: "Users", url: "/admin/users", icon: FaUserPlus },
                { title: "Reports", url: "/admin/reports", icon: FaUserClock },
            ],
            navSecondary: [
                { title: "Settings", url: "/admin/settings", icon: FiSettings },
            ],
        },
    };

    // Only get navs if userRole is there and valid
    const nav =
        userRole && Object.hasOwn(navConfig, userRole)
            ? navConfig[userRole]
            : null;

    const sidebarRef = useRef<HTMLDivElement>(null);

    // Compute main navigation links
    const navMain = useMemo(
        () =>
            nav
                ? nav.navMain.map((item) => ({
                      ...item,
                      isActive:
                          pathname === item.url ||
                          pathname.startsWith(item.url + "/"),
                      badge: item.badge?.(),
                  }))
                : [],
        [pathname, userRole, nav]
    );

    // Compute secondary navigation links
    const navSecondary = useMemo(
        () =>
            nav
                ? nav.navSecondary.map((item) => ({
                      ...item,
                      isActive:
                          pathname === item.url ||
                          pathname.startsWith(item.url + "/"),
                  }))
                : [],
        [pathname, userRole, nav]
    );

    // SPA navigation handler
    const handleNavigate = useCallback(
        (url: string) => {
            if (url !== pathname) {
                router.push(url);
            }
        },
        [router, pathname]
    );

    // Focus sidebar with Alt+S or Cmd+S
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                (e.altKey || e.metaKey) &&
                (e.key === "s" || e.key === "S")
            ) {
                e.preventDefault();
                sidebarRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () =>
            window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Skip link for accessibility
    const skipLinkId = "main-content";

    // Guard: only render sidebar if user is authenticated and role is recognized
    if (!user || !userRole || !nav) {
        return null;
    }

    // Determine homepage URL based on current role
    const homeUrl =
        userRole === "Frontdesk"
            ? "/frontdesk/dashboard"
            : userRole === "Nurse"
            ? "/nurse/dashboard"
            : userRole === "Doctor"
            ? "/doctor/dashboard"
            : userRole === "Pharmacist"
            ? "/pharmacist/dashboard"
            : userRole === "Admin"
            ? "/admin/dashboard"
            : userRole === "LabTechnician"
            ? "/labtech/dashboard"
            : "/";

    return (
        <>
            <a
                href={`#${skipLinkId}`}
                className="sr-only focus:not-sr-only absolute top-2 left-2 z-50 bg-primary dark:bg-gray-900 text-black dark:text-red-200 font-bold px-4 py-2 rounded shadow transition"
                tabIndex={0}
            >
                Skip to main content
            </a>
            <Sidebar
                ref={sidebarRef}
                tabIndex={-1}
                variant="inset"
                {...props}
                aria-label="Main site navigation"
                className="dark:from-gray-900 dark:via-gray-950 bg-primary dark:to-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen"
            >
                {/* Logo and hospital title */}
                <SidebarHeader aria-label="Main Site Identity">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="sm" asChild>
                                <button
                                    type="button"
                                    onClick={() => handleNavigate(homeUrl)}
                                    className="items-center gap-3 rounded-2xl p-6 dark:from-red-900 dark:to-primary hover:from-red-700 hover:to-red-500 dark:hover:from-red-800 dark:hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all w-full h-auto"
                                    aria-label="Nile Hospital Homepage"
                                >
                                    <div className="flex w-fit h-fit items-center justify-center rounded-full dark:bg-gray-800 text-black">
                                        <Image
                                            src="/assets/icons/nilelogo.jpeg"
                                            alt="Nile Hospital logo"
                                            width={66}
                                            height={66}
                                            className="h-14 rounded-mb w-auto"
                                            priority
                                        />
                                    </div>
                                    <div className="text-left" aria-hidden="true">
                                        <span className="block font-extrabold text-xl text-white">
                                            Nile Mother & Child
                                        </span>
                                        <span className="block text-xs text-white tracking-wide">
                                            Hospital
                                        </span>
                                    </div>
                                </button>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>

                <SidebarContent
                    aria-label="Sidebar Navigation"
                    className="flex flex-col"
                >
                    {/* Main navigation */}
                    <section
                        aria-labelledby="main-navigation-label"
                        className="flex flex-col gap-2 px-3 pt-8"
                    >
                        <h2 id="main-navigation-label" className="sr-only">
                            Main Navigation
                        </h2>
                        <ul
                            className="flex flex-col gap-2"
                            role="menu"
                            aria-orientation="vertical"
                        >
                            {navMain.map(
                                ({ title, url, icon, isActive, badge }) => (
                                    <NavLink
                                        key={url}
                                        title={title}
                                        url={url}
                                        Icon={icon}
                                        isActive={isActive}
                                        badge={badge}
                                        onNavigate={handleNavigate}
                                    />
                                )
                            )}
                        </ul>
                    </section>

                    {/* Secondary navigation */}
                    <section
                        aria-labelledby="secondary-navigation-label"
                        className="flex flex-col gap-2 px-3 pb-8 mt-6 border-t border-gray-200 dark:border-gray-800"
                    >
                        <h2
                            id="secondary-navigation-label"
                            className="sr-only"
                        >
                            Secondary Navigation
                        </h2>
                        <ul
                            className="flex flex-col gap-2"
                            role="menu"
                            aria-orientation="vertical"
                        >
                            {navSecondary.map(
                                ({ title, url, icon, isActive }) => (
                                    <NavLink
                                        key={url}
                                        title={title}
                                        url={url}
                                        Icon={icon}
                                        isActive={isActive}
                                        onNavigate={handleNavigate}
                                    />
                                )
                            )}
                        </ul>
                    </section>
                </SidebarContent>
            </Sidebar>
        </>
    );
}
