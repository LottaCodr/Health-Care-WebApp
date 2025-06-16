"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Staff } from "@/types/appwrite.types";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";


const formSchema = z.object({
    full_name: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email address"),
    role: z.string().min(2, "Position is required"),
    department: z.string().min(1, "Department is required"),
    status: z.enum(["Active", "Inactive"]),
});

type FormData = z.infer<typeof formSchema>;

interface EditEmployeeModalProps {
    employee: Staff;
    onClose: () => void;
    onSave: (data: FormData) => Promise<void> | void;
}

export default function EditEmployeeModal({
    employee,
    onClose,
    onSave,
}: EditEmployeeModalProps) {
    const { toast } = useToast();

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            full_name: "",
            email: "",
            role: "",
            department: "",
            status: "Active",
        },
    });

    const isLoading = form.formState.isSubmitting;

    // Pre-fill form with employee data
    useEffect(() => {
        if (employee) {
            form.reset({
                full_name: employee.full_name || "",
                email: employee.email || "",
                role: employee.role || "",
                department: employee.department || "",
                status:
                    employee.status?.toLowerCase() === "inactive" ? "Inactive" : "Active"
            });
        }
    }, [employee, form]);

    // ✅ Handle form submit
    const handleSubmit = async (values: FormData) => {
        try {
            onSave(values);
            toast({
                title: "Employee Updated",
                description: "Employee information has been successfully updated.",
            });
            onClose();
        } catch (error) {
            toast({
                title: "Update Failed",
                description: "Something went wrong. Please try again.",
                variant: "destructive",
            });
        }
    };

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Employee</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        {/** Full Name */}
                        <FormField
                            control={form.control}
                            name="full_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" disabled {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/** Email */}
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email Address</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="email@example.com" {...field} disabled />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/** Role */}
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Position</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Nurse" disabled {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/** Department */}
                        <FormField
                            control={form.control}
                            name="department"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Department</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Pediatrics" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/** Status */}
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <FormControl>
                                        <select
                                            {...field}
                                            className="w-full border border-input rounded px-3 py-2 text-sm"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
