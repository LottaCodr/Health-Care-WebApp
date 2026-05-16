import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
// import { NotificationContainer } from "@/components/notification-container";
import { Providers } from "@/context/provider";
import { cn } from "@/utils/utils";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
});

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
        className={cn("min-h-screen font-sans antialiased", fontSans.variable)}
        suppressHydrationWarning
      >
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="light">
            {children}
            {/* <NotificationContainer /> */}
            <Toaster />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
