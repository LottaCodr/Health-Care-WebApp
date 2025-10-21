"use client"


import {
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from "@/components/ui/sidebar";
import { FrontDeskAppSidebar } from "@/components/front-desk/sidebar-navigation/app-bar";


import { FrontDeskNavUser } from "@/components/front-desk/sidebar-navigation/nav-user";
import { useAuth } from "@/context/auth-provider";


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

        user?.isLoading ? (


            <div className="flex flex-col items-center justify-center h-screen min-h-[40vh] mb-4 p-6">
                <svg
                    className="animate-spin w-12 h-12 text-primary mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                >
                    <circle
                        className="opacity-20"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    ></circle>
                    <path
                        className="opacity-70"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    ></path>
                </svg>
                <div className="text-lg md:text-xl font-semibold text-center text-primary">
                    Welcome to Nile Valley Mother & Child Hospital...
                </div>
            </div>
        ) : (
            <SidebarProvider>
                <FrontDeskAppSidebar />
                <SidebarInset>
                    <header className="flex h-16 justify-between w-full shrink-0 items-center gap-2 bg-white dark:bg-gray-900 border-b border-grey-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 px-4 justify-between w-full">
                            <SidebarTrigger className="-ml-1 hover:bg-red-100 dark:hover:bg-gray-800 focus:ring-2 focus:ring-red-400 dark:focus:ring-red-600 rounded transition" />


                            <FrontDeskNavUser />
                        </div>
                    </header>
                    <main className="flex flex-1 flex-col gap-4 pt-0 bg-gray-100 dark:bg-gray-900">{children}</main>
                </SidebarInset>
            </SidebarProvider>

        )


    );
}

// 