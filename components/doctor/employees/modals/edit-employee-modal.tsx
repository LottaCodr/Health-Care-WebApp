"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User2, Mail, Briefcase, Building2, ShieldCheck } from "lucide-react";
import { Staff } from "@/actions/staff/types";

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
    const departmentInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            full_name: "",
            email: "",
            role: "",
            department: "",
            status: "Active",
        },
        mode: "onBlur",
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
                    employee.status?.toLowerCase() === "inactive" ? "Inactive" : "Active",
            });
            // Focus department input for quick edit
            setTimeout(() => {
                departmentInputRef.current?.focus();
            }, 200);
        }
    }, [employee, form]);

    // Handle form submit
    const handleSubmit = async (values: FormData) => {
        try {
            await onSave(values);
            toast({
                title: "Employee Updated",
                description: "Employee information has been successfully updated.",
                variant: "default",
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
            <DialogContent className="max-w-lg rounded-2xl p-0 overflow-hidden shadow-2xl border border-red-100 bg-gradient-to-br from-white via-red-50 to-red-100">
                <DialogHeader className="bg-red-50 px-6 py-4 border-b border-red-100">
                    <DialogTitle className="flex items-center gap-2 text-red-700 text-lg font-bold">
                        <User2 className="w-5 h-5 text-red-500" />
                        Edit Employee
                    </DialogTitle>
                </DialogHeader>

                <div className="px-6 py-6">
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handleSubmit)}
                            className="space-y-5"
                            autoComplete="off"
                        >
                            {/* Full Name */}
                            <FormField
                                control={form.control}
                                name="full_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            <span className="flex items-center gap-1">
                                                <User2 className="w-4 h-4 text-red-400" />
                                                Full Name
                                            </span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="John Doe"
                                                disabled
                                                {...field}
                                                className="bg-gray-100 cursor-not-allowed"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Email */}
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            <span className="flex items-center gap-1">
                                                <Mail className="w-4 h-4 text-red-400" />
                                                Email Address
                                            </span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="email@example.com"
                                                {...field}
                                                disabled
                                                className="bg-gray-100 cursor-not-allowed"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Role */}
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            <span className="flex items-center gap-1">
                                                <Briefcase className="w-4 h-4 text-red-400" />
                                                Position
                                            </span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g. Nurse"
                                                disabled
                                                {...field}
                                                className="bg-gray-100 cursor-not-allowed"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Department */}
                            <FormField
                                control={form.control}
                                name="department"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            <span className="flex items-center gap-1">
                                                <Building2 className="w-4 h-4 text-red-400" />
                                                Department
                                            </span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g. Pediatrics"
                                                {...field}
                                                ref={departmentInputRef}
                                                autoFocus
                                                className="focus:ring-2 focus:ring-red-300"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Status */}
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            <span className="flex items-center gap-1">
                                                <ShieldCheck className="w-4 h-4 text-red-400" />
                                                Status
                                            </span>
                                        </FormLabel>
                                        <FormControl>
                                            <select
                                                {...field}
                                                className="w-full border border-input rounded px-3 py-2 text-sm focus:ring-2 focus:ring-red-300 bg-white"
                                                aria-label="Status"
                                            >
                                                <option value="Active">Active</option>
                                                <option value="Inactive">Inactive</option>
                                            </select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <DialogFooter className="pt-6 flex gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={onClose}
                                    className="w-1/2 border border-red-100 hover:bg-red-50"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="w-1/2 bg-red-600 hover:bg-red-700 text-white font-semibold"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="animate-spin w-4 h-4" />
                                            Saving...
                                        </span>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
