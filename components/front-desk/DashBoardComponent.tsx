"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import { usePatientsByStatus, usePendingPayments } from "@/hooks/use-emr";
import {
    PatientInfoCard,
    PaymentCard,
    LoadingSkeleton,
    EmptyState,
} from "@/components/emr";
import { Button } from "@/components/ui/button";
import { Users, ClipboardList, Wallet, LogOut, Plus } from "lucide-react";
import Link from "next/link";

export default function DashBoardComponent() {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.FrontDesk, UserRole.Admin]);

    const registeredPatients = usePatientsByStatus(PatientStatus.Registered);
    const awaitingConsultationPatients = usePatientsByStatus(PatientStatus.AwaitingConsultation);
    const awaitingPaymentPatients = usePatientsByStatus(PatientStatus.AwaitingPayment);
    const dischargedPatients = usePatientsByStatus(PatientStatus.Discharged);

    if (!authorized) return null;

    const stats = [
        { label: "New Arrivals", value: registeredPatients.data?.length || 0, icon: <Users className="text-blue-600" />, color: "border-blue-500" },
        { label: "In Queue", value: awaitingConsultationPatients.data?.length || 0, icon: <ClipboardList className="text-yellow-600" />, color: "border-yellow-500" },
        { label: "Pending Payment", value: awaitingPaymentPatients.data?.length || 0, icon: <Wallet className="text-red-600" />, color: "border-red-500" },
        { label: "Discharged", value: dischargedPatients.data?.length || 0, icon: <LogOut className="text-green-600" />, color: "border-green-500" },
    ];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Front Desk Control</h1>
                    <p className="text-muted-foreground font-medium">Managing patient admissions and discharge flow</p>
                </div>
                <Link href="/front-desk/patient/new">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl px-6 py-6 shadow-lg shadow-primary/20 flex gap-2 font-bold transition-all transform hover:scale-105">
                        <Plus size={20} />
                        Register Patient
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((s, i) => (
                    <div key={i} className={`glass-card p-6 border-l-8 ${i === 0 ? "border-blue-500/50" : i === 1 ? "border-yellow-500/50" : i === 2 ? "border-red-500/50" : "border-green-500/50"} shadow-sm hover:shadow-md transition-all group`}>
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-primary/20 transition-colors">
                                {s.icon}
                            </div>
                            <span className="text-3xl font-black text-foreground">{s.value}</span>
                        </div>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-card p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-foreground">Recent Admissions</h2>
                        <Link href="/front-desk/queue" className="text-sm font-bold text-primary hover:underline">View Queue</Link>
                    </div>
                    {registeredPatients.loading ? <LoadingSkeleton rows={3} /> : (
                        <div className="space-y-4">
                            {registeredPatients.data?.slice(0, 3).map(p => (
                                <div key={p.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-3xl border border-white/5">
                                    <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center font-bold text-primary text-lg">{p.name?.[0] || "P"}</div>
                                    <div className="flex-1">
                                        <p className="font-bold text-foreground">{p.name}</p>
                                        <p className="text-xs text-muted-foreground font-medium">{p.phone}</p>
                                    </div>
                                </div>
                            ))}
                            {(!registeredPatients.data || registeredPatients.data.length === 0) && <EmptyState title="No recent admissions" description="All clear for now" icon="✓" />}
                        </div>
                    )}
                </div>

                <div className="glass-card p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-foreground">Billing Queue</h2>
                        <Link href="/front-desk/payment" className="text-sm font-bold text-red-400 hover:underline">Process Billing</Link>
                    </div>
                    {awaitingPaymentPatients.loading ? <LoadingSkeleton rows={3} /> : (
                        <div className="space-y-4">
                            {awaitingPaymentPatients.data?.slice(0, 3).map(p => (
                                <div key={p.id} className="flex items-center gap-4 p-4 bg-red-500/10 rounded-3xl border border-red-500/20">
                                    <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center font-bold text-red-400 text-lg">{p.name?.[0] || "P"}</div>
                                    <div className="flex-1">
                                        <p className="font-bold text-foreground">{p.name}</p>
                                        <p className="text-xs text-red-400 font-medium">Pending Final Checkout</p>
                                    </div>
                                </div>
                            ))}
                            {(!awaitingPaymentPatients.data || awaitingPaymentPatients.data.length === 0) && <EmptyState title="Billing Clear" description="No pending payments" icon="✓" />}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
