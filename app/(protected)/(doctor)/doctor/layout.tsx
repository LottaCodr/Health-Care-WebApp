import {
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AppSidebar } from "@/components/doctor/sidebar-navigation/app-bar";

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
                    <header className="flex h-20 shrink-0 items-center gap-4 px-6 bg-white/80 border-b border-red-100 shadow-sm sticky top-0 z-30 backdrop-blur-md">
                        <div className="flex items-center gap-3 w-full">
                            <SidebarTrigger className="rounded-full p-2 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-400 transition" />
                            <Separator orientation="vertical" className="mr-3 h-6 bg-red-200" />
                            <Breadcrumbs
                            // className="text-red-700 font-semibold text-base"
                            // separatorClassName="text-red-400"
                            // activeClassName="text-red-900"
                            />
                        </div>
                    </header>
                    <main className="flex flex-1 flex-col gap-6 p-4 sm:p-8 bg-transparent items-center">
                        <div className="w-full max-w-6xl rounded-2xl bg-white/90 shadow-lg border border-red-100 p-4 sm:p-8 min-h-[calc(100vh-6rem)]">
                            {children}
                        </div>
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    );
}