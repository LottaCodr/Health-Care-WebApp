"use client"

import {
    ChevronsUpDown,
    LogOut,
    Moon,
    Sun,
    Mail,
    Copy as CopyIcon,
    CheckCircle2,
    User as UserIcon,
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
} from "@/components/ui/sidebar"
import { useTheme } from "next-themes"
import { logout } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

function getInitials(name?: string) {
    if (!name) return "NU";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "NU";
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

// Fallback user info for when AuthProvider is not present
const fallbackUser = {
    full_name: "Nurse User",
    email: "nurse@email.com",
    avatar: "",
};

export function NurseNavUser() {
    const { setTheme, theme } = useTheme();
    const [user, setUser] = useState<typeof fallbackUser>(fallbackUser);
    const [copied, setCopied] = useState(false);
    const router = useRouter();

    // Optionally, try to get user info from localStorage/sessionStorage if available
    useEffect(() => {
        try {
            const storedUser = typeof window !== "undefined" ? window.localStorage.getItem("nurseUser") : null;
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                if (parsed && parsed.full_name && parsed.email) {
                    setUser({
                        ...fallbackUser,
                        ...parsed,
                    });
                }
            }
        } catch (e) {
            // ignore
        }
    }, []);

    // Copy email to clipboard
    const handleCopyEmail = async () => {
        try {
            await navigator.clipboard.writeText(user.email);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            // fallback: do nothing
        }
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-red-100 data-[state=open]:text-red-700 transition-all hover:bg-red-50 rounded-xl border border-red-200 w-full px-2 py-2"
                            aria-label="Open user menu"
                        >
                            <Avatar className="h-9 w-9 rounded-lg ring-2 ring-red-200 bg-red-50">
                                {user.avatar ? (
                                    <AvatarImage src={user.avatar} alt={user.full_name} />
                                ) : (
                                    <AvatarFallback className="rounded-lg bg-red-200 text-red-700 font-bold">
                                        {getInitials(user.full_name)}
                                    </AvatarFallback>
                                )}
                            </Avatar>
                            <div className="flex-1 min-w-0 ml-3 text-left">
                                <span className="block truncate font-semibold text-base text-red-900">{user.full_name}</span>
                                <span className="block truncate text-xs text-red-500">{user.email}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-red-400" aria-hidden="true" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-60 rounded-xl shadow-xl border border-red-100 bg-white p-0"
                        align="end"
                        sideOffset={6}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-3 px-4 py-4 text-left text-sm bg-red-50/70 rounded-t-xl">
                                <Avatar className="h-11 w-11 rounded-lg border border-red-200 bg-red-100">
                                    {user.avatar ? (
                                        <AvatarImage src={user.avatar} alt={user.full_name} />
                                    ) : (
                                        <AvatarFallback className="rounded-lg bg-red-200 text-red-700 font-bold">
                                            {getInitials(user.full_name)}
                                        </AvatarFallback>
                                    )}
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <span className="block truncate font-semibold capitalize text-red-800 text-base">{user.full_name}</span>
                                    <div className="flex items-center gap-1 mt-1">
                                        <Mail className="w-4 h-4 text-red-400" />
                                        <span className="truncate text-xs text-red-500">{user.email}</span>
                                        <button
                                            type="button"
                                            aria-label="Copy email"
                                            className="ml-1 p-1 rounded hover:bg-red-100 transition"
                                            onClick={handleCopyEmail}
                                            tabIndex={0}
                                        >
                                            {copied ? (
                                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <CopyIcon className="w-4 h-4 text-red-400" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-red-100" />

                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                                className="cursor-pointer gap-2 px-4 py-2 rounded-md hover:bg-red-100/80 transition-colors"
                                aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                            >
                                {theme === "light" ? (
                                    <Moon className="mr-2 text-red-500" />
                                ) : (
                                    <Sun className="mr-2 text-red-500" />
                                )}
                                <span className="text-red-700">
                                    {theme === "light" ? "Dark mode" : "Light mode"}
                                </span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-red-100" />
                        <DropdownMenuItem
                            onClick={async () => {
                                await logout();
                                router.replace("/staff");
                            }}
                            className="cursor-pointer gap-2 px-4 py-2 rounded-md text-red-700 font-semibold hover:bg-red-100/80 transition-colors"
                            aria-label="Log out"
                        >
                            <LogOut className="text-red-500" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}