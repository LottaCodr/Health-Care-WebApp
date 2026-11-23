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
    MailCheck,
    ShieldCheck,
    Stethoscope,
} from "lucide-react";
import Image from "next/image";
import NetworkStatusBanner from "@/components/layout/NetworkStatusBanner";
import supabase from "@/utils/supabase/client";
import { passwordSchema } from "@/lib/auth-utils";
import type { EmailOtpType } from "@supabase/supabase-js";

type Phase = "loading" | "set-password" | "confirmed" | "success" | "invalid";

const VALID_EMAIL_OTP_TYPES = new Set<string>([
    "signup",
    "invite",
    "magiclink",
    "recovery",
    "email_change",
    "email",
]);

export default function AuthConfirmPage() {
    const router = useRouter();
    const didInit = useRef(false);

    const [phase, setPhase] = useState<Phase>("loading");
    const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null);
    const [staffName, setStaffName] = useState<string | null>(null);
    const [invalidReason, setInvalidReason] = useState(
        "This confirmation link is invalid, expired, or has already been used. Ask an administrator to resend your confirmation email."
    );

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const currentYear = new Date().getFullYear();

    useEffect(() => {
        if (didInit.current || typeof window === "undefined") return;
        didInit.current = true;

        const searchParams = new URLSearchParams(window.location.search);
        const hashRaw = window.location.hash.startsWith("#")
            ? window.location.hash.slice(1)
            : window.location.hash;
        const hashParams = new URLSearchParams(hashRaw);

        const errMsg =
            searchParams.get("error_description") ||
            hashParams.get("error_description") ||
            searchParams.get("error") ||
            hashParams.get("error");

        if (errMsg) {
            setInvalidReason(
                errMsg.replace(/\+/g, " ") ||
                    "This confirmation link is invalid or has expired. Ask an administrator to resend it."
            );
            setPhase("invalid");
            return;
        }

        const tokenHash = searchParams.get("token_hash");
        const queryType = searchParams.get("type");
        const hashType = hashParams.get("type");
        const mode = searchParams.get("mode");
        const code = searchParams.get("code");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        const resolveNextPhase = (
            user: { email?: string | null; user_metadata?: Record<string, any> } | null | undefined,
            detectedType: string | null
        ) => {
            setConfirmedEmail(user?.email ?? null);
            const meta = user?.user_metadata ?? {};
            if (typeof meta.name === "string" && meta.name.trim()) {
                setStaffName(meta.name.trim());
            }

            const needsPasswordSetup =
                detectedType === "invite" ||
                detectedType === "recovery" ||
                mode === "invite" ||
                (meta.onboarding_mode === "invite" && !meta.password_set);

            setPhase(needsPasswordSetup ? "set-password" : "confirmed");
        };

        const verify = async () => {
            try {
                if (tokenHash && queryType && VALID_EMAIL_OTP_TYPES.has(queryType)) {
                    const { data, error: otpErr } = await supabase.auth.verifyOtp({
                        token_hash: tokenHash,
                        type: queryType as EmailOtpType,
                    });
                    if (otpErr || !data?.user) {
                        setInvalidReason(
                            otpErr?.message ||
                                "This confirmation link has expired or already been used. Ask an administrator to resend it."
                        );
                        setPhase("invalid");
                        return;
                    }
                    resolveNextPhase(data.user, queryType);
                    return;
                }

                if (code) {
                    const { data, error: exchangeErr } =
                        await supabase.auth.exchangeCodeForSession(code);
                    if (exchangeErr || !data?.user) {
                        setInvalidReason(
                            exchangeErr?.message ||
                                "This confirmation link has expired or already been used. Ask an administrator to resend it."
                        );
                        setPhase("invalid");
                        return;
                    }
                    resolveNextPhase(data.user, queryType);
                    return;
                }

                if (accessToken && refreshToken) {
                    const { data, error: sessionErr } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });
                    // Scrub sensitive tokens from the browser URL bar immediately.
                    window.history.replaceState(
                        null,
                        "",
                        window.location.pathname + window.location.search
                    );
                    if (sessionErr || !data?.user) {
                        setInvalidReason(
                            sessionErr?.message ||
                                "This confirmation link has expired or already been used. Ask an administrator to resend it."
                        );
                        setPhase("invalid");
                        return;
                    }
                    resolveNextPhase(data.user, hashType || queryType);
                    return;
                }

                const { data } = await supabase.auth.getSession();
                if (data?.session?.user) {
                    resolveNextPhase(data.session.user, hashType || queryType);
                    return;
                }

                setPhase("invalid");
            } catch {
                setPhase("invalid");
            }
        };

        void verify();
    }, []);

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const check = passwordSchema.safeParse(password);
        if (!check.success) {
            setError(check.error.issues[0]?.message ?? "Please choose a stronger password.");
            return;
        }
        if (password !== confirm) {
            setError("Passwords do not match. Please re-enter both fields.");
            return;
        }

        setSaving(true);
        try {
            const { data: userData } = await supabase.auth.getUser();
            const existingMeta = userData?.user?.user_metadata ?? {};

            const { error: updateErr } = await supabase.auth.updateUser({
                password,
                data: {
                    ...existingMeta,
                    password_set: true,
                },
            });

            if (updateErr) {
                setError(updateErr.message || "Could not save your password. Please try again.");
                setSaving(false);
                return;
            }

            setPhase("success");
            setTimeout(async () => {
                try {
                    await supabase.auth.signOut();
                } catch {
                    // Non-fatal
                }
                router.replace("/login?confirmed=1");
            }, 1500);
        } catch (err) {
            console.error("[auth/confirm] updateUser error:", err);
            setError("Something went wrong while setting your password. Please try again.");
            setSaving(false);
        }
    };

    const handleContinueToLogin = async () => {
        try {
            await supabase.auth.signOut();
        } catch {
            // Non-fatal
        }
        router.replace("/login?confirmed=1");
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
                    style={{
                        backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                    }}
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
                        <Image
                            src="/assets/icons/nilelogo.jpeg"
                            alt="Logo"
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div>
                        <p className="text-white text-xs font-bold tracking-wide">Nile Valley</p>
                        <p className="text-white/30 text-[9px] uppercase tracking-[0.18em]">
                            Mother &amp; Child Hospital
                        </p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-[410px] bg-white rounded-3xl shadow-2xl shadow-black/30 p-8"
                >
                    {/* ── Loading ─────────────────────────────────────────── */}
                    {phase === "loading" && (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="relative w-12 h-12">
                                <div className="absolute inset-0 rounded-2xl border-2 border-blue-100 border-t-blue-500 animate-spin" />
                                <div className="absolute inset-2 rounded-xl bg-blue-50 flex items-center justify-center">
                                    <Stethoscope size={16} className="text-blue-500" />
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 font-medium">
                                Confirming your staff email…
                            </p>
                        </div>
                    )}

                    {/* ── Invalid / Expired ───────────────────────────────── */}
                    {phase === "invalid" && (
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-5">
                                <AlertCircle size={24} className="text-red-500" />
                            </div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">
                                Confirmation link invalid
                            </h1>
                            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                {invalidReason}
                            </p>
                            <div className="mt-6 flex flex-col gap-2 w-full">
                                <Link
                                    href="/login"
                                    className="w-full h-11 flex items-center justify-center gap-2 bg-[#0a1628] hover:bg-[#0f1f38] text-white text-sm font-bold rounded-xl transition-all duration-150"
                                >
                                    Go to Sign In
                                </Link>
                                <Link
                                    href="/forgot-password"
                                    className="w-full h-10 flex items-center justify-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
                                >
                                    <ArrowLeft size={13} /> Request a Password Reset
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* ── Confirmed (Temp Password Flow) ──────────────────── */}
                    {phase === "confirmed" && (
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-5">
                                <MailCheck size={26} className="text-emerald-600" />
                            </div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">
                                Email confirmed
                            </h1>
                            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                {staffName ? `Welcome, ${staffName}. ` : ""}
                                Your work email{" "}
                                {confirmedEmail && (
                                    <span className="font-semibold text-gray-800">
                                        ({confirmedEmail})
                                    </span>
                                )}{" "}
                                is now verified. You can sign in to the EMR with your password.
                            </p>
                            <div className="mt-6 flex flex-col gap-2 w-full">
                                <button
                                    type="button"
                                    onClick={handleContinueToLogin}
                                    className="w-full h-11 flex items-center justify-center gap-2 bg-[#0a1628] hover:bg-[#0f1f38] text-white text-sm font-bold rounded-xl transition-all duration-150"
                                >
                                    Continue to Sign In
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPhase("set-password")}
                                    className="w-full h-10 flex items-center justify-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    <KeyRound size={13} /> Change temporary password first
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Set Password (Invite Flow) ──────────────────────── */}
                    {phase === "set-password" && (
                        <>
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-5">
                                <KeyRound size={20} className="text-blue-600" />
                            </div>
                            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                                Activate your account
                            </h1>
                            <p className="text-sm text-gray-500 mt-1.5 font-medium leading-relaxed">
                                {staffName ? `Welcome, ${staffName}! ` : ""}
                                Your email{" "}
                                {confirmedEmail ? (
                                    <span className="font-semibold text-gray-800">
                                        {confirmedEmail}
                                    </span>
                                ) : (
                                    "is confirmed"
                                )}
                                . Create a password to finish setting up your staff login.
                            </p>

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

                            <form onSubmit={handleSetPassword} className="mt-6 space-y-4">
                                <div className="space-y-1.5">
                                    <label
                                        htmlFor="confirm-pw"
                                        className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400"
                                    >
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <Lock
                                            size={15}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
                                        />
                                        <input
                                            id="confirm-pw"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            required
                                            minLength={8}
                                            maxLength={128}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={saving}
                                            placeholder="Create a strong password"
                                            className="w-full h-11 pl-10 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400/25 focus:border-blue-400 focus:bg-white transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((v) => !v)}
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                    <p className="text-[11px] text-gray-400">
                                        8+ characters with uppercase, lowercase, number, and symbol.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label
                                        htmlFor="confirm-pw-repeat"
                                        className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400"
                                    >
                                        Confirm Password
                                    </label>
                                    <div className="relative">
                                        <Lock
                                            size={15}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
                                        />
                                        <input
                                            id="confirm-pw-repeat"
                                            type={showPassword ? "text" : "password"}
                                            autoComplete="new-password"
                                            required
                                            minLength={8}
                                            maxLength={128}
                                            value={confirm}
                                            onChange={(e) => setConfirm(e.target.value)}
                                            disabled={saving}
                                            placeholder="Re-enter your password"
                                            className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400/25 focus:border-blue-400 focus:bg-white transition-all"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full h-11 flex items-center justify-center gap-2 bg-[#0a1628] hover:bg-[#0f1f38] text-white text-sm font-bold rounded-xl shadow-lg shadow-slate-900/10 transition-all disabled:opacity-60"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 size={15} className="animate-spin" />
                                            Activating Account…
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck size={15} />
                                            Confirm &amp; Activate Login
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    )}

                    {/* ── Success ─────────────────────────────────────────── */}
                    {phase === "success" && (
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-5">
                                <CheckCircle2 size={26} className="text-emerald-500" />
                            </div>
                            <h1 className="text-xl font-black text-gray-900 tracking-tight">
                                Account activated
                            </h1>
                            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                Your email is confirmed and your password is saved. Taking you to sign in…
                            </p>
                            <div className="mt-6 w-full h-11 flex items-center justify-center gap-2 text-xs font-bold text-blue-600">
                                <Loader2 size={14} className="animate-spin" /> Redirecting…
                            </div>
                        </div>
                    )}
                </motion.div>

                <p className="mt-8 text-[11px] text-white/25 font-medium">
                    &copy; {currentYear} Nile Valley Mother &amp; Child Hospital
                </p>
            </div>
        </div>
    );
}
