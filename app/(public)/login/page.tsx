"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { Stethoscope, ShieldCheck, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";

const LoginScreen: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, login, isLoading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    

    // Dashboard routes by role
    const getDashboardRoute = (role?: string): string => {
        const roleMap: Record<string, string> = {
            Doctor: "/doctor/dashboard",
            Nurse: "/nurse/dashboard",
            Pharmacist: "/pharmacist/dashboard",
            LabTechnician: "/lab-tech/dashboard",
            FrontDesk: "/front-desk/dashboard",
            Admin: "/admin/dashboard",
        };
        return roleMap[role || ""] || "/login";
    };

    // Redirect if already logged in
    // useEffect(() => {
    //     if (user && !authLoading) {
    //         const dashboardRoute = getDashboardRoute(user.role);
    //         router.push(dashboardRoute);
    //     }
    // }, [user, authLoading, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) {
            setError("Please enter your email and password.");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // const next = searchParams.get("next") || "/"
            const result = await login(email.trim(), password);
            
            if (!result.success) {
                setError(result.message || "Login failed. Please check your credentials.");
                setLoading(false);
                return;
            }
            
            const next = searchParams.get("next") || "/"
            // router.replace(next)
            window.location.href = next;

            // Navigation handled by useEffect when user updates
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed. Please try again.");
            console.error("Login error:", err);
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={40} className="text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
            <div className="max-w-md w-full">

                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white mb-6 shadow-lg shadow-blue-200">
                        <Stethoscope size={40} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        Nile Valley Mother &amp; Child Hospital
                    </h1>
                    <p className="text-slate-500 mt-2 text-base">EMR Staff Portal — Sign in to continue</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-8">

                    {/* Info Banner */}
                    <div className="flex items-center gap-3 mb-6 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg">
                        <ShieldCheck size={18} className="flex-shrink-0" />
                        <span className="text-sm font-medium">Sign in with your staff credentials</span>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
                            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleLogin} className="space-y-5">

                        {/* Email */}
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-slate-700 mb-1.5"
                            >
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
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-slate-700"
                                >
                                    Password
                                </label>
                                <a
                                    href="/forgot-password"
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition"
                                >
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
                                    className="w-full px-4 py-2.5 pr-10 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                                    tabIndex={-1}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-slate-400 text-xs mt-8">
                    &copy; 2026 Nile Valley Mother &amp; Child Hospital. All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default LoginScreen;