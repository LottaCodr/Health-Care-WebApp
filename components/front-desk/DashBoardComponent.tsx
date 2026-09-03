"use client";

import React from "react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import { LoadingSkeleton } from "@/components/emr";
import {
    Users, ClipboardList, Wallet, LogOut, Plus,
    ChevronRight, ArrowRight, BedDouble, RefreshCcw,
    UserCheck, CalendarDays,
} from "lucide-react";
import Link from "next/link";
import PaymentConfirmation from "./PaymentSuite";
import { usePatientsByStatus, useAllPatients } from "@/hooks/emr/use-patients";
import {
    useActiveAdmissions,
} from "@/hooks/emr/use-admissions";
import { useAppointmentsByDate } from "@/hooks/emr/use-appointments";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { toHospitalISODate } from "@/lib/utils/appointment.utils";
import { fmtFull } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob?: string) {
    if (!dob) return null;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age < 1 ? "< 1 yr" : `${age} yrs`;
}

function registeredToday(patient: any): boolean {
    if (!patient?.created_at) return false;
    return String(patient.created_at).slice(0, 10) === toHospitalISODate();
}

// ─── Live status chip ─────────────────────────────────────────────────────────

const STATUS_CHIP: Record<string, string> = {
    "registered":            "bg-blue-50 text-blue-700 border-blue-100",
    "sent-to-nurse":         "bg-teal-50 text-teal-700 border-teal-100",
    "awaiting-consultation": "bg-amber-50 text-amber-700 border-amber-100",
    "under-consultation":    "bg-violet-50 text-violet-700 border-violet-100",
    "sent-to-lab":           "bg-indigo-50 text-indigo-700 border-indigo-100",
    "sent-to-radiology":     "bg-cyan-50 text-cyan-700 border-cyan-100",
    "sent-to-pharmacy":      "bg-pink-50 text-pink-700 border-pink-100",
    "awaiting-payment":      "bg-red-50 text-red-700 border-red-100",
    "admitted":              "bg-blue-50 text-blue-700 border-blue-100",
    "under-observation":     "bg-orange-50 text-orange-700 border-orange-100",
    "discharged":            "bg-green-50 text-green-700 border-green-100",
};

function StatusChip({ status }: { status?: string }) {
    const key = (status ?? "").toLowerCase();
    const label = key
        ? key.split("-").map(w => w[0]?.toUpperCase() + w.slice(1)).join(" ")
        : "No status";
    return (
        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${STATUS_CHIP[key] ?? "bg-gray-50 text-gray-500 border-gray-100"}`}>
            <span className="w-1 h-1 rounded-full bg-current opacity-60" />
            {label}
        </span>
    );
}

// ─── Patient row ──────────────────────────────────────────────────────────────

function PatientRow({ patient, action, secondaryAction }: {
    patient:  any;
    action:   { label: string; href: string; color: string };
    secondaryAction?: { label: string; href: string; color: string };
}) {
    const age = calcAge(patient.birth_date ?? patient.date_of_birth);
    const initials = typeof patient.name === "string" && patient.name.length > 0
        ? patient.name[0].toUpperCase()
        : "?";
    return (
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-blue-300 transition-colors group">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center font-black text-blue-600 text-sm shrink-0">
                {initials}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{patient.name ?? "—"}</p>
                <p className="text-[11px] text-gray-400">
                    {patient.gender ?? ""}
                    {age ? ` · ${age}` : ""}
                    {patient.phone ? ` · ${patient.phone}` : ""}
                </p>
            </div>
            {secondaryAction && (
                <Link href={secondaryAction.href}
                    title={secondaryAction.label}
                    className={`shrink-0 hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${secondaryAction.color}`}>
                    {secondaryAction.label}
                </Link>
            )}
            <Link href={action.href}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-white text-xs font-bold transition-colors ${action.color}`}>
                {action.label} <ArrowRight size={11} />
            </Link>
        </div>
    );
}

