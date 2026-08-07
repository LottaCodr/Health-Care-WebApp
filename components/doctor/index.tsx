"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import { usePatientsByStatus, useConsultationsByDoctor } from "@/hooks/emr/use-emr";
import { useAppointmentsByDate } from "@/hooks/emr/use-appointments";
import { LoadingSkeleton, EmptyState, ErrorAlert } from "@/components/emr-ui";
import {
    Clock, ClipboardList, CheckCircle2,
    ChevronRight, Stethoscope, Activity, FileText,
    Calendar, BedDouble, Baby,
} from "lucide-react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { toHospitalISODate } from "@/lib/utils/appointment.utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
    return toHospitalISODate();
}

function calcAge(dob?: string) {
    if (!dob) return null;
    const y = new Date().getFullYear() - new Date(dob).getFullYear();
    return y < 1 ? "< 1 yr" : `${y} yrs`;
}

function timeWaiting(updatedAt?: string) {
    if (!updatedAt) return "";
    const mins = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m waiting`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m waiting`;
}

function isCompletedConsultation(status?: string) {
    return String(status ?? "").toLowerCase().replace(/[\s_-]/g, "") === "completed";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, bg, border }: {
    label: string; value: number; icon: React.ElementType;
    color: string; bg: string; border: string;
}) {
    return (
        <div className={`bg-white rounded-2xl border ${border} px-4 py-4 sm:px-5 sm:py-5 flex min-w-0 items-center gap-3 sm:gap-4 shadow-sm hover:shadow-md transition-shadow`}>
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
        <div className="scrollbar-hide flex border-b border-gray-100 -mx-4 px-4 sm:-mx-6 sm:px-6 overflow-x-auto">
            {tabs.map(tab => (
                <button key={tab.id} onClick={() => onChange(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-150 ${
                        active === tab.id
                            ? "border-red-600 text-red-700"
                            : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200"
                    }`}>
                    {tab.label}
                    {!!tab.badge && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            active === tab.id ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500"
                        }`}>{tab.badge}</span>
                    )}
                </button>
            ))}
        </div>
    );
}

