"use client";

import React from "react";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { usePendingPrescriptions } from "@/hooks/use-emr";
import { LoadingSkeleton } from "@/components/emr";
import {
    Pill, Clock, CheckCircle2, ChevronRight,
    RefreshCcw, BadgeDollarSign, User, Calendar,
    Stethoscope, AlertCircle,
} from "lucide-react";
import Link from "next/link";

export default function PharmacistDashboard() {
    const { authorized }                            = useRoleProtection([UserRole.Pharmacist, UserRole.Admin]);
    const { data: prescriptions, loading, refetch } = usePendingPrescriptions();

    if (!authorized) return null;

    const active     = prescriptions?.filter((p: any) => p.status === "Active")    ?? [];
    const dispensed  = prescriptions?.filter((p: any) => p.status === "Dispensed") ?? [];
    const unreviewed = active.filter((p: any) => !p.pharmacist_id);
    const totalValue = active.reduce((sum: number, p: any) => sum + (Number(p.price) || 0), 0);

    const stats = [
        { label: "Active Orders",   value: active.length,     icon: Pill,         color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
        { label: "Pending Review",  value: unreviewed.length, icon: Clock,        color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-100"  },
        { label: "Dispensed Today", value: dispensed.length,  icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50",  border: "border-green-100"  },
    ];

    return (
        <div className="space-y-6">

            {/* ── Stats ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div key={s.label}
                            className={`bg-white rounded-2xl border ${s.border} shadow-sm px-5 py-5 flex items-center gap-4 hover:shadow-md transition-shadow`}>
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

            {/* ── Dispensing queue ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                            <Pill size={16} className="text-violet-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800 leading-tight">Dispensing Queue</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Active prescriptions awaiting dispensing</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {active.length > 0 && totalValue > 0 && (
                            <span className="hidden sm:flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                                <BadgeDollarSign size={11} />
                                ₦{totalValue.toLocaleString("en-NG")}
                            </span>
                        )}
                        {active.length > 0 && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                                {active.length} pending
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
                    ) : active.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                                <CheckCircle2 size={22} className="text-green-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-gray-600">Queue Empty</p>
                                <p className="text-xs text-gray-400 mt-1">No active prescriptions to dispense</p>
                            </div>
                        </div>
                    ) : (
                        active.map((order: any, idx: number) => {
                            const patientName  = order.patients?.name ?? `Patient #${order.patient_id?.slice(-6) ?? "—"}`;
                            const patientPhone = order.patients?.phone;
                            const gender       = order.patients?.gender;
                            const isUnreviewed = !order.pharmacist_id;
                            const price        = Number(order.price) || 0;
                            const initial      = patientName?.[0]?.toUpperCase() ?? "P";
                            const dispensedAt  = order.dispensed_at
                                ? new Date(order.dispensed_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
                                : null;
                            const createdAt    = order.created_at
                                ? new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                                : null;

                            return (
                                <Link
                                    key={order.id}
                                    href={`/pharmacist/queue/patient/${order.patient_id}`}
                                    className="group block rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-violet-100 hover:shadow-sm transition-all overflow-hidden"
                                >
                                    <div className="flex items-start gap-4 p-4">
                                        {/* Queue number */}
                                        <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 group-hover:bg-violet-600 group-hover:text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5 transition-colors">
                                            {idx + 1}
                                        </div>

                                        {/* Patient avatar */}
                                        <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center font-black text-violet-600 text-sm shrink-0">
                                            {initial}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0 space-y-2">

                                            {/* Name + badges */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-bold text-gray-900 truncate">{patientName}</p>
                                                {isUnreviewed && (
                                                    <span className="shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                                                        <AlertCircle size={9} /> Unreviewed
                                                    </span>
                                                )}
                                            </div>

                                            {/* Patient meta row */}
                                            <div className="flex items-center gap-3 flex-wrap">
                                                {patientPhone && (
                                                    <div className="flex items-center gap-1">
                                                        <User size={10} className="text-gray-400" />
                                                        <span className="text-[11px] text-gray-500 font-medium">{patientPhone}</span>
                                                    </div>
                                                )}
                                                {gender && (
                                                    <span className="text-[11px] text-gray-400">{gender}</span>
                                                )}
                                                {createdAt && (
                                                    <div className="flex items-center gap-1">
                                                        <Calendar size={10} className="text-gray-400" />
                                                        <span className="text-[11px] text-gray-400">{createdAt}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Prescription detail row */}
                                            <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-gray-100">
                                                <div className="flex items-center gap-1">
                                                    <Stethoscope size={11} className="text-violet-500" />
                                                    <span className="text-xs font-bold text-gray-700">{order.drug_name ?? "—"}</span>
                                                </div>
                                                {order.dosage && (
                                                    <span className="text-[11px] text-gray-400 font-medium">{order.dosage}</span>
                                                )}
                                                {order.duration && (
                                                    <span className="text-[11px] text-gray-400">· {order.duration}</span>
                                                )}
                                                {price > 0 && (
                                                    <div className="flex items-center gap-1 ml-auto shrink-0">
                                                        <BadgeDollarSign size={11} className="text-green-500" />
                                                        <span className="text-xs font-extrabold text-green-600">
                                                            ₦{price.toLocaleString("en-NG")}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Chevron */}
                                        <div className="shrink-0 flex items-center gap-1 self-center">
                                            <span className="hidden sm:block text-xs font-bold text-violet-600 group-hover:text-violet-700">
                                                Dispense
                                            </span>
                                            <ChevronRight size={16}
                                                className="text-gray-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── Dispensed today ── */}
            {dispensed.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
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
                        {/* Total dispensed value */}
                        {dispensed.reduce((s: number, p: any) => s + (Number(p.price) || 0), 0) > 0 && (
                            <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                                <BadgeDollarSign size={11} />
                                ₦{dispensed.reduce((s: number, p: any) => s + (Number(p.price) || 0), 0).toLocaleString("en-NG")}
                            </span>
                        )}
                    </div>
                    <div className="px-6 py-4 space-y-2">
                        {dispensed.map((rx: any) => {
                            const name = rx.patients?.name ?? `Patient #${rx.patient_id?.slice(-6) ?? "—"}`;
                            return (
                                <div key={rx.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-800">{name}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            {rx.drug_name ?? "Prescription"}
                                            {rx.dosage ? ` · ${rx.dosage}` : ""}
                                        </p>
                                    </div>
                                    {Number(rx.price) > 0 && (
                                        <p className="text-xs font-bold text-green-600 shrink-0">
                                            ₦{Number(rx.price).toLocaleString("en-NG")}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}