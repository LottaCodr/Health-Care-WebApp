import {
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { LabTechAppSidebar } from "@/components/lab-tech/sidebar-navigation/app-bar";

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
            <LabTechAppSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 bg-white/80 backdrop-blur-md border-b border-red-100 sticky top-0 z-30 shadow-sm transition-all">
                    <div className="flex items-center gap-2 px-4 w-full">
                        <SidebarTrigger className="-ml-1 focus:ring-2 focus:ring-red-400 rounded transition" aria-label="Open sidebar" />
                        <Separator orientation="vertical" className="mr-2 h-4" />
                        <Breadcrumbs />
                        {/* Add space for future quick actions or user info */}
                        <div className="ml-auto flex items-center gap-2">
                            {/* Placeholder for quick actions, notifications, or user avatar */}
                        </div>
                    </div>
                </header>
                <main className="flex flex-1 flex-col gap-4 pt-2 md:pt-4 px-2 md:px-6 bg-gradient-to-br from-red-50 via-white to-white min-h-[calc(100vh-4rem)] transition-all">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}