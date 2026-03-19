"use client";

import React from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { usePendingPrescriptions } from "@/hooks/use-emr";
import { LoadingSkeleton, EmptyState } from "@/components/emr";
import {
    Pill, Clock, CheckCircle2, ChevronRight,
    FlaskConical, Package, Activity,
} from "lucide-react";
import Link from "next/link";

export default function DashBoardComponent() {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.Pharmacist, UserRole.Admin]);
    const { data: prescriptions, loading } = usePendingPrescriptions();

    if (!authorized) return null;

    const active = prescriptions?.filter((p) => p.status === "Active") ?? [];
    const dispensed = prescriptions?.filter((p) => p.status === "Dispensed") ?? [];
    const pending = active.filter((p) => !p.pharmacist_id);

    const stats = [
        {
            label: "Active Orders",
            value: active.length,
            icon: Pill,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100",
        },
        {
            label: "Pending Review",
            value: pending.length,
            icon: Clock,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-100",
        },
        {
            label: "Dispensed Today",
            value: dispensed.length,
            icon: CheckCircle2,
            color: "text-green-600",
            bg: "bg-green-50",
            border: "border-green-100",
        },
    ];

    return (
        <div className="space-y-6">

            {/* ── Stats ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.map((s) => {
                    const Icon = s.icon;
                    return (
                        <div
                            key={s.label}
                            className={`bg-white rounded-2xl border ${s.border} shadow-sm px-5 py-5 flex items-center gap-4 hover:shadow-md transition-shadow`}
                        >
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

                {/* Card header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                            <FlaskConical size={16} className="text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-800 leading-tight">Dispensing Queue</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Active prescriptions awaiting dispensing</p>
                        </div>
                    </div>
                    {active.length > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            {active.length} pending
                        </span>
                    )}
                </div>

                <div className="px-6 pt-4 pb-6 space-y-3">
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
                        active.map((order, idx) => {
                            const initials = order.patient_id?.slice(-2).toUpperCase() ?? "PT";
                            const medCount = order.medications?.length ?? 0;
                            const isUnreviewed = !order.pharmacist_id;

                            return (
                                <Link
                                    key={order.id}
                                    href={`/pharmacist/dispense/${order.id}`}
                                    className="group flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-100 hover:shadow-sm transition-all"
                                >
                                    {/* Queue number */}
                                    <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-xs font-black shrink-0 transition-colors">
                                        {idx + 1}
                                    </div>

                                    {/* Patient avatar */}
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-black text-blue-600 text-sm shrink-0">
                                        {initials}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-gray-800 truncate">
                                                Patient #{order.patient_id?.slice(-6) ?? "—"}
                                            </p>
                                            {isUnreviewed && (
                                                <span className="shrink-0 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                                                    Unreviewed
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Package size={11} className="text-gray-400" />
                                            <p className="text-xs text-gray-400 font-medium">
                                                {medCount} medication{medCount !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="hidden sm:block text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                                            Dispense
                                        </span>
                                        <ChevronRight
                                            size={16}
                                            className="text-gray-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all"
                                        />
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}