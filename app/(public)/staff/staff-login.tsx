"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Shield, AlertTriangle } from "lucide-react";
import Image from "next/image";
import { loginSchema } from "@/lib/auth-utils";
import { useAuth } from "@/context/auth-provider";

type LoginFormValues = z.infer<typeof loginSchema>;

const ROLE_DASHBOARD_MAP: Record<string, string> = {
    doctor: "/doctor/dashboard",
    nurse: "/nurse/dashboard",
    pharmacist: "/pharmacy/dashboard",
    labtech: "/labtech/dashboard",
    frontdesk: "/frontdesk/dashboard",
    admin: "/admin/dashboard",
};

export default function StaffLogin() {
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [year, setYear] = useState<number | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [securityWarning, setSecurityWarning] = useState<string | null>(null);

    useEffect(() => {
        setYear(new Date().getFullYear());
    }, []);

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const { login } = useAuth();

    const onSubmit = async (values: LoginFormValues) => {
        setLoading(true);
        setFormError(null);
        setSecurityWarning(null);

        console.log("🔐 Login attempt started");
        console.log("📧 Email:", values.email);

        try {
            const result = await login(values.email, values.password);

            console.log("✅ Login result:", result);

            if (!result.success) {
                console.error("❌ Login failed:", result.message);
                setFormError(result.message);
                toast({
                    title: "Login failed",
                    description: result.message,
                    variant: "destructive",
                });
                return;
            }

            // Verify we have staff data
            if (!result.staff) {
                console.error("❌ No staff data in result");
                setFormError("Staff profile not found");
                toast({
                    title: "Login failed",
                    description: "Staff profile not found",
                    variant: "destructive",
                });
                return;
            }

            console.log("👔 Staff data:", result.staff);
            console.log("🎭 Role:", result.staff.role);

            // Normalize role to lowercase for consistent matching
            const userRole = result.staff.role?.toLowerCase() || "";
            console.log("🎯 Normalized role:", userRole);

            // Get redirect path
            const redirectTo = ROLE_DASHBOARD_MAP[userRole] || "/dashboard";
            console.log("🚀 Redirecting to:", redirectTo);

            toast({
                title: "Login successful",
                description: `Welcome, ${result.staff.name || result.staff.role}!`,
            });

            // Force hard navigation to ensure middleware runs
            console.log("🔄 Performing redirect to:", redirectTo);
            window.location.href = redirectTo;

        } catch (err: any) {
            console.error("💥 Unexpected error:", err);
            const errorMessage = err.message || "Unexpected error occurred";
            setFormError(errorMessage);
            toast({
                title: "Login failed",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
            console.log("🏁 Login attempt completed");
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary to-primary px-4">
            <div className="w-full max-w-md rounded-3xl shadow-2xl border border-red-200/20 bg-white/10 backdrop-blur-lg p-8 text-white space-y-7 relative overflow-hidden">
                {/* Decorative Red Glow */}
                <div className="absolute -top-16 -left-16 w-56 h-56 bg-red-primary/30 rounded-full blur-3xl pointer-events-none z-0" />
                <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none z-0" />

                <div className="relative z-10 flex flex-col items-center gap-2">
                    <Image
                        src="/assets/icons/nilelogo.jpeg"
                        alt="Logo"
                        width={56}
                        height={56}
                        className="h-14 w-auto drop-shadow-lg"
                        priority
                    />
                    <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow">
                        Welcome Back
                    </h1>
                    <p className="text-sm text-white/80 font-medium">
                        Secure Staff Login Portal
                    </p>

                    <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-green-500/20 border border-green-400/30 rounded-full">
                        <Shield className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-green-200 font-medium">
                            Enhanced Security
                        </span>
                    </div>
                </div>

                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmit)}
                        className="space-y-5 relative z-10"
                    >
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-red-200 font-semibold">
                                        Email address
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            autoComplete="username"
                                            placeholder="you@example.com"
                                            {...field}
                                            className="bg-white/20 border border-primary/30 focus:ring-2 focus:ring-primary text-white placeholder:text-primary/60 rounded-xl py-3 px-4 font-medium"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs text-red-200" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-red-200 font-semibold">
                                        Password
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                autoComplete="current-password"
                                                placeholder="••••••••"
                                                {...field}
                                                className="bg-white/20 border border-red-200/30 pr-12 text-white placeholder:text-primary/60 rounded-xl py-3 px-4 font-medium"
                                            />
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-2 flex items-center px-2 text-red-200 hover:text-primary transition"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-xs text-red-200" />
                                </FormItem>
                            )}
                        />

                        {/* Security Warning */}
                        {securityWarning && (
                            <div className="text-sm text-yellow-200 bg-yellow-900/40 border border-yellow-500/30 rounded-lg px-3 py-2 font-medium animate-fade-in flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                <span>{securityWarning}</span>
                            </div>
                        )}

                        {/* Error Message */}
                        {formError && (
                            <div className="text-sm text-red-200 bg-red-900/40 border border-red-500/30 rounded-lg px-3 py-2 font-medium animate-fade-in">
                                {formError}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-primary text-white hover:from-primary hover:to-primary/10 transition font-bold text-base py-3 rounded-xl shadow-lg disabled:opacity-60"
                            disabled={loading || form.formState.isSubmitting}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg
                                        className="animate-spin h-5 w-5 text-white"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                        />
                                    </svg>
                                    Logging in...
                                </span>
                            ) : (
                                "Login"
                            )}
                        </Button>
                        <div className="mt-4 flex justify-center">
                            <a
                                href="/staff/signup"
                                className="inline-block w-full text-center bg-white/20 text-red-200 font-bold text-base py-3 rounded-xl shadow-lg transition hover:bg-white/30"
                                tabIndex={-1}
                            >
                                Sign Up
                            </a>
                        </div>
                    </form>
                </Form>

                <div className="relative z-10 text-xs text-center text-red-100/60 space-y-2">
                    <p>
                        © {year}{" "}
                        <span className="font-semibold text-red-200">
                            Nile Mother &amp; Child Hospital
                        </span>
                        . All rights reserved.
                    </p>
                </div>
            </div>
        </main>
    );
}