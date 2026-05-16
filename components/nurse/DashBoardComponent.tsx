"use client";

import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import {
    HeartPulse, CheckCircle2, RefreshCcw,
    ChevronRight, Phone, Baby, User,
} from "lucide-react";
import Link from "next/link";
import { usePatientsByStatus, usePendingNursingActions } from "@/hooks/emr/use-emr";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob?: string): string | null {
    if (!dob) return null;
    const years = new Date().getFullYear() - new Date(dob).getFullYear();
    return years < 1 ? "< 1 yr" : `${years} yrs`;
}

function fmtTime(iso?: string): string {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NurseDashboard() {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.Nurse, UserRole.Admin]);

    // ── Source of truth: patients currently sent to nurse ─────────────────────
    // This is what matters — how many patients are waiting and who they are.
    const {
        data: sentToNurse = [],
        isPending: loadingQueue,
        refetch,
    } = usePatientsByStatus("sent-to-nurse" as any);

    // ── Completed nursing actions for the "done today" section ────────────────
    const { data: actions = [] } = usePendingNursingActions();
    const completed = (actions as any[]).filter(a => a.status === "Completed");

    if (!authorized) return null;

    const queue = sentToNurse as any[];

    return (
        <div className="space-y-6">

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 gap-4">
                {[
                    {
                        label: "Patients in Queue",
                        value: queue.length,
                        icon: HeartPulse,
                        color: "text-teal-600",
                        bg: "bg-teal-50",
                        border: "border-teal-100",
                    },
                    {
                        label: "Completed Today",
                        value: completed.length,
                        icon: CheckCircle2,
                        color: "text-green-600",
                        bg: "bg-green-50",
                        border: "border-green-100",
                    },
                ].map(({ label, value, icon: Icon, color, bg, border }) => (
                    <div key={label} className={`bg-white rounded-2xl border ${border} shadow-sm px-5 py-5 flex items-center gap-4 hover:shadow-md transition-shadow`}>
                        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                            <Icon size={19} className={color} />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-gray-900 leading-none">{value}</p>
                            <p className="text-xs text-gray-400 font-medium mt-1">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Patients sent to nurse ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                            <HeartPulse size={16} className="text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800 leading-tight">Nursing Queue</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Patients waiting for nursing attention</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {queue.length > 0 && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                                {queue.length} waiting
                            </span>
                        )}
                        <button
                            onClick={() => refetch()}
                            className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
                        >
                            <RefreshCcw size={13} />
                        </button>
                    </div>
                </div>

                <div className="px-6 py-5 space-y-3">
                    {loadingQueue ? (
                        // Skeleton
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-2xl border border-gray-100">
                                <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-gray-200 rounded-full w-1/3" />
                                    <div className="h-2.5 bg-gray-200 rounded-full w-1/4" />
                                </div>
                            </div>
                        ))
                    ) : queue.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                                <CheckCircle2 size={22} className="text-green-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-gray-600">Queue is clear</p>
                                <p className="text-xs text-gray-400 mt-1">No patients waiting for nursing care</p>
                            </div>
                        </div>
                    ) : (
                        queue.map((patient: any, idx: number) => {
                            const age = calcAge(patient.birth_date);
                            const isChild = age ? parseInt(age) < 13 : false;
                            const isFemale = (patient.gender ?? "").toLowerCase() === "female";

                            return (
                                <Link
                                    key={patient.id}
                                    href={`/nurse/queue/patient/${patient.id}`}
                                    className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-teal-100 hover:shadow-sm transition-all"
                                >
                                    {/* Queue number */}
                                    <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center text-xs font-black shrink-0 transition-colors">
                                        {idx + 1}
                                    </div>

                                    {/* Avatar */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0
                                        ${isFemale ? "bg-pink-50 border border-pink-100 text-pink-600" : "bg-teal-50 border border-teal-100 text-teal-600"}`}>
                                        {(patient.name ?? "?")[0].toUpperCase()}
                                    </div>

                                    {/* Patient info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <p className="text-sm font-bold text-gray-800 truncate">{patient.name ?? "—"}</p>
                                            {isChild && (
                                                <span className="flex items-center gap-0.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                                    <Baby size={8} /> Paed
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            {patient.gender && (
                                                <span className={`text-[11px] font-medium ${isFemale ? "text-pink-500" : "text-teal-500"}`}>
                                                    {patient.gender}
                                                </span>
                                            )}
                                            {age && <span className="text-[11px] text-gray-400">· {age}</span>}
                                            {patient.phone && (
                                                <div className="flex items-center gap-1">
                                                    <Phone size={10} className="text-gray-400" />
                                                    <span className="text-[11px] text-gray-400">{patient.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="hidden sm:block text-xs font-semibold text-teal-600 group-hover:text-teal-700">
                                            Attend
                                        </span>
                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Completed today (from nursing_actions) ── */}
            {completed.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-50">
                        <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={15} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">Completed Today</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {completed.length} patient{completed.length !== 1 ? "s" : ""} attended
                            </p>
                        </div>
                    </div>
                    <div className="px-6 py-4 space-y-2">
                        {completed.map((task: any) => {
                            const patientName = task.patients?.name ?? `Patient #${task.patient_id?.slice(-6) ?? "—"}`;
                            return (
                                <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-700 truncate">{patientName}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{task.action_type ?? "Nursing care"}</p>
                                    </div>
                                    <p className="text-[10px] text-gray-400 shrink-0">
                                        {fmtTime(task.completion_time)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}