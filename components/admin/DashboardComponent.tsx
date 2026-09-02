"use client";

import React from "react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import {
    usePatientsByStatus,
    useAllPatients,
    usePendingLabRequests,
    usePendingPrescriptions,
    usePendingNursingActions,
} from "@/hooks/emr/use-emr";
import {
    Users, Stethoscope, FlaskConical, Pill,
    HeartPulse, CreditCard, Activity,
    AlertTriangle, ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { DashboardHeader } from "@/components/layout/DashboardHeader";

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, bg, border, href, sublabel }: {
    label: string; value: number | string; icon: React.ElementType;
    color: string; bg: string; border: string; href?: string; sublabel?: string;
}) {
    const content = (
        <div className={`bg-white rounded-2xl border ${border} shadow-sm px-4 py-4 sm:px-5 sm:py-5 flex min-w-0 items-center gap-3 sm:gap-4 hover:shadow-md transition-all group`}>
            <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={19} className={color} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-2xl font-extrabold text-gray-900 leading-none">{value}</p>
                <p className="text-xs text-gray-400 font-medium mt-1">{label}</p>
                {sublabel && <p className="text-[10px] text-gray-300 mt-0.5">{sublabel}</p>}
            </div>
            {href && <Activity size={14} className="text-gray-200 group-hover:text-gray-400 transition-colors shrink-0" />}
        </div>
    );
    return href ? <Link href={href}>{content}</Link> : content;
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <p className="text-sm font-bold text-gray-900">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            </div>
            {action}
        </div>
    );
}

// ─── Role activity row ────────────────────────────────────────────────────────

const ROLE_ACTIVITY = [
    { role: "Doctor", color: "bg-red-500", label: "Consultations", href: "/doctor/dashboard" },
    { role: "Nurse", color: "bg-teal-500", label: "Nursing Tasks", href: "/nurse/dashboard" },
    { role: "Labtech", color: "bg-indigo-500", label: "Lab Requests", href: "/lab-tech/dashboard" },
    { role: "Pharmacist", color: "bg-violet-500", label: "Dispensing", href: "/pharmacist/dashboard" },
    { role: "Frontdesk", color: "bg-blue-500", label: "Registration", href: "/front-desk/dashboard" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
    const { authorized } = useRoleProtection([UserRole.Admin]);

    const allPatients = useAllPatients();
    const awaiting = usePatientsByStatus(PatientStatus.AwaitingConsultation);
    const awaitingPay = usePatientsByStatus(PatientStatus.AwaitingPayment);

    const { data: labRequests } = usePendingLabRequests();
    const { data: prescriptions } = usePendingPrescriptions();
    const { data: nursingTasks } = usePendingNursingActions();

    if (!authorized) return null;

    const totalPatients = allPatients.data?.length ?? 0;

    const pendingLab = labRequests?.filter((r: any) => r.status === "pending").length ?? 0;
    const activePx = prescriptions?.filter((p: any) => p.status === "Active").length ?? 0;
    const pendingTasks = nursingTasks?.filter((t: any) => t.status === "Pending").length ?? 0;
    const pendingPay = awaitingPay.data?.length ?? 0;

    const stats = [
        { label: "Total Patient Records", value: totalPatients, icon: Users, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", href: "/admin/patient" },
        { label: "Awaiting Consultation", value: awaiting.data?.length ?? 0, icon: Stethoscope, color: "text-red-600", bg: "bg-red-50", border: "border-red-100", href: "/doctor/dashboard" },
        { label: "Pending Lab Tests", value: pendingLab, icon: FlaskConical, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", href: "/lab-tech/dashboard" },
        { label: "Active Prescriptions", value: activePx, icon: Pill, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100", href: "/pharmacist/dashboard" },
        { label: "Nursing Tasks", value: pendingTasks, icon: HeartPulse, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-100", href: "/nurse/dashboard" },
        { label: "Awaiting Payment", value: pendingPay, icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", href: "/front-desk/payment" },
    ];

    // Alerts
    const alerts = [
        pendingPay > 0 && { type: "warning", msg: `${pendingPay} patient${pendingPay > 1 ? "s" : ""} awaiting payment confirmation` },
        pendingLab > 5 && { type: "warning", msg: `${pendingLab} lab tests queued — lab scientist may need support` },
        activePx > 10 && { type: "info", msg: `${activePx} active prescriptions pending dispensing` },
    ].filter(Boolean) as { type: string; msg: string }[];

    return (
        <div className="space-y-6">

            <DashboardHeader
                title="Hospital operations overview"
                description="Monitor patient flow, department queues, billing, and staff activity from one place."
                icon={ShieldCheck}
                tone="amber"
                actions={
                    <div className="flex flex-wrap gap-2">
                        <Link href="/admin/staff"
                            className="flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50">
                            <Users size={13} /> Staff
                        </Link>
                        <Link href="/admin/audit"
                            className="flex h-9 items-center gap-2 rounded-xl bg-[#0a1628] px-3 text-xs font-bold text-white transition-all hover:bg-[#0f1f38]">
                            <Activity size={13} /> Audit Log
                        </Link>
                    </div>
                }
            />

            {/* ── Alerts ── */}
            {alerts.length > 0 && (
                <div className="space-y-2">
                    {alerts.map((a, i) => (
                        <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-medium
                            ${a.type === "warning" ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-blue-50 border-blue-100 text-blue-700"}`}>
                            <AlertTriangle size={13} className="shrink-0" />
                            {a.msg}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Stats grid ── */}
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {stats.map((s) => <StatCard key={s.label} {...s} />)}
            </div>

            {/* ── Department activity ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50">
                    <SectionHeader title="Department Activity" subtitle="Live status across all departments" />
                </div>
                <div className="px-6 py-5 space-y-3">
                    {ROLE_ACTIVITY.map(({ role, color, label, href }) => (
                        <Link key={role} href={href}
                            className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all group">
                            <div className={`w-2.5 h-2.5 rounded-full ${color} shrink-0`} />
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-800">{role}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                            </div>
                            <span className="text-xs font-bold text-gray-400 group-hover:text-gray-700 transition-colors">
                                View →
                            </span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Quick links ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                    { label: "Patient Records", href: "/admin/patient", color: "text-red-600", bg: "bg-red-50" },
                    { label: "Lab Reports", href: "/lab-tech/reports", color: "text-indigo-600", bg: "bg-indigo-50" },
                    { label: "Drug Inventory", href: "/pharmacist/inventory", color: "text-violet-600", bg: "bg-violet-50" },
                    { label: "Payment Queue", href: "/front-desk/payment", color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Staff Settings", href: "/admin/staff", color: "text-blue-600", bg: "bg-blue-50" },
                    { label: "Audit Trail", href: "/admin/audit", color: "text-gray-600", bg: "bg-gray-100" },
                ].map(({ label, href, color, bg }) => (
                    <Link key={label} href={href}
                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-gray-100 ${bg} hover:shadow-sm transition-all text-xs font-bold ${color}`}>
                        {label}
                    </Link>
                ))}
            </div>
        </div>
    );
}