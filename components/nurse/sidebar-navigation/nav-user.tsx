"use client"

import { ChevronsUpDown, LogOut, Moon, Sun, } from "lucide-react"

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
import { useAuth } from "@/context/auth-provider"
import { logout } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"

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
                                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                            >
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarFallback className="rounded-lg">
                                        {user?.full_name
                                            ? user.full_name
                                                .split(' ')
                                                .map((n: any) => n[0])
                                                .join('')
                                                .toUpperCase()
                                            : 'CN'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">{user?.full_name}</span>
                                    <span className="truncate text-xs">{user?.email}</span>
                                </div>
                                <ChevronsUpDown className="ml-auto size-4" />
                            </SidebarMenuButton>
                        </div>

                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarImage src={undefined} alt={user?.name} />
                                    <AvatarFallback className="rounded-lg">
                                        {user?.full_name
                                            ? user.full_name
                                                .split(' ')
                                                .map((n: any) => n[0])
                                                .join('')
                                                .toUpperCase()
                                            : 'NILE'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold capitalize">{user?.name}</span>
                                    <span className="truncate text-xs capitalize">{user?.email}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
                                {theme === "light" ? <Moon className="mr-2" /> : <Sun className="mr-2" />}
                                {theme === "light" ? "Dark mode" : "Light mode"}
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={async () => {
                                await logout();
                                router.replace("/staff");
                            }}

                            className="cursor-pointer gap-2"
                        >
                            <LogOut />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu >
    )
}