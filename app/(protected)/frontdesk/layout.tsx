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

        user.user?.role === 'frontdesk' ? (
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
        ) : (
            <div className="flex flex-col items-center justify-center h-screen min-h-[40vh] mb-4 p-6 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm text-yellow-800 font-medium space-y-4">
                <svg
                    className="w-10 h-10 text-yellow-400 mb-2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
                </svg>
                <div className="text-lg md:text-xl font-semibold text-center">
                    You must be logged in to access all features.
                </div>
                <a
                    href="/staff"
                    className="inline-block px-5 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded transition focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                    Go to Staff Login
                </a>
            </div>

        )


    );
}

// 