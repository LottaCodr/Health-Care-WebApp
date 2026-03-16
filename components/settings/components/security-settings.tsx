"use client";

import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Lock,
    Shield,
    Eye,
    EyeOff,
    AlertTriangle,
    CheckCircle,
    Clock,
    Users,
    Activity
} from "lucide-react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-provider";
import { useState, useEffect } from "react";
import {
    passwordSchema,
    validatePasswordStrength,
    logSecurityEvent,
    authService
} from "@/lib/auth-utils";
import { Badge } from "@/components/ui/badge";
// import { Progress } from "@/components/ui/progress";

const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: passwordSchema,
        confirmPassword: z.string().min(1, "Please confirm your new password"),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function SecuritySettings() {
    const { toast } = useToast();
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: [] as string[] });
    const [activeSessions, setActiveSessions] = useState(0);

    const form = useForm<ChangePasswordFormData>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    // Monitor password strength
    useEffect(() => {
        const newPassword = form.watch("newPassword");
        if (newPassword) {
            const validation = validatePasswordStrength(newPassword);
            const score = validation.isValid ? 100 : Math.max(0, 100 - (validation.errors.length * 20));
            setPasswordStrength({ score, feedback: validation.errors });
        } else {
            setPasswordStrength({ score: 0, feedback: [] });
        }
    }, [form.watch("newPassword")]);

    // Get active sessions count
    useEffect(() => {
        setActiveSessions(authService.getActiveSessionsCount());
    }, []);

    const onSubmit = async (values: ChangePasswordFormData) => {
        setLoading(true);
        try {
            const result = await authService.changePassword(values.currentPassword, values.newPassword);

            if (result.success) {
                toast({
                    title: "Password Updated",
                    description: "Your password has been changed successfully.",
                });
                form.reset();

                // Log password change
                logSecurityEvent('PASSWORD_CHANGED_SUCCESS', {
                    userId: user?.$id,
                    email: user?.email
                });
            } else {
                toast({
                    title: "Update Failed",
                    description: result.message,
                    variant: "destructive",
                });

                logSecurityEvent('PASSWORD_CHANGE_FAILED', {
                    userId: user?.$id,
                    error: result.message
                });
            }
        } catch (err: any) {
            toast({
                title: "Update Failed",
                description: err?.message || "Could not change password.",
                variant: "destructive",
            });

            logSecurityEvent('PASSWORD_CHANGE_ERROR', {
                userId: user?.$id,
                error: err?.message
            });
        } finally {
            setLoading(false);
        }
    };

    const handleLogoutAllSessions = async () => {
        try {
            await logout();
            toast({
                title: "Logged Out",
                description: "You have been logged out from all sessions.",
            });

            logSecurityEvent('LOGOUT_ALL_SESSIONS', {
                userId: user?.$id,
                email: user?.email
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to logout from all sessions.",
                variant: "destructive",
            });
        }
    };

    const getPasswordStrengthColor = (score: number) => {
        if (score >= 80) return "text-green-600";
        if (score >= 60) return "text-yellow-600";
        if (score >= 40) return "text-orange-600";
        return "text-red-600";
    };

    const getPasswordStrengthText = (score: number) => {
        if (score >= 80) return "Strong";
        if (score >= 60) return "Good";
        if (score >= 40) return "Fair";
        if (score >= 20) return "Weak";
        return "Very Weak";
    };

    return (
        <div className="space-y-6">
            {/* Security Overview */}
            <Card className="shadow-sm border border-gray-200 rounded-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-800">
                        <Shield className="w-5 h-5 text-blue-500" />
                        Security Overview
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                                <p className="text-sm font-medium text-green-800">Account Status</p>
                                <p className="text-xs text-green-600">Active & Secure</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                            <Clock className="w-5 h-5 text-blue-600" />
                            <div>
                                <p className="text-sm font-medium text-blue-800">Session Duration</p>
                                <p className="text-xs text-blue-600">8 hours remaining</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                            <Users className="w-5 h-5 text-purple-600" />
                            <div>
                                <p className="text-sm font-medium text-purple-800">Active Sessions</p>
                                <p className="text-xs text-purple-600">{activeSessions} session(s)</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Change Password */}
            <Card className="shadow-sm border border-gray-200 rounded-2xl">
                <CardContent className="p-6 space-y-6">
                    <div className="flex items-center gap-2 text-xl font-semibold text-gray-800">
                        <Lock className="w-5 h-5 text-yellow-500" />
                        <span>Change Password</span>
                    </div>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showCurrentPassword ? "text" : "password"}
                                                    placeholder="Current password"
                                                    {...field}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                                                >
                                                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
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
                                            <div className="relative">
                                                <Input
                                                    type={showNewPassword ? "text" : "password"}
                                                    placeholder="New password"
                                                    {...field}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                                                >
                                                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />

                                        {/* Password Strength Indicator */}
                                        {field.value && (
                                            <div className="mt-2 space-y-2">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span>Password Strength:</span>
                                                    <span className={`font-medium ${getPasswordStrengthColor(passwordStrength.score)}`}>
                                                        {getPasswordStrengthText(passwordStrength.score)}
                                                    </span>
                                                </div>
                                                {/* <Progress value={passwordStrength.score} className="h-2" /> */}

                                                {passwordStrength.feedback.length > 0 && (
                                                    <div className="text-xs text-red-600 space-y-1">
                                                        {passwordStrength.feedback.map((feedback, index) => (
                                                            <div key={index} className="flex items-center gap-1">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                {feedback}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm New Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder="Confirm new password"
                                                    {...field}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                                                >
                                                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white"
                            >
                                {loading ? "Updating..." : "Change Password"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            {/* Session Management */}
            <Card className="shadow-sm border border-gray-200 rounded-2xl">
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-xl font-semibold text-gray-800">
                        <Activity className="w-5 h-5 text-purple-500" />
                        <span>Session Management</span>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium">Current Session</p>
                                <p className="text-xs text-gray-600">Started {session ? new Date(session.createdAt).toLocaleString() : 'Unknown'}</p>
                            </div>
                            <Badge variant="secondary">Active</Badge>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <p className="text-sm font-medium">Active Sessions</p>
                                <p className="text-xs text-gray-600">{activeSessions} session(s) across devices</p>
                            </div>
                            <Badge variant="outline">{activeSessions}</Badge>
                        </div>
                    </div>

                    <Button
                        onClick={handleLogoutAllSessions}
                        variant="outline"
                        className="w-full"
                    >
                        Logout from All Sessions
                    </Button>
                </CardContent>
            </Card>

            {/* Security Features */}
            <Card className="shadow-sm border border-gray-200 rounded-2xl">
                <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-xl font-semibold text-gray-800">
                        <Shield className="w-5 h-5 text-green-500" />
                        <span>Security Features</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center gap-2 p-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">Rate Limiting</span>
                        </div>
                        <div className="flex items-center gap-2 p-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">Account Lockout</span>
                        </div>
                        <div className="flex items-center gap-2 p-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">Session Management</span>
                        </div>
                        <div className="flex items-center gap-2 p-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">Audit Logging</span>
                        </div>
                        <div className="flex items-center gap-2 p-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">Password Strength</span>
                        </div>
                        <div className="flex items-center gap-2 p-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm">Secure Cookies</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 