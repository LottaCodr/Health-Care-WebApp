"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { User } from "lucide-react";

import { updateStaff } from "@/actions/staff/update.deletestaff";
import { useAuth } from "@/context/auth-provider";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
    full_name: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email address"),
    phone_number: z.string().min(10, "Phone number is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function AccountSettings() {
    const { user } = useAuth();
    const { toast } = useToast();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            full_name: "",
            email: "",
            phone_number: "",
        },
    });

    const isLoading = form.formState.isSubmitting;

    useEffect(() => {
        if (user) {
            form.reset({
                full_name: user.full_name || "",
                email: user.email || "",
                phone_number: String(user.phone_number),
            });
        }
    }, [user, form]);

    const onSubmit = async (data: FormData) => {
        try {

            await updateStaff(user?.$id || "", data);

            toast({
                title: "Profile updated",
                description: "Your account information was updated successfully.",
                variant: "default",
            });
        } catch (err) {
            toast({
                title: "Update failed",
                description: "There was an error updating your profile. Please try again.",
                variant: "destructive",
            });
        }
    };

    return (
        <Card className="shadow-sm border border-gray-200 rounded-2xl">
            <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-xl font-semibold text-gray-800">
                    <User className="w-5 h-5 text-indigo-500" />
                    <span>Account Information</span>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="full_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email Address</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="john@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="phone_number"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone Number</FormLabel>
                                    <FormControl>
                                        <Input type="tel" placeholder="+1234567890" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="md:col-span-2 pt-4">
                            <Button
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                disabled={isLoading}
                            >
                                {isLoading ? "Updating..." : "Update Profile"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
