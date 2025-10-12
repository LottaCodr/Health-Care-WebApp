

import {
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from "@/components/ui/sidebar";
import { FrontDeskAppSidebar } from "@/components/front-desk/sidebar-navigation/app-bar";


import { FrontDeskNavUser } from "@/components/front-desk/sidebar-navigation/nav-user";


interface DashboardLayoutProps {
    children?: React.ReactNode;
    params: { id: string };
}

export default function DashboardLayout({
    children,
    params,
}: DashboardLayoutProps) {



    return (


        <SidebarProvider>
            <FrontDeskAppSidebar />
            <SidebarInset>
                <header className="flex h-16 justify-between w-full items-center gap-2 bg-white dark:bg-gray-900 border-b border-grey-100 dark:border-gray-800">
                    <SidebarTrigger className=" hover:bg-red-100 dark:hover:bg-gray-800 focus:ring-2 focus:ring-red-400 dark:focus:ring-red-600 rounded transition" />
                    {/* <TopNavBar/> */}
                    <FrontDeskNavUser/>
                </header>
                <main className=" w-full h-full gap-4 pt-0 bg-gray-100 dark:bg-gray-900">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}

