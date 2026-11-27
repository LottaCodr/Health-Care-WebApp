"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    HeartPulse, CheckCircle2, RefreshCcw, ChevronRight, Phone, Baby,
    BedDouble, Eye, ClipboardList, Clock, AlertTriangle, Activity,
    Stethoscope, Users, ShieldAlert, ArrowUpRight, Sparkles, Search,
    X, Check, Send, Loader2, Radio,
} from "lucide-react";
import { useRoleProtection } from "@/lib/role-utils";
import { PatientStatus, UserRole } from "@/types/models";
import { fmtFull } from "@/lib/utils";
import { displayHospitalNumber } from "@/lib/hospital-number";
import {
    usePatientsByStatus,
    useCompletedNursingActions,
    usePendingNursingActions,
    useUpdatePatientStatus,
    useUpdateNursingAction,
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
    urgent: "bg-red-50 text-red-700 border-red-200 animate-pulse",
};

const HOVER_BORDERS: Record<string, string> = {
    "bg-teal-600": "hover:border-teal-300 hover:shadow-teal-100/60",
    "bg-sky-600": "hover:border-sky-300 hover:shadow-sky-100/60",
    "bg-indigo-600": "hover:border-indigo-300 hover:shadow-indigo-100/60",
};

// ─── Interactive Patient Card ─────────────────────────────────────────────────

