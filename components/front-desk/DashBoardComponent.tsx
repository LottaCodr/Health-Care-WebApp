"use client";

import React from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import { LoadingSkeleton } from "@/components/emr";
import {
    Users, ClipboardList, Wallet, LogOut, Plus,
    ChevronRight, ArrowRight, BedDouble, RefreshCcw,
    Calendar, UserCheck,
} from "lucide-react";
import Link from "next/link";
import PaymentConfirmation from "./PaymentSuite";
import { usePatientsByStatus } from "@/hooks/emr/use-patients";
import {
    useActiveAdmissions,
    usePatientAdmissions,
    useCreateAdmission,
    useAssignWard,
    useDischargeFromWard,
} from "@/hooks/emr/use-admissions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso?: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function calcAge(dob?: string) {
    if (!dob) return null;
    const y = new Date().getFullYear() - new Date(dob).getFullYear();
    return y < 1 ? "< 1 yr" : `${y} yrs`;
}

// ─── Patient row ──────────────────────────────────────────────────────────────

function PatientRow({ patient, action }: {
    patient:  any;
    action:   { label: string; href: string; color: string };
}) {
    const age    = calcAge(patient.birth_date ?? patient.date_of_birth);
    const initials = (patient.name ?? "?")[0].toUpperCase();
    return (
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-100 hover:shadow-sm transition-all group">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center font-black text-blue-600 text-sm shrink-0">
                {initials}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{patient.name ?? "—"}</p>
                <p className="text-[11px] text-gray-400">
                    {patient.gender ?? ""}{age ? ` · ${age}` : ""}{patient.phone ? ` · ${patient.phone}` : ""}
                </p>
            </div>
            <Link href={action.href}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-white text-xs font-bold transition-colors ${action.color}`}>
                {action.label} <ArrowRight size={11} />
            </Link>
        </div>
    );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon: Icon, iconBg, iconColor, title, subtitle, badge, badgeColor, href, hrefLabel, children, loading, empty }: {
    icon: React.ElementType; iconBg: string; iconColor: string;
    title: string; subtitle: string;
    badge?: number; badgeColor?: string;
    href?: string; hrefLabel?: string;
    children: React.ReactNode;
    loading?: boolean;
    empty?: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                        <Icon size={15} className={iconColor} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800 leading-tight">{title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {badge !== undefined && badge > 0 && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badgeColor}`}>
                            {badge}
                        </span>
                    )}
                    {href && hrefLabel && (
                        <Link href={href} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                            {hrefLabel} <ChevronRight size={13} />
                        </Link>
                    )}
                </div>
            </div>
            <div className="px-6 py-4 space-y-2.5">
                {loading ? <LoadingSkeleton rows={3} /> : empty}
                {!loading && children}
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FrontDeskDashboard() {
    const { authorized } = useRoleProtection([UserRole.FrontDesk, UserRole.Admin]);

    const registered          = usePatientsByStatus(PatientStatus.Registered);
    const awaitingConsult     = usePatientsByStatus(PatientStatus.AwaitingConsultation);
    const awaitingPayment     = usePatientsByStatus(PatientStatus.AwaitingPayment);
    const discharged          = usePatientsByStatus(PatientStatus.Discharged);
    // Use useActiveAdmissions for admitted/admitted patients
    const activeAdmissions    = useActiveAdmissions();

    if (!authorized) return null;

    const admittedPatients = activeAdmissions.data || [];
    const admittedPatientsLength = admittedPatients.length;

    const stats = [
        { label: "New Arrivals",     value: registered.data?.length      ?? 0, icon: Users,         color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100"   },
        { label: "In Queue",         value: awaitingConsult.data?.length  ?? 0, icon: ClipboardList,  color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-100"  },
        { label: "Admitted",         value: admittedPatientsLength        ?? 0, icon: BedDouble,      color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
        { label: "Pending Payment",  value: awaitingPayment.data?.length  ?? 0, icon: Wallet,         color: "text-red-600",    bg: "bg-red-50",    border: "border-red-100"    },
        { label: "Discharged Today", value: discharged.data?.length       ?? 0, icon: LogOut,         color: "text-green-600",  bg: "bg-green-50",  border: "border-green-100"  },
    ];

    return (
        <div className="space-y-6">

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {stats.map(s => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className={`bg-white rounded-2xl border ${s.border} shadow-sm px-4 py-4 flex items-center gap-3 hover:shadow-md transition-shadow`}>
                            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                                <Icon size={17} className={s.color} />
                            </div>
                            <div>
                                <p className="text-xl font-extrabold text-gray-900 leading-none">{s.value}</p>
                                <p className="text-[10px] text-gray-400 font-medium mt-0.5 leading-tight">{s.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Row 1: New arrivals + Admitted patients ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* New arrivals */}
                <Section
                    icon={Users} iconBg="bg-blue-50" iconColor="text-blue-600"
                    title="New Arrivals" subtitle="Patients registered today"
                    badge={registered.data?.length} badgeColor="bg-blue-50 text-blue-700 border-blue-100"
                    href="/front-desk/queue" hrefLabel="View All"
                    loading={registered.isLoading}
                    empty={registered.data?.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No new arrivals</p>
                    ) : undefined}>
                    {registered.data?.slice(0, 5).map(p => (
                        <PatientRow key={p.id} patient={p}
                            action={{ label: "Check In", href: `/front-desk/patient/${p.id}`, color: "bg-blue-600 hover:bg-blue-700" }} />
                    ))}
                    <Link href="/front-desk/patient/new" className="block mt-1">
                        <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 text-gray-400 hover:text-blue-600 text-xs font-bold uppercase tracking-widest transition-all">
                            <Plus size={13} /> Register New Patient
                        </button>
                    </Link>
                </Section>

                {/* Admitted patients — doctor routed here (using useActiveAdmissions) */}
                <Section
                    icon={BedDouble} iconBg="bg-indigo-50" iconColor="text-indigo-600"
                    title="Admitted Patients" subtitle="Awaiting bed / ward assignment"
                    badge={admittedPatientsLength} badgeColor="bg-indigo-50 text-indigo-700 border-indigo-100"
                    href="/front-desk/admissions" hrefLabel="Manage"
                    loading={activeAdmissions.isLoading}
                    empty={admittedPatientsLength === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2">
                            <BedDouble size={20} className="text-gray-200" />
                            <p className="text-sm text-gray-400">No patients awaiting admission</p>
                        </div>
                    ) : undefined}>
                    {admittedPatients.slice(0, 5).map(p => (
                        <PatientRow key={p.id} patient={p}
                            action={{ label: "Assign Bed", href: `/front-desk/admissions/${p.id}`, color: "bg-indigo-600 hover:bg-indigo-700" }} />
                    ))}
                </Section>
            </div>

            {/* ── Row 2: Billing queue + Discharged (potential return visits) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Billing queue */}
                <Section
                    icon={Wallet} iconBg="bg-red-50" iconColor="text-red-600"
                    title="Billing Queue" subtitle="Patients awaiting checkout"
                    badge={awaitingPayment.data?.length} badgeColor="bg-red-50 text-red-700 border-red-100"
                    href="/front-desk/payment" hrefLabel="Process All"
                    loading={awaitingPayment.isLoading}
                    empty={awaitingPayment.data?.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">Billing clear</p>
                    ) : undefined}>
                    {awaitingPayment.data?.slice(0, 5).map(p => (
                        <PatientRow key={p.id} patient={p}
                            action={{ label: "Checkout", href: `/front-desk/payment/${p.id}`, color: "bg-red-600 hover:bg-red-700" }} />
                    ))}
                </Section>

                {/* Recently discharged — quick re-admit */}
                <Section
                    icon={UserCheck} iconBg="bg-green-50" iconColor="text-green-600"
                    title="Recently Discharged" subtitle="Tap to re-admit if returning"
                    badge={discharged.data?.length} badgeColor="bg-green-50 text-green-700 border-green-100"
                    loading={discharged.isLoading}
                    empty={discharged.data?.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No recently discharged patients</p>
                    ) : undefined}>
                    {discharged.data?.slice(0, 5).map(p => (
                        <PatientRow key={p.id} patient={p}
                            action={{ label: "Re-admit", href: `/front-desk/patient/${p.id}?readmit=1`, color: "bg-green-600 hover:bg-green-700" }} />
                    ))}
                </Section>
            </div>

            {/* ── Payment confirmation ── */}
            <PaymentConfirmation />
        </div>
    );
}