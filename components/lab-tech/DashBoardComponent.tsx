"use client";

import React from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { usePendingLabRequests } from "@/hooks/use-emr";
import { LoadingSkeleton, EmptyState } from "@/components/emr";
import { Beaker, Clock, CheckSquare, ChevronRight, Zap } from "lucide-react";
import Link from "next/link";

export default function DashBoardComponent() {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.LabTechnician, UserRole.Admin]);
    const { data: requests, loading } = usePendingLabRequests();

    if (!authorized) return null;

    const pending = requests?.filter(r => r.status === "Pending") || [];
    const urgent = requests?.filter(r => r.priority === "Urgent" && r.status === "Pending") || [];
    const completed = requests?.filter(r => r.status === "Completed") || [];

    const stats = [
        { label: "New Requests", value: pending.length, icon: <Beaker className="text-blue-600" />, color: "bg-blue-50" },
        { label: "Stat (Urgent)", value: urgent.length, icon: <Zap className="text-red-600" />, color: "bg-red-50" },
        { label: "Today&apos;s Yield", value: completed.length, icon: <CheckSquare className="text-green-600" />, color: "bg-green-50" },
    ];

    return (
        <div className="space-y-10">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground">Diagnostics Lab</h1>
                    <p className="text-muted-foreground font-medium">Pathology and medical imaging management</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {stats.map((s, i) => (
                    <div key={i} className={`glass-card p-8 flex items-center justify-between group hover:shadow-lg transition-all border-l-4 ${i === 0 ? "border-primary/50" : i === 1 ? "border-red-500/50" : "border-emerald-500/50"}`}>
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
                    <Clock className="text-primary" /> Laboratory Queue
                </h2>

                {loading ? <LoadingSkeleton rows={4} /> : (
                    <div className="grid gap-4">
                        {pending.map(request => (
                            <Link key={request.id} href={`/lab-tech/test/${request.id}`} className={`group block p-6 rounded-[2rem] transition-all border shadow-sm ${request.priority === "Urgent" ? "bg-red-500/10 border-red-500/20 hover:bg-red-600" : "bg-white/5 border-white/5 hover:bg-primary"} `}>
                                <div className="flex justify-between items-center">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center font-bold text-primary shadow-sm group-hover:text-white transition-colors">
                                            {request.test_type?.[0] || request.testType?.[0] || "T"}
                                        </div>
                                        <div>
                                            <h3 className={`font-bold ${request.priority === "Urgent" ? "text-red-400" : "text-foreground"} group-hover:text-white transition-colors`}>{request.test_type || request.testType}</h3>
                                            <p className={`text-sm font-medium ${request.priority === "Urgent" ? "text-red-300" : "text-muted-foreground"} group-hover:text-primary-foreground/80 transition-colors uppercase tracking-widest`}>Patient: {request.patient_id || request.patientId}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {request.priority === "Urgent" && <span className="px-3 py-1 bg-white/10 text-red-400 text-[10px] font-black uppercase rounded-full border border-red-500/20 shadow-sm group-hover:bg-red-700 group-hover:text-white transition-all">Stat</span>}
                                        <ChevronRight className="text-muted-foreground group-hover:text-white transition-all transform group-hover:translate-x-2" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {pending.length === 0 && <EmptyState title="All tests completed" description="No pending pathology requests" icon="✓" />}
                    </div>
                )}
            </div>
        </div>
    );
}
