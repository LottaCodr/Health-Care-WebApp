"use client";

import React from "react";
import { useAuth } from "@/context/auth-provider";
import { UserRole } from "@/types/models";
import { useRoleProtection } from "@/lib/role-utils";
import { usePendingNursingActions } from "@/hooks/use-emr";
import { LoadingSkeleton, EmptyState } from "@/components/emr";
import { Activity, Clock, CheckCircle, ChevronRight, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function DashBoardComponent() {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.Nurse, UserRole.Admin]);
    const { data: actions, loading } = usePendingNursingActions();

    if (!authorized) return null;

    const pending = actions?.filter(a => a.status === "Pending") || [];
    const active = actions?.filter(a => a.status === "InProgress") || [];
    const completed = actions?.filter(a => a.status === "Completed") || [];

    const stats = [
        { label: "New Tasks", value: pending.length, icon: <AlertCircle className="text-yellow-600" />, bg: "bg-yellow-50" },
        { label: "Active Care", value: active.length, icon: <Clock className="text-blue-600" />, bg: "bg-blue-50" },
        { label: "Completed", value: completed.length, icon: <CheckCircle className="text-green-600" />, bg: "bg-green-50" },
    ];

    return (
        <div className="space-y-10">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground">Nursing Care</h1>
                    <p className="text-muted-foreground font-medium">Prioritizing patient vitals and recovery support</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {stats.map((s, i) => (
                    <div key={i} className={`glass-card p-8 flex items-center justify-between group hover:shadow-lg transition-all border-l-4 ${i === 0 ? "border-amber-500/50" : i === 1 ? "border-primary/50" : "border-emerald-500/50"}`}>
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
                    <Activity className="text-primary" /> Active Care Queue
                </h2>

                {loading ? <LoadingSkeleton rows={4} /> : (
                    <div className="grid gap-4">
                        {pending.map(task => (
                            <Link key={task.id} href={`/nurse/task/${task.id}`} className="group block p-6 bg-white/5 hover:bg-primary rounded-[2rem] transition-all border border-white/5 hover:border-primary/50">
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center font-bold text-primary group-hover:text-white transition-colors">
                                            {task.patient_id?.slice(-2).toUpperCase() || "PT"}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground group-hover:text-white transition-colors">Patient: {task.patient_id}</h3>
                                            <p className="text-sm font-medium text-muted-foreground group-hover:text-primary-foreground/80 transition-colors uppercase tracking-widest">{task.action_type || task.actionType}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-muted-foreground group-hover:text-white transition-all transform group-hover:translate-x-2" />
                                </div>
                            </Link>
                        ))}
                        {pending.length === 0 && <EmptyState title="All patients attended" description="No pending vitals or nursing actions" icon="✓" />}
                    </div>
                )}
            </div>
        </div>
    );
}