function QueueRow({ patient, index }: { patient: any; index: number }) {
    const age      = calcAge(patient.birth_date ?? patient.date_of_birth);
    const isChild  = age ? parseInt(age) <= 12 : false;
    const isFemale = (patient.gender ?? "").toLowerCase() === "female";
    const wait     = timeWaiting(patient.updated_at);

    return (
        <div className="flex flex-wrap items-center gap-3 p-3.5 sm:p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-red-100 hover:shadow-sm transition-all group">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-black text-sm shrink-0">
                {index + 1}
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                isFemale ? "bg-pink-50 border-pink-100 text-pink-600" : "bg-red-50 border-red-100 text-red-600"
            }`}>
                {(patient.name ?? "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-gray-800 truncate">{patient.name ?? "—"}</p>
                    {isChild && (
                        <span className="flex items-center gap-0.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                            <Baby size={8} /> Paed
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5 flex-wrap">
                    {patient.gender && <span>{patient.gender}</span>}
                    {age && <span>· {age}</span>}
                    {wait && <span className="text-amber-500 font-medium">· {wait}</span>}
                </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
                <Link href={`/doctor/health-records/${patient.id}`}
                    className="w-8 h-8 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                    <FileText size={13} />
                </Link>
                <Link href={`/doctor/patients/${patient.id}`}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shadow-red-200">
                    <Stethoscope size={12} /> Consult
                </Link>
            </div>
        </div>
    );
}

function AdmittedRow({ patient }: { patient: any }) {
    const age = calcAge(patient.birth_date ?? patient.date_of_birth);
    return (
        <Link href={`/doctor/patients/${patient.id}`}
            className="group flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-sm transition-all">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-600 text-sm shrink-0">
                {(patient.name ?? "?")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{patient.name}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                    {patient.gender ?? ""}{age ? ` · ${age}` : ""}
                </p>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-500 shrink-0" />
        </Link>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DoctorDashboard() {
    const { user }   = useAuth();
    const { authorized, loading: protectionLoading } = useRoleProtection([UserRole.Doctor, UserRole.Admin]);
    const [activeTab, setActiveTab]           = useState("queue");
    const [dismissedErrors, setDismissedErrors] = useState<string[]>([]);

    const awaitingPatients = usePatientsByStatus(PatientStatus.AwaitingConsultation);
    const admittedPatients = usePatientsByStatus(PatientStatus.Admitted);
    const staffId          = user?.$id ?? user?.id ?? "";
    const myConsultations  = useConsultationsByDoctor(staffId);
    const todayAppts       = useAppointmentsByDate(todayISO());

    if (protectionLoading) return (
        <div className="flex items-center justify-center min-h-[40vh]">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
                <Activity size={20} className="text-red-600 animate-pulse" />
            </div>
        </div>
    );
    if (!authorized) return null;

    const queueCount     = awaitingPatients.data?.length ?? 0;
    const admittedCount  = admittedPatients.data?.length ?? 0;
    const inProgressCount = myConsultations.data?.filter(c => !isCompletedConsultation(c.status)).length ?? 0;
    const completedCount  = myConsultations.data?.filter(c => isCompletedConsultation(c.status)).length ?? 0;
    const myTodayAppointments = todayAppts.data?.filter((appointment: any) => appointment.doctor_id === staffId) ?? [];
    const apptCount = myTodayAppointments.length;

    const stats = [
        { label: "Awaiting Consultation", value: queueCount,      icon: Clock,         color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-100"  },
        { label: "Admitted Patients",      value: admittedCount,   icon: BedDouble,     color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
        { label: "Today's Appointments",   value: apptCount,       icon: Calendar,      color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100"   },
        { label: "Completed Consultations", value: completedCount,  icon: CheckCircle2,  color: "text-green-600",  bg: "bg-green-50",  border: "border-green-100"  },
    ];

    const tabs = [
        { id: "queue",       label: "Consultation Queue",  badge: queueCount      },
        { id: "admitted",    label: "Admitted",            badge: admittedCount   },
        { id: "in-progress", label: "In Progress",         badge: inProgressCount },
        { id: "completed",   label: "Completed",           badge: completedCount  },
    ];

    return (
        <div className="space-y-6">
            <DashboardHeader
                title="Clinical dashboard"
                description="Review your consultation queue, admitted patients, and today’s assigned appointments."
                icon={Stethoscope}
                tone="red"
                actions={
                    <Link href="/doctor/appointments" className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 text-xs font-bold text-red-700 transition-colors hover:bg-red-100">
                        <Calendar size={13} /> My schedule
                    </Link>
                }
            />

            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                {stats.map(s => <StatCard key={s.label} {...s} />)}
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 pt-5 pb-0 sm:px-6 sm:pt-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                            <ClipboardList size={16} className="text-red-600" />
                        </div>
                        <h2 className="text-base font-bold text-gray-800">Patient Management</h2>
                    </div>
                </div>

                <div className="px-4 pt-4 pb-5 sm:px-6 sm:pb-6">
                    <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />
                    <div className="mt-5 space-y-3">

                        {/* Consultation Queue */}
                        {activeTab === "queue" && (
                            <>
                                {awaitingPatients.isLoading && <LoadingSkeleton rows={4} />}
                                {awaitingPatients.error && !dismissedErrors.includes("queue") && (
                                    <ErrorAlert error={awaitingPatients.error}
                                        onDismiss={() => setDismissedErrors(p => [...p, "queue"])} />
                                )}
                                {!awaitingPatients.isLoading && queueCount === 0 && (
                                    <EmptyState title="Queue is clear" description="No patients waiting for consultation" icon="✓" />
                                )}
                                {awaitingPatients.data?.map((p, i) => (
                                    <QueueRow key={p.id} patient={p} index={i} />
                                ))}
                            </>
                        )}

                        {/* Admitted patients */}
                        {activeTab === "admitted" && (
                            <>
                                {admittedPatients.isLoading && <LoadingSkeleton rows={3} />}
                                {!admittedPatients.isLoading && admittedCount === 0 && (
                                    <EmptyState title="No admitted patients" description="Patients you admitted will appear here" icon="🛏" />
                                )}
                                {admittedPatients.data?.map(p => (
                                    <AdmittedRow key={p.id} patient={p} />
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
                                {myConsultations.data?.filter(c => !isCompletedConsultation(c.status)).map(c => (
                                    <div key={c.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50 text-sm text-gray-700">
                                        {c.patient_name ?? `Consultation #${c.id?.slice(-6)}`}
                                    </div>
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
                                {myConsultations.data?.filter(c => isCompletedConsultation(c.status)).map(c => (
                                    <div key={c.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50 text-sm text-gray-700 flex items-center gap-3">
                                        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                                        {c.patientName ?? `Consultation #${c.id?.slice(-6)}`}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}