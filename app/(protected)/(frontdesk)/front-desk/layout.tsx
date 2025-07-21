import {
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FrontDeskAppSidebar } from "@/components/front-desk/sidebar-navigation/app-bar";

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
                <header className="flex h-16 shrink-0 items-center gap-2 bg-white dark:bg-gray-900 border-b border-red-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1 hover:bg-red-100 dark:hover:bg-gray-800 focus:ring-2 focus:ring-red-400 dark:focus:ring-red-600 rounded transition" />
                        <Separator orientation="vertical" className="mr-2 h-4 bg-red-200 dark:bg-gray-700" />
                        <Breadcrumbs />
                    </div>
                </header>
                <main className="flex flex-1 flex-col gap-4 pt-0 bg-white dark:bg-gray-900">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}