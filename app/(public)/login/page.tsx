"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { getDashboardRoute } from "@/lib/role-dashboard";
import { Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, ArrowRight, Stethoscope } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import NetworkStatusBanner from "@/components/layout/NetworkStatusBanner";


// ─── Features list ────────────────────────────────────────────────────────────

const FEATURES = [
    "Patient Queue & Triage Management",
    "Consultation & Diagnosis Records",
    "Lab Requests & Result Tracking",
    "Prescription & Dispensing",
    "AI-Powered Clinical Decision Support",
];

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm(props: {
    email: string; setEmail: (v: string) => void;
    password: string; setPassword: (v: string) => void;
    showPassword: boolean; setShowPassword: (v: boolean) => void;
    loading: boolean; setLoading: (v: boolean) => void;
    error: string | null; setError: (v: string | null) => void;
    login: any; currentYear: number; authLoading: boolean;
}) {
    const {
        email, setEmail, password, setPassword,
        showPassword, setShowPassword, loading, setLoading,
        error, setError, login, currentYear, authLoading,
    } = props;

    const searchParams = useSearchParams();
    const router = useRouter();

    // create confetti when user logs in
    const fireConfetti = () => {
        // Left burst
        confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors: ["#3b82f6", "#ffffff", "#10b981"] });
        // Right burst
        confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors: ["#6366f1", "#f59e0b", "#ffffff"] });

    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            setError("Please enter your email and password.");
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const result = await login(email.trim(), password);
            if (!result.success) {
                setError(result.message || "Invalid credentials. Please try again.");
                setLoading(false);
                return;
            }

            fireConfetti();
            const next = searchParams.get("next") || getDashboardRoute(result.staff?.role);
            router.replace(next); 
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed. Please try again.");
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0a1628] flex items-center justify-center">
                <div className="flex flex-col items-center gap-5">
                    <div className="relative w-14 h-14">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 rounded-2xl border-2 border-white/8 border-t-blue-400" />
                        <div className="absolute inset-2 rounded-xl bg-white/5 flex items-center justify-center">
                            <Stethoscope size={18} className="text-blue-400" />
                        </div>
                    </div>
                    <p className="text-white/40 text-xs font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">

            {/* ── Left panel ── */}
            <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] bg-[#0a1628] flex-col relative overflow-hidden">

                {/* Background texture */}
                <div className="absolute inset-0 overflow-hidden">
                    {/* Radial glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/8 blur-3xl" />
                    {/* Rings */}
                    <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full border border-white/[0.04]" />
                    <div className="absolute bottom-[-60px] left-[-60px] w-[380px] h-[380px] rounded-full border border-white/[0.04]" />
                    <div className="absolute bottom-[-20px] left-[-20px] w-[260px] h-[260px] rounded-full border border-white/[0.04]" />
                    {/* Top right accent */}
                    <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-500/8 blur-2xl" />
                    {/* Vertical accent line */}
                    <div className="absolute top-1/4 right-0 w-px h-48 bg-gradient-to-b from-transparent via-blue-400/25 to-transparent" />
                    {/* Dot grid */}
                    <div className="absolute inset-0 opacity-[0.035]"
                        style={{ backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                </div>

                {/* Content */}
                <div className="relative flex flex-col h-full px-10 py-10">

                    {/* Logo */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center gap-3"
                    >
                        <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-white/10 shrink-0">
                            <Image src="/assets/icons/nilelogo.jpeg" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <p className="text-white text-xs font-bold tracking-wide">Nile Valley</p>
                            <p className="text-white/30 text-[9px] uppercase tracking-[0.18em]">Mother & Child Hospital</p>
                        </div>
                    </motion.div>

                    {/* Hero */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="flex-1 flex flex-col justify-center"
                    >
                        {/* Pill badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/15 mb-7 w-fit">
                            <ShieldCheck size={11} className="text-blue-400" />
                            <span className="text-blue-300/80 text-[9px] font-black uppercase tracking-[0.18em]">
                                Secure Staff Portal
                            </span>
                        </div>

                        <h2 className="text-[2.6rem] font-black text-white leading-[1.1] tracking-tight mb-5">
                            Electronic<br />
                            <span className="text-blue-400">Medical</span><br />
                            Records
                        </h2>

                        <p className="text-white/35 text-sm leading-relaxed max-w-[280px] mb-10">
                            A unified clinical workspace for every role — from registration to discharge.
                        </p>

                        {/* Feature list */}
                        <div className="space-y-3">
                            {FEATURES.map((item, idx) => (
                                <motion.div
                                    key={item}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.4, delay: 0.3 + idx * 0.07 }}
                                    className="flex items-center gap-3"
                                >
                                    <div className="w-1 h-1 rounded-full bg-blue-400/60 shrink-0" />
                                    <span className="text-white/40 text-xs font-medium">{item}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    <p className="text-white/15 text-[9px] font-medium">
                        © {currentYear} Nile Valley Mother & Child Hospital
                    </p>
                </div>
            </div>

            {/* ── Right panel — form ── */}
            <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12 relative">

                {/* Subtle bg texture on white */}
                <div className="absolute inset-0 opacity-[0.025]"
                    style={{ backgroundImage: 'radial-gradient(circle, #64748b 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="relative w-full max-w-[360px]"
                >

                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
                        <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-gray-200">
                            <Image src="/assets/icons/nilelogo.jpeg" alt="Logo" width={36} height={36} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <p className="text-gray-900 text-sm font-bold">Nile Valley Hospital</p>
                            <p className="text-gray-400 text-[9px] uppercase tracking-[0.15em]">Staff Portal</p>
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Welcome back</h1>
                        <p className="text-sm text-gray-400 mt-1 font-medium">Sign in to your workspace</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-5 flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl"
                        >
                            <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-600 font-medium">{error}</p>
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-4">

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                                Work Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                placeholder="you@hospital.com"
                                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 font-medium placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white hover:border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                                    Password
                                </label>
                                <a href="/forgot-password" className="text-[10px] text-blue-500 hover:text-blue-700 font-bold transition-colors">
                                    Forgot?
                                </a>
                            </div>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                    placeholder="••••••••"
                                    className="w-full h-11 px-4 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 font-medium placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white hover:border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-gray-300 hover:text-gray-500 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 mt-1 flex items-center justify-center gap-2 bg-[#0a1628] hover:bg-[#0f1f38] text-white text-sm font-bold rounded-xl transition-all duration-150 shadow-lg shadow-slate-900/15 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-700 focus:ring-offset-2"
                        >
                            {loading ? (
                                <><Loader2 size={14} className="animate-spin" /> Signing in...</>
                            ) : (
                                <>Sign In <ArrowRight size={14} /></>
                            )}
                        </button>
                    </form>

                    {/* Security note */}
                    <div className="mt-8 flex items-center justify-center gap-2">
                        <div className="h-px flex-1 bg-gray-100" />
                        <div className="flex items-center gap-1.5">
                            <ShieldCheck size={11} className="text-gray-300" />
                            <p className="text-[9px] text-gray-300 font-medium whitespace-nowrap">End-to-end encrypted</p>
                        </div>
                        <div className="h-px flex-1 bg-gray-100" />
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

// ─── Main export ──────────────────────────────────────────────────────────────

const LoginScreen: React.FC = () => {
    const { login, isLoading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const currentYear = new Date().getFullYear();

    return (
        <>
            {/* Connection banner so users see why login might be failing */}
            <NetworkStatusBanner />
            <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0a1628]">
                <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-2xl border-2 border-white/8 border-t-blue-400 animate-spin" />
                    <div className="absolute inset-2 rounded-xl bg-white/5 flex items-center justify-center">
                        <Stethoscope size={16} className="text-blue-400" />
                    </div>
                </div>
            </div>
        }>
            <LoginForm
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                showPassword={showPassword} setShowPassword={setShowPassword}
                loading={loading} setLoading={setLoading}
                error={error} setError={setError}
                login={login} currentYear={currentYear}
                authLoading={authLoading}
            />
            </Suspense>
        </>
    );
};

export default LoginScreen;