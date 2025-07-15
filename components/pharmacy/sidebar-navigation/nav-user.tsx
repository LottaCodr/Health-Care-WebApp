"use client"

import {
    BadgeCheck,
    Bell,
    ChevronsUpDown,
    CreditCard,
    LogOut,
    Sparkles,
    Moon,
    Sun,
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

export function PharmacyNavUser({
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

    // Helper for user initials
    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-red-100 data-[state=open]:text-red-700 hover:bg-red-50 transition-colors duration-150 px-3 py-2 rounded-xl flex items-center gap-3"
                            aria-label="Open user menu"
                        >
                            <Avatar className="h-9 w-9 rounded-lg border-2 border-red-500 shadow-sm">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback className="rounded-lg bg-red-500 text-white font-bold">
                                    {getInitials(user.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 text-left">
                                <span className="block truncate font-semibold text-base text-red-700">{user.name}</span>
                                <span className="block truncate text-xs text-gray-500">{user.email}</span>
                            </div>
                            <ChevronsUpDown className="ml-2 size-4 text-red-400" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-60 rounded-xl shadow-lg border border-red-100 bg-white"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={6}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-3 px-3 py-3 bg-red-50 rounded-t-xl">
                                <Avatar className="h-10 w-10 rounded-lg border-2 border-red-500 shadow">
                                    <AvatarImage src={user.avatar} alt={user.name} />
                                    <AvatarFallback className="rounded-lg bg-red-500 text-white font-bold">
                                        {getInitials(user.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <span className="block truncate font-semibold text-base text-red-700">{user.name}</span>
                                    <span className="block truncate text-xs text-gray-500">{user.email}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-red-100" />
                        <DropdownMenuGroup>
                            <DropdownMenuItem className="gap-2 font-medium text-red-600 hover:bg-red-100 transition-colors rounded-md px-3 py-2 cursor-pointer">
                                <Sparkles className="text-red-500" />
                                <span>Upgrade to <span className="font-bold text-red-700">Pro</span></span>
                                <span className="ml-auto bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-semibold">New</span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-red-100" />
                        <DropdownMenuGroup>
                            <DropdownMenuItem className="gap-2 hover:bg-red-50 transition-colors rounded-md px-3 py-2 cursor-pointer">
                                <BadgeCheck className="text-red-500" />
                                <span>Account</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 hover:bg-red-50 transition-colors rounded-md px-3 py-2 cursor-pointer">
                                <CreditCard className="text-red-500" />
                                <span>Billing</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 hover:bg-red-50 transition-colors rounded-md px-3 py-2 cursor-pointer">
                                <Bell className="text-red-500" />
                                <span>Notifications</span>
                                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-semibold">3</span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-red-100" />
                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                                className="gap-2 hover:bg-red-50 transition-colors rounded-md px-3 py-2 cursor-pointer"
                            >
                                {theme === "light" ? (
                                    <Moon className="text-red-500 mr-2" />
                                ) : (
                                    <Sun className="text-red-500 mr-2" />
                                )}
                                <span>
                                    {theme === "light" ? "Dark mode" : "Light mode"}
                                </span>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-red-100" />
                        <DropdownMenuItem
                            className="gap-2 text-red-700 font-semibold hover:bg-red-100 transition-colors rounded-md px-3 py-2 cursor-pointer"
                        >
                            <LogOut className="text-red-500" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}