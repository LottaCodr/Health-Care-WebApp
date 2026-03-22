"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import Image from "next/image";

// Extract the logic that uses useSearchParams into a child component
function LoginFormWithSearchParams(props: {
    email: string;
    setEmail: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
    showPassword: boolean;
    setShowPassword: (v: boolean) => void;
    loading: boolean;
    setLoading: (v: boolean) => void;
    error: string | null;
    setError: (v: string | null) => void;
    login: any;
    currentYear: number;
    authLoading: boolean;
}) {
    const {
        email, setEmail, password, setPassword,
        showPassword, setShowPassword, loading, setLoading,
        error, setError, login, currentYear, authLoading
    } = props;

    const router = useRouter();
    const searchParams = useSearchParams();

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
                setError(result.message || "Login failed. Please check your credentials.");
                setLoading(false);
                return;
            }
            const next = searchParams.get("next") || "/";
            window.location.href = next;
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed. Please try again.");
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0f1c3a] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-14 h-14">
                        <div className="absolute inset-0 rounded-2xl border-2 border-white/10 border-t-blue-400 animate-spin" />
                        <div className="absolute inset-2 rounded-xl bg-white/5 flex items-center justify-center">
                            <Image src="/assets/icons/nilelogo.jpeg" alt="Logo" width={28} height={28} className="rounded-lg" />
                        </div>
                    </div>
                    <p className="text-white/50 text-sm font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex">

            {/* ── Left panel — brand ─────────────────────────────────────────── */}
            <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] bg-[#0f1c3a] flex-col relative overflow-hidden">

                {/* Decorative background elements */}
                <div className="absolute inset-0">
                    {/* Large faint circle */}
                    <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full border border-white/5" />
                    <div className="absolute -bottom-16 -left-16 w-[360px] h-[360px] rounded-full border border-white/5" />
                    {/* Top right accent */}
                    <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-blue-600/10" />
                    <div className="absolute top-1/3 right-0 w-1 h-40 bg-gradient-to-b from-transparent via-blue-400/30 to-transparent" />
                    {/* Dot grid */}
                    <div className="absolute inset-0 opacity-[0.04]"
                        style={{
                            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                            backgroundSize: '28px 28px',
                        }}
                    />
                </div>

                {/* Content */}
                <div className="relative flex flex-col h-full px-12 py-12">

                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-white/10">
                            <Image src="/assets/icons/nilelogo.jpeg" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <p className="text-white text-xs font-bold tracking-widest uppercase">Nile Valley</p>
                            <p className="text-white/40 text-[9px] uppercase tracking-widest">Mother & Child Hospital</p>
                        </div>
                    </div>

                    {/* Centre hero text */}
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="mb-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 mb-6">
                                <ShieldCheck size={12} className="text-blue-400" />
                                <span className="text-blue-300 text-[10px] font-bold uppercase tracking-widest">Secure Staff Portal</span>
                            </div>
                            <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
                                Electronic<br />
                                Medical<br />
                                Records
                            </h2>
                            <p className="text-white/40 mt-4 text-sm leading-relaxed max-w-xs">
                                Centralised patient management for doctors, nurses, lab technicians, and pharmacists.
                            </p>
                        </div>

                        {/* Feature pills */}
                        <div className="space-y-2.5">
                            {[
                                { label: "Patient Queue Management" },
                                { label: "Consultation & Diagnosis Records" },
                                { label: "Lab Requests & Results" },
                                { label: "Prescription & Dispensing" },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                    <span className="text-white/50 text-xs font-medium">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-white/20 text-[10px]">
                        © {currentYear} Nile Valley Mother & Child Hospital
                    </p>
                </div>
            </div>

            {/* ── Right panel — form ─────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/60 px-6 py-12">
                <div className="w-full max-w-sm">

                    {/* Mobile logo */}
                    <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
                        <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-gray-200">
                            <Image src="/assets/icons/nilelogo.jpeg" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <p className="text-gray-900 text-sm font-bold">Nile Valley Mother & Child Hospital</p>
                            <p className="text-gray-400 text-[10px] uppercase tracking-widest">Staff Portal</p>
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
                        <p className="text-sm text-gray-400 mt-1">Sign in to access your workspace</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-5 flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl">
                            <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-600 font-medium">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-4">

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-gray-400">
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
                                className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-gray-400">
                                    Password
                                </label>
                                <a href="/forgot-password" className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold transition-colors">
                                    Forgot password?
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
                                    className="w-full h-11 px-4 pr-11 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-gray-300 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 mt-2 flex items-center justify-center gap-2 bg-[#0f1c3a] hover:bg-[#162242] text-white text-sm font-bold rounded-xl transition-all duration-150 shadow-lg shadow-slate-900/20 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-slate-700 focus:ring-offset-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={15} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Secure badge */}
                    <div className="mt-6 flex items-center justify-center gap-2">
                        <ShieldCheck size={12} className="text-gray-300" />
                        <p className="text-[10px] text-gray-300 font-medium">Secured with end-to-end encryption</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

const LoginScreen: React.FC = () => {
    const { user, login, isLoading: authLoading } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const currentYear = new Date().getFullYear();

    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#0f1c3a]">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative w-14 h-14">
                        <div className="absolute inset-0 rounded-2xl border-2 border-white/10 border-t-blue-400 animate-spin" />
                        <div className="absolute inset-2 rounded-xl bg-white/5 flex items-center justify-center">
                            <Image src="/assets/icons/nilelogo.jpeg" alt="Logo" width={28} height={28} className="rounded-lg" />
                        </div>
                    </div>
                    <p className="text-white/50 text-sm font-medium">Loading...</p>
                </div>
            </div>
        }>
            <LoginFormWithSearchParams
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                loading={loading}
                setLoading={setLoading}
                error={error}
                setError={setError}
                login={login}
                currentYear={currentYear}
                authLoading={authLoading}
            />
        </Suspense>
    );
};

export default LoginScreen;