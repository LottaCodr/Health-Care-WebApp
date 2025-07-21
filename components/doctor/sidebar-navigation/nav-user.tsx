"use client";

import {
    ChevronsUpDown,
    LogOut,
    Moon,
    Sun,
    Mail,
    Copy as CopyIcon,
    CheckCircle2,
} from "lucide-react";

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/auth-provider";
import { logout as doLogout } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NavUser() {
    const { setTheme, theme } = useTheme();
    const [copied, setCopied] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    let user;
    try {
        ({ user } = useAuth() ?? {});
    } catch (e) {
        user = undefined;
    }
    const router = useRouter();

    // Helper for initials
    const getInitials = (name?: string) => {
        if (!name) return "DR";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    // Helper for display email (truncate if long)
    const getDisplayEmail = (email?: string) => {
        if (!email) return "user@email.com";
        if (email.length > 28) {
            return email.slice(0, 14) + "..." + email.slice(-8);
        }
        return email;
    };

    // Copy email to clipboard
    const handleCopyEmail = async () => {
        if (user?.email) {
            try {
                await navigator.clipboard.writeText(user.email);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
            } catch (e) {
                // fallback: do nothing
            }
        }
    };

    // Logout handler with feedback
    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await doLogout();
            router.replace("/staff");
        } finally {
            setLoggingOut(false);
        }
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="cursor-pointer w-full">
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
                                aria-label="Open user menu"
                            >
                                <Avatar className="h-9 w-9 rounded-lg ring-2 ring-red-400">
                                    <AvatarImage src={undefined} alt={user?.name} />
                                    <AvatarFallback className="rounded-lg bg-red-200 text-red-700 font-bold">
                                        {getInitials(user?.full_name || user?.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0 ml-3 text-left">
                                    <span className="truncate font-semibold text-gray-900 dark:text-white text-base">
                                        {user?.full_name || user?.name || "Doctor"}
                                    </span>
                                    <span className="truncate text-xs text-gray-500 dark:text-gray-300 block">
                                        {getDisplayEmail(user?.email)}
                                    </span>
                                </div>
                                <ChevronsUpDown className="ml-auto size-4 text-red-500" />
                            </SidebarMenuButton>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-72 rounded-xl shadow-xl border border-red-100 dark:border-red-900/40 bg-white dark:bg-muted/90 p-0"
                        align="end"
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/30 rounded-t-xl">
                                <Avatar className="h-10 w-10 rounded-lg ring-2 ring-red-400">
                                    <AvatarImage src={undefined} alt={user?.name} />
                                    <AvatarFallback className="rounded-lg bg-red-200 text-red-700 font-bold">
                                        {getInitials(user?.full_name || user?.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0 text-left">
                                    <span className="truncate font-semibold capitalize text-gray-900 dark:text-white text-base">
                                        {user?.full_name || user?.name || "Doctor"}
                                    </span>
                                    <span className="truncate text-xs text-gray-500 dark:text-gray-300 block">
                                        {getDisplayEmail(user?.email)}
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-red-100 dark:bg-red-900/40" />

                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                onClick={handleCopyEmail}
                                className={`
                                    cursor-pointer gap-2 px-4 py-2 rounded-lg
                                    hover:bg-red-100 dark:hover:bg-red-900/30
                                    transition
                                    text-gray-800 dark:text-gray-200
                                    focus:bg-red-100 dark:focus:bg-red-900/30
                                    focus:text-red-700
                                `}
                                aria-label="Copy email"
                            >
                                <Mail className="text-red-400" />
                                <span className="truncate flex-1">{getDisplayEmail(user?.email)}</span>
                                {copied ? (
                                    <CheckCircle2 className="text-green-500" title="Copied!" />
                                ) : (
                                    <CopyIcon className="text-gray-400" title="Copy email" />
                                )}
                            </DropdownMenuItem>
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
                                aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                            >
                                {theme === "light" ? (
                                    <Moon className="text-red-500" />
                                ) : (
                                    <Sun className="text-red-400" />
                                )}
                                <span>
                                    {theme === "light" ? "Dark mode" : "Light mode"}
                                </span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-red-100 dark:bg-red-900/40" />
                        <DropdownMenuItem
                            onClick={handleLogout}
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
    );
}