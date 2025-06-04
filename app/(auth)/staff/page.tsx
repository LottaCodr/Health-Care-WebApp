"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { account, databases } from "@/lib/appwrite.config";
import { StaffRole } from "@/types/appwrite.types";
import { ROLE_ROUTES } from "@/constants";

const loginSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [year, setYear] = useState<number | null>(null);

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

    const onSubmit = async (values: LoginFormValues) => {
        setLoading(true);
        try {
            // Always delete the current session before logging in
            await account.deleteSession("current").catch(() => { });

            // Create new session
            await account.createEmailPasswordSession(values.email, values.password);

            // Get current user
            const user = await account.get();

            // Fetch staff details
            const userDoc = await databases.getDocument(
                process.env.NEXT_PUBLIC_DATABASE_ID!,
                process.env.NEXT_PUBLIC_STAFF_COLLECTION_ID!,
                user.$id
            );

            const role = userDoc?.role as StaffRole;

            await account.updatePrefs({ role });

            if (!role || !ROLE_ROUTES[role]) {
                throw new Error("Invalid or missing user role");
            }

            toast.toast({
                title: "Login successful",
                description: `Welcome, ${role.charAt(0).toUpperCase() + role.slice(1)}!`,
            });

            // Navigate to the role-based route
            router.replace(ROLE_ROUTES[role]);

        } catch (error) {
            toast.toast({
                title: "Login failed",
                description: error instanceof Error ? error.message : "Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1f36] via-[#121826] to-black px-4">
            <div className="w-full max-w-md rounded-3xl shadow-2xl border border-white/10 bg-white/5 backdrop-blur-lg p-8 text-white space-y-6">
                <Image src="/logo.png" alt="Logo" width={48} height={48} className="h-12 w-auto" priority />
                <div className="text-center space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
                    <p className="text-sm text-muted-foreground">Secure Staff Login Portal</p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email address</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="email"
                                            placeholder="you@example.com"
                                            {...field}
                                            className="bg-white/10 border-white/20 focus:ring-white text-white placeholder:text-white/50"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                {...field}
                                                className="bg-white/10 border-white/20 pr-10 text-white placeholder:text-white/50"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute inset-y-0 right-0 px-3 text-muted-foreground"
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button
                            type="submit"
                            className="w-full bg-white text-black hover:bg-white/80 transition font-semibold"
                            disabled={loading || form.formState.isSubmitting}
                        >
                            {loading ? "Logging in..." : "Login"}
                        </Button>
                    </form>
                </Form>

                <p className="text-xs text-center text-white/40">
                    © {year} Nile Mother & Child Hospital. All rights reserved.
                </p>
            </div>
        </main>
    );
}
