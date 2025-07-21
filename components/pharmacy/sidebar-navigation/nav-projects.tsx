"use client";

import {
    Folder,
    MoreHorizontal,
    Share,
    Trash2,
    type LucideIcon,
} from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";

export function PharmacyNavProjects({
    projects,
}: {
    projects: {
        name: string;
        url: string;
        icon: LucideIcon;
        isActive?: boolean;
    }[];
}) {
    const { isMobile } = useSidebar();

    return (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden bg-white dark:bg-gray-900 rounded-xl shadow-md">
            <SidebarGroupLabel className="text-gray-700 dark:text-gray-200">Accounts</SidebarGroupLabel>
            <SidebarMenu>
                {projects.map((item) => (
                    <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={item.isActive}>
                            <a href={item.url} className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-gray-800 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-gray-800">
                                <item.icon />
                                <span>{item.name}</span>
                            </a>
                        </SidebarMenuButton>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuAction showOnHover>
                                    <MoreHorizontal />
                                    <span className="sr-only">More</span>
                                </SidebarMenuAction>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-48 bg-white dark:bg-gray-900 border border-red-100 dark:border-gray-700 rounded-xl shadow-lg"
                                side={isMobile ? "bottom" : "right"}
                                align={isMobile ? "end" : "start"}
                            >
                                <DropdownMenuItem className="flex items-center gap-2 hover:bg-red-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200">
                                    <Folder className="text-muted-foreground" />
                                    <span>View Project</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="flex items-center gap-2 hover:bg-red-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200">
                                    <Share className="text-muted-foreground" />
                                    <span>Share Project</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-red-100 dark:bg-gray-700" />
                                <DropdownMenuItem className="flex items-center gap-2 hover:bg-red-50 dark:hover:bg-gray-800 text-red-700 dark:text-red-300">
                                    <Trash2 className="text-muted-foreground" />
                                    <span>Delete Project</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                    <SidebarMenuButton className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-gray-800 dark:text-gray-200 hover:bg-red-50 dark:hover:bg-gray-800">
                        <MoreHorizontal />
                        <span>More</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarGroup>
    );
}