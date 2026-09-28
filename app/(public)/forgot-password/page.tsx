"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    KeyRound,
    Loader2,
    Mail,
    ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import NetworkStatusBanner from "@/components/layout/NetworkStatusBanner";
import supabase from "@/utils/supabase/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Forgot password — step 1.
 *
 * Staff enter their work email and we ask Supabase Auth to send a secure
 * reset link to `?type=recovery` on `/reset-password`. The reset link URL is
 * built from the current origin so the email always points back at the same
 * deployment (preview host or production domain).
 */
export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    const currentYear = new Date().getFullYear();

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = email.trim();
        const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

        if (!EMAIL_RE.test(value)) {
            setError("Please enter a valid work email address.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await supabase.auth.resetPasswordForEmail(value, {
                // The recovery email links back to /reset-password on this
                // deployment (current origin — preview host or production).
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (authError) {
                // Supabase reveals whether an email exists ("User not found").
                // We treat that the same as success so the form can't be used
                // to enumerate hospital staff accounts.
                if (authError.message?.toLowerCase().includes("not found")) {
                    setSent(true);
                    return;
                }
                setError(
                    isOffline
                        ? "You appear to be offline. Reconnect and try again."
                        : authError.message || "Could not send the reset email. Please try again."
                );
                setLoading(false);
                return;
            }

            setSent(true);
        } catch (err) {
            // Network failure (Supabase throws AuthRetryableFetchError).
            console.error("[forgot-password]", err);
            setError(
                isOffline
                    ? "You appear to be offline. Reconnect and try again."
                    : "Something went wrong while sending the reset email. Please try again."
            );
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[#0a1628]">
            <NetworkStatusBanner />

            {/* Background texture */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/8 blur-3xl" />
                <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full border border-white/[0.04]" />
                <div className="absolute bottom-[-20px] left-[-20px] w-[260px] h-[260px] rounded-full border border-white/[0.04]" />
                <div className="absolute inset-0 opacity-[0.035]"
                    style={{ backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
            </div>

            <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12">

                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex items-center gap-3 mb-8"
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
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-[400px] bg-white rounded-3xl shadow-2xl shadow-black/30 p-8"
                >
                    {sent ? (
                        /* ── Success state ─────────────────────────────────── */
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-5">
                                <CheckCircle2 size={26} className="text-emerald-500" />
                            </div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Check your inbox</h1>
                            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                If an account exists for{" "}
                                <span className="font-semibold text-gray-800">{email.trim()}</span>, a secure
                                password reset link is on its way.
                            </p>
                            <div className="mt-4 w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-left">
                                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-1">Tip</p>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    The link is single-use and expires quickly — if it doesn&apos;t arrive within a few
                                    minutes, check your spam folder or request a new one.
                                </p>
                            </div>
                            <div className="mt-6 flex flex-col gap-2 w-full">
                                <Link
                                    href="/login"
                                    className="w-full h-11 flex items-center justify-center gap-2 bg-[#0a1628] hover:bg-[#0f1f38] text-white text-sm font-bold rounded-xl transition-all duration-150"
                                >
                                    Back to Sign In
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSent(false);
                                        setEmail("");
                                        setError(null);
                                    }}
                                    className="w-full h-10 flex items-center justify-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
                                >
                                    <ArrowLeft size={13} /> Use a different email
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* ── Form state ────────────────────────────────────── */
                        <>
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-5">
                                <KeyRound size={20} className="text-blue-600" />
                            </div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Forgot your password?</h1>
                            <p className="text-sm text-gray-400 mt-1.5 font-medium leading-relaxed">
                                No worries — enter your work email and we&apos;ll send you a secure link to set a new one.
                            </p>

                            {/* Error */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-5 flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl"
                                >
                                    <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-600 font-medium">{error}</p>
                                </motion.div>
                            )}

                            <form onSubmit={handleSend} className="mt-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="fp-email" className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                                        Work Email
                                    </label>
                                    <div className="relative">
                                        <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                                        <input
                                            id="fp-email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={loading}
                                            placeholder="you@hospital.com"
                                            className="w-full h-11 pl-11 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 font-medium placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white hover:border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-11 flex items-center justify-center gap-2 bg-[#0a1628] hover:bg-[#0f1f38] text-white text-sm font-bold rounded-xl transition-all duration-150 shadow-lg shadow-slate-900/15 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-700 focus:ring-offset-2"
                                >
                                    {loading ? (
                                        <><Loader2 size={14} className="animate-spin" /> Sending link…</>
                                    ) : (
                                        <>Send Reset Link <ArrowLeft size={14} className="rotate-180" /></>
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 flex items-center justify-center">
                                <Link
                                    href="/login"
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors"
                                >
                                    <ArrowLeft size={13} /> Back to Sign In
                                </Link>
                            </div>
                        </>
                    )}
                </motion.div>

                {/* Footer */}
                <div className="mt-8 flex items-center gap-2">
                    <ShieldCheck size={11} className="text-white/25" />
                    <p className="text-[9px] text-white/25 font-medium">
                        © {currentYear} Nile Valley Mother &amp; Child Hospital · Secure Staff Portal
                    </p>
                </div>
            </div>
        </div>
    );
}
