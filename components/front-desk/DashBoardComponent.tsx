"use client";

import React from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import { LoadingSkeleton, EmptyState } from "@/components/emr";
import { Users, ClipboardList, Wallet, LogOut, Plus, ChevronRight, ArrowRight } from "lucide-react";
import Link from "next/link";
import PaymentConfirmation from "./PaymentSuite";
import { usePatientsByStatus } from "@/hooks/emr/use-patients";

export default function DashBoardComponent() {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.FrontDesk, UserRole.Admin]);

    const registeredPatients = usePatientsByStatus(PatientStatus.Registered);
    const awaitingConsultationPatients = usePatientsByStatus(PatientStatus.AwaitingConsultation);
    const awaitingPaymentPatients = usePatientsByStatus(PatientStatus.AwaitingPayment);
    const dischargedPatients = usePatientsByStatus(PatientStatus.Discharged);
    

    if (!authorized) return null;

    const stats = [
        {
            label: "New Arrivals",
            value: registeredPatients.data?.length ?? 0,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
            border: "border-blue-100",
        },
        {
            label: "In Queue",
            value: awaitingConsultationPatients.data?.length ?? 0,
            icon: ClipboardList,
            color: "text-amber-600",
            bg: "bg-amber-50",
            border: "border-amber-100",
        },
        {
            label: "Pending Payment",
            value: awaitingPaymentPatients.data?.length ?? 0,
            icon: Wallet,
            color: "text-red-600",
            bg: "bg-red-50",
            border: "border-red-100",
        },
        {
            label: "Discharged",
            value: dischargedPatients.data?.length ?? 0,
            icon: LogOut,
            color: "text-green-600",
            bg: "bg-green-50",
            border: "border-green-100",
        },
    ];

    return (
        <div className="space-y-6">

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* ── Middle row: admissions + billing queue ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Recent admissions */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                <Users size={15} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800 leading-tight">Recent Admissions</p>
                                <p className="text-xs text-gray-400 mt-0.5">Newly registered patients</p>
                            </div>
                        </div>
                        <Link href="/front-desk/queue" className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                            View All <ChevronRight size={13} />
                        </Link>
                    </div>

                    <div className="px-6 py-4 space-y-3">
                        {registeredPatients.loading ? (
                            <LoadingSkeleton rows={3} />
                        ) : registeredPatients.data?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                                <p className="text-sm font-semibold text-gray-500">No recent admissions</p>
                                <p className="text-xs text-gray-400">All clear for now</p>
                            </div>
                        ) : (
                            registeredPatients.data?.slice(0, 4).map((p) => (
                                <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors group">
                                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center font-black text-blue-600 text-sm shrink-0">
                                        {p.name?.[0]?.toUpperCase() ?? "P"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{p.name}</p>
                                        <p className="text-xs text-gray-400 font-medium">{p.phone ?? "No phone"}</p>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-200 group-hover:text-blue-400 transition-colors shrink-0" />
                                </div>
                            ))
                        )}
                    </div>

                    {/* Register button */}
                    <div className="px-6 pb-5">
                        <Link href="/front-desk/patient/new">
                            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 text-gray-400 hover:text-blue-600 text-xs font-bold uppercase tracking-widest transition-all">
                                <Plus size={13} /> Register New Patient
                            </button>
                        </Link>
                    </div>
                </div>

                {/* Billing queue */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                                <Wallet size={15} className="text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800 leading-tight">Billing Queue</p>
                                <p className="text-xs text-gray-400 mt-0.5">Patients awaiting checkout</p>
                            </div>
                        </div>
                        <Link href="/front-desk/payment" className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 transition-colors">
                            Process All <ChevronRight size={13} />
                        </Link>
                    </div>

                    <div className="px-6 py-4 space-y-3">
                        {awaitingPaymentPatients.loading ? (
                            <LoadingSkeleton rows={3} />
                        ) : awaitingPaymentPatients.data?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                                <p className="text-sm font-semibold text-gray-500">Billing clear</p>
                                <p className="text-xs text-gray-400">No pending checkouts</p>
                            </div>
                        ) : (
                            awaitingPaymentPatients.data?.slice(0, 4).map((p) => (
                                <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl bg-red-50/50 border border-red-100/60 hover:bg-red-50 transition-colors group">
                                    <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center font-black text-red-600 text-sm shrink-0">
                                        {p.name?.[0]?.toUpperCase() ?? "P"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">{p.name}</p>
                                        <p className="text-xs text-red-400 font-medium">Pending final checkout</p>
                                    </div>
                                    <Link href={`/front-desk/payment/${p.id}`}>
                                        <button className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors">
                                            Pay <ArrowRight size={11} />
                                        </button>
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ── Payment confirmation ── */}
            <PaymentConfirmation />
        </div>
    );
}