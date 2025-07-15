import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import { cn } from "./lib/utils";

export const metadata: Metadata = {
  title: "Nile Valley Mother & Child Hospital",
  description: "Welcome to Nile Valley Mother & Child Hospital",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
  ],
  themeColor: "#991b1b",
};

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

function AppBackground() {
  // Subtle animated background for improved UX
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
      style={{
        background:
          "radial-gradient(ellipse at 60% 20%, rgba(220,38,38,0.10) 0%, transparent 70%), radial-gradient(ellipse at 20% 80%, rgba(220,38,38,0.08) 0%, transparent 70%)",
        animation: "bg-move 20s linear infinite alternate",
      }}
    />
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className={cn(
          "min-h-screen font-sans antialiased bg-white dark:bg-zinc-950 transition-colors duration-300",
          fontSans.variable
        )}
      >
        <AppBackground />
        {children}
        <style>{`
          @keyframes bg-move {
            0% {
              background-position: 60% 20%, 20% 80%;
            }
            100% {
              background-position: 65% 25%, 25% 85%;
            }
          }
        `}</style>
      </body>
    </html>
  );
}
