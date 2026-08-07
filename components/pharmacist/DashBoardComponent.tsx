"use client";

import React from "react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { useCompletedPrescriptionsToday, usePendingPrescriptions } from "@/hooks/emr/use-emr";
import { LoadingSkeleton } from "@/components/emr";
import {
    Pill, Clock, CheckCircle2, ChevronRight,
    RefreshCcw, BadgeDollarSign, User, Calendar,
    Stethoscope, AlertCircle, TrendingUp, Package,
} from "lucide-react";
import Link from "next/link";
import { DashboardHeader } from "@/components/layout/DashboardHeader";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtNaira = (n?: number) =>
    n !== undefined ? `₦${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}` : "—";

function timeAgo(iso?: string) {
    if (!iso) return "";
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
}

function fmtDate(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PharmacistDashboard() {
    const { authorized } = useRoleProtection([UserRole.Pharmacist, UserRole.Admin]);
    const { data: prescriptions = [], isLoading: loading, refetch: refetchPending } = usePendingPrescriptions();
    const { data: completedPrescriptions = [], isLoading: completedLoading, refetch: refetchCompleted } = useCompletedPrescriptionsToday();

    if (!authorized) return null;

    const active      = prescriptions as any[];
    const dispensed   = completedPrescriptions as any[];
    const unreviewed  = active.filter(p => !p.pharmacist_id);
    const totalPending= active.reduce((s: number, p: any) => s + (Number(p.price) || 0), 0);
    const totalEarned = dispensed.reduce((s: number, p: any) => s + (Number(p.price) || 0), 0);

    const stats = [
        { label: "Active Orders",    value: active.length,     icon: Pill,          color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
        { label: "Unreviewed",       value: unreviewed.length, icon: Clock,         color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-100"  },
        { label: "Dispensed Today",  value: dispensed.length,  icon: CheckCircle2,  color: "text-green-600",  bg: "bg-green-50",  border: "border-green-100"  },
        { label: "Dispensed Value",    value: null,              icon: TrendingUp,    color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100",
          custom: totalEarned > 0 ? fmtNaira(totalEarned) : "₦0.00"
        },
    ];

    return (
        <div className="space-y-6">

            <DashboardHeader
                title="Pharmacy workspace"
                description="Review medication orders, dispense safely, and keep an eye on today’s pharmacy activity."
                icon={Pill}
                tone="violet"
                actions={
                    <Link href="/pharmacist/inventory" className="inline-flex h-9 items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 text-xs font-bold text-violet-700 transition-colors hover:bg-violet-100">
                        <Package size={13} /> Inventory
                    </Link>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                {stats.map(s => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label} className={`bg-white rounded-2xl border ${s.border} shadow-sm px-4 py-4 sm:px-5 sm:py-5 flex min-w-0 items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow`}>
                            <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                                <Icon size={19} className={s.color} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xl font-extrabold text-gray-900 leading-none truncate">
                                    {s.custom ?? s.value}
                                </p>
                                <p className="text-xs text-gray-400 font-medium mt-1">{s.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Dispensing queue */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                            <Pill size={16} className="text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800">Dispensing Queue</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Active prescriptions awaiting dispensing</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {active.length > 0 && totalPending > 0 && (
                            <span className="hidden sm:flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                                <BadgeDollarSign size={11} /> {fmtNaira(totalPending)}
                            </span>
                        )}
                        {active.length > 0 && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                                {active.length} pending
                            </span>
                        )}
                        <button onClick={() => { void Promise.all([refetchPending(), refetchCompleted()]); }}
                            type="button"
                            aria-label="Refresh pharmacy queues"
                            disabled={loading || completedLoading}
                            className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors disabled:cursor-wait disabled:opacity-60">
                            <RefreshCcw size={13} className={loading || completedLoading ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                <div className="px-4 py-4 sm:px-6 sm:py-5 space-y-3">
                    {loading ? <LoadingSkeleton rows={4} /> : active.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                                <CheckCircle2 size={22} className="text-green-500" />
                            </div>
                            <p className="text-sm font-semibold text-gray-600">Queue Empty</p>
                            <p className="text-xs text-gray-400">No active prescriptions to dispense</p>
                        </div>
                    ) : (
                        active.map((order: any, idx: number) => {
                            const patientName     = order.patients?.name ?? `Patient #${order.patient_id?.slice(-6) ?? "—"}`;
                            const prescribedByName= order.staffs?.name ?? order.doctor_name ?? null;
                            const isUnreviewed    = !order.pharmacist_id;
                            const price           = Number(order.price) || 0;
                            const ago             = timeAgo(order.created_at);

                            return (
                                <Link key={order.id} href={`/pharmacist/queue/patient/${order.patient_id}`}
                                    className="group block rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-violet-100 hover:shadow-sm transition-all overflow-hidden">
                                    <div className="flex items-start gap-3 p-4">
                                        <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 group-hover:bg-violet-600 group-hover:text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5 transition-colors">
                                            {idx + 1}
                                        </div>
                                        <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center font-black text-violet-600 text-sm shrink-0">
                                            {(patientName)[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-bold text-gray-900 truncate">{patientName}</p>
                                                {isUnreviewed && (
                                                    <span className="shrink-0 flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                                                        <AlertCircle size={9} /> New
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                                                <span className="flex items-center gap-1 font-medium text-gray-700">
                                                    <Stethoscope size={10} /> {order.drug_name ?? "—"}
                                                </span>
                                                {order.dosage && <span>{order.dosage}</span>}
                                                {order.duration && <span>· {order.duration}</span>}
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">
                                                {prescribedByName && <span>Prescribed by Dr. {prescribedByName}</span>}
                                                {ago && <span>· {ago}</span>}
                                            </div>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            {price > 0 && (
                                                <p className="text-sm font-extrabold text-green-600">{fmtNaira(price)}</p>
                                            )}
                                            <ChevronRight size={15} className="text-gray-300 group-hover:text-violet-500 ml-auto mt-1 transition-colors" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Dispensed today */}
            {(dispensed.length > 0 || completedLoading) && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 border-b border-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                                <CheckCircle2 size={15} className="text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">Dispensed Today</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {dispensed.length} prescription{dispensed.length !== 1 ? "s" : ""} completed
                                </p>
                            </div>
                        </div>
                        {totalEarned > 0 && (
                            <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                                <BadgeDollarSign size={11} /> {fmtNaira(totalEarned)}
                            </span>
                        )}
                    </div>
                    <div className="px-4 py-4 sm:px-6 space-y-2">
                        {completedLoading ? <LoadingSkeleton rows={2} /> : dispensed.slice(0, 8).map((rx: any) => (
                            <div key={rx.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-gray-800 truncate">
                                        {rx.patients?.name ?? `Patient #${rx.patient_id?.slice(-6) ?? "—"}`}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        {rx.drug_name ?? "Prescription"}{rx.dosage ? ` · ${rx.dosage}` : ""}
                                    </p>
                                </div>
                                {Number(rx.price) > 0 && (
                                    <p className="text-xs font-bold text-green-600 shrink-0">{fmtNaira(Number(rx.price))}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}