"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    Lock,
    ShieldCheck,
    Stethoscope,
} from "lucide-react";
import Image from "next/image";
import NetworkStatusBanner from "@/components/layout/NetworkStatusBanner";
import supabase from "@/utils/supabase/client";

const MIN_PASSWORD_LENGTH = 6;

type Phase = "loading" | "form" | "invalid" | "success";

/**
 * Forgot password — step 2.
 *
 * This app's Supabase browser client uses the PKCE auth flow, so the recovery
 * email links to:  /reset-password?code=<one-time-code>&type=recovery
 *
 * Flow:
 *   1. `exchangeCodeForSession(code)` trades the one-time code (plus the PKCE
 *      verifier stored locally when the reset was requested) for a session.
 *   2. `updateUser({ password })` sets the new password on that session.
 *   3. We sign the session out and land on /login?reset=success so the staff
 *      member confirms the new password with a normal sign-in.
 *
 * Links without a usable code (expired, reused, or non-recovery emails) show
 * the invalid state instead of the form.
 */
export default function ResetPasswordPage() {
    const router = useRouter();
    const [phase, setPhase] = useState<Phase>("loading");
    const [invalidReason, setInvalidReason] = useState(
        "This password reset link is invalid or has already been used. Please request a new one."
    );
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const currentYear = new Date().getFullYear();
    const didInit = useRef(false);

    // ── Validate the recovery link & establish the session (once) ────────────
    useEffect(() => {
        if (didInit.current || typeof window === "undefined") return;
        didInit.current = true;

        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const type = params.get("type");

        // A link that isn't a recovery link (e.g. a sign-up confirmation)
        // should not open the password form.
        if (type && type !== "recovery") {
            setInvalidReason("This link was not a password reset link. Please request a new one.");
            setPhase("invalid");
            return;
        }

        if (code) {
            // PKCE: exchange the one-time code for a usable session. Fails for
            // expired / reused codes, or when the link was opened on a
            // different device than the one that requested the reset (the PKCE
            // verifier only exists in that browser).
            supabase.auth
                .exchangeCodeForSession(code)
                .then(({ error: exchangeError }) => {
                    if (exchangeError) {
                        setInvalidReason(
                            "This password reset link is invalid or has expired. Please request a new one."
                        );
                        setPhase("invalid");
                        return;
                    }
                    setPhase("form");
                })
                .catch(() => {
                    setInvalidReason(
                        "This password reset link is invalid or has expired. Please request a new one."
                    );
                    setPhase("invalid");
                });
            return;
        }

        // No code in the URL — the link is only usable if a session already
        // exists (e.g. the staff member is signed in on this device).
        supabase.auth
            .getSession()
            .then(({ data }) => {
                if (data.session) {
                    setPhase("form");
                } else {
                    setPhase("invalid");
                }
            })
            .catch(() => setPhase("invalid"));
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password.length < MIN_PASSWORD_LENGTH) {
            setError(`Your password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
            return;
        }
        if (password !== confirm) {
            setError("Passwords do not match. Please re-enter both fields.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });

            if (updateError) {
                setError(updateError.message || "Could not update your password. Please try again.");
                setLoading(false);
                return;
            }

            setPhase("success");

            // Drop the temporary session so the staff member proves the new
            // password with a regular sign-in, then show the success banner on
            // the login page.
            setTimeout(async () => {
                try {
                    await supabase.auth.signOut();
                } catch {
                    // Non-fatal — the redirect below lands on /login either way.
                }
                router.replace("/login?reset=success");
            }, 1600);
        } catch (err) {
            console.error("[reset-password]", err);
            setError("Something went wrong while updating your password. Please try again.");
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
                <div
                    className="absolute inset-0 opacity-[0.035]"
                    style={{ backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)", backgroundSize: "32px 32px" }}
                />
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
                    {/* ── Validating the link ─────────────────────────────── */}
                    {phase === "loading" && (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="relative w-12 h-12">
                                <div className="absolute inset-0 rounded-2xl border-2 border-blue-100 border-t-blue-500 animate-spin" />
                                <div className="absolute inset-2 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <Stethoscope size={16} className="text-blue-500" />
                                </div>
                            </div>
                            <p className="text-sm text-gray-400 font-medium">Validating your reset link…</p>
                        </div>
                    )}

                    {/* ── Invalid / expired link ──────────────────────────── */}
                    {phase === "invalid" && (
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-5">
                                <AlertCircle size={24} className="text-red-500" />
                            </div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Link not recognised</h1>
                            <p className="text-sm text-gray-500 mt-2 leading-relaxed">{invalidReason}</p>
                            <div className="mt-6 flex flex-col gap-2 w-full">
                                <Link
                                    href="/forgot-password"
                                    className="w-full h-11 flex items-center justify-center gap-2 bg-[#0a1628] hover:bg-[#0f1f38] text-white text-sm font-bold rounded-xl transition-all duration-150"
                                >
                                    Request a New Link
                                </Link>
                                <Link
                                    href="/login"
                                    className="w-full h-10 flex items-center justify-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
                                >
                                    <ArrowLeft size={13} /> Back to Sign In
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* ── Success ─────────────────────────────────────────── */}
                    {phase === "success" && (
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-5">
                                <CheckCircle2 size={26} className="text-emerald-500" />
                            </div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">Password updated</h1>
                            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                Your password has been changed successfully. Taking you to sign in…
                            </p>
                            <div className="mt-6 w-full h-11 flex items-center justify-center gap-2 text-xs font-bold text-blue-600">
                                <Loader2 size={14} className="animate-spin" /> Redirecting…
                            </div>
                        </div>
                    )}

                    {/* ── New password form ───────────────────────────────── */}
                    {phase === "form" && (
                        <>
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-5">
                                <KeyRound size={20} className="text-blue-600" />
                            </div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Set a new password</h1>
                            <p className="text-sm text-gray-400 mt-1.5 font-medium leading-relaxed">
                                Choose a strong password you haven&apos;t used before.
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

                            <form onSubmit={handleReset} className="mt-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label htmlFor="rp-password" className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                                        <input
                                            id="rp-password"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={loading}
                                            placeholder="••••••••"
                                            className="w-full h-11 pl-10 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 font-medium placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white hover:border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            tabIndex={-1}
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                            className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-gray-300 hover:text-gray-500 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="rp-confirm" className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <Lock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                                        <input
                                            id="rp-confirm"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            required
                                            value={confirm}
                                            onChange={(e) => setConfirm(e.target.value)}
                                            disabled={loading}
                                            placeholder="••••••••"
                                            className="w-full h-11 pl-10 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 font-medium placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white hover:border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        />
                                    </div>
                                    {confirm.length > 0 && confirm !== password && !loading && (
                                        <p className="text-[11px] text-red-500 font-medium pl-1">Passwords do not match yet.</p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-11 flex items-center justify-center gap-2 bg-[#0a1628] hover:bg-[#0f1f38] text-white text-sm font-bold rounded-xl transition-all duration-150 shadow-lg shadow-slate-900/15 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-700 focus:ring-offset-2"
                                >
                                    {loading ? (
                                        <><Loader2 size={14} className="animate-spin" /> Updating…</>
                                    ) : (
                                        <>Update Password</>
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 flex items-center justify-center">
                                <Link
                                    href="/forgot-password"
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-gray-700 transition-colors"
                                >
                                    <ArrowLeft size={13} /> Need a new link?
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
