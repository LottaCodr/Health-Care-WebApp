"use client";

import React from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { usePendingPrescriptions } from "@/hooks/use-emr";
import { LoadingSkeleton, EmptyState } from "@/components/emr";
import { Pill, Clock, CheckCircle, ChevronRight, Bookmark } from "lucide-react";
import Link from "next/link";

export default function DashBoardComponent() {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.Pharmacist, UserRole.Admin]);
    const { data: prescriptions, loading } = usePendingPrescriptions();

    if (!authorized) return null;

    // Filter for current pharmacist if needed, or all for dashboard
    const active = prescriptions?.filter(p => p.status === "Active") || [];
    const dispensed = prescriptions?.filter(p => p.status === "Dispensed") || [];

    const stats = [
        { label: "Active Orders", value: active.length, icon: <Pill className="text-blue-600" />, color: "bg-blue-50" },
        { label: "Pending Review", value: active.filter(p => !p.pharmacist_id).length, icon: <Clock className="text-yellow-600" />, color: "bg-yellow-50" },
        { label: "Dispensed Today", value: dispensed.length, icon: <CheckCircle className="text-green-600" />, color: "bg-green-50" },
    ];

    return (
        <div className="space-y-10">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground">Pharmacy Control</h1>
                    <p className="text-muted-foreground font-medium">Precision medication dispensing and inventory tracking</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {stats.map((s, i) => (
                    <div key={i} className={`glass-card p-8 flex items-center justify-between group hover:shadow-lg transition-all border-l-4 ${i === 0 ? "border-primary/50" : i === 1 ? "border-amber-500/50" : "border-emerald-500/50"}`}>
                        <div>
                            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-1">{s.label}</p>
                            <p className="text-4xl font-black text-foreground">{s.value}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl shadow-sm border border-white/10 transform group-hover:scale-110 transition-transform">
                            {s.icon}
                        </div>
                    </div>
                ))}
            </div>

            <div className="glass-card p-8">
                <h2 className="text-2xl font-bold text-foreground mb-8 flex items-center gap-3">
                    <Bookmark className="text-primary" /> Dispensing Workflow
                </h2>

                {loading ? <LoadingSkeleton rows={4} /> : (
                    <div className="grid gap-4">
                        {active.map(order => (
                            <Link key={order.id} href={`/pharmacist/dispense/${order.id}`} className="group block p-6 bg-white/5 hover:bg-primary rounded-[2rem] transition-all border border-white/5 hover:border-primary/50">
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center font-bold text-primary group-hover:text-white transition-colors">
                                            {order.patient_id?.slice(-2).toUpperCase() || "PT"}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground group-hover:text-white transition-colors">Patient: {order.patient_id}</h3>
                                            <p className="text-sm font-medium text-muted-foreground group-hover:text-primary-foreground/80 transition-colors uppercase tracking-widest">{order.medications?.length || 0} Medications</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-muted-foreground group-hover:text-white transition-all transform group-hover:translate-x-2" />
                                </div>
                            </Link>
                        ))}
                        {active.length === 0 && <EmptyState title="Queue Empty" description="No active prescriptions to dispense" icon="✓" />}
                    </div>
                )}
            </div>
        </div>
    );
}
