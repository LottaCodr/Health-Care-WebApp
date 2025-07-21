"use client";

import {
    ChevronsUpDown,
    LogOut,
    Moon,
    Sun,
    User as UserIcon,
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
    useSidebar,
} from "@/components/ui/sidebar";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { useState } from "react";

// Use real logout from auth-provider
export function LabTechNavUser() {
    const { isMobile } = useSidebar();
    const { setTheme, theme } = useTheme();
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);
    const [copied, setCopied] = useState(false);

    let user, logout;
    try {
        const auth = useAuth();
        user = auth.user;
        logout = auth.logout;
    } catch (e) {
        user = undefined;
        logout = async () => {};
    }

    // Helper for initials
    const getInitials = (name?: string) => {
        if (!name) return "LT";
        const parts = name.split(" ");
        if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "LT";
        return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
    };

    // Helper for fallback name/email/avatar
    const displayName = user?.full_name || user?.name || "Lab Technician";
    const displayEmail = user?.email || "user@email.com";
    const displayAvatar = user?.avatar || undefined;

    // Copy email to clipboard
    const handleCopyEmail = async () => {
        try {
            await navigator.clipboard.writeText(displayEmail);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            // fallback: do nothing
        }
    };

    // Theme
    const themeLabel = theme === "light" ? "Switch to dark mode" : "Switch to light mode";
    const themeIcon = theme === "light"
        ? <Moon className="mr-2 text-red-500" />
        : <Sun className="mr-2 text-red-400" />;
    const themeText = theme === "light" ? "Dark mode" : "Light mode";

    // Menu trigger button
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className={`
                                data-[state=open]:bg-red-100
                                data-[state=open]:text-red-700
                                hover:bg-red-50
                                transition
                                px-3 py-2
                                rounded-xl
                                border border-red-200
                                shadow-sm
                                w-full
                                focus:outline-none
                                focus-visible:ring-2
                                focus-visible:ring-red-500
                                focus-visible:ring-offset-1
                            `}
                            aria-label="Open user menu"
                        >
                            <Avatar className="h-9 w-9 rounded-lg border border-red-200 bg-red-50 shadow">
                                {displayAvatar ? (
                                    <AvatarImage src={displayAvatar} alt={displayName} />
                                ) : (
                                    <AvatarFallback className="rounded-lg bg-red-200 text-red-700 font-bold">
                                        {getInitials(displayName)}
                                    </AvatarFallback>
                                )}
                            </Avatar>
                            <div className="flex-1 min-w-0 ml-3 text-left">
                                <span className="block truncate font-semibold text-base text-red-900">{displayName}</span>
                                <span className="block truncate text-xs text-red-500">{displayEmail}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-red-400" aria-hidden="true" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-xl shadow-2xl border border-red-100 dark:border-red-900/40 bg-white dark:bg-muted/90 p-0"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={6}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/30 rounded-t-xl">
                                <Avatar className="h-10 w-10 rounded-lg border border-red-200 bg-red-100">
                                    {displayAvatar ? (
                                        <AvatarImage src={displayAvatar} alt={displayName} />
                                    ) : (
                                        <AvatarFallback className="rounded-lg bg-red-200 text-red-700 font-bold">
                                            {getInitials(displayName)}
                                        </AvatarFallback>
                                    )}
                                </Avatar>
                                <div className="flex-1 min-w-0 text-left">
                                    <span className="block truncate font-semibold capitalize text-red-900 dark:text-white text-base">
                                        {displayName}
                                    </span>
                                    <span className="block truncate text-xs text-red-500 dark:text-gray-300">
                                        {displayEmail}
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
                                <span className="flex-1 truncate">{displayEmail}</span>
                                {copied ? (
                                    <CheckCircle2 className="text-green-500" aria-label="Copied!" />
                                ) : (
                                    <CopyIcon className="text-gray-400" aria-label="Copy email" />
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
                                try {
                                    await logout();
                                } finally {
                                    router.replace("/staff");
                                }
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
    );
}