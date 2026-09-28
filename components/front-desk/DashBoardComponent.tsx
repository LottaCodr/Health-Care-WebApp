"use client";

import React from "react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import { LoadingSkeleton } from "@/components/emr";
import {
    Users, ClipboardList, Wallet, LogOut, Plus,
    ChevronRight, ArrowRight, BedDouble, RefreshCcw,
    UserCheck, CalendarDays, AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import PaymentConfirmation from "./PaymentSuite";
import {
    usePatientsByStatus,
    useTodaysArrivals,
} from "@/hooks/emr/use-patients";
import {
    useActiveAdmissions,
} from "@/hooks/emr/use-admissions";
import { useAppointmentsByDate } from "@/hooks/emr/use-appointments";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { toHospitalISODate } from "@/lib/utils/appointment.utils";
import { fmtFull } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

/** Human-readable reason for a failed query (strips the Next.js digest boilerplate). */
function errorText(err: unknown, fallback = "Something went wrong while loading this list."): string {
    const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
    const clean = (raw ?? "").trim();
    if (!clean) return fallback;
    if (clean.includes("An error occurred in the Server Components render")) {
        return "Something went wrong while loading this list. Please retry.";
    }
    return clean;
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
        <Badge variant="outline" className={`inline-flex gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold whitespace-nowrap ${STATUS_CHIP[key] ?? "bg-gray-50 text-gray-500 border-gray-100"}`}>
            <span className="h-1 w-1 rounded-full bg-current opacity-60" />
            {label}
        </Badge>
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
                <Button asChild variant="outline" size="sm"
                    className={`hidden sm:inline-flex h-8 rounded-xl px-3 text-xs font-bold ${secondaryAction.color}`}>
                    <Link href={secondaryAction.href} title={secondaryAction.label}>
                        {secondaryAction.label}
                    </Link>
                </Button>
            )}
            <Button asChild size="sm"
                className={`h-8 shrink-0 rounded-xl px-3 text-xs font-bold text-white shadow-sm hover:opacity-90 ${action.color}`}>
                <Link href={action.href}>
                    {action.label} <ArrowRight size={11} />
                </Link>
            </Button>
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
            <Button asChild size="sm"
                className="h-8 shrink-0 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white shadow-sm hover:bg-blue-700">
                <Link href={`/front-desk/patient/${patient.id}`}>
                    Open <ArrowRight size={11} />
                </Link>
            </Button>
        </div>
    );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon: Icon, iconBg, iconColor, title, subtitle, badge, badgeColor, href, hrefLabel, children, loading, empty, error, onRetry, extraHeaderContent }: {
    icon: React.ElementType; iconBg: string; iconColor: string;
    title: string; subtitle: string;
    badge?: number; badgeColor?: string;
    href?: string; hrefLabel?: string;
    children: React.ReactNode;
    loading?: boolean;
    empty?: React.ReactNode;
    /** When set, the section renders this error banner instead of its rows. */
    error?: string | null;
    onRetry?: () => void;
    extraHeaderContent?: React.ReactNode;
}) {
    return (
        <Card className="overflow-hidden rounded-3xl border-gray-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-gray-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
                <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                        <Icon size={15} className={iconColor} />
                    </div>
                    <div>
                        <p className="text-sm font-bold leading-tight text-gray-800">{title}</p>
                        <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {extraHeaderContent}
                    {typeof badge === "number" && badge > 0 && (
                        <Badge variant="outline" className={`rounded-full px-2.5 py-1 text-xs font-bold ${badgeColor}`}>
                            {badge}
                        </Badge>
                    )}
                    {href && hrefLabel && (
                        <Link href={href} className="flex items-center gap-1 text-xs font-bold text-blue-600 transition-colors hover:text-blue-800">
                            {hrefLabel} <ChevronRight size={13} />
                        </Link>
                    )}
                </div>
            </div>
            <div className="space-y-2.5 px-4 py-4 sm:px-6">
                {loading ? (
                    <LoadingSkeleton rows={3} />
                ) : error ? (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-6 text-center">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-100">
                            <AlertTriangle size={16} className="text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-red-700">Couldn’t load {title.toLowerCase()}</p>
                            <p className="mt-1 text-xs text-red-600/80 break-words">{error}</p>
                        </div>
                        {onRetry && (
                            <Button size="sm" variant="outline" onClick={onRetry}
                                className="h-8 rounded-xl border-red-200 text-xs font-bold text-red-700 hover:bg-red-100">
                                <RefreshCcw size={13} /> Retry
                            </Button>
                        )}
                    </div>
                ) : (
                    <>
                        {empty}
                        {children}
                    </>
                )}
            </div>
        </Card>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FrontDeskDashboard() {
    const { authorized } = useRoleProtection([UserRole.FrontDesk, UserRole.Admin]);

    const todaysArrivalsQuery = useTodaysArrivals(50);
    const awaitingConsult     = usePatientsByStatus(PatientStatus.AwaitingConsultation);
    const awaitingPayment     = usePatientsByStatus(PatientStatus.AwaitingPayment);
    const discharged          = usePatientsByStatus(PatientStatus.Discharged);
    const activeAdmissions    = useActiveAdmissions();
    const todayAppointments   = useAppointmentsByDate(toHospitalISODate());

    // "New arrivals" = every patient registered today, regardless of which
    // stage of the journey they have reached (nurse triage, doctor, billing…).
    // Count and list both come from the database (start-of-hospital-day
    // boundary), so the card and the list always agree.
    const todaysArrivals = todaysArrivalsQuery.data?.patients ?? [];
    const todaysArrivalsTotal = todaysArrivalsQuery.data?.total ?? todaysArrivals.length;

    const handleRefresh = () => {
        void Promise.all([
            todaysArrivalsQuery.refetch(),
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
        { label: "New Arrivals",     value: todaysArrivalsTotal,                                                    icon: Users,         color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100",   loading: todaysArrivalsQuery.isLoading },
        { label: "In Queue",         value: Array.isArray(awaitingConsult.data) ? awaitingConsult.data.length : 0, icon: ClipboardList,  color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-100",  loading: awaitingConsult.isLoading },
        { label: "Admitted",         value: admittedPatientsLength                                     , icon: BedDouble,      color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", loading: activeAdmissions.isLoading },
        { label: "Pending Payment",  value: Array.isArray(awaitingPayment.data) ? awaitingPayment.data.length : 0, icon: Wallet,         color: "text-red-600",    bg: "bg-red-50",    border: "border-red-100",    loading: awaitingPayment.isLoading },
        { label: "Discharged",       value: Array.isArray(discharged.data) ? discharged.data.length : 0, icon: LogOut,         color: "text-green-600",  bg: "bg-green-50",  border: "border-green-100",  loading: discharged.isLoading },
        { label: "Appointments Today", value: Array.isArray(todayAppointments.data) ? todayAppointments.data.length : 0, icon: CalendarDays, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-100", loading: todayAppointments.isLoading },
    ];

    // True if any section is loading
    const anyLoading =
        todaysArrivalsQuery.isLoading ||
        awaitingConsult.isLoading ||
        awaitingPayment.isLoading ||
        discharged.isLoading ||
        activeAdmissions.isLoading ||
        todayAppointments.isLoading;

    // fix: wrap callbacks in functions instead of passing potentially undefined or wrong signatures

    const handleArrivalsRefresh = () => {
        if (typeof todaysArrivalsQuery.refetch === "function") {
            void todaysArrivalsQuery.refetch();
        }
    };
    const handleActiveAdmissionsRefresh = () => {
        if (typeof activeAdmissions.refetch === "function") {
            void activeAdmissions.refetch();
        }
    };
    const handleAwaitingPaymentRefresh = () => {
        if (typeof awaitingPayment.refetch === "function") {
            void awaitingPayment.refetch();
        }
    };
    const handleDischargedRefresh = () => {
        if (typeof discharged.refetch === "function") {
            void discharged.refetch();
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
                    <Button asChild size="sm" className="h-9 gap-2 rounded-xl bg-blue-600 text-xs font-bold hover:bg-blue-700">
                        <Link href="/front-desk/patient/new">
                            <Plus size={13} /> Register patient
                        </Link>
                    </Button>
                }
            />

            {/* ── Stats and Refresh ── */}
            <div className="space-y-3">
                <div className="grid min-[420px]:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 grid-cols-1 gap-3">
                    {stats.map(s => {
                        const Icon = s.icon;
                        return (
                            <Card key={s.label} className={`flex items-center gap-3 rounded-2xl px-4 py-4 transition-colors hover:border-gray-300 ${s.border}`}>
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
                                    <Icon size={17} className={s.color} />
                                </div>
                                <div>
                                    {s.loading ? (
                                        <Skeleton className="mb-1 h-6 w-10" />
                                    ) : (
                                        <p className="text-xl font-extrabold leading-none text-gray-900">{s.value}</p>
                                    )}
                                    <p className="mt-0.5 text-[10px] font-medium leading-tight text-gray-400">{s.label}</p>
                                </div>
                            </Card>
                        );
                    })}
                </div>
                <Button
                    aria-label="Refresh dashboard"
                    variant="outline"
                    size="sm"
                    className="ml-auto h-auto rounded-lg px-3 py-2 text-xs font-bold shadow-sm"
                    onClick={handleRefresh}
                    disabled={anyLoading}
                    type="button"
                    style={{ minWidth: 40 }}
                >
                    <RefreshCcw size={16} className={anyLoading ? "animate-spin" : ""} />
                    <span className="hidden sm:inline">{anyLoading ? "Refreshing..." : "Refresh"}</span>
                </Button>
            </div>

            {/* ── Row 1: New arrivals + Admitted patients ── */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                {/* Today's arrivals */}
                <Section
                    icon={Users}
                    iconBg="bg-blue-50"
                    iconColor="text-blue-600"
                    title="Today's Arrivals"
                    subtitle="Patients registered today and their live journey stage"
                    badge={todaysArrivalsTotal}
                    badgeColor="bg-blue-50 text-blue-700 border-blue-100"
                    href="/front-desk/queue"
                    hrefLabel="View All"
                    loading={todaysArrivalsQuery.isLoading}
                    error={todaysArrivalsQuery.error ? errorText(todaysArrivalsQuery.error) : null}
                    onRetry={handleArrivalsRefresh}
                    empty={todaysArrivals.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400">No patients registered yet today</p>
                    ) : undefined}
                    extraHeaderContent={
                        <Button
                            aria-label="Refresh new arrivals"
                            type="button"
                            className="flex items-center rounded-lg bg-blue-50 p-1 text-blue-600 transition-colors hover:bg-blue-100"
                            onClick={handleArrivalsRefresh}
                            disabled={todaysArrivalsQuery.isLoading}
                        >
                            <RefreshCcw size={14} className={todaysArrivalsQuery.isLoading ? "animate-spin" : ""} />
                        </Button>
                    }
                >
                    {todaysArrivals.slice(0, 5).map(p => (
                        <ArrivalRow key={p.id} patient={p} />
                    ))}
                    <Button asChild variant="ghost"
                        className="mt-1 w-full gap-2 rounded-xl border-2 border-dashed border-gray-200 text-xs font-bold uppercase tracking-widest text-gray-400 hover:border-blue-300 hover:bg-blue-50/40 hover:text-blue-600">
                        <Link href="/front-desk/patient/new">
                            <Plus size={13} /> Register New Patient
                        </Link>
                    </Button>
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
                    error={activeAdmissions.error ? errorText(activeAdmissions.error) : null}
                    onRetry={handleActiveAdmissionsRefresh}
                    empty={admittedPatientsLength === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-10">
                            <BedDouble size={20} className="text-gray-200" />
                            <p className="text-sm text-gray-400">No patients awaiting admission</p>
                        </div>
                    ) : undefined}
                    extraHeaderContent={
                        <Button
                            aria-label="Refresh admitted patients"
                            type="button"
                            className="flex items-center rounded-lg bg-indigo-50 p-1 text-indigo-600 transition-colors hover:bg-indigo-100"
                            onClick={handleActiveAdmissionsRefresh}
                            disabled={activeAdmissions.isLoading}
                        >
                            <RefreshCcw size={14} className={activeAdmissions.isLoading ? "animate-spin" : ""} />
                        </Button>
                    }
                >
                    {admittedPatients.slice(0, 5).map(p => (
                        <PatientRow key={p.id} patient={p}
                            action={{ label: "Assign Bed", href: `/front-desk/admissions/${p.id}`, color: "bg-indigo-600 hover:bg-indigo-700" }} />
                    ))}
                </Section>
            </div>

            {/* ── Row 2: Billing queue + Discharged (potential return visits) ── */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

                {/* Billing queue */}
                <Section
                    icon={Wallet}
                    iconBg="bg-amber-50"
                    iconColor="text-amber-700"
                    title="Billing Queue"
                    subtitle="Patients awaiting checkout"
                    badge={Array.isArray(awaitingPayment.data) ? awaitingPayment.data.length : 0}
                    badgeColor="bg-amber-50 text-amber-800 border-amber-200"
                    href="/front-desk/payment"
                    hrefLabel="Process All"
                    loading={awaitingPayment.isLoading}
                    error={awaitingPayment.error ? errorText(awaitingPayment.error) : null}
                    onRetry={handleAwaitingPaymentRefresh}
                    empty={Array.isArray(awaitingPayment.data) && awaitingPayment.data.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400">Billing clear</p>
                    ) : undefined}
                    extraHeaderContent={
                        <Button
                            aria-label="Refresh billing queue"
                            type="button"
                            variant="ghost" className="flex items-center rounded-lg bg-amber-50 p-1 text-amber-700 transition-colors hover:bg-amber-100"
                            onClick={handleAwaitingPaymentRefresh}
                            disabled={awaitingPayment.isLoading}
                        >
                            <RefreshCcw size={14} className={awaitingPayment.isLoading ? "animate-spin" : ""} />
                        </Button>
                    }
                >
                    {Array.isArray(awaitingPayment.data) && awaitingPayment.data.slice(0, 5).map(p => (
                        <PatientRow key={p.id} patient={p}
                            action={{ label: "Checkout", href: `/front-desk/payment/${p.id}`, color: "bg-primary hover:bg-primary/90" }}
                            secondaryAction={{ label: "Request Lab", href: `/front-desk/patient/${p.id}?tab=lab`, color: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100" }} />
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
                    error={discharged.error ? errorText(discharged.error) : null}
                    onRetry={handleDischargedRefresh}
                    empty={Array.isArray(discharged.data) && discharged.data.length === 0 ? (
                        <p className="py-8 text-center text-sm text-gray-400">No recently discharged patients</p>
                    ) : undefined}
                    extraHeaderContent={
                        <Button
                            aria-label="Refresh recently discharged"
                            type="button"
                            className="flex items-center rounded-lg bg-green-50 p-1 text-green-600 transition-colors hover:bg-green-100"
                            onClick={handleDischargedRefresh}
                            disabled={discharged.isLoading}
                        >
                            <RefreshCcw size={14} className={discharged.isLoading ? "animate-spin" : ""} />
                        </Button>
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
