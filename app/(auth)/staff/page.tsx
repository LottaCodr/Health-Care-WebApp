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
import { loginStaff } from "@/actions/login";
import type { Role } from "@/actions/login";

const loginSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
    const router = useRouter();
    const toast = useToast();

    const form = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });


    type LoginStaffResult = {
        success: boolean;
        role?: Role;
        message?: string;
    };

    const onSubmit = async (values: LoginFormValues) => {
        const result = await loginStaff(values.email, values.password);

        if (result.role) {
            const role = result.role;

            toast.toast({
                title: "Login successful",
                description: role
                    ? `Welcome, ${((role as unknown) as string).charAt(0).toUpperCase() + ((role as unknown) as string).slice(1)}!`
                    : "Welcome!",
                variant: "default",
            })

            if ((role as unknown as string) === "doctor") {
                router.replace("/doctor/dashboard");
            } else if ((role as unknown as string) === "lab-tech") {
                router.replace("/lab-tech/dashboard");
            } else if ((role as unknown as string) === "nurse") {
                router.replace("/nurse/dashboard");
            } else if ((role as unknown as string) === "pharmacist") {
                router.replace("/pharmacist/dashboard");
            } else if ((role as unknown as string) === "admin") {
                router.replace("/admin");
            } else {
                alert("Unknown role.");
            }
        } else {
            alert(result.role ?? "Login failed. Please try again.");
        }
    };

    return (
        <div className="max-w-md mx-auto mt-20 p-6 border rounded-2xl shadow-sm space-y-6">
            <h2 className="text-2xl font-semibold text-center">Login to your account</h2>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="you@example.com" {...field} />
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
                                    <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Logging in..." : "Login"}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
