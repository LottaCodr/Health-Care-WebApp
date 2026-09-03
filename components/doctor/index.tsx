"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import CountUp from "react-countup";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import { usePatientsByStatus, useConsultationsByDoctor, useUpdateConsultation } from "@/hooks/emr/use-emr";
import { useAppointmentsByDate } from "@/hooks/emr/use-appointments";
import { LoadingSkeleton, EmptyState, ErrorAlert } from "@/components/emr";
import {
    Clock, ClipboardList, CheckCircle2, Loader2,
    ChevronRight, Stethoscope, Activity, FileText,
    Calendar, BedDouble, Baby, RefreshCcw, Send,
    CalendarClock, Search, Sparkles, ArrowRight,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { toHospitalISODate, resolvePatientName } from "@/lib/utils/appointment.utils";
import { toast } from "sonner";
import { fmtDate, fmtFull } from "@/lib/utils";
import { AttendantPill } from "@/components/emr/care-team";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob?: string | null) {
    if (!dob) return null;
    const y = new Date().getFullYear() - new Date(dob).getFullYear();
    return y < 1 ? "< 1 yr" : `${y} yrs`;
}

function waitMinutes(updatedAt?: string | null) {
    if (!updatedAt) return null;
    return Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000));
}

function timeWaiting(updatedAt?: string | null) {
    const mins = waitMinutes(updatedAt);
    if (mins == null) return "";
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m waiting`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m waiting`;
}

function isToday(iso?: string | null) {
    if (!iso) return false;
    return iso.slice(0, 10) === toHospitalISODate();
}

function normStatus(status?: string | null) {
    return String(status ?? "").toLowerCase().replace(/[\s_-]/g, "");
}

function isCompletedConsultation(status?: string | null) {
    return normStatus(status) === "completed";
}

function isActiveConsultation(status?: string | null) {
    return normStatus(status) === "underconsultation";
}

function isReferredConsultation(status?: string | null) {
    const s = normStatus(status);
    return s.startsWith("sentto") || s === "admitted";
}

const REFERRAL_STYLE: Record<string, { bg: string; text: string; label: string }> = {
    nurse:     { bg: "bg-teal-50 border-teal-100",     text: "text-teal-700",    label: "Nurse" },
    lab:       { bg: "bg-indigo-50 border-indigo-100", text: "text-indigo-700",  label: "Lab" },
    radiology: { bg: "bg-cyan-50 border-cyan-100",     text: "text-cyan-700",    label: "Radiology" },
    pharmacy:  { bg: "bg-violet-50 border-violet-100", text: "text-violet-700",  label: "Pharmacy" },
    admitted:  { bg: "bg-blue-50 border-blue-100",     text: "text-blue-700",    label: "Admission" },
};

function referralCfg(status?: string | null) {
    const s = normStatus(status);
    if (s.includes("nurse")) return REFERRAL_STYLE.nurse;
    if (s.includes("lab")) return REFERRAL_STYLE.lab;
    if (s.includes("radiology") || s.includes("radio")) return REFERRAL_STYLE.radiology;
    if (s.includes("pharm")) return REFERRAL_STYLE.pharmacy;
    if (s === "admitted") return REFERRAL_STYLE.admitted;
    return { bg: "bg-gray-50 border-gray-100", text: "text-gray-600", label: status ?? "Referred" };
}

// ─── KPI stat card ────────────────────────────────────────────────────────────

