"use client";

import { useState } from "react";
import {
    LogOut,
    Settings,
    User as UserIcon,
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
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/context/auth-provider";

export function FrontDeskNavUser() {
    const { isMobile } = useSidebar();
    const { user, logout } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const getInitials = (text: string): string => {
        if (!text) return "U";
        const parts = text.split(" ");
        if (parts.length === 1) {
            return parts[0][0]?.toUpperCase() ?? "U";
        }
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

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

    if (!user) {
        return null;
    }

    const userInitials = getInitials(user.name || user.email || "");

    // This matches the right screenshot: avatar left, name (big) and email (small) stacked, with dropdown for settings/logout.
    return (
        <div className="w-full px-6 py-4 flex items-center gap-4 ">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="outline-none text-red flex items-center">
                        <Avatar className="h-10 w-10 rounded-full border border-gray-200 bg-gray-50 shadow">
                            <AvatarFallback className="rounded-full bg-gray-100 text-primary font-bold uppercase">
                                {userInitials}
                            </AvatarFallback>
                        </Avatar>
                    </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    className="min-w-52 rounded-xl shadow-2xl border border-gray-100 bg-white p-0"
                    side={isMobile ? "bottom" : "right"}
                    align="start"
                    sideOffset={6}
                >
                    <DropdownMenuLabel className="p-0 font-normal">
                        <div className="flex items-center gap-3 px-4 py-4 bg-gray-50 rounded-t-xl">
                            <Avatar className="h-10 w-10 rounded-full border border-gray-200 bg-gray-100 shadow">
                                <AvatarFallback className="rounded-full bg-gray-200 text-gray-900 font-bold uppercase">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                                <span className="truncate font-semibold text-base text-gray-900">
                                    {user.name || "User"}
                                </span>
                                <span className="truncate text-xs text-gray-500">
                                    {user.email || ""}
                                </span>
                            </div>
                        </div>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator className="bg-gray-100" />

                    <DropdownMenuItem
                        className="flex items-center gap-2 px-4 py-2 mx-2 my-1 rounded-md text-gray-800 hover:bg-gray-100 focus:bg-gray-100 font-medium transition-colors cursor-pointer"
                        onClick={() => { }}
                    >
                        <UserIcon className="w-4 h-4" aria-hidden="true" />
                        <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="flex items-center gap-2 px-4 py-2 mx-2 my-1 rounded-md text-gray-800 hover:bg-gray-100 focus:bg-gray-100 font-medium transition-colors cursor-pointer"
                        onClick={() => { }}
                    >
                        <Settings className="w-4 h-4" aria-hidden="true" />
                        <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-gray-100" />
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
            <div className="flex flex-col min-w-0 ml-2">
                <span className="font-semibold text-[18px] leading-5 text-gray-900 truncate">
                    {user.name || "User"}
                </span>
                <span className="text-xs text-gray-500 truncate">
                    {user.email || ""}
                </span>
            </div>
        </div>
    );
}