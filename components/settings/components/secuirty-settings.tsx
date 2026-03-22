"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
// NEW: Import supabase client
import supabase from "@/utils/supabase/client";

const schema = z
    .object({
        currentPassword: z.string().min(6, "Current password is required"),
        newPassword: z.string().min(8, "New password must be at least 8 characters"),
        confirmPassword: z.string().min(8, "Please confirm your new password"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

type FormData = z.infer<typeof schema>;

// You may have to adjust this function for your authentication setup.
// This example assumes use of Supabase Auth and email/password login.
export default function SecuritySettings() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const form = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (values: FormData) => {
        setLoading(true);
        try {
            // REPLACEMENT: Manual "reauth" then update user's password via Supabase
            // 1. Get session user
            const {
                data: { user },
                error: userError,                       
            } = await supabase.auth.getUser();

            if (userError || !user?.email) {
                throw new Error("Could not determine current user.");
            }

            // 2. Re-authenticate by sign-in with the current password
            let { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: values.currentPassword,
            });

            if (signInError) {
                throw new Error("Current password is incorrect.");
            }

            // 3. Update the password
            const { error: updateError } = await supabase.auth.updateUser({
                password: values.newPassword,
            });

            if (updateError) {
                throw new Error(updateError.message || "Failed to update password.");
            }

            toast({
                title: "Password Updated",
                description: "Your password has been changed successfully.",
            });
            form.reset();
        } catch (err: any) {
            toast({
                title: "Update Failed",
                description: err?.message || "Could not change password.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="shadow-sm border border-gray-200 rounded-2xl">
            <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-gray-800">
                    <Lock className="w-5 h-5 text-yellow-500" />
                    <span>Security</span>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="currentPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Current Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="Current password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>New Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="New password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="Confirm new password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="md:col-span-2 pt-4">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white"
                            >
                                {loading ? "Updating..." : "Change Password"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
