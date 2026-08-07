import type { Metadata } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
// import { NotificationContainer } from "@/components/notification-container";
import { Providers } from "@/context/provider";
import { cn } from "@/utils/utils";

export const metadata: Metadata = {
  title: "Nile Valley Mother & Child Hospital",
  description: "Welcome to Nile Valley Mother & Child Hospital",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn("min-h-screen font-sans antialiased")}
        suppressHydrationWarning
      >
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="light">
            {children}
            {/* <NotificationContainer /> */}
            <Toaster />
            <SonnerToaster position="top-right" richColors closeButton />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
