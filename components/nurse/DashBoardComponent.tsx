"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
    HeartPulse, CheckCircle2, RefreshCcw, ChevronRight, Phone, Baby,
    BedDouble, Eye, ClipboardList, Clock, AlertTriangle, Activity,
    Stethoscope, Users, ShieldAlert, ArrowUpRight, Sparkles,
} from "lucide-react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { fmtFull } from "@/lib/utils";
import { displayHospitalNumber } from "@/lib/hospital-number";
import {
    usePatientsByStatus,
    useCompletedNursingActions,
    usePendingNursingActions,
    patientKeys,
} from "@/hooks/emr/use-emr";
import NursePatientSearch from "./component/nurse-patient-search";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { AttendantPill } from "@/components/emr/care-team";

// ─── Types & Helpers ──────────────────────────────────────────────────────────

type StageFilter = "all" | "triage" | "observation" | "admitted" | "completed";

function calcAge(dob?: string) {
    if (!dob) return null;
    const y = new Date().getFullYear() - new Date(dob).getFullYear();
    return y < 1 ? "< 1 yr" : `${y} yrs`;
}

function fmtTime(iso?: string) {
    if (!iso) return "";
    return fmtFull(iso);
}

function getWaitInfo(updatedAt?: string): { label: string; tone: "fresh" | "warn" | "urgent" } {
    if (!updatedAt) return { label: "", tone: "fresh" };
    const mins = Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60_000));
    if (mins < 1) return { label: "just now", tone: "fresh" };
    if (mins < 15) return { label: `${mins}m`, tone: "fresh" };
    if (mins < 45) return { label: `${mins}m`, tone: "warn" };
    if (mins < 60) return { label: `${mins}m`, tone: "urgent" };
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return { label: `${hrs}h ${rem}m`, tone: "urgent" };
}

const WAIT_STYLES = {
    fresh: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn: "bg-amber-50 text-amber-700 border-amber-200",
    urgent: "bg-red-50 text-red-700 border-red-200",
};

const HOVER_BORDERS: Record<string, string> = {
    "bg-teal-600": "hover:border-teal-300",
    "bg-sky-600": "hover:border-sky-300",
    "bg-indigo-600": "hover:border-indigo-300",
};

// ─── Patient Card ─────────────────────────────────────────────────────────────

function PatientCard({
    patient,
    index,
    href,
    accentColor,
    stageBadge,
    onPrefetch,
}: {
    patient: any;
    index?: number;
    href: string;
    accentColor: string;
    stageBadge?: { label: string; className: string };
    onPrefetch: (p: any) => void;
}) {
    const age = calcAge(patient.birth_date ?? patient.date_of_birth);
    const isChild = age ? parseInt(age) <= 12 : false;
    const isFemale = (patient.gender ?? "").toLowerCase() === "female";
    const wait = getWaitInfo(patient.updated_at);
    const hasAllergies = Boolean(patient.allergies && String(patient.allergies).trim() && !/^(none|nil|n\/a|no)$/i.test(String(patient.allergies).trim()));

    return (
        <Link
            href={href}
            onMouseEnter={() => onPrefetch(patient)}
            onClick={() => onPrefetch(patient)}
            className={`group flex items-center gap-3 p-3.5 rounded-2xl border bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all border-gray-200/80 ${HOVER_BORDERS[accentColor] ?? "hover:border-gray-300"}`}
        >
            {index !== undefined && (
                <div className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-black shrink-0 ${accentColor}`}>
                    {index + 1}
                </div>
            )}

            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                isFemale ? "bg-pink-50 border-pink-100 text-pink-600" : "bg-teal-50 border-teal-100 text-teal-600"
            }`}>
                {(patient.name ?? "?")[0].toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-gray-900 truncate">{patient.name ?? "—"}</p>
                    {patient.hospital_number && (
                        <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">
                            {displayHospitalNumber(patient.hospital_number)}
                        </span>
                    )}
                    {stageBadge && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stageBadge.className}`}>
                            {stageBadge.label}
                        </span>
                    )}
                    {isChild && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                            <Baby size={8} /> Paed
                        </span>
                    )}
                    {hasAllergies && (
                        <span
                            title={`Allergies: ${patient.allergies}`}
                            className="inline-flex items-center gap-0.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200"
                        >
                            <ShieldAlert size={9} /> Allergy
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-gray-500">
                    {patient.gender && (
                        <span className={isFemale ? "text-pink-600 font-medium" : "text-teal-600 font-medium"}>
                            {patient.gender}
                        </span>
                    )}
                    {age && <span>· {age}</span>}
                    {patient.blood_group && (
                        <span className="font-semibold text-gray-600">· {patient.blood_group}</span>
                    )}
                    {patient.phone && (
                        <span className="inline-flex items-center gap-0.5">
                            <Phone size={9} /> {patient.phone}
                        </span>
                    )}
                    {patient.id && (
                        <AttendantPill
                            patientId={patient.id}
                            viewerRole="Nurse"
                            size="xs"
                            variant="subtle"
                            showTimestamp={false}
                        />
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {wait.label && (
                    <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${WAIT_STYLES[wait.tone]}`}>
                        <Clock size={9} /> {wait.label}
                    </span>
                )}
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 group-hover:bg-teal-600 group-hover:text-white px-2.5 py-1 rounded-xl transition-colors">
                    Open <ArrowUpRight size={12} />
                </span>
                <ChevronRight size={15} className="md:hidden text-gray-300 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
            </div>
        </Link>
    );
}

