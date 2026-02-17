import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { FrontDeskAppSidebar } from "@/components/front-desk/sidebar-navigation/app-bar";
import { FrontDeskNavUser } from "@/components/front-desk/sidebar-navigation/nav-user";

export default function DashboardLayout({ children }: { children?: React.ReactNode }) {
    return (
        <SidebarProvider>
            <FrontDeskAppSidebar />
            <SidebarInset>
                <header
                    className="flex h-16 justify-between items-center bg-white dark:bg-gray-900 border-b px-4 md:px-8"
                    role="banner"
                    aria-label="Doctor Navigation Bar"
                >
                    <nav
                        aria-label="Primary"
                        className="flex items-center gap-2"
                    >
                        <SidebarTrigger
                            aria-label="Open sidebar menu"
                            className="hover:bg-red-100 dark:hover:bg-gray-800 rounded transition focus:outline-none focus:ring-2 focus:ring-primary/70"
                        />
                    </nav>
                    <div className="flex justify-between items-center">
                        <FrontDeskNavUser />
                    </div>
                </header>
                <main className="w-full h-full pt-0 bg-gray-100 dark:bg-gray-900">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}