function StatCard({ label, value, caption, icon: Icon, chip, ring, href }: {
    label: string; value: number; caption: string; icon: React.ElementType;
    chip: string; ring: string; href?: string;
}) {
    const body = (
        <div className={`group relative overflow-hidden bg-white rounded-3xl border border-gray-200 px-5 py-5 transition-all duration-200 hover:border-gray-300 ring-1 ring-transparent ${ring}`}>
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-3xl font-black text-gray-900 leading-none tabular-nums">
                        <CountUp end={value} duration={0.7} preserveValue />
                    </p>
                    <p className="text-xs font-bold text-gray-500 mt-2 leading-tight">{label}</p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5 truncate">{caption}</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl ${chip} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110`}>
                    <Icon size={20} strokeWidth={2.2} />
                </div>
            </div>
            {href && (
                <span className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300">
                    <ArrowRight size={14} />
                </span>
            )}
        </div>
    );
    return href ? <Link href={href}>{body}</Link> : body;
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ tabs, active, onChange }: {
    tabs: { id: string; label: string; icon: React.ElementType; badge?: number }[];
    active: string;
    onChange: (id: string) => void;
}) {
    return (
        <div className="scrollbar-hide flex gap-1 overflow-x-auto rounded-2xl bg-gray-50/80 border border-gray-200 p-1">
            {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = active === tab.id;
                return (
                    <button key={tab.id} onClick={() => onChange(tab.id)}
                        className={`flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-150 ${
                            isActive
                                ? "bg-white text-red-700 border border-gray-200"
                                : "text-gray-400 hover:text-gray-600 border border-transparent"
                        }`}>
                        <Icon size={13} />
                        {tab.label}
                        {!!tab.badge && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                                isActive ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
                            }`}>{tab.badge}</span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ─── Patient avatar ───────────────────────────────────────────────────────────

function PatientAvatar({ name, gender, size = 36 }: { name?: string | null; gender?: string | null; size?: number }) {
    const isFemale = (gender ?? "").toLowerCase() === "female";
    return (
        <div
            style={{ width: size, height: size }}
            className={`rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                isFemale ? "bg-pink-50 border-pink-100 text-pink-600" : "bg-red-50 border-red-100 text-red-600"
            }`}
        >
            {(name ?? "?")[0]?.toUpperCase() ?? "?"}
        </div>
    );
}

// ─── Queue row ────────────────────────────────────────────────────────────────

function QueueRow({ patient, index }: { patient: any; index: number }) {
    const age      = calcAge(patient.birth_date ?? patient.date_of_birth);
    const isChild  = age ? parseInt(age) <= 12 : false;
    const wait     = timeWaiting(patient.updated_at);
    const waitMin  = waitMinutes(patient.updated_at);
    const waitChip =
        waitMin == null ? "bg-gray-50 text-gray-400 border-gray-100"
        : waitMin >= 60 ? "bg-red-50 text-red-600 border-red-100"
        : waitMin >= 30 ? "bg-amber-50 text-amber-600 border-amber-100"
        : "bg-green-50 text-green-600 border-green-100";

    return (
        <div className="flex flex-wrap items-center gap-3 p-3.5 sm:p-4 rounded-2xl border border-gray-200 bg-gray-50/40 hover:bg-white hover:border-red-300 transition-all duration-200">
            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-black text-xs shrink-0">
                {index + 1}
            </div>
            <PatientAvatar name={patient.name} gender={patient.gender} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-gray-800 truncate">{patient.name ?? "—"}</p>
                    {isChild && (
                        <span className="flex items-center gap-0.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                            <Baby size={8} /> Paed
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5 flex-wrap">
                    {patient.gender && <span>{patient.gender}</span>}
                    {age && <span>· {age}</span>}
                    {patient.id && (
                        <AttendantPill
                            patientId={patient.id}
                            viewerRole="Doctor"
                            size="xs"
                            variant="subtle"
                            showTimestamp={false}
                        />
                    )}
                    {wait && (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-bold ${waitChip}`}>
                            <Clock size={9} /> {wait}
                        </span>
                    )}
                </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
                <Link href={`/doctor/health-records/${patient.id}`} title="Open health record"
                    className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors">
                    <FileText size={13} />
                </Link>
                <Link href={`/doctor/patients/${patient.id}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition-all">
                    <Stethoscope size={12} /> Consult
                </Link>
            </div>
        </div>
    );
}

// ─── Active consultation row ──────────────────────────────────────────────────

function ActiveConsultationRow({ consultation, onComplete, completing }: {
    consultation: any;
    onComplete: (id: string) => void;
    completing: boolean;
}) {
    const name = consultation.patient_name ?? consultation.patientName ?? "Unknown patient";
    const age  = calcAge(consultation.patient_birth_date);

    return (
        <div className="flex flex-wrap items-start gap-3 p-3.5 sm:p-4 rounded-2xl border border-red-200/80 bg-gradient-to-br from-red-50/40 to-white hover:border-red-300 transition-all duration-200">
            <PatientAvatar name={name} gender={consultation.patient_gender} />
            <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-gray-800 truncate">{name}</p>
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> In progress
                    </span>
                </div>
                {consultation.symptoms && (
                    <p className="text-xs text-gray-500 line-clamp-1">
                        <span className="font-semibold text-gray-400">Symptoms:</span> {consultation.symptoms}
                    </p>
                )}
                <p className="text-[11px] text-gray-400 flex items-center gap-1.5 flex-wrap">
                    {consultation.patient_gender && <span>{consultation.patient_gender}</span>}
                    {age && <span>· {age}</span>}
                    <span className="inline-flex items-center gap-1">
                        <Clock size={9} /> started {fmtFull(consultation.created_at)}
                    </span>
                </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                <button
                    onClick={() => onComplete(consultation.id)}
                    disabled={completing}
                    title="Mark this consultation as completed"
                    className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-green-200 bg-green-50 text-green-700 text-[11px] font-bold hover:bg-green-100 transition-colors disabled:opacity-60">
                    {completing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                    Complete
                </button>
                {consultation.patient_id && (
                    <Link href={`/doctor/patients/${consultation.patient_id}`}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition-all">
                        <Stethoscope size={12} /> Continue
                    </Link>
                )}
            </div>
        </div>
    );
}

// ─── Referred consultation row ────────────────────────────────────────────────

function ReferredRow({ consultation }: { consultation: any }) {
    const name = consultation.patient_name ?? consultation.patientName ?? "Unknown patient";
    const cfg  = referralCfg(consultation.status);

    return (
        <Link href={consultation.patient_id ? `/doctor/patients/${consultation.patient_id}` : "#"}
            className="group flex items-center gap-3 p-3.5 rounded-2xl border border-gray-200 bg-gray-50/40 hover:bg-white hover:border-indigo-300 transition-all duration-200">
            <PatientAvatar name={name} gender={consultation.patient_gender} />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    {consultation.diagnosis && <span className="truncate">Dx: {consultation.diagnosis}</span>}
                    <span className="shrink-0">· {fmtDate(consultation.created_at)}</span>
                </p>
            </div>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border shrink-0 ${cfg.bg} ${cfg.text}`}>
                <Send size={9} /> {cfg.label}
            </span>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-500 shrink-0" />
        </Link>
    );
}

