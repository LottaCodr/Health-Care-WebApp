"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import { usePatientsByStatus, useConsultationsByDoctor } from "@/hooks/emr/use-emr";
import { PatientInfoCard, ConsultationCard, LoadingSkeleton, EmptyState, ErrorAlert } from "@/components/emr-ui";
import {
    Clock, ClipboardList, CheckCircle2, Users,
    ChevronRight, Stethoscope, Activity,
    FileText,
} from "lucide-react";

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, bg, border }: {
    label: string; value: number; icon: React.ElementType;
    color: string; bg: string; border: string;
}) {
    return (
        <div className={`bg-white rounded-2xl border ${border} px-5 py-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow`}>
            <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={19} className={color} />
            </div>
            <div>
                <p className="text-2xl font-extrabold text-gray-900 leading-none">{value}</p>
                <p className="text-xs text-gray-400 font-medium mt-1 leading-tight">{label}</p>
            </div>
        </div>
    );
}

function TabBar({ tabs, active, onChange }: {
    tabs: { id: string; label: string; badge?: number }[];
    active: string;
    onChange: (id: string) => void;
}) {
    return (
        <div className="flex border-b border-gray-100 -mx-6 px-6 overflow-x-auto">
            {tabs.map((tab) => (
                <button key={tab.id} onClick={() => onChange(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-150
                        ${active === tab.id
                            ? "border-red-600 text-red-700"
                            : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200"
                        }`}
                >
                    {tab.label}
                    {!!tab.badge && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
                            ${active === tab.id ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"}`}>
                            {tab.badge}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

function QueueRow({ patient, index }: { patient: any; index: number }) {
    return (
        <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-red-100 hover:shadow-sm transition-all group">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-black text-sm shrink-0">
                {index + 1}
            </div>
            <div className="flex-1 min-w-0">
                <PatientInfoCard patient={patient} />
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <Link href={`/patient-timeline/${patient.id ?? patient.$id}`}
                    className="px-3 py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-700 transition-colors">
                    Timeline
                </Link>
                <Link href={`/doctor/patients/${patient.id ?? patient.$id}`}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shadow-red-200">
                    <Stethoscope size={13} /> Consult <ChevronRight size={12} />
                </Link>

                <Link href={`/doctor/health-records/${patient.id ?? patient.$id}`}
                    className="px-3 py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:text-gray-700 transition-colors">
                    <FileText size={13} />
                </Link>
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DoctorDashboard() {
    const { user } = useAuth();
    const { authorized, loading: protectionLoading } = useRoleProtection([UserRole.Doctor, UserRole.Admin]);
    const [activeTab, setActiveTab] = useState("queue");
    const [dismissedErrors, setDismissedErrors] = useState<string[]>([]);

    const awaitingPatients = usePatientsByStatus(PatientStatus.AwaitingConsultation);
    const myConsultations = useConsultationsByDoctor(user?.$id ?? "");

    if (protectionLoading) return (
        <div className="flex items-center justify-center min-h-[40vh]">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
                <Activity size={20} className="text-red-600 animate-pulse" />
            </div>
        </div>
    );

    if (!authorized) return null;

    const queueCount = awaitingPatients.data?.length ?? 0;
    const inProgressCount = myConsultations.data?.filter((c) => c.status !== "Completed").length ?? 0;
    const completedCount = myConsultations.data?.filter((c) => c.status === "Completed").length ?? 0;
    const totalCount = myConsultations.data?.length ?? 0;

    const stats = [
        { label: "Awaiting Consultation", value: queueCount, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
        { label: "In Progress", value: inProgressCount, icon: Stethoscope, color: "text-red-600", bg: "bg-red-50", border: "border-red-100" },
        { label: "Completed Today", value: completedCount, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
        { label: "Total Patients", value: totalCount, icon: Users, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
    ];

    const tabs = [
        { id: "queue", label: "Consultation Queue", badge: queueCount },
        { id: "in-progress", label: "In Progress", badge: inProgressCount },
        { id: "completed", label: "Completed", badge: completedCount },
    ];

    return (
        <div className="space-y-6">

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((s) => <StatCard key={s.label} {...s} />)}
            </div>

            {/* Main card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 pt-6 pb-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                            <ClipboardList size={16} className="text-red-600" />
                        </div>
                        <h2 className="text-base font-bold text-gray-800">Patient Management</h2>
                    </div>
                </div>

                <div className="px-6 pt-4 pb-6">
                    <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

                    <div className="mt-5 space-y-3">

                        {/* Queue */}
                        {activeTab === "queue" && (
                            <>
                                {awaitingPatients.isLoading && <LoadingSkeleton rows={4} />}
                                {awaitingPatients.error && !dismissedErrors.includes("queue") && (
                                    <ErrorAlert error={awaitingPatients.error}
                                        onDismiss={() => setDismissedErrors((p) => [...p, "queue"])} />
                                )}
                                {!awaitingPatients.isLoading && queueCount === 0 && (
                                    <EmptyState title="Queue is clear" description="No patients waiting for consultation" icon="✓" />
                                )}
                                {awaitingPatients.data?.map((p, i) => (
                                    <QueueRow key={p.id ?? p.id} patient={p} index={i} />
                                ))}
                            </>
                        )}

                        {/* In progress */}
                        {activeTab === "in-progress" && (
                            <>
                                {myConsultations.isLoading && <LoadingSkeleton rows={4} />}
                                {!myConsultations.isLoading && inProgressCount === 0 && (
                                    <EmptyState title="No active consultations" description="Consultations you start will appear here" icon="📋" />
                                )}
                                {myConsultations.data?.filter((c) => c.status !== "Completed").map((c) => (
                                    <ConsultationCard key={c.id ?? c.id} consultation={c} />
                                ))}
                            </>
                        )}

                        {/* Completed */}
                        {activeTab === "completed" && (
                            <>
                                {myConsultations.isLoading && <LoadingSkeleton rows={4} />}
                                {!myConsultations.isLoading && completedCount === 0 && (
                                    <EmptyState title="No completed consultations" description="Completed consultations will appear here" icon="✓" />
                                )}
                                {myConsultations.data?.filter((c) => c.status === "Completed").map((c) => (
                                    <ConsultationCard key={c.id ?? c.id} consultation={c} />
                                ))}
                            </>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}