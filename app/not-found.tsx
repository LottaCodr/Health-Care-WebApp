"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, HeartPulse, LayoutDashboard } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/context/auth-provider";
import { getDashboardRoute } from "@/lib/role-dashboard";

/**
 * Custom 404 — "vitals not found".
 *
 * Rendered by Next.js App Router for any unmatched route (see `not-found.tsx`
 * convention). Logged-in staff land back on their own role dashboard;
 * everyone else goes to sign in.
 */
export default function NotFoundPage() {
    const router = useRouter();
    const { user } = useAuth();
    const homeHref = user ? getDashboardRoute(user.role) : "/login";

    // A calm heartbeat that keeps beating — the page is gone, the hospital isn't.
    const heartbeat = (
        <svg
            viewBox="0 0 400 80"
            fill="none"
            className="w-full h-16 text-blue-400"
            preserveAspectRatio="none"
            aria-hidden
        >
            <motion.path
                d="M0 40 H90 L105 40 L115 18 L130 62 L142 40 H210 L225 40 L235 24 L250 56 L262 40 H400"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ strokeDasharray: 620, strokeDashoffset: 620 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 1.8, delay: 0.5, ease: "linear" }}
            />
        </svg>
    );

    return (
        <div className="min-h-screen flex flex-col bg-[#0a1628]">
            {/* Background texture */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/8 blur-3xl" />
                <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full border border-white/[0.04]" />
                <div className="absolute bottom-[-60px] left-[-60px] w-[380px] h-[380px] rounded-full border border-white/[0.04]" />
                <div className="absolute inset-0 opacity-[0.035]"
                    style={{ backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
            </div>

            <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-16">
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 mb-10"
                >
                    <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-white/10 shrink-0">
                        <Image src="/assets/icons/nilelogo.jpeg" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
                    </div>
                    <div>
                        <p className="text-white text-xs font-bold tracking-wide">Nile Valley</p>
                        <p className="text-white/30 text-[9px] uppercase tracking-[0.18em]">Mother &amp; Child Hospital</p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-[460px] flex flex-col items-center text-center"
                >
                    {/* Flatlined-then-beeping pulse */}
                    <div className="w-full max-w-[340px] mb-6 overflow-hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                        >
                            {heartbeat}
                        </motion.div>
                    </div>

                    <div className="relative mb-4">
                        <p className="text-[92px] leading-none font-black text-white tracking-tighter select-none">
                            404
                        </p>
                        <span className="absolute -right-5 top-2 w-9 h-9 rounded-full bg-blue-500/15 border border-blue-400/25 flex items-center justify-center">
                            <HeartPulse size={16} className="text-blue-400" />
                        </span>
                    </div>

                    <h1 className="text-2xl font-black text-white tracking-tight">Vitals not found</h1>
                    <p className="mt-3 text-sm text-white/40 leading-relaxed max-w-[340px]">
                        The page you&apos;re looking for has flatlined — it was never registered,
                        has been discharged, or moved to a different ward.
                    </p>

                    <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                        <Link
                            href={homeHref}
                            className="w-full sm:w-auto h-11 px-6 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-all duration-150 shadow-lg shadow-blue-900/40"
                        >
                            <LayoutDashboard size={15} />
                            {user ? "Back to my dashboard" : "Back to sign in"}
                        </Link>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="w-full sm:w-auto h-11 px-6 flex items-center justify-center gap-2 text-sm font-bold text-white/60 hover:text-white border border-white/15 hover:border-white/30 rounded-xl transition-all duration-150"
                        >
                            <ArrowLeft size={15} />
                            Go back
                        </button>
                    </div>
                </motion.div>

                <p className="mt-12 text-white/15 text-[9px] font-medium">
                    © {new Date().getFullYear()} Nile Valley Mother &amp; Child Hospital
                </p>
            </div>
        </div>
    );
}