// ─── Admitted row ─────────────────────────────────────────────────────────────

function AdmittedRow({ patient }: { patient: any }) {
    const age = calcAge(patient.birth_date ?? patient.date_of_birth);
    return (
        <Link href={`/doctor/patients/${patient.id}`}
            className="group flex items-center gap-3 p-3.5 rounded-2xl border border-gray-200 bg-gray-50/40 hover:bg-white hover:border-indigo-300 transition-all duration-200">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-600 text-sm shrink-0">
                {(patient.name ?? "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{patient.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                    {patient.gender ?? ""}{age ? ` · ${age}` : ""}
                </p>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-500 shrink-0" />
        </Link>
    );
}

// ─── Today's schedule panel ───────────────────────────────────────────────────

const APPT_STATUS_DOT: Record<string, string> = {
    scheduled:   "bg-blue-400",
    confirmed:   "bg-green-500",
    in_progress: "bg-amber-500 animate-pulse",
    completed:   "bg-gray-300",
    cancelled:   "bg-red-400",
    no_show:     "bg-orange-400",
};

function SchedulePanel({ appointments, loading }: { appointments: any[]; loading: boolean }) {
    const sorted = [...appointments].sort((a, b) => (a.appointment_time ?? "").localeCompare(b.appointment_time ?? ""));
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
    const nextIdx = sorted.findIndex(a => {
        if (!["scheduled", "confirmed"].includes(a.status)) return false;
        const [h, m] = (a.appointment_time ?? "00:00").split(":").map(Number);
        return h * 60 + (m || 0) >= nowMinutes;
    });

    return (
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                        <CalendarClock size={15} className="text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800 leading-tight">Today&apos;s schedule</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">{appointments.length} appointment{appointments.length !== 1 ? "s" : ""} assigned to you</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 p-3 space-y-1.5 max-h-[420px] overflow-y-auto">
                {loading ? (
                    <div className="space-y-2 p-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-14 rounded-xl bg-gray-50 animate-pulse" />
                        ))}
                    </div>
                ) : sorted.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                        <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center">
                            <Calendar size={16} className="text-gray-300" />
                        </div>
                        <p className="text-xs font-semibold text-gray-400">No appointments scheduled today</p>
                    </div>
                ) : (
                    sorted.map((appt, i) => {
                        const isNext = i === nextIdx;
                        return (
                            <div key={appt.id}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${
                                    isNext ? "border-blue-200 bg-blue-50/50" : "border-transparent hover:bg-gray-50"
                                }`}>
                                <div className={`w-12 shrink-0 text-center rounded-lg py-1.5 text-[11px] font-black tabular-nums ${
                                    isNext ? "bg-blue-600 text-white shadow-sm" : "bg-gray-100 text-gray-500"
                                }`}>
                                    {(appt.appointment_time ?? "").slice(0, 5)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-800 truncate">{resolvePatientName(appt)}</p>
                                    <p className="text-[10px] text-gray-400 truncate">{appt.reason ?? appt.department ?? "Consultation"}</p>
                                </div>
                                {isNext && <span className="text-[9px] font-black uppercase text-blue-600 shrink-0">Next</span>}
                                <span title={String(appt.status).replace(/_/g, " ")}
                                    className={`w-2 h-2 rounded-full shrink-0 ${APPT_STATUS_DOT[appt.status] ?? "bg-gray-300"}`} />
                            </div>
                        );
                    })
                )}
            </div>

            <div className="px-4 py-3 border-t border-gray-50">
                <Link href="/doctor/appointments"
                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors">
                    Open full schedule <ChevronRight size={13} />
                </Link>
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DoctorDashboard() {
    const { user }   = useAuth();
    const { authorized, loading: protectionLoading } = useRoleProtection([UserRole.Doctor, UserRole.Admin]);
    const [activeTab, setActiveTab]           = useState("queue");
    const [dismissedErrors, setDismissedErrors] = useState<string[]>([]);
    const [completingId, setCompletingId]     = useState<string | null>(null);
    const [lastSynced, setLastSynced]         = useState<Date | null>(null);

    const awaitingPatients = usePatientsByStatus(PatientStatus.AwaitingConsultation);
    const admittedPatients = usePatientsByStatus(PatientStatus.Admitted);
    const staffId          = user?.$id ?? user?.id ?? "";
    const myConsultations  = useConsultationsByDoctor(staffId);
    const todayAppts       = useAppointmentsByDate(toHospitalISODate());
    const updateConsultation = useUpdateConsultation();

    const refreshAll = () => {
        void Promise.all([
            awaitingPatients.refetch(),
            admittedPatients.refetch(),
            myConsultations.refetch(),
            todayAppts.refetch(),
        ]).then(() => setLastSynced(new Date()));
    };

    // Auto-refresh every 60s so the queue stays live while the doctor works.
    useEffect(() => {
        const t = setInterval(() => {
            awaitingPatients.refetch();
            myConsultations.refetch();
            todayAppts.refetch();
        }, 60_000);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!lastSynced && !awaitingPatients.isLoading) setLastSynced(new Date());
    }, [awaitingPatients.isLoading, lastSynced]);

    const handleComplete = (id: string) => {
        setCompletingId(id);
        updateConsultation.mutate(
            { id, updates: { status: "completed" } },
            {
                onSuccess: () => toast.success("Consultation marked as completed."),
                onError: () => toast.error("Could not complete this consultation."),
                onSettled: () => {
                    setCompletingId(null);
                    myConsultations.refetch();
                },
            }
        );
    };

    const consultations = useMemo(() => (myConsultations.data ?? []) as any[], [myConsultations.data]);

    const activeConsultations    = useMemo(() => consultations.filter(c => isActiveConsultation(c.status)), [consultations]);
    const referredConsultations  = useMemo(() => consultations.filter(c => isReferredConsultation(c.status)), [consultations]);
    const completedToday         = useMemo(() => consultations.filter(c => isCompletedConsultation(c.status) && isToday(c.updated_at ?? c.created_at)), [consultations]);
    const seenToday              = useMemo(() => consultations.filter(c => isToday(c.created_at)).length, [consultations]);

    const myTodayAppointments = useMemo(
        () => (todayAppts.data ?? []).filter((appt: any) => appt.doctor_id === staffId),
        [todayAppts.data, staffId]
    );

    if (protectionLoading) return (
        <div className="flex items-center justify-center min-h-[40vh]">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
                <Activity size={20} className="text-red-600 animate-pulse" />
            </div>
        </div>
    );
    if (!authorized) return null;

    const queueCount    = awaitingPatients.data?.length ?? 0;
    const admittedCount = admittedPatients.data?.length ?? 0;
    const anyLoading = awaitingPatients.isFetching || myConsultations.isFetching || admittedPatients.isFetching || todayAppts.isFetching;

    const stats = [
        { label: "Waiting for you",        value: queueCount,                  caption: "consultation queue",  icon: Clock,         chip: "bg-amber-50 text-amber-600",   ring: "hover:ring-amber-100",  href: undefined },
        { label: "Active consultations",   value: activeConsultations.length,  caption: "in the room now",     icon: Stethoscope,   chip: "bg-red-50 text-red-600",      ring: "hover:ring-red-100",    href: undefined },
        { label: "Today's appointments",   value: myTodayAppointments.length,  caption: "assigned to you",     icon: Calendar,      chip: "bg-blue-50 text-blue-600",    ring: "hover:ring-blue-100",   href: "/doctor/appointments" },
        { label: "Patients seen today",    value: seenToday,                   caption: `${completedToday.length} completed`, icon: CheckCircle2, chip: "bg-green-50 text-green-600", ring: "hover:ring-green-100", href: undefined },
    ];

    const tabs = [
        { id: "queue",    label: "Queue",    icon: Clock,       badge: queueCount },
        { id: "active",   label: "Active",   icon: Stethoscope, badge: activeConsultations.length },
        { id: "referred", label: "Referred", icon: Send,        badge: referredConsultations.length },
        { id: "admitted", label: "Admitted", icon: BedDouble,   badge: admittedCount },
    ];

    return (
        <div className="space-y-6">
            <DashboardHeader
                title="Clinical dashboard"
                description="Your live consultation queue, active cases, referrals and today’s schedule."
                icon={Stethoscope}
                tone="red"
                actions={
                    <div className="flex items-center gap-2">
                        <button onClick={refreshAll} disabled={anyLoading}
                            title="Refresh all data"
                            className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-60">
                            <RefreshCcw size={13} className={anyLoading ? "animate-spin" : ""} />
                            <span className="hidden sm:inline">{anyLoading ? "Syncing…" : "Refresh"}</span>
                        </button>
                        <Link href="/doctor/appointments" className="inline-flex h-9 items-center gap-2 rounded-xl bg-red-700 px-3 text-xs font-bold text-white transition-colors hover:bg-red-800">
                            <Calendar size={13} /> My schedule
                        </Link>
                    </div>
                }
            />

            {/* ── KPI stats ── */}
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                {stats.map(s => <StatCard key={s.label} {...s} />)}
            </div>

            {/* ── Main content ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">

                {/* Patient management */}
                <div className="xl:col-span-2 bg-white rounded-3xl border border-gray-200 overflow-hidden">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 pt-5 sm:px-6 sm:pt-6">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                                <ClipboardList size={16} className="text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-800 leading-tight">Patient management</h2>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    {lastSynced ? `Synced ${lastSynced.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · refreshes every minute` : "Loading live data…"}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="px-4 pt-4 pb-5 sm:px-6 sm:pb-6 space-y-4">
                        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
                        <div className="space-y-2.5 min-h-[200px]">

                            {/* Consultation queue */}
                            {activeTab === "queue" && (
                                <>
                                    {awaitingPatients.isLoading && <LoadingSkeleton rows={4} />}
                                    {awaitingPatients.error && !dismissedErrors.includes("queue") && (
                                        <ErrorAlert error={awaitingPatients.error}
                                            onDismiss={() => setDismissedErrors(p => [...p, "queue"])} />
                                    )}
                                    {!awaitingPatients.isLoading && queueCount === 0 && (
                                        <EmptyState title="Queue is clear" description="No patients are waiting for a consultation right now." icon="✓" />
                                    )}
                                    {awaitingPatients.data?.map((p, i) => (
                                        <QueueRow key={p.id} patient={p} index={i} />
                                    ))}
                                </>
                            )}

                            {/* Active consultations */}
                            {activeTab === "active" && (
                                <>
                                    {myConsultations.isLoading && <LoadingSkeleton rows={4} />}
                                    {myConsultations.error && !dismissedErrors.includes("active") && (
                                        <ErrorAlert error={myConsultations.error}
                                            onDismiss={() => setDismissedErrors(p => [...p, "active"])} />
                                    )}
                                    {!myConsultations.isLoading && activeConsultations.length === 0 && (
                                        <EmptyState title="No active consultations" description="Start a consultation from the queue to see it here." icon="🩺" />
                                    )}
                                    {activeConsultations.map(c => (
                                        <ActiveConsultationRow key={c.id} consultation={c}
                                            onComplete={handleComplete} completing={completingId === c.id} />
                                    ))}
                                </>
                            )}

                            {/* Referred consultations */}
                            {activeTab === "referred" && (
                                <>
                                    {myConsultations.isLoading && <LoadingSkeleton rows={4} />}
                                    {!myConsultations.isLoading && referredConsultations.length === 0 && (
                                        <EmptyState title="No referrals yet" description="Patients you route to nursing, lab, radiology, pharmacy or admission will appear here." icon="↗" />
                                    )}
                                    {referredConsultations.map(c => (
                                        <ReferredRow key={c.id} consultation={c} />
                                    ))}
                                </>
                            )}

                            {/* Admitted patients */}
                            {activeTab === "admitted" && (
                                <>
                                    {admittedPatients.isLoading && <LoadingSkeleton rows={3} />}
                                    {!admittedPatients.isLoading && admittedCount === 0 && (
                                        <EmptyState title="No admitted patients" description="Patients admitted under the hospital will appear here." icon="🛏" />
                                    )}
                                    {admittedPatients.data?.map(p => (
                                        <AdmittedRow key={p.id} patient={p} />
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right rail — today's schedule + quick actions */}
                <div className="space-y-5">
                    <SchedulePanel appointments={myTodayAppointments} loading={todayAppts.isLoading} />

                    {/* Quick actions */}
                    <div className="bg-gradient-to-br from-red-700 to-rose-800 rounded-3xl p-5 text-white border border-red-600/30 relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10 blur-xl" aria-hidden="true" />
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-1.5">
                                <Sparkles size={14} className="text-rose-200" />
                                <p className="text-xs font-black uppercase tracking-widest text-rose-100">Quick actions</p>
                            </div>
                            <p className="text-sm font-bold mb-4">Jump straight into your work</p>
                            <div className="space-y-2">
                                <Link href="/doctor/patients"
                                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold transition-colors">
                                    <Search size={13} /> Find a patient record
                                    <ChevronRight size={12} className="ml-auto opacity-60" />
                                </Link>
                                <Link href="/doctor/health-records"
                                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold transition-colors">
                                    <FileText size={13} /> Health records library
                                    <ChevronRight size={12} className="ml-auto opacity-60" />
                                </Link>
                                <Link href="/doctor/analysis"
                                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold transition-colors">
                                    <Activity size={13} /> My performance analytics
                                    <ChevronRight size={12} className="ml-auto opacity-60" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
