import {
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AppSidebar } from "@/components/doctor/sidebar-navigation/app-bar";
import { MdDashboard } from "react-icons/md";

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
            <div className="flex min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100">
                <AppSidebar />
                <SidebarInset>
                    <header className="flex h-20 shrink-0 items-center gap-4 px-6 bg-white/95 border-b border-red-200 shadow-md sticky top-0 z-30 backdrop-blur-lg">
                        <div className="flex items-center gap-4 w-full">
                            <SidebarTrigger className="rounded-full p-2 text-red-600 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-400 transition shadow" />
                            <Separator orientation="vertical" className="mr-3 h-8 bg-red-200" />
                            <span className="inline-flex items-center gap-2 text-2xl font-bold text-red-700 drop-shadow-sm">
                                <MdDashboard className="text-red-600" />
                                <span className="hidden sm:inline">Doctor Dashboard</span>
                            </span>
                            <Separator orientation="vertical" className="mx-4 h-8 bg-red-200" />
                            <Breadcrumbs
                                className="flex-1 text-red-700 font-semibold text-base"
                                itemClassName="hover:text-red-900"
                                separatorClassName="text-red-400"
                                activeClassName="text-red-900"
                            />
                            <div className="ml-auto flex items-center gap-2">
                                {/* Placeholder for user avatar or quick actions */}
                                {/* Example: <UserAvatar /> */}
                            </div>
                        </div>
                    </header>
                    <main className="flex flex-1 flex-col gap-6 p-6 sm:p-8 bg-transparent">
                        <div className="rounded-2xl bg-white/95 shadow-2xl border-2 border-red-100 p-4 sm:p-8 min-h-[calc(100vh-6rem)] transition-all">
                            {children}
                        </div>
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}