function PatientCard({
    patient,
    index,
    href,
    accentColor,
    stageType,
    busyId,
    onPrefetch,
    onQuickMove,
}: {
    patient: any;
    index?: number;
    href: string;
    accentColor: string;
    stageType: "triage" | "observation" | "admitted";
    busyId: string | null;
    onPrefetch: (p: any) => void;
    onQuickMove: (patient: any, nextStatus: PatientStatus, label: string) => void;
}) {
    const age = calcAge(patient.birth_date ?? patient.date_of_birth);
    const isChild = age ? parseInt(age) <= 12 : false;
    const isFemale = (patient.gender ?? "").toLowerCase() === "female";
    const wait = getWaitInfo(patient.updated_at);
    const hasAllergies = Boolean(
        patient.allergies &&
        String(patient.allergies).trim() &&
        !/^(none|nil|n\/a|no)$/i.test(String(patient.allergies).trim())
    );
    const isBusy = busyId === patient.id;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            onMouseEnter={() => onPrefetch(patient)}
            className={`group flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 rounded-2xl border bg-gradient-to-r from-gray-50/70 to-white hover:from-white hover:to-white hover:shadow-md transition-all border-gray-200/80 ${HOVER_BORDERS[accentColor] ?? "hover:border-gray-300"}`}
        >
            <Link
                href={href}
                onClick={() => onPrefetch(patient)}
                className="flex items-center gap-3 flex-1 min-w-0"
            >
                {index !== undefined && (
                    <div className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-xs ${accentColor}`}>
                        {index + 1}
                    </div>
                )}

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border transition-transform group-hover:scale-105 ${
                    isFemale ? "bg-pink-50 border-pink-100 text-pink-600" : "bg-teal-50 border-teal-100 text-teal-600"
                }`}>
                    {(patient.name ?? "?")[0].toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-gray-900 group-hover:text-teal-700 transition-colors truncate">
                            {patient.name ?? "—"}
                        </p>
                        {patient.hospital_number && (
                            <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">
                                {displayHospitalNumber(patient.hospital_number)}
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
            </Link>

            {/* Quick interactive actions */}
            <div className="flex items-center justify-end gap-1.5 shrink-0 pl-9 sm:pl-0">
                {wait.label && (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${WAIT_STYLES[wait.tone]}`}>
                        <Clock size={9} /> {wait.label}
                    </span>
                )}

                {stageType === "triage" && (
                    <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onQuickMove(patient, PatientStatus.AwaitingConsultation, "Doctor Queue")}
                        title="Send directly to Doctor consultation queue"
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isBusy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                        <span className="hidden lg:inline">To Doctor</span>
                    </button>
                )}

                {stageType === "triage" && (
                    <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onQuickMove(patient, PatientStatus.UnderObservation, "Observation")}
                        title="Move to Under Observation"
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white hover:border-sky-600 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <Eye size={11} />
                        <span className="hidden xl:inline">Observe</span>
                    </button>
                )}

                <Link
                    href={href}
                    onClick={() => onPrefetch(patient)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-600 hover:text-white px-2.5 py-1.5 rounded-xl border border-teal-200/70 hover:border-teal-600 transition-all active:scale-95"
                >
                    Chart <ArrowUpRight size={12} />
                </Link>
            </div>
        </motion.div>
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
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-3xl border shadow-xs overflow-hidden ${borderColor}`}
        >
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
                    <AnimatePresence mode="popLayout">{children}</AnimatePresence>
                )}
            </div>
        </motion.div>
    );
}

// ─── Main Nurse Dashboard ─────────────────────────────────────────────────────

export default function NurseDashboard() {
    const { authorized } = useRoleProtection([UserRole.Nurse, UserRole.Admin]);
    const queryClient = useQueryClient();
    const [stage, setStage] = useState<StageFilter>("all");
    const [quickFilter, setQuickFilter] = useState("");
    const [busyPatientId, setBusyPatientId] = useState<string | null>(null);
    const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

    const { data: sentToNurse = [], isPending: l1, isFetching: f1, refetch: r1 } = usePatientsByStatus("sent-to-nurse" as any);
    const { data: underObserv = [], isPending: l2, isFetching: f2, refetch: r2 } = usePatientsByStatus("under-observation" as any);
    const { data: admitted = [], isPending: l3, isFetching: f3, refetch: r3 } = usePatientsByStatus("admitted" as any);
    const { data: completedData = [], isPending: l4, isFetching: f4, refetch: r4 } = useCompletedNursingActions();
    const { data: pendingTasksData = [], isPending: l5, isFetching: f5, refetch: r5 } = usePendingNursingActions();

    const updateStatusMutation = useUpdatePatientStatus();
    const updateTaskMutation = useUpdateNursingAction();

    const filterList = (list: any[]) => {
        const q = quickFilter.trim().toLowerCase();
        if (!q) return list;
        return list.filter((p) =>
            (p.name ?? "").toLowerCase().includes(q) ||
            (p.hospital_number ?? "").toLowerCase().includes(q) ||
            (p.phone ?? "").toLowerCase().includes(q)
        );
    };

    const queue = useMemo(() => filterList(sentToNurse as any[]), [sentToNurse, quickFilter]);
    const observed = useMemo(() => filterList(underObserv as any[]), [underObserv, quickFilter]);
    const inpatient = useMemo(() => filterList(admitted as any[]), [admitted, quickFilter]);
    const completed = completedData as any[];
    const pendingTasks = pendingTasksData as any[];

    const totalActive = (sentToNurse as any[]).length + (underObserv as any[]).length + (admitted as any[]).length;
    const isRefreshing = f1 || f2 || f3 || f4 || f5;

    const longWaitCount = useMemo(
        () => (sentToNurse as any[]).filter((p) => getWaitInfo(p.updated_at).tone === "urgent").length,
        [sentToNurse]
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

    async function handleQuickMove(patient: any, nextStatus: PatientStatus, label: string) {
        if (!patient?.id || busyPatientId) return;
        setBusyPatientId(patient.id);
        try {
            await updateStatusMutation.mutateAsync({ id: patient.id, status: nextStatus });
            toast.success(`${patient.name ?? "Patient"} moved to ${label}.`);
        } catch (err: any) {
            toast.error(err?.message ?? "Could not update patient status.");
        } finally {
            setBusyPatientId(null);
        }
    }

    async function handleCompleteTask(task: any) {
        if (!task?.id || completingTaskId) return;
        setCompletingTaskId(task.id);
        try {
            await updateTaskMutation.mutateAsync({
                id: task.id,
                patientId: task.patient_id,
                updates: {
                    status: "Completed",
                    completion_time: new Date().toISOString(),
                } as any,
            });
            toast.success(`Completed: ${task.action_type ?? "Nursing order"} for ${task.patients?.name ?? "patient"}.`);
        } catch (err: any) {
            toast.error(err?.message ?? "Could not complete nursing task.");
        } finally {
            setCompletingTaskId(null);
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
            value: (sentToNurse as any[]).length,
            sub: longWaitCount > 0 ? `${longWaitCount} waiting >45m` : "Ready for vitals",
            icon: HeartPulse,
            iconBg: "bg-teal-50",
            iconColor: "text-teal-600",
            activeRing: "ring-2 ring-teal-500 border-teal-300 bg-teal-50/30",
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
            value: (underObserv as any[]).length,
            sub: "Active monitoring",
            icon: Eye,
            iconBg: "bg-sky-50",
            iconColor: "text-sky-600",
            activeRing: "ring-2 ring-sky-500 border-sky-300 bg-sky-50/30",
        },
        {
            key: "admitted",
            label: "Admitted / Ward",
            value: (admitted as any[]).length,
            sub: "Inpatient care",
            icon: BedDouble,
            iconBg: "bg-indigo-50",
            iconColor: "text-indigo-600",
            activeRing: "ring-2 ring-indigo-500 border-indigo-300 bg-indigo-50/30",
        },
        {
            key: "completed",
            label: "Completed Today",
            value: completed.length,
            sub: "Attended today",
            icon: CheckCircle2,
            iconBg: "bg-emerald-50",
            iconColor: "text-emerald-600",
            activeRing: "ring-2 ring-emerald-500 border-emerald-300 bg-emerald-50/30",
        },
    ];

    return (
        <div className="space-y-5 sm:space-y-6">
            {/* ── Header with live pulse & quick actions ── */}
            <DashboardHeader
                title="Nursing Command Center"
                description="Triage arrivals, execute doctor orders, monitor observations, and manage inpatient ward care."
                icon={HeartPulse}
                tone="teal"
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-bold text-emerald-700">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                            </span>
                            Live
                        </span>
                        <Link
                            href="/nurse/ward-board"
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-xs font-bold text-indigo-700 transition-all hover:bg-indigo-100 active:scale-95"
                        >
                            <BedDouble size={13} /> Ward Board
                        </Link>
                        <Link
                            href="/nurse/task"
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-teal-100 bg-teal-50 px-3 text-xs font-bold text-teal-700 transition-all hover:bg-teal-100 active:scale-95"
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
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-bold text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
                        >
                            <Users size={13} /> Full Queue
                        </Link>
                        <button
                            onClick={refetchAll}
                            type="button"
                            aria-label="Refresh nursing queues"
                            disabled={isRefreshing}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-teal-600 hover:border-teal-200 transition-all active:scale-95 disabled:opacity-60"
                        >
                            <RefreshCcw size={14} className={isRefreshing ? "animate-spin" : ""} />
                        </button>
                    </div>
                }
            />

            {/* ── Global Patient Search ── */}
            <NursePatientSearch />

            {/* ── Urgent wait banner ── */}
            <AnimatePresence>
                {longWaitCount > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200"
                    >
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
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Interactive KPI Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
                {statCards.map((s) => {
                    const Icon = s.icon;
                    const isSelected = stage === s.key;
                    const cardClass = `w-full text-left bg-white rounded-2xl border px-4 py-3.5 flex items-center gap-3 transition-all hover:shadow-md cursor-pointer ${
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
                            <motion.div key={s.key} whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
                                <Link href={s.href} className={cardClass}>
                                    {content}
                                </Link>
                            </motion.div>
                        );
                    }

                    return (
                        <motion.button
                            key={s.key}
                            type="button"
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setStage(isSelected ? "all" : (s.key as StageFilter))}
                            className={cardClass}
                        >
                            {content}
                        </motion.button>
                    );
                })}
            </div>

            {/* ── Animated Stage Filter Pills + Instant Queue Filter ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white rounded-2xl border border-gray-200/80 p-2.5 shadow-xs">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                    {([
                        { id: "all", label: "All Active", count: totalActive },
                        { id: "triage", label: "Triage Queue", count: (sentToNurse as any[]).length },
                        { id: "observation", label: "Observation", count: (underObserv as any[]).length },
                        { id: "admitted", label: "Admitted", count: (admitted as any[]).length },
                        { id: "completed", label: "Completed Today", count: completed.length },
                    ] as const).map((tab) => {
                        const active = stage === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setStage(tab.id)}
                                className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                                    active ? "text-white" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                                }`}
                            >
                                {active && (
                                    <motion.span
                                        layoutId="nurse-stage-pill"
                                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                                        className="absolute inset-0 rounded-xl bg-teal-600 shadow-xs"
                                    />
                                )}
                                <span className="relative z-10">{tab.label}</span>
                                <span className={`relative z-10 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                                    active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Instant inline filter */}
                <div className="relative w-full md:w-64 shrink-0">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        value={quickFilter}
                        onChange={(e) => setQuickFilter(e.target.value)}
                        placeholder="Filter queue by name or ID…"
                        className="w-full h-8 pl-8 pr-7 rounded-xl border border-gray-200 bg-gray-50/70 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-400 transition-all"
                    />
                    {quickFilter && (
                        <button
                            type="button"
                            onClick={() => setQuickFilter("")}
                            aria-label="Clear filter"
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
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
                            subtitle="Record vitals or route directly to Doctor / Observation"
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
                                    stageType="triage"
                                    busyId={busyPatientId}
                                    onPrefetch={seedPatientCache}
                                    onQuickMove={handleQuickMove}
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
                                    stageType="observation"
                                    busyId={busyPatientId}
                                    onPrefetch={seedPatientCache}
                                    onQuickMove={handleQuickMove}
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
                                    stageType="admitted"
                                    busyId={busyPatientId}
                                    onPrefetch={seedPatientCache}
                                    onQuickMove={handleQuickMove}
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

                {/* Right Column (1 col): Interactive Pending Doctor Orders + Recent Completed */}
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
                                    <p className="text-[11px] text-gray-400">One-click complete or open chart</p>
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
                                <AnimatePresence mode="popLayout">
                                    {pendingTasks.slice(0, 6).map((task: any) => {
                                        const priority = String(task.priority ?? "routine").toLowerCase();
                                        const isUrgent = priority === "stat" || priority === "urgent" || priority === "high";
                                        const isCompleting = completingTaskId === task.id;
                                        return (
                                            <motion.div
                                                key={task.id}
                                                layout
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: 16 }}
                                                className="group flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50/70 hover:bg-amber-50/50 border border-gray-100 hover:border-amber-200 transition-colors"
                                            >
                                                <Link
                                                    href={task.patient_id ? `/nurse/queue/patient/${task.patient_id}` : "/nurse/task"}
                                                    className="flex items-start gap-2.5 flex-1 min-w-0"
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
                                                </Link>
                                                <button
                                                    type="button"
                                                    disabled={isCompleting}
                                                    onClick={() => handleCompleteTask(task)}
                                                    title="Mark order as completed"
                                                    className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all active:scale-90 disabled:opacity-50"
                                                >
                                                    {isCompleting ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                                                </button>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
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