// ─── Section Wrapper ──────────────────────────────────────────────────────────

function StatusGroup({
    icon: Icon,
    iconBg,
    iconColor,
    label,
    subtitle,
    count,
    badgeBg,
    badgeText,
    borderColor,
    children,
    loading,
}: {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    label: string;
    subtitle?: string;
    count: number;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    children: React.ReactNode;
    loading?: boolean;
}) {
    return (
        <div className={`bg-white rounded-3xl border shadow-xs overflow-hidden ${borderColor}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                        <Icon size={16} className={iconColor} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900">{label}</p>
                        {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
                    </div>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badgeBg} ${badgeText}`}>
                    {count} {count === 1 ? "patient" : "patients"}
                </span>
            </div>
            <div className="p-4 sm:p-5 space-y-2.5">
                {loading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100">
                            <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-gray-200 rounded-full w-1/3" />
                                <div className="h-2.5 bg-gray-200 rounded-full w-1/4" />
                            </div>
                        </div>
                    ))
                ) : count === 0 ? (
                    <div className="flex flex-col items-center justify-center py-7 gap-1.5 text-center">
                        <CheckCircle2 size={20} className="text-emerald-300" />
                        <p className="text-xs font-semibold text-gray-500">All clear</p>
                        <p className="text-[11px] text-gray-400">No patients waiting in this stage</p>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}

// ─── Main Nurse Dashboard ─────────────────────────────────────────────────────

