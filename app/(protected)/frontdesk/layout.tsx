"use client"


import {
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from "@/components/ui/sidebar";
import { FrontDeskAppSidebar } from "@/components/front-desk/sidebar-navigation/app-bar";


import { FrontDeskNavUser } from "@/components/front-desk/sidebar-navigation/nav-user";
import { useAuth } from "@/context/auth-provider";
import { Loader2 } from "lucide-react";


interface DashboardLayoutProps {
    children?: React.ReactNode;
    params: { id: string };
}

export default function DashboardLayout({
    children,
    params,
}: DashboardLayoutProps) {


    const user = useAuth()



    return (

        user.user?.role === 'frontdesk' ? (
            <SidebarProvider>
                <FrontDeskAppSidebar />
                <SidebarInset>
                    <header className="flex h-16 justify-between w-full shrink-0 items-center gap-2 bg-white dark:bg-gray-900 border-b border-grey-100 dark:border-gray-800 sticky top-0 z-30">
                        <div className="flex items-center px-4 justify-between w-full h-fit">
                            <div className="flex items-center gap-4">
                                <SidebarTrigger className="-ml-1 hover:bg-red-100 dark:hover:bg-gray-800 focus:ring-2 focus:ring-red-400 dark:focus:ring-red-600 rounded transition" />
                            </div>
                            <div className="flex items-center w-fit gap-4">
                                <FrontDeskNavUser />
                            </div>
                        </div>
                    </header>
                    <main className="flex flex-1 flex-col gap-4 pt-0 bg-gray-100 dark:bg-gray-900">{children}</main>
                </SidebarInset>
            </SidebarProvider>
        ) : (
                <main className="min-h-screen flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <h1 className="text-2xl font-bold text-center text-gray-800">Welcome to the FrontDesk Dashboard</h1>
                        <p className="text-base text-muted-foreground text-center">
                            Loading your dashboard. Please wait...
                        </p>
                    </div>
                </main>

        )


    );
}

// 