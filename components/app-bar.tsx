"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
    Building,
    Command,
    CreditCard,
    Frame,
    Layers,
    LayoutDashboard,
    Leaf,
    LifeBuoy,
    Map,
    PieChart,
    PieChartIcon,
    Send,
    Signal,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavSecondary } from "./nav-secondary";

const data = {
    user: {
        name: "Codehagen",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
        {
            title: "Dashboard",
            url: "/dashboard",
            icon: LayoutDashboard,
        },
        {
            title: "Patients",
            url: "/patients",
            icon: Layers,
        },
        {
            title: "Appointments",
            url: "/appointments",
            icon: PieChartIcon,
        },
        {
            title: "Transactions",
            url: "/transactions",
            icon: Signal,
        },
        {
            title: "Employees",
            url: "/employees",
            icon: Building,
        },
        {
            title: "Health Records",
            url: "/health-records",
            icon: Leaf,
        },
        {
            title: "Analysis",
            url: "/analysis",
            icon: CreditCard,
        },

    ],
    navSecondary: [
        {
            title: "Support",
            url: "/support",
            icon: LifeBuoy,
        },

        {
            title: "Settings",
            url: "/settings",
            icon: Send,
        },
        {
            title: "Logout",
            url: "/logout",
            icon: Send,
        },
    ],

};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();

    // Add isActive property based on current pathname
    const navMainWithActive = data.navMain.map((item) => ({
        ...item,
        isActive: pathname.startsWith(item.url),
    }));


    return (
        <Sidebar variant="inset" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="#">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <Command className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">Nile Mother & Child</span>
                                    <span className="truncate text-xs">Hospital</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navMainWithActive} />
                <NavSecondary items={data.navSecondary} className="mt-auto" />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    );
}