export default function NurseDashboard() {
    const { authorized } = useRoleProtection([UserRole.Nurse, UserRole.Admin]);
    const queryClient = useQueryClient();
    const [stage, setStage] = useState<StageFilter>("all");

    const { data: sentToNurse = [], isPending: l1, isFetching: f1, refetch: r1 } = usePatientsByStatus("sent-to-nurse" as any);
    const { data: underObserv = [], isPending: l2, isFetching: f2, refetch: r2 } = usePatientsByStatus("under-observation" as any);
    const { data: admitted = [], isPending: l3, isFetching: f3, refetch: r3 } = usePatientsByStatus("admitted" as any);
    const { data: completedData = [], isPending: l4, isFetching: f4, refetch: r4 } = useCompletedNursingActions();
    const { data: pendingTasksData = [], isPending: l5, isFetching: f5, refetch: r5 } = usePendingNursingActions();

    const queue = sentToNurse as any[];
    const observed = underObserv as any[];
    const inpatient = admitted as any[];
    const completed = completedData as any[];
    const pendingTasks = pendingTasksData as any[];

    const totalActive = queue.length + observed.length + inpatient.length;
    const isRefreshing = f1 || f2 || f3 || f4 || f5;

    const longWaitCount = useMemo(
        () => queue.filter((p) => getWaitInfo(p.updated_at).tone === "urgent").length,
        [queue]
    );

    if (!authorized) return null;

    function refetchAll() {
        void Promise.all([r1(), r2(), r3(), r4(), r5()]);
    }

    function seedPatientCache(patient: any) {
        if (patient?.id) {
            queryClient.setQueryData(patientKeys.detail(patient.id), patient);
        }
    }

    const statCards: Array<{
        key: StageFilter | "tasks";
        label: string;
        value: number;
        sub: string;
        icon: React.ElementType;
        iconBg: string;
        iconColor: string;
        activeRing: string;
        href?: string;
    }> = [
        {
            key: "triage",
            label: "Triage / Attention",
            value: queue.length,
            sub: longWaitCount > 0 ? `${longWaitCount} waiting >45m` : "Ready for vitals",
            icon: HeartPulse,
            iconBg: "bg-teal-50",
            iconColor: "text-teal-600",
            activeRing: "ring-2 ring-teal-500 border-teal-300",
        },
        {
            key: "tasks",
            label: "Pending Tasks",
            value: pendingTasks.length,
            sub: pendingTasks.length > 0 ? "Doctor orders due" : "All tasks done",
            icon: ClipboardList,
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
            activeRing: "border-amber-200",
            href: "/nurse/task",
        },
        {
            key: "observation",
            label: "Under Observation",
            value: observed.length,
            sub: "Active monitoring",
            icon: Eye,
            iconBg: "bg-sky-50",
            iconColor: "text-sky-600",
            activeRing: "ring-2 ring-sky-500 border-sky-300",
        },
        {
            key: "admitted",
            label: "Admitted / Ward",
            value: inpatient.length,
            sub: "Inpatient care",
            icon: BedDouble,
            iconBg: "bg-indigo-50",
            iconColor: "text-indigo-600",
            activeRing: "ring-2 ring-indigo-500 border-indigo-300",
        },
        {
            key: "completed",
            label: "Completed Today",
            value: completed.length,
            sub: "Attended today",
            icon: CheckCircle2,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
            activeRing: "ring-2 ring-emerald-500 border-emerald-300",
        },
    ];

    return (
        <div className="space-y-5 sm:space-y-6">
            {/* ── Header with quick navigation actions ── */}
            <DashboardHeader
                title="Nursing Command Center"
                description="Triage arrivals, execute doctor orders, monitor observations, and manage inpatient ward care."
                icon={HeartPulse}
                tone="teal"
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href="/nurse/ward-board"
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
                        >
                            <BedDouble size={13} /> Ward Board
                        </Link>
                        <Link
                            href="/nurse/task"
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-teal-100 bg-teal-50 px-3 text-xs font-bold text-teal-700 transition-colors hover:bg-teal-100"
                        >
                            <ClipboardList size={13} /> Tasks
                            {pendingTasks.length > 0 && (
                                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-black leading-none">
                                    {pendingTasks.length}
                                </span>
                            )}
                        </Link>
                        <Link
                            href="/nurse/queue"
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50"
                        >
                            <Users size={13} /> Full Queue
                        </Link>
                        <button
                            onClick={refetchAll}
                            type="button"
                            aria-label="Refresh nursing queues"
                            disabled={isRefreshing}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-teal-600 hover:border-teal-200 transition-colors disabled:opacity-60"
                        >
                            <RefreshCcw size={14} className={isRefreshing ? "animate-spin" : ""} />
                        </button>
                    </div>
                }
            />

            {/* ── Global Patient Search ── */}
            <NursePatientSearch />

            {/* ── Urgent wait banner ── */}
            {longWaitCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2.5 text-red-800">
                        <AlertTriangle size={16} className="text-red-600 shrink-0" />
                        <p className="text-xs sm:text-sm font-semibold">
                            {longWaitCount} patient{longWaitCount > 1 ? "s have" : " has"} been waiting in the triage queue for over 45 minutes.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setStage("triage")}
                        className="text-xs font-bold text-red-700 hover:text-red-900 underline underline-offset-2"
                    >
                        Focus triage queue
                    </button>
                </div>
            )}

            {/* ── Interactive KPI Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                {statCards.map((s) => {
                    const Icon = s.icon;
                    const isSelected = stage === s.key;
                    const cardClass = `text-left bg-white rounded-2xl border px-4 py-3.5 flex items-center gap-3 transition-all hover:shadow-xs ${
                        isSelected ? s.activeRing : "border-gray-200/80 hover:border-gray-300"
                    }`;

                    const content = (
                        <>
                            <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}>
                                <Icon size={17} className={s.iconColor} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl font-extrabold text-gray-900 leading-none">{s.value}</p>
                                <p className="text-[11px] font-bold text-gray-700 mt-1 truncate">{s.label}</p>
                                <p className="text-[10px] text-gray-400 truncate">{s.sub}</p>
                            </div>
                        </>
                    );

                    if (s.href) {
                        return (
                            <Link key={s.key} href={s.href} className={cardClass}>
                                {content}
                            </Link>
                        );
                    }

                    return (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => setStage(isSelected ? "all" : (s.key as StageFilter))}
                            className={cardClass}
                        >
                            {content}
                        </button>
                    );
                })}
            </div>

            {/* ── Stage Filter Pills ── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                    {([
                        { id: "all", label: "All Active", count: totalActive },
                        { id: "triage", label: "Triage Queue", count: queue.length },
                        { id: "observation", label: "Observation", count: observed.length },
                        { id: "admitted", label: "Admitted", count: inpatient.length },
                        { id: "completed", label: "Completed Today", count: completed.length },
                    ] as const).map((tab) => {
                        const active = stage === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setStage(tab.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                                    active
                                        ? "bg-teal-600 text-white shadow-xs"
                                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                                }`}
                            >
                                {tab.label}
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                                    active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <p className="text-xs text-gray-400">
                    {totalActive > 0
                        ? `${totalActive} active patient${totalActive !== 1 ? "s" : ""} across nursing care`
                        : "All nursing queues clear"}
                </p>
            </div>

            {/* ── Main 2-Column Command Layout ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
                {/* Left / Primary (2 cols): Patient Care Stages */}
                <div className="xl:col-span-2 space-y-4">
                    {(stage === "all" || stage === "triage") && (
                        <StatusGroup
                            icon={HeartPulse}
                            iconBg="bg-teal-50"
                            iconColor="text-teal-600"
                            label="Needs Nursing Attention (Triage)"
                            subtitle="Patients waiting for vitals, assessment, or triage routing"
                            count={queue.length}
                            badgeBg="bg-teal-50 border-teal-100"
                            badgeText="text-teal-700"
                            borderColor="border-teal-100"
                            loading={l1}
                        >
                            {queue.map((p, i) => (
                                <PatientCard
                                    key={p.id}
                                    patient={p}
                                    index={i}
                                    href={`/nurse/queue/patient/${p.id}`}
                                    accentColor="bg-teal-600"
                                    onPrefetch={seedPatientCache}
                                />
                            ))}
                        </StatusGroup>
                    )}

                    {(stage === "all" || stage === "observation") && (
                        <StatusGroup
                            icon={Eye}
                            iconBg="bg-sky-50"
                            iconColor="text-sky-600"
                            label="Under Observation"
                            subtitle="Patients receiving short-stay monitoring"
                            count={observed.length}
                            badgeBg="bg-sky-50 border-sky-100"
                            badgeText="text-sky-700"
                            borderColor="border-sky-100"
                            loading={l2}
                        >
                            {observed.map((p) => (
                                <PatientCard
                                    key={p.id}
                                    patient={p}
                                    href={`/nurse/queue/patient/${p.id}`}
                                    accentColor="bg-sky-600"
                                    onPrefetch={seedPatientCache}
                                />
                            ))}
                        </StatusGroup>
                    )}

                    {(stage === "all" || stage === "admitted") && (
                        <StatusGroup
                            icon={BedDouble}
                            iconBg="bg-indigo-50"
                            iconColor="text-indigo-600"
                            label="Admitted Patients (Ward)"
                            subtitle="Inpatients requiring drug charts, fluid balance & vitals"
                            count={inpatient.length}
                            badgeBg="bg-indigo-50 border-indigo-100"
                            badgeText="text-indigo-700"
                            borderColor="border-indigo-100"
                            loading={l3}
                        >
                            {inpatient.map((p) => (
                                <PatientCard
                                    key={p.id}
                                    patient={p}
                                    href={`/nurse/queue/patient/${p.id}`}
                                    accentColor="bg-indigo-600"
                                    onPrefetch={seedPatientCache}
                                />
                            ))}
                        </StatusGroup>
                    )}

                    {stage === "completed" && (
                        <StatusGroup
                            icon={CheckCircle2}
                            iconBg="bg-emerald-50"
                            iconColor="text-emerald-600"
                            label="Completed Today"
                            subtitle="Nursing actions completed during today's shift"
                            count={completed.length}
                            badgeBg="bg-emerald-50 border-emerald-100"
                            badgeText="text-emerald-700"
                            borderColor="border-emerald-100"
                            loading={l4}
                        >
                            {completed.map((t: any) => (
                                <div
                                    key={t.id}
                                    className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/70 border border-gray-100"
                                >
                                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-800 truncate">
                                            {t.patients?.name ?? "Unknown patient"}
                                        </p>
                                        <p className="text-[11px] text-gray-500">{t.action_type ?? "Nursing care"}</p>
                                    </div>
                                    <p className="text-[10px] text-gray-400 shrink-0">{fmtTime(t.completion_time)}</p>
                                </div>
                            ))}
                        </StatusGroup>
                    )}
                </div>

                {/* Right Column (1 col): Pending Doctor Orders + Recent Completed */}
                <div className="space-y-4">
                    {/* Pending Nursing Tasks */}
                    <div className="bg-white rounded-3xl border border-amber-100 shadow-xs overflow-hidden">
                        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                                    <Stethoscope size={15} className="text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">Pending Doctor Orders</p>
                                    <p className="text-[11px] text-gray-400">Injections, vitals & procedures</p>
                                </div>
                            </div>
                            <Link
                                href="/nurse/task"
                                className="text-[11px] font-bold text-teal-600 hover:text-teal-700"
                            >
                                View all
                            </Link>
                        </div>

                        <div className="p-4 space-y-2">
                            {l5 ? (
                                <div className="animate-pulse space-y-2">
                                    <div className="h-12 bg-gray-100 rounded-xl" />
                                    <div className="h-12 bg-gray-100 rounded-xl" />
                                </div>
                            ) : pendingTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-6 gap-1.5 text-center">
                                    <Sparkles size={18} className="text-amber-300" />
                                    <p className="text-xs font-semibold text-gray-500">No pending orders</p>
                                    <p className="text-[11px] text-gray-400">New doctor tasks appear here live</p>
                                </div>
                            ) : (
                                pendingTasks.slice(0, 6).map((task: any) => {
                                    const priority = String(task.priority ?? "routine").toLowerCase();
                                    const isUrgent = priority === "stat" || priority === "urgent" || priority === "high";
                                    return (
                                        <Link
                                            key={task.id}
                                            href={task.patient_id ? `/nurse/queue/patient/${task.patient_id}` : "/nurse/task"}
                                            className="group flex items-start gap-2.5 p-3 rounded-2xl bg-gray-50/70 hover:bg-amber-50/50 border border-gray-100 hover:border-amber-200 transition-colors"
                                        >
                                            <Activity size={14} className={`mt-0.5 shrink-0 ${isUrgent ? "text-red-500" : "text-amber-500"}`} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <p className="text-xs font-bold text-gray-800 truncate">
                                                        {task.patients?.name ?? "Patient"}
                                                    </p>
                                                    {isUrgent && (
                                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
                                                            {priority}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                                    {task.action_type ?? task.description ?? "Nursing task"}
                                                </p>
                                            </div>
                                            <ChevronRight size={13} className="text-gray-300 group-hover:text-amber-600 shrink-0 mt-1" />
                                        </Link>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Recent Completed Activity */}
                    {stage !== "completed" && (
                        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
                            <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-gray-100">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                                        <CheckCircle2 size={15} className="text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Completed Today</p>
                                        <p className="text-[11px] text-gray-400">
                                            {completed.length} action{completed.length !== 1 ? "s" : ""} logged
                                        </p>
                                    </div>
                                </div>
                                {completed.length > 5 && (
                                    <button
                                        type="button"
                                        onClick={() => setStage("completed")}
                                        className="text-[11px] font-bold text-teal-600 hover:text-teal-700"
                                    >
                                        See all
                                    </button>
                                )}
                            </div>
                            <div className="p-4 space-y-2">
                                {completed.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-5">No completed actions yet today</p>
                                ) : (
                                    completed.slice(0, 5).map((t: any) => (
                                        <div key={t.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                                            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-700 truncate">
                                                    {t.patients?.name ?? "Unknown patient"}
                                                </p>
                                                <p className="text-[10px] text-gray-400 truncate">
                                                    {t.action_type ?? "Nursing care"}
                                                </p>
                                            </div>
                                            <p className="text-[10px] text-gray-400 shrink-0">{fmtTime(t.completion_time)}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
