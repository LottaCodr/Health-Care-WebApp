import {
    SidebarProvider,
    SidebarTrigger,
    SidebarInset,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { NurseAppSidebar } from "@/components/nurse/sidebar-navigation/app-bar";
import { FaUserNurse } from "react-icons/fa";

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
            <NurseAppSidebar />
            <SidebarInset>
                <header className="flex h-20 shrink-0 items-center gap-4 bg-red-50 border-b border-red-200 shadow-sm">
                    <div className="flex items-center gap-4 px-6 w-full">
                        <SidebarTrigger className="-ml-1 text-red-600 hover:bg-red-100 focus:ring-2 focus:ring-red-400 rounded transition" />
                        <Separator orientation="vertical" className="mr-2 h-6 bg-red-200" />
                        <div className="flex items-center gap-2">
                            <FaUserNurse className="text-red-600 text-2xl" />
                            <span className="text-lg font-semibold text-red-700 tracking-tight">
                                Nurse Dashboard
                            </span>
                        </div>
                        <Separator orientation="vertical" className="mx-4 h-6 bg-red-200" />
                        <Breadcrumbs
                            // className="flex-1"
                            // itemClassName="text-red-700 hover:text-red-900"
                            // separatorClassName="text-red-400"
                        />
                        {/* Placeholder for user avatar or quick actions */}
                        <div className="ml-auto flex items-center gap-2">
                            {/* Example: <UserAvatar /> */}
                        </div>
                    </div>
                </header>
                <main className="flex flex-1 flex-col gap-6 pt-4 px-6 bg-white rounded-t-lg shadow-inner min-h-[calc(100vh-5rem)]">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}