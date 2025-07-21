"use client"

import {
    ChevronsUpDown,
    LogOut,
    Moon,
    Sun,
    User as UserIcon,
    Mail,
    BadgeCheck,
    Copy as CopyIcon,
    CheckCircle2,
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
import { useState } from "react"

export function FrontDeskNavUser({
    user,
}: {
    user: {
        name: string
        email: string
        avatar: string
    }
}) {
    const { isMobile } = useSidebar()
    const { setTheme, theme } = useTheme()
    const [copied, setCopied] = useState(false)

    // Get initials for fallback
    const getInitials = (name: string) => {
        if (!name) return "U"
        const parts = name.split(" ")
        if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "U"
        return (parts[0][0] + parts[1][0]).toUpperCase()
    }

    // Copy email to clipboard
    const handleCopyEmail = async () => {
        try {
            await navigator.clipboard.writeText(user.email)
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
        } catch {
            // fallback: do nothing
        }
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-red-100 data-[state=open]:text-red-700 transition-all hover:bg-red-50 rounded-xl border border-red-200 shadow-sm"
                            aria-label="Open user menu"
                        >
                            <Avatar className="h-9 w-9 rounded-lg border border-red-200 bg-red-50 shadow">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback className="rounded-lg bg-red-200 text-red-700 font-bold">
                                    {getInitials(user.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 ml-3 text-left">
                                <span className="block truncate font-semibold text-base text-red-900">{user.name}</span>
                                <span className="block truncate text-xs text-red-500">{user.email}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4 text-red-400" aria-hidden="true" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-xl shadow-2xl border border-red-100 bg-white p-0"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={6}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-3 px-4 py-4 bg-red-50/70 rounded-t-xl">
                                <Avatar className="h-11 w-11 rounded-lg border border-red-200 bg-red-100 shadow">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback className="rounded-lg bg-red-200 text-red-700 font-bold">
                                        {getInitials(user.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1">
                                        <span className="truncate font-semibold text-base text-red-900">{user.name}</span>
                                        <BadgeCheck className="w-4 h-4 text-green-500" aria-label="Verified" />
                                    </div>
                                    <span className="truncate text-xs text-red-500 flex items-center gap-1 mt-1">
                                        <Mail className="w-3 h-3 mr-1 text-red-400" aria-hidden="true" />
                                        {user.email}
                                        <button
                                            onClick={handleCopyEmail}
                                            className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
                                                copied
                                                    ? "bg-green-50 text-green-700"
                                                    : "text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                            }`}
                                            aria-label="Copy email"
                                            tabIndex={0}
                                            type="button"
                                        >
                                            {copied ? (
                                                <>
                                                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <CopyIcon className="w-3 h-3" />
                                                    Copy
                                                </>
                                            )}
                                        </button>
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-red-100" />
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                                className="flex items-center gap-2 px-4 py-2 rounded-md hover:bg-red-100 transition-colors"
                                aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                            >
                                {theme === "light" ? (
                                    <>
                                        <Moon className="w-4 h-4 text-gray-700" aria-hidden="true" />
                                        <span>Dark mode</span>
                                    </>
                                ) : (
                                    <>
                                        <Sun className="w-4 h-4 text-yellow-500" aria-hidden="true" />
                                        <span>Light mode</span>
                                    </>
                                )}
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-red-100" />
                        <DropdownMenuItem
                            className="flex items-center gap-2 px-4 py-2 rounded-md text-red-600 hover:bg-red-100 font-semibold transition-colors"
                            asChild
                        >
                            <a href="/front-desk/logout" aria-label="Log out">
                                <LogOut className="w-4 h-4" aria-hidden="true" />
                                Log out
                            </a>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}