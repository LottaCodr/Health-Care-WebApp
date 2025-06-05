import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import { cn } from "./lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import ProtectedRedirect from "./(auth)/protected";
import { Providers } from "@/context/provider";

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
    <html lang="en">
      <body
        className={cn("min-h-screen font-sans antialiased", fontSans.variable)}
      >
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="light">
            <ProtectedRedirect>
              {children}
            </ ProtectedRedirect>
            <Toaster />
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
