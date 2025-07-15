"use client"

import { ChevronsUpDown, LogOut, Moon, Sun } from "lucide-react"

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
import { useAuth } from "@/context/auth-provider"
import { logout } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

function getInitials(name?: string) {
    if (!name) return "NU";
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
}

export function NurseNavUser() {
    const { setTheme, theme } = useTheme()
    const { user } = useAuth();
    const router = useRouter()

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="cursor-pointer w-full">
                            <SidebarMenuButton
                                size="lg"
                                className="data-[state=open]:bg-red-100 data-[state=open]:text-red-700 transition-colors rounded-xl border border-red-200 hover:bg-red-50/80"
                            >
                                <Avatar className="h-9 w-9 rounded-lg border border-red-200 shadow-sm bg-red-50">
                                    <AvatarImage src={undefined} alt={user?.full_name} />
                                    <AvatarFallback className="rounded-lg bg-red-200 text-red-700 font-bold">
                                        {getInitials(user?.full_name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                                    <span className="truncate font-semibold text-red-800">{user?.full_name || "Nurse User"}</span>
                                    <span className="truncate text-xs text-red-500">{user?.email || "nurse@email.com"}</span>
                                </div>
                                <ChevronsUpDown className="ml-auto size-4 text-red-400" />
                            </SidebarMenuButton>
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 rounded-xl border border-red-100 shadow-lg bg-white p-0">
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-3 px-3 py-3 text-left text-sm bg-red-50/60 rounded-t-xl">
                                <Avatar className="h-10 w-10 rounded-lg border border-red-200 bg-red-100">
                                    <AvatarImage src={undefined} alt={user?.full_name} />
                                    <AvatarFallback className="rounded-lg bg-red-200 text-red-700 font-bold">
                                        {getInitials(user?.full_name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold capitalize text-red-800">{user?.full_name || "Nurse User"}</span>
                                    <span className="truncate text-xs text-red-500">{user?.email || "nurse@email.com"}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-red-100" />

                        <DropdownMenuGroup>
                            <DropdownMenuItem
                                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                                className="cursor-pointer gap-2 px-4 py-2 rounded-md hover:bg-red-100/80 transition-colors"
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
                        >
                            <LogOut className="text-red-500" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}