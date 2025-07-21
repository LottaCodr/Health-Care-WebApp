import {
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AppSidebar } from "@/components/doctor/sidebar-navigation/app-bar";
import { BellIcon } from "lucide-react";

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
            <div className="flex min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
                <AppSidebar />
                <SidebarInset>
                    <header className="flex h-20 shrink-0 items-center gap-4 px-6 bg-white/90 dark:bg-gray-900/90 border-b border-red-100 dark:border-gray-800 shadow-md sticky top-0 z-30 backdrop-blur-lg transition-all">
                        <div className="flex items-center gap-3 w-full">
                            <SidebarTrigger className="rounded-full p-2 hover:bg-red-100 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-red-400 dark:focus-visible:ring-red-600 transition" />
                            <Separator orientation="vertical" className="mr-3 h-6 bg-red-200 dark:bg-gray-700" />
                            <Breadcrumbs />
                        </div>
                        {/* Notification Bell */}
                        <button
                            className="relative ml-auto rounded-full p-2 hover:bg-red-100 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-red-400 dark:focus-visible:ring-red-600 transition"
                            aria-label="Notifications"
                        >
                            <BellIcon className="h-6 w-6 text-red-500" />
                            <span className="absolute top-2 right-2 inline-flex h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white animate-pulse"></span>
                        </button>
                    </header>
                    <main className="flex flex-1 flex-col gap-8 p-4 sm:p-10 bg-transparent items-center transition-all">
                        <div className="w-full max-w-7xl rounded-3xl bg-white/95 dark:bg-gray-900 shadow-2xl border-2 border-red-100 dark:border-gray-700 p-4 sm:p-10 min-h-[calc(100vh-6rem)] transition-all hover:shadow-red-200/60 hover:scale-[1.01] duration-200">
                            {children}
                        </div>
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}