"use client";

import React from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { usePendingNursingActions } from "@/hooks/use-emr";
import { LoadingSkeleton } from "@/components/emr";
import {
    HeartPulse, Clock, CheckCircle2, AlertCircle,
    ChevronRight, RefreshCcw, Activity,
} from "lucide-react";
import Link from "next/link";

export default function NurseDashboard() {
    const { user }       = useAuth();
    const { authorized } = useRoleProtection([UserRole.Nurse, UserRole.Admin]);
    const { data: actions, loading, refetch } = usePendingNursingActions();

    if (!authorized) return null;

    const pending   = actions?.filter((a) => a.status === "Pending")    ?? [];
    const active    = actions?.filter((a) => a.status === "InProgress")  ?? [];
    const completed = actions?.filter((a) => a.status === "Completed")   ?? [];

    const stats = [
        { label: "New Tasks",   value: pending.length,   icon: AlertCircle,  color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-100"  },
        { label: "Active Care", value: active.length,    icon: Activity,     color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100"   },
        { label: "Completed",   value: completed.length, icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50",  border: "border-green-100"  },
    ];

    return (
        <div className="space-y-6">

            {/* ── Stats ── */}
            <div className="grid grid-cols-3 gap-4">
                {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className={`bg-white rounded-2xl border ${s.border} shadow-sm px-5 py-5 flex items-center gap-4 hover:shadow-md transition-shadow`}>
                            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                                <Icon size={19} className={s.color} />
                            </div>
                            <div>
                                <p className="text-2xl font-extrabold text-gray-900 leading-none">{s.value}</p>
                                <p className="text-xs text-gray-400 font-medium mt-1">{s.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Care queue ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                            <HeartPulse size={16} className="text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800 leading-tight">Active Care Queue</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Patients requiring nursing attention</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {pending.length > 0 && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                {pending.length} pending
                            </span>
                        )}
                        <button onClick={() => refetch()}
                            className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                            <RefreshCcw size={13} />
                        </button>
                    </div>
                </div>

                <div className="px-6 py-5 space-y-3">
                    {loading ? (
                        <LoadingSkeleton rows={4} />
                    ) : pending.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                                <CheckCircle2 size={22} className="text-green-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-gray-600">All patients attended</p>
                                <p className="text-xs text-gray-400 mt-1">No pending nursing actions</p>
                            </div>
                        </div>
                    ) : (
                        pending.map((task: any, idx) => (
                            <Link
                                key={task.id}
                                href={`/nurse/task/${task.id}`}
                                className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-teal-100 hover:shadow-sm transition-all"
                            >
                                {/* Queue position */}
                                <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center text-xs font-black shrink-0 transition-colors">
                                    {idx + 1}
                                </div>

                                {/* Patient avatar */}
                                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center font-black text-teal-600 text-sm shrink-0">
                                    {task.patient_id?.slice(-2).toUpperCase() ?? "PT"}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">
                                        Patient #{task.patient_id?.slice(-6) ?? "—"}
                                    </p>
                                    <p className="text-xs text-gray-400 font-medium mt-0.5 uppercase tracking-widest">
                                        {task.action_type ?? task.actionType ?? "Nursing Care"}
                                    </p>
                                </div>

                                {/* Priority dot */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="hidden sm:block text-xs font-semibold text-teal-600 group-hover:text-teal-700">
                                        Attend
                                    </span>
                                    <ChevronRight size={16} className="text-gray-300 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>

            {/* ── Completed today ── */}
            {completed.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-50">
                        <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={15} className="text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">Completed Today</p>
                            <p className="text-xs text-gray-400 mt-0.5">{completed.length} task{completed.length !== 1 ? "s" : ""} done</p>
                        </div>
                    </div>
                    <div className="px-6 py-4 space-y-2">
                        {completed.map((task: any) => (
                            <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-700">Patient #{task.patient_id?.slice(-6)}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{task.action_type ?? "Nursing care"}</p>
                                </div>
                                <p className="text-[10px] text-gray-400 shrink-0">
                                    {task.completion_time
                                        ? new Date(task.completion_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                                        : ""}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}