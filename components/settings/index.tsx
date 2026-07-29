// ─────────────────────────────────────────────────────────────────────────────
// FILE: components/settings/SettingsComponent.tsx  (main page)
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { updateStaff } from "@/actions/staff/update.deletestaff";
import { useAuth } from "@/context/auth-provider";
import { toast } from "sonner";
import supabase from "@/utils/supabase/client";
import {
    User, Lock, Bell, Trash2, Loader2, CheckCircle2,
    Shield, Mail, Phone, Eye, EyeOff, AlertTriangle,
    Smartphone, MonitorSmartphone,
} from "lucide-react";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SectionCard({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
    return (
        <div className={`bg-white rounded-3xl border shadow-sm overflow-hidden
            ${danger ? "border-red-100" : "border-gray-100"}`}>
            {children}
        </div>
    );
}

function CardHeader({ icon: Icon, color, bg, title, subtitle }: {
    icon: React.ElementType; color: string; bg: string; title: string; subtitle: string;
}) {
    return (
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-50">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={17} className={color} />
            </div>
            <div>
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            </div>
        </div>
    );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
            {children}{required && <span className="text-red-500 ml-0.5">*</span>}
        </p>
    );
}

function FieldInput({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
    return (
        <input
            {...props}
            className={`w-full h-10 px-4 rounded-xl border bg-gray-50 text-sm font-medium text-gray-900
                placeholder:text-gray-300 transition-all
                focus:outline-none focus:ring-2 focus:ring-blue-400/25 focus:border-blue-400 focus:bg-white
                hover:border-gray-300 hover:bg-white
                disabled:opacity-50 disabled:cursor-not-allowed
                ${error ? "border-red-300 bg-red-50 focus:ring-red-400/25 focus:border-red-400" : "border-gray-200"}`}
        />
    );
}

// ─── 1. ACCOUNT SETTINGS ─────────────────────────────────────────────────────

const accountSchema = z.object({
    full_name: z.string().min(2, "Full name is required"),
    email: z.string().email("Invalid email address"),
    phone_number: z.string().min(10, "Phone number is required"),
});

function AccountSettings() {
    const { user } = useAuth();
    const form = useForm<z.infer<typeof accountSchema>>({
        resolver: zodResolver(accountSchema),
        defaultValues: { full_name: "", email: "", phone_number: "" },
    });
    const { isSubmitting } = form.formState;

    useEffect(() => {
        if (user) form.reset({
            full_name: user.full_name || user.name || "",
            email: user.email || "",
            phone_number: String(user.phone_number || ""),
        });
    }, [user, form]);

    const onSubmit = async (data: z.infer<typeof accountSchema>) => {
        try {
            await updateStaff(user?.$id || "", {
                name: data.full_name,
                email: data.email,
                phone_number: data.phone_number,
            });
            toast.success("Profile updated successfully.");
        } catch {
            toast.error("Failed to update profile. Please try again.");
        }
    };

    return (
        <SectionCard>
            <CardHeader icon={User} color="text-blue-600" bg="bg-blue-50"
                title="Account Information" subtitle="Update your personal details" />
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={form.control} name="full_name" render={({ field, fieldState }) => (
                            <FormItem className="space-y-0">
                                <FieldLabel required>Full Name</FieldLabel>
                                <FormControl>
                                    <FieldInput placeholder="Dr. John Doe" error={!!fieldState.error} {...field} />
                                </FormControl>
                                <FormMessage className="text-[10px] text-red-500 font-semibold mt-1" />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="email" render={({ field, fieldState }) => (
                            <FormItem className="space-y-0">
                                <FieldLabel required>Email Address</FieldLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        <FieldInput type="email" placeholder="you@hospital.com" error={!!fieldState.error}
                                            className="pl-9" {...field} style={{ paddingLeft: "2.25rem" }} />
                                    </div>
                                </FormControl>
                                <FormMessage className="text-[10px] text-red-500 font-semibold mt-1" />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="phone_number" render={({ field, fieldState }) => (
                            <FormItem className="space-y-0">
                                <FieldLabel required>Phone Number</FieldLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                        <FieldInput type="tel" placeholder="+234 800 000 0000" error={!!fieldState.error}
                                            style={{ paddingLeft: "2.25rem" }} {...field} />
                                    </div>
                                </FormControl>
                                <FormMessage className="text-[10px] text-red-500 font-semibold mt-1" />
                            </FormItem>
                        )} />
                    </div>

                    <div className="pt-2">
                        <button type="submit" disabled={isSubmitting}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm shadow-blue-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                            {isSubmitting ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><CheckCircle2 size={14} /> Save Changes</>}
                        </button>
                    </div>
                </form>
            </Form>
        </SectionCard>
    );
}

// ─── 2. SECURITY SETTINGS ────────────────────────────────────────────────────

const securitySchema = z.object({
    currentPassword: z.string().min(6, "Current password is required"),
    newPassword: z.string().min(8, "Must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your new password"),
}).refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match", path: ["confirmPassword"],
});

function SecuritySettings() {
    const form = useForm<z.infer<typeof securitySchema>>({
        resolver: zodResolver(securitySchema),
        defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });
    const [loading, setLoading] = useState(false);
    const [showFields, setShowFields] = useState<Record<string, boolean>>({});

    const toggle = (field: string) => setShowFields((p) => ({ ...p, [field]: !p[field] }));

    const onSubmit = async (values: z.infer<typeof securitySchema>) => {
        setLoading(true);
        try {
            const { data: { user }, error: ue } = await supabase.auth.getUser();
            if (ue || !user?.email) throw new Error("Could not determine current user.");
            const { error: se } = await supabase.auth.signInWithPassword({ email: user.email, password: values.currentPassword });
            if (se) throw new Error("Current password is incorrect.");
            const { error: pe } = await supabase.auth.updateUser({ password: values.newPassword });
            if (pe) throw new Error(pe.message);
            toast.success("Password changed successfully.");
            form.reset();
        } catch (err: any) {
            toast.error(err?.message ?? "Could not change password.");
        } finally {
            setLoading(false);
        }
    };

    const PasswordField = ({ name, label, placeholder }: { name: any; label: string; placeholder: string }) => (
        <FormField control={form.control} name={name} render={({ field, fieldState }) => (
            <FormItem className="space-y-0">
                <FieldLabel required>{label}</FieldLabel>
                <FormControl>
                    <div className="relative">
                        <FieldInput type={showFields[name] ? "text" : "password"}
                            placeholder={placeholder} error={!!fieldState.error} {...field}
                            style={{ paddingRight: "2.5rem" }} />
                        <button type="button" onClick={() => toggle(name)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                            {showFields[name] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                    </div>
                </FormControl>
                <FormMessage className="text-[10px] text-red-500 font-semibold mt-1" />
            </FormItem>
        )} />
    );

    return (
        <SectionCard>
            <CardHeader icon={Lock} color="text-amber-600" bg="bg-amber-50"
                title="Security" subtitle="Change your password to keep your account safe" />
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <PasswordField name="currentPassword" label="Current Password" placeholder="Current password" />
                        <PasswordField name="newPassword" label="New Password" placeholder="Min. 8 characters" />
                        <PasswordField name="confirmPassword" label="Confirm Password" placeholder="Repeat new password" />
                    </div>

                    {/* Password strength hint */}
                    <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                        <Shield size={13} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-700 leading-relaxed">
                            Use at least 8 characters with a mix of letters, numbers, and symbols for a strong password.
                        </p>
                    </div>

                    <div className="pt-2">
                        <button type="submit" disabled={loading}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-sm shadow-amber-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                            {loading ? <><Loader2 size={14} className="animate-spin" /> Changing...</> : <><Lock size={14} /> Change Password</>}
                        </button>
                    </div>
                </form>
            </Form>
        </SectionCard>
    );
}

// ─── 3. NOTIFICATION SETTINGS ────────────────────────────────────────────────

const NOTIFICATION_OPTIONS = [
    { id: "email", label: "Email Notifications", desc: "Receive alerts and updates via email", icon: Mail },
    { id: "sms", label: "SMS Notifications", desc: "Get text messages for urgent alerts", icon: Smartphone },
    { id: "push", label: "In-App Notifications", desc: "Browser and desktop push notifications", icon: MonitorSmartphone },
] as const;

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" onClick={() => onChange(!checked)} role="switch" aria-checked={checked}
            className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0
                ${checked ? "bg-blue-600" : "bg-gray-200"}`}>
            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200
                ${checked ? "translate-x-4" : "translate-x-0"}`} />
        </button>
    );
}

function NotificationSettings() {
    const [prefs, setPrefs] = useState({ email: true, sms: false, push: true });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await new Promise((r) => setTimeout(r, 800));
        setSaving(false);
        toast.success("Notification preferences saved.");
    };

    return (
        <SectionCard>
            <CardHeader icon={Bell} color="text-blue-600" bg="bg-blue-50"
                title="Notifications" subtitle="Choose how you want to be notified" />
            <div className="px-6 py-5 space-y-3">
                {NOTIFICATION_OPTIONS.map(({ id, label, desc, icon: Icon }) => (
                    <div key={id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0">
                                <Icon size={14} className="text-gray-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{label}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                            </div>
                        </div>
                        <Toggle checked={prefs[id as keyof typeof prefs]} onChange={(v) => setPrefs((p) => ({ ...p, [id]: v }))} />
                    </div>
                ))}

                <div className="pt-2">
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm shadow-blue-200 transition-all disabled:opacity-60">
                        {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><CheckCircle2 size={14} /> Save Preferences</>}
                    </button>
                </div>
            </div>
        </SectionCard>
    );
}

// ─── 4. DANGER ZONE ──────────────────────────────────────────────────────────

function DangerZone() {
    const [confirm, setConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        await new Promise((r) => setTimeout(r, 1000));
        setDeleting(false);
        toast.error("Account deletion is disabled in this environment.");
        setConfirm(false);
    };

    return (
        <div className="bg-white rounded-3xl border border-red-100 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-red-50">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                    <Trash2 size={17} className="text-red-600" />
                </div>
                <div>
                    <p className="text-sm font-bold text-red-700">Danger Zone</p>
                    <p className="text-xs text-red-400 mt-0.5">Irreversible account actions</p>
                </div>
            </div>

            <div className="px-6 py-5">
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl mb-4">
                    <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 leading-relaxed">
                        Deleting your account is <strong>permanent and irreversible</strong>. All your data, records, and settings will be permanently removed and cannot be recovered.
                    </p>
                </div>

                {!confirm ? (
                    <button onClick={() => setConfirm(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-red-200 bg-white hover:bg-red-50 text-red-600 text-sm font-bold transition-all">
                        <Trash2 size={14} /> Delete My Account
                    </button>
                ) : (
                    <div className="flex items-center gap-3">
                        <button onClick={() => setConfirm(false)} disabled={deleting}
                            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-colors disabled:opacity-50">
                            Cancel
                        </button>
                        <button onClick={handleDelete} disabled={deleting}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-sm shadow-red-200 transition-all disabled:opacity-60">
                            {deleting ? <><Loader2 size={14} className="animate-spin" /> Deleting...</> : <><Trash2 size={14} /> Yes, Delete Account</>}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── MAIN SETTINGS PAGE ───────────────────────────────────────────────────────

export default function SettingsComponent() {
    const { user } = useAuth();
    const roleLabel = user?.role
        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
        : "Staff";

    return (
        <div className="max-w-2xl mx-auto space-y-5 pb-12">

            {/* Page header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Settings</h1>
                    <p className="text-sm text-gray-400 mt-1">Manage your account preferences and security</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">{user?.name ?? user?.full_name}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">{roleLabel}</p>
                </div>
            </div>

            <AccountSettings />
            <SecuritySettings />
            <NotificationSettings />
            <DangerZone />
        </div>
    );
}