// ─── Today's-arrival row (status chip shows live journey stage) ───────────────

function ArrivalRow({ patient }: { patient: any }) {
    const age = calcAge(patient.birth_date ?? patient.date_of_birth);
    const initials = typeof patient.name === "string" && patient.name.length > 0
        ? patient.name[0].toUpperCase()
        : "?";
    return (
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-blue-300 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center font-black text-blue-600 text-sm shrink-0">
                {initials}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{patient.name ?? "—"}</p>
                <p className="text-[11px] text-gray-400">
                    {patient.gender ?? ""}
                    {age ? ` · ${age}` : ""}
                    {patient.created_at ? ` · ${fmtFull(patient.created_at)}` : ""}
                </p>
            </div>
            <StatusChip status={patient.status} />
            <Link href={`/front-desk/patient/${patient.id}`}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-white text-xs font-bold transition-colors bg-blue-600 hover:bg-blue-700">
                Open <ArrowRight size={11} />
            </Link>
        </div>
    );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon: Icon, iconBg, iconColor, title, subtitle, badge, badgeColor, href, hrefLabel, children, loading, empty, extraHeaderContent }: {
    icon: React.ElementType; iconBg: string; iconColor: string;
    title: string; subtitle: string;
    badge?: number; badgeColor?: string;
    href?: string; hrefLabel?: string;
    children: React.ReactNode;
    loading?: boolean;
    empty?: React.ReactNode;
    extraHeaderContent?: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden">
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 border-b border-gray-50">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                        <Icon size={15} className={iconColor} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800 leading-tight">{title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {extraHeaderContent}
                    {typeof badge === "number" && badge > 0 && (
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
            <div className="px-4 py-4 sm:px-6 space-y-2.5">
                {loading ? <LoadingSkeleton rows={3} /> : empty}
                {!loading && children}
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FrontDeskDashboard() {
    const { authorized } = useRoleProtection([UserRole.FrontDesk, UserRole.Admin]);

    const allPatients         = useAllPatients();
    const awaitingConsult     = usePatientsByStatus(PatientStatus.AwaitingConsultation);
    const awaitingPayment     = usePatientsByStatus(PatientStatus.AwaitingPayment);
    const discharged          = usePatientsByStatus(PatientStatus.Discharged);
    const activeAdmissions    = useActiveAdmissions();
    const todayAppointments   = useAppointmentsByDate(toHospitalISODate());

    // "New arrivals" = every patient registered today, regardless of which
    // stage of the journey they have reached (nurse triage, doctor, billing…).
    const todaysArrivals = Array.isArray(allPatients.data)
        ? allPatients.data.filter(registeredToday)
        : [];

    const handleRefresh = () => {
        void Promise.all([
            allPatients.refetch(),
            awaitingConsult.refetch(),
            awaitingPayment.refetch(),
            discharged.refetch(),
            activeAdmissions.refetch(),
            todayAppointments.refetch(),
        ]);
    };

    if (!authorized) return null;

    const admittedPatients = Array.isArray(activeAdmissions.data) ? activeAdmissions.data : [];
    const admittedPatientsLength = admittedPatients.length;

    const stats = [
        { label: "New Arrivals",     value: todaysArrivals.length, icon: Users,         color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100"   },
        { label: "In Queue",         value: Array.isArray(awaitingConsult.data) ? awaitingConsult.data.length : 0, icon: ClipboardList,  color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-100"  },
        { label: "Admitted",         value: admittedPatientsLength                                     , icon: BedDouble,      color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
        { label: "Pending Payment",  value: Array.isArray(awaitingPayment.data) ? awaitingPayment.data.length : 0, icon: Wallet,         color: "text-red-600",    bg: "bg-red-50",    border: "border-red-100"    },
        { label: "Discharged",       value: Array.isArray(discharged.data) ? discharged.data.length : 0, icon: LogOut,         color: "text-green-600",  bg: "bg-green-50",  border: "border-green-100"  },
        { label: "Appointments Today", value: Array.isArray(todayAppointments.data) ? todayAppointments.data.length : 0, icon: CalendarDays, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-100" },
    ];

    // True if any section is loading
    const anyLoading =
        allPatients.isLoading ||
        awaitingConsult.isLoading ||
        awaitingPayment.isLoading ||
        discharged.isLoading ||
        activeAdmissions.isLoading ||
        todayAppointments.isLoading;

    // fix: wrap callbacks in functions instead of passing potentially undefined or wrong signatures

    const handleRegisteredRefresh = () => {
        if (typeof allPatients.refetch === "function") {
            allPatients.refetch();
        }
    };
    const handleActiveAdmissionsRefresh = () => {
        if (typeof activeAdmissions.refetch === "function") {
            activeAdmissions.refetch();
        }
    };
    const handleAwaitingPaymentRefresh = () => {
        if (typeof awaitingPayment.refetch === "function") {
            awaitingPayment.refetch();
        }
    };
    const handleDischargedRefresh = () => {
        if (typeof discharged.refetch === "function") {
            discharged.refetch();
        }
    };

    return (
        <div className="space-y-6">

            <DashboardHeader
                title="Front desk operations"
                description="Coordinate arrivals, admissions, appointments, and billing from today’s live queues."
                icon={ClipboardList}
                tone="blue"
                actions={
                    <Link href="/front-desk/patient/new" className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white transition-colors hover:bg-blue-700">
                        <Plus size={13} /> Register patient
                    </Link>
                }
            />

            {/* ── Stats and Refresh ── */}
            <div className="space-y-3">
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3">
                    {stats.map(s => {
                        const Icon = s.icon;
                        return (
                            <div key={s.label} className={`bg-white rounded-2xl border ${s.border} px-4 py-4 flex items-center gap-3 hover:border-gray-300 transition-colors`}>
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
                <button
                    aria-label="Refresh dashboard"
                    className="ml-auto flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 shadow-sm text-xs font-bold text-gray-600 bg-white hover:bg-blue-50 hover:text-blue-700 transition-all"
                    onClick={handleRefresh}
                    disabled={anyLoading}
                    type="button"
                    style={{ minWidth: 40 }}
                >
                    <RefreshCcw size={16} className={anyLoading ? "animate-spin" : ""} />
                    <span className="hidden sm:inline">{anyLoading ? "Refreshing..." : "Refresh"}</span>
                </button>
            </div>

            {/* ── Row 1: New arrivals + Admitted patients ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Today's arrivals */}
                <Section
                    icon={Users}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                    title="Today's Arrivals"
                    subtitle="Patients registered today and their live journey stage"
                    badge={todaysArrivals.length}
                    badgeColor="bg-blue-50 text-blue-700 border-blue-100"
                    href="/front-desk/queue"
                    hrefLabel="View All"
                    loading={allPatients.isLoading}
                    empty={todaysArrivals.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No patients registered yet today</p>
                    ) : undefined}
                    extraHeaderContent={
                        <button
                            aria-label="Refresh new arrivals"
                            type="button"
                            className="flex items-center text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors p-1 rounded-lg"
                            onClick={handleRegisteredRefresh}
                            disabled={allPatients.isLoading}
                        >
                            <RefreshCcw size={14} className={allPatients.isLoading ? "animate-spin" : ""} />
                        </button>
                    }
                >
                    {todaysArrivals.slice(0, 5).map(p => (
                        <ArrivalRow key={p.id} patient={p} />
                    ))}
                    <Link href="/front-desk/patient/new" className="block mt-1">
                        {/* Button should not be a child of Link in Next.js 13+; so use only <Link> as stylable element */}
                        <span className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 text-gray-400 hover:text-blue-600 text-xs font-bold uppercase tracking-widest transition-all">
                            <Plus size={13} /> Register New Patient
                        </span>
                    </Link>
                </Section>

                {/* Admitted patients — doctor routed here (using useActiveAdmissions) */}
                <Section
                    icon={BedDouble}
                    iconBg="bg-indigo-50"
                    iconColor="text-indigo-600"
                    title="Admitted Patients"
                    subtitle="Awaiting bed / ward assignment"
                    badge={admittedPatientsLength}
                    badgeColor="bg-indigo-50 text-indigo-700 border-indigo-100"
                    href="/front-desk/admissions"
                    hrefLabel="Manage"
                    loading={activeAdmissions.isLoading}
                    empty={admittedPatientsLength === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2">
                            <BedDouble size={20} className="text-gray-200" />
                            <p className="text-sm text-gray-400">No patients awaiting admission</p>
                        </div>
                    ) : undefined}
                    extraHeaderContent={
                        <button
                            aria-label="Refresh admitted patients"
                            type="button"
                            className="flex items-center text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors p-1 rounded-lg"
                            onClick={handleActiveAdmissionsRefresh}
                            disabled={activeAdmissions.isLoading}
                        >
                            <RefreshCcw size={14} className={activeAdmissions.isLoading ? "animate-spin" : ""} />
                        </button>
                    }
                >
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
                    icon={Wallet}
                    iconBg="bg-red-50"
                    iconColor="text-red-600"
                    title="Billing Queue"
                    subtitle="Patients awaiting checkout"
                    badge={Array.isArray(awaitingPayment.data) ? awaitingPayment.data.length : 0}
                    badgeColor="bg-red-50 text-red-700 border-red-100"
                    href="/front-desk/payment"
                    hrefLabel="Process All"
                    loading={awaitingPayment.isLoading}
                    empty={Array.isArray(awaitingPayment.data) && awaitingPayment.data.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">Billing clear</p>
                    ) : undefined}
                    extraHeaderContent={
                        <button
                            aria-label="Refresh billing queue"
                            type="button"
                            className="flex items-center text-red-600 bg-red-50 hover:bg-red-100 transition-colors p-1 rounded-lg"
                            onClick={handleAwaitingPaymentRefresh}
                            disabled={awaitingPayment.isLoading}
                        >
                            <RefreshCcw size={14} className={awaitingPayment.isLoading ? "animate-spin" : ""} />
                        </button>
                    }
                >
                    {Array.isArray(awaitingPayment.data) && awaitingPayment.data.slice(0, 5).map(p => (
                        <PatientRow key={p.id} patient={p}
                            action={{ label: "Checkout", href: `/front-desk/payment/${p.id}`, color: "bg-red-600 hover:bg-red-700" }}
                            secondaryAction={{ label: "Request Lab", href: `/front-desk/patient/${p.id}?tab=lab`, color: "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100" }} />
                    ))}
                </Section>

                {/* Recently discharged — quick re-admit */}
                <Section
                    icon={UserCheck}
                    iconBg="bg-green-50"
                    iconColor="text-green-600"
                    title="Recently Discharged"
                    subtitle="Tap to re-admit if returning"
                    badge={Array.isArray(discharged.data) ? discharged.data.length : 0}
                    badgeColor="bg-green-50 text-green-700 border-green-100"
                    loading={discharged.isLoading}
                    empty={Array.isArray(discharged.data) && discharged.data.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No recently discharged patients</p>
                    ) : undefined}
                    extraHeaderContent={
                        <button
                            aria-label="Refresh recently discharged"
                            type="button"
                            className="flex items-center text-green-600 bg-green-50 hover:bg-green-100 transition-colors p-1 rounded-lg"
                            onClick={handleDischargedRefresh}
                            disabled={discharged.isLoading}
                        >
                            <RefreshCcw size={14} className={discharged.isLoading ? "animate-spin" : ""} />
                        </button>
                    }
                >
                    {Array.isArray(discharged.data) && discharged.data.slice(0, 5).map(p => (
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