"use client";

import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import {
    HeartPulse, CheckCircle2, RefreshCcw,
    ChevronRight, Phone, Baby, BedDouble,
    Eye, ClipboardList,
} from "lucide-react";
import Link from "next/link";
import { usePatientsByStatus, useCompletedNursingActions } from "@/hooks/emr/use-emr";
import NursePatientSearch from "./component/nurse-patient-search";
import { DashboardHeader } from "@/components/layout/DashboardHeader";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob?: string) {
    if (!dob) return null;
    const y = new Date().getFullYear() - new Date(dob).getFullYear();
    return y < 1 ? "< 1 yr" : `${y} yrs`;
}

function fmtTime(iso?: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function timeInQueue(updatedAt?: string): string {
    if (!updatedAt) return "";
    const mins = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000);
    if (mins < 1)   return "just now";
    if (mins < 60)  return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ─── Patient card ─────────────────────────────────────────────────────────────

const HOVER_BORDERS: Record<string, string> = {
    "bg-teal-600": "hover:border-teal-200",
    "bg-sky-600": "hover:border-sky-200",
    "bg-indigo-600": "hover:border-indigo-200",
};

function PatientCard({ patient, index, href, accentColor }: {
    patient: any; index?: number; href: string;
    accentColor: string;
}) {
    const age      = calcAge(patient.birth_date ?? patient.date_of_birth);
    const isChild  = age ? parseInt(age) <= 12 : false;
    const isFemale = (patient.gender ?? "").toLowerCase() === "female";

    return (
        <Link href={href}
            className={`group flex items-center gap-3 p-3.5 rounded-2xl border bg-gray-50/50 hover:bg-white hover:shadow-sm transition-all border-gray-100 ${HOVER_BORDERS[accentColor] ?? "hover:border-gray-200"}`}>

            {index !== undefined && (
                <div className={`w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-black shrink-0 transition-colors ${accentColor}`}>
                    {index + 1}
                </div>
            )}

            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                isFemale ? "bg-pink-50 border-pink-100 text-pink-600" : "bg-teal-50 border-teal-100 text-teal-600"
            }`}>
                {(patient.name ?? "?")[0].toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-gray-800 truncate">{patient.name ?? "—"}</p>
                    {isChild && (
                        <span className="flex items-center gap-0.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                            <Baby size={8} /> Paed
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap text-[11px] text-gray-400">
                    {patient.gender && <span className={isFemale ? "text-pink-500" : "text-teal-500"}>{patient.gender}</span>}
                    {age && <span>· {age}</span>}
                    {patient.phone && (
                        <span className="flex items-center gap-0.5">
                            <Phone size={9} /> {patient.phone}
                        </span>
                    )}
                    {patient.updated_at && (
                        <span className="text-gray-300">· {timeInQueue(patient.updated_at)}</span>
                    )}
                </div>
            </div>

            <ChevronRight size={15} className="text-gray-300 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
    );
}

// ─── Status group ─────────────────────────────────────────────────────────────

function StatusGroup({ icon: Icon, iconBg, iconColor, label, count, badgeBg, badgeText, borderColor, children, loading }: {
    icon: React.ElementType; iconBg: string; iconColor: string;
    label: string; count: number; badgeBg: string; badgeText: string; borderColor: string;
    children: React.ReactNode; loading?: boolean;
}) {
    return (
        <div className={`bg-white rounded-3xl border shadow-sm overflow-hidden ${borderColor}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-4 sm:px-5 border-b border-gray-50">
                <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                        <Icon size={15} className={iconColor} />
                    </div>
                    <p className="text-sm font-bold text-gray-800">{label}</p>
                </div>
                {count > 0 && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${badgeBg} ${badgeText}`}>
                        {count}
                    </span>
                )}
            </div>
            <div className="px-4 py-4 sm:px-5 space-y-2.5">
                {loading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-2xl border border-gray-100">
                            <div className="w-9 h-9 rounded-xl bg-gray-200 shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-3 bg-gray-200 rounded-full w-1/3" />
                                <div className="h-2 bg-gray-200 rounded-full w-1/4" />
                            </div>
                        </div>
                    ))
                ) : count === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                        <CheckCircle2 size={18} className="text-gray-200" />
                        <p className="text-xs text-gray-400">None at this stage</p>
                    </div>
                ) : children}
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function NurseDashboard() {
    const { authorized } = useRoleProtection([UserRole.Nurse, UserRole.Admin]);

    const { data: sentToNurse    = [], isPending: l1, refetch: r1 } = usePatientsByStatus("sent-to-nurse" as any);
    const { data: underObserv    = [], isPending: l2, refetch: r2 } = usePatientsByStatus("under-observation" as any);
    const { data: admitted       = [], isPending: l3, refetch: r3 } = usePatientsByStatus("admitted" as any);
    const { data: completedData  = [], isPending: l4, refetch: r4 } = useCompletedNursingActions();

    if (!authorized) return null;

    const queue     = sentToNurse   as any[];
    const observed  = underObserv   as any[];
    const inpatient = admitted      as any[];
    const completed = completedData as any[];

    const total     = queue.length + observed.length + inpatient.length;

    function refetchAll() { void Promise.all([r1(), r2(), r3(), r4()]); }

    return (
        <div className="space-y-5 sm:space-y-6">

            <DashboardHeader
                title="Nursing workspace"
                description="Prioritize patients who need attention, monitor observations, and continue inpatient care."
                icon={HeartPulse}
                tone="teal"
                actions={
                    <Link href="/nurse/task" className="inline-flex h-9 items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 px-3 text-xs font-bold text-teal-700 transition-colors hover:bg-teal-100">
                        <ClipboardList size={13} /> View tasks
                    </Link>
                }
            />

            {/* ── Patient search — pull up ANY patient, not just your queue ── */}
            <NursePatientSearch />

            {/* ── Stats row ── */}
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-3">
                {[
                    { label: "Needs Attention",    value: queue.length,     color: "text-teal-600",   bg: "bg-teal-50",   border: "border-teal-100",   icon: HeartPulse  },
                    { label: "Under Observation",  value: observed.length,  color: "text-sky-600",    bg: "bg-sky-50",    border: "border-sky-100",    icon: Eye         },
                    { label: "Admitted / Ward",    value: inpatient.length, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", icon: BedDouble   },
                    { label: "Completed Today",    value: completed.length, color: "text-green-600",  bg: "bg-green-50",  border: "border-green-100",  icon: CheckCircle2},
                ].map(s => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className={`bg-white rounded-2xl border ${s.border} shadow-sm px-4 py-4 flex items-center gap-3 hover:shadow-md transition-shadow`}>
                            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                                <Icon size={16} className={s.color} />
                            </div>
                            <div>
                                <p className="text-xl font-extrabold text-gray-900 leading-none">{s.value}</p>
                                <p className="text-[10px] text-gray-400 font-medium mt-0.5 leading-tight">{s.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Refresh bar ── */}
            <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                    {total > 0 ? `${total} patient${total !== 1 ? "s" : ""} across all stages` : "All clear"}
                </p>
                <button onClick={refetchAll}
                    type="button"
                    aria-label="Refresh nursing queues"
                    disabled={l1 || l2 || l3 || l4}
                    className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors disabled:cursor-wait disabled:opacity-60">
                    <RefreshCcw size={13} className={l1 || l2 || l3 || l4 ? "animate-spin" : ""} />
                </button>
            </div>

            {/* ── Three status groups ── */}
            <div className="space-y-4">

                {/* Sent to Nurse — needs immediate attention */}
                <StatusGroup
                    icon={HeartPulse} iconBg="bg-teal-50" iconColor="text-teal-600"
                    label="Needs Nursing Attention" count={queue.length}
                    badgeBg="bg-teal-50 border-teal-100" badgeText="text-teal-700"
                    borderColor="border-teal-100"
                    loading={l1}>
                    {queue.map((p, i) => (
                        <PatientCard key={p.id} patient={p} index={i}
                            href={`/nurse/queue/patient/${p.id}`}
                            accentColor="bg-teal-600" />
                    ))}
                </StatusGroup>

                {/* Under observation */}
                <StatusGroup
                    icon={Eye} iconBg="bg-sky-50" iconColor="text-sky-600"
                    label="Under Observation" count={observed.length}
                    badgeBg="bg-sky-50 border-sky-100" badgeText="text-sky-700"
                    borderColor="border-sky-100"
                    loading={l2}>
                    {observed.map(p => (
                        <PatientCard key={p.id} patient={p}
                            href={`/nurse/queue/patient/${p.id}`}
                            accentColor="bg-sky-600" />
                    ))}
                </StatusGroup>

                {/* Admitted — inpatient nursing care */}
                <StatusGroup
                    icon={BedDouble} iconBg="bg-indigo-50" iconColor="text-indigo-600"
                    label="Admitted Patients" count={inpatient.length}
                    badgeBg="bg-indigo-50 border-indigo-100" badgeText="text-indigo-700"
                    borderColor="border-indigo-100"
                    loading={l3}>
                    {inpatient.map(p => (
                        <PatientCard key={p.id} patient={p}
                            href={`/nurse/queue/patient/${p.id}`}
                            accentColor="bg-indigo-600" />
                    ))}
                </StatusGroup>
            </div>

            {/* ── Completed today ── */}
            {completed.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                        <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={15} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">Completed Today</p>
                            <p className="text-xs text-gray-400">{completed.length} patient{completed.length !== 1 ? "s" : ""} attended</p>
                        </div>
                    </div>
                    <div className="px-5 py-4 space-y-2">
                        {completed.map((t: any) => (
                            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-700 truncate">
                                        {t.patients?.name ?? `Patient #${t.patient_id?.slice(-6) ?? "—"}`}
                                    </p>
                                    <p className="text-[10px] text-gray-400">{t.action_type ?? "Nursing care"}</p>
                                </div>
                                <p className="text-[10px] text-gray-400 shrink-0">{fmtTime(t.completion_time)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}