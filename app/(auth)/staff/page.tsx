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
import { useState } from "react";
import {
    account,
    databases,
    NEXT_PUBLIC_DATABASE_ID,
    NEXT_PUBLIC_STAFF_COLLECTION_ID,
} from "@/lib/appwrite.config";
import { StaffRole } from "@/types/appwrite.types";

// Zod schema for login form validation
const loginSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Map staff roles to their respective dashboard routes
const ROLE_ROUTES: Record<StaffRole, string> = {
    doctor: "/doctor/dashboard",
    "lab-tech": "/lab-tech/dashboard",
    nurse: "/nurse/dashboard",
    pharmacist: "/pharmacist/dashboard",
    "front-desk": "/front-desk/dashboard",
};

export default function Login() {
    const router = useRouter();
    const toast = useToast();
    const [loading, setLoading] = useState(false);

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

            //delete any active session
            await account.deleteSession("current");

            // Authenticate user
            await account.createEmailPasswordSession(values.email, values.password);

            // Get user account
            const user = await account.get();
            console.log("Logged-in user ID:", user.$id);


            // Fetch user role from database
            const userDoc = await databases.getDocument(
                '66c70cd1001163421547',
                '683395e500365717a835',
                user.$id
            );
            const role = userDoc?.role as StaffRole;

            if (!role || !ROLE_ROUTES[role]) {
                throw new Error("Invalid or missing user role");
            }

            // Show success toast
            toast.toast({
                title: "Login successful",
                description: `Welcome, ${role.charAt(0).toUpperCase() + role.slice(1)}!`,
                variant: "default",
            });

            // Redirect to dashboard
            router.replace(ROLE_ROUTES[role]);
        } catch (error) {
            console.error("Appwrite login failed:", error);
            toast.toast({
                title: "Login failed",
                description:
                    error instanceof Error
                        ? error.message
                        : "Please try again.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-20 p-6 border rounded-2xl shadow-sm space-y-6">
            <h2 className="text-2xl font-semibold text-center">
                Login to your account
            </h2>
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                >
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input
                                        type="email"
                                        placeholder="you@example.com"
                                        {...field}
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
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading || form.formState.isSubmitting}
                    >
                        {loading || form.formState.isSubmitting
                            ? "Logging in..."
                            : "Login"}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
