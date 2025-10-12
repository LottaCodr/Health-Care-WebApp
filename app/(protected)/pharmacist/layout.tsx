import {
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PharmacyAppSidebar } from "@/components/pharmacy/sidebar-navigation/app-bar";
import { FaCapsules } from "react-icons/fa";

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
            <PharmacyAppSidebar />
            <SidebarInset>
                <header className="flex h-20 shrink-0 items-center gap-4 bg-red-50 border-b border-red-200 shadow-sm">
                    <div className="flex items-center gap-4 px-6 w-full">
                        <SidebarTrigger className="-ml-1 text-red-600 hover:bg-red-100 focus:ring-2 focus:ring-red-400 rounded transition" />
                        <Separator orientation="vertical" className="mr-2 h-6 bg-red-200" />
                        <div className="flex items-center gap-3">
                            <span className="bg-red-100 rounded-xl p-2 flex items-center justify-center">
                                <FaCapsules className="w-7 h-7 text-red-600" aria-hidden="true" />
                            </span>
                            <span className="text-2xl font-bold text-red-700 tracking-tight drop-shadow">
                                Pharmacy Dashboard
                            </span>
                        </div>
                        <div className="flex-1" />
                        <Breadcrumbs />
                    </div>
                </header>
                <main className="flex flex-1 flex-col gap-6 pt-0 bg-white rounded-b-3xl shadow-lg border-x border-b border-red-100 animate-fade-in">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}