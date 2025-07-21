"use client"

import {
    ChevronsUpDown,
    LogOut,
    Moon,
    Sun,
    User,
    Mail,
} from "lucide-react"

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-provider"
import { useState } from "react"

// Dummy logout function, replace with your real logout logic
async function logout() {
    if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
    }
}

export function LabTechNavUser() {
    const { isMobile } = useSidebar()
    const { setTheme, theme } = useTheme()
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    let user;
    try {
        ({ user } = useAuth() ?? {})
    } catch (e) {
        user = undefined;
    }

    // Helper for initials
    const getInitials = (name?: string) => {
        if (!name) return "LT";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    // Helper for fallback name/email
    const displayName = user?.full_name || user?.name || "Lab Technician";
    const displayEmail = user?.email || "user@email.com";

    // Helper for theme label
    const themeLabel = theme === "light" ? "Switch to dark mode" : "Switch to light mode";
    const themeIcon = theme === "light"
        ? <Moon className="mr-2 text-red-500" />
        : <Sun className="mr-2 text-red-400" />;
    const themeText = theme === "light" ? "Dark mode" : "Light mode";

    // Accessibility: focus ring and aria
    // Improved: show email and name in menu, add user icon, show feedback on logout, better mobile touch targets

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="w-full focus:outline-none"
                            aria-label="Open user menu"
                            tabIndex={0}
                        >
                            <SidebarMenuButton
                                size="lg"
                                className={`
                                    data-[state=open]:bg-red-100
                                    data-[state=open]:text-red-700
                                    hover:bg-red-50
                                    transition
                                    px-3 py-2
                                    rounded-xl
                                    focus:outline-none
                                    focus-visible:ring-2
                                    focus-visible:ring-red-500
                                    focus-visible:ring-offset-1
                                `}
                            >
                                <Avatar className="h-9 w-9 rounded-lg ring-2 ring-red-400">
                                    <AvatarImage src={undefined} alt={displayName} />
                                    <AvatarFallback className="rounded-lg bg-red-200 text-red-700 font-bold">
                                        {getInitials(displayName)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0 ml-3 text-left">
                                    <span className="truncate font-semibold text-gray-900 dark:text-white text-base">
                                        {displayName}
                                    </span>
                                    <span className="truncate text-xs text-gray-500 dark:text-gray-300 block">
                                        {displayEmail}
                                    </span>
                                </div>
                                <ChevronsUpDown className="ml-auto size-4 text-red-500" />
                            </SidebarMenuButton>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-72 rounded-xl shadow-xl border border-red-100 dark:border-red-900/40 bg-white dark:bg-muted/90 p-0"
                        align="end"
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/30 rounded-t-xl">
                                <Avatar className="h-10 w-10 rounded-lg ring-2 ring-red-400">
                                    <AvatarImage src={undefined} alt={displayName} />
                                    <AvatarFallback className="rounded-lg bg-red-200 text-red-700 font-bold">
                                        {getInitials(displayName)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0 text-left">
                                    <span className="truncate font-semibold capitalize text-gray-900 dark:text-white text-base">
                                        {displayName}
                                    </span>
                                    <span className="truncate text-xs text-gray-500 dark:text-gray-300 block">
                                        {displayEmail}
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-red-100 dark:bg-red-900/40" />

                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                                className={`
                                    cursor-pointer gap-2 px-4 py-2 rounded-lg
                                    hover:bg-red-100 dark:hover:bg-red-900/30
                                    transition
                                    text-gray-800 dark:text-gray-200
                                    focus:bg-red-100 dark:focus:bg-red-900/30
                                    focus:text-red-700
                                `}
                                aria-label={themeLabel}
                            >
                                {themeIcon}
                                <span>
                                    {themeText}
                                </span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-red-100 dark:bg-red-900/40" />

                        <DropdownMenuItem
                            onClick={async () => {
                                setLoggingOut(true);
                                await logout();
                                router.replace("/staff");
                            }}
                            className={`
                                cursor-pointer gap-2 px-4 py-2 rounded-lg
                                text-red-700 font-semibold
                                hover:bg-red-100 dark:hover:bg-red-900/30
                                hover:text-red-800
                                transition
                                focus:bg-red-100 dark:focus:bg-red-900/30
                                focus:text-red-800
                                disabled:opacity-60
                            `}
                            aria-label="Log out"
                            disabled={loggingOut}
                        >
                            <LogOut className="text-red-500" />
                            {loggingOut ? "Logging out..." : "Log out"}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}