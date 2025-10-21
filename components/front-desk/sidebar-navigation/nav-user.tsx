"use client";

import { useState } from "react";
import {
    ChevronsUpDown,
    LogOut,
    Mail,
    BadgeCheck,
} from "lucide-react";

import {
    Avatar,
    AvatarFallback,
} from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
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
import { useAuth } from "@/context/auth-provider";

/**
 * Navigation User Component
 * 
 * Displays authenticated user information in the sidebar with a dropdown menu
 * for account actions including logout functionality.
 */
export function FrontDeskNavUser() {
    const { isMobile } = useSidebar();
    const { user, logout } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    /**
     * Generates user initials from name or email
     * @param text - User's name or email
     * @returns Two-letter initials in uppercase
     */
    const getInitials = (text: string): string => {
        if (!text) return "U";

        const parts = text.split(" ");

        if (parts.length === 1) {
            return parts[0][0]?.toUpperCase() ?? "U";
        }

        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    /**
     * Handles user logout with loading state
     */
    const handleLogout = async () => {
        if (isLoggingOut) return;

        try {
            setIsLoggingOut(true);
            await logout();
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    // Guard against no user data
    if (!user) {
        return null;
    }

    const userInitials = getInitials(user.name || user.email || "");

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-red-100 data-[state=open]:text-primary transition-all hover:bg-red-50 rounded-full border border-red-200 shadow-sm w-fit h-fit"
                            aria-label="Open user menu"
                        >
                            <Avatar className="h-9 w-9 rounded-full border border-red-200 bg-red-50 shadow">
                                <AvatarFallback className="rounded-lg bg-red-200 text-primary font-bold">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0 ml-3 text-left">
                                <span className="block truncate font-semibold text-base text-primary">
                                   {user.role.charAt(0).toUpperCase() || ""} {user.name || "User"}
                                </span>
                                <span className="block truncate text-xs text-primary/70">
                                    {user.email || ""}
                                </span>
                            </div>

                            <ChevronsUpDown
                                className="ml-auto size-4 text-red-400"
                                aria-hidden="true"
                            />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-xl shadow-2xl border border-red-100 bg-white p-0"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={6}
                    >
                        {/* User Info Header */}
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-3 px-4 py-4 bg-red-50/70 rounded-t-xl">
                                <Avatar className="h-11 w-11 rounded-full border border-red-200 bg-red-100 shadow">
                                    <AvatarFallback className="rounded-full bg-red-200 text-primary font-bold">
                                        {userInitials}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                        <span className="truncate font-semibold text-base text-primary">
                                            {user.role.charAt(0).toUpperCase() || ""} 
                                            {user.name || "User"}
                                        </span>
                                        <BadgeCheck
                                            className="w-4 h-4 text-green-500 flex-shrink-0"
                                            aria-label="Verified account"
                                        />
                                    </div>

                                    {user.email && (
                                        <span className="truncate text-xs text-gray-600 flex items-center gap-1 mt-1">
                                            <Mail
                                                className="w-3 h-3 text-primary flex-shrink-0"
                                                aria-hidden="true"
                                            />
                                            {user.email}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator className="bg-red-100" />

                        {/* Logout Action */}
                        <DropdownMenuItem
                            className="flex items-center gap-2 px-4 py-2 mx-2 my-1 rounded-md text-red-600 hover:bg-red-50 focus:bg-red-50 font-semibold transition-colors cursor-pointer"
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                        >
                            <LogOut className="w-4 h-4" aria-hidden="true" />
                            <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}