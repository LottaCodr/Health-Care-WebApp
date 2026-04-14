"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
    useConsultationsByPatient, useLabRequestsByPatient,
    useNursingActionsByPatient, usePaymentsByPatient,
} from "@/hooks/use-emr";
import { getPatientById } from "@/actions/front-desk/get.patients";
import {
    ArrowLeft, Calendar, Stethoscope, FlaskConical, HeartPulse,
    CreditCard, CheckCircle2, Clock, AlertCircle, Loader2,
    User, Activity, Radio, Pill, ClipboardList, RefreshCcw,
    TrendingUp,
} from "lucide-react";
import { fmtFull, calcAge } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimelineEvent {
    id:          string;
    type:        "registration" | "consultation" | "lab" | "radiology" | "nursing" | "pharmacy" | "payment";
    title:       string;
    description: string;
    timestamp:   string;
    status?:     string;
    meta?:       string;
}

// ─── Event config ─────────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<string, {
    icon:  React.ElementType;
    color: string;
    bg:    string;
    border:string;
    label: string;
    line:  string;
}> = {
    registration:  { icon: User,         color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200",   label: "Registration",   line: "bg-blue-200"   },
    consultation:  { icon: Stethoscope,  color: "text-red-600",    bg: "bg-red-50",    border: "border-red-200",    label: "Consultation",   line: "bg-red-200"    },
    lab:           { icon: FlaskConical, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200", label: "Lab",            line: "bg-indigo-200" },
    radiology:     { icon: Radio,        color: "text-cyan-600",   bg: "bg-cyan-50",   border: "border-cyan-200",   label: "Radiology",      line: "bg-cyan-200"   },
    nursing:       { icon: HeartPulse,   color: "text-teal-600",   bg: "bg-teal-50",   border: "border-teal-200",   label: "Nursing",        line: "bg-teal-200"   },
    pharmacy:      { icon: Pill,         color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", label: "Pharmacy",       line: "bg-violet-200" },
    payment:       { icon: CreditCard,   color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200",  label: "Payment",        line: "bg-amber-200"  },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
    completed:    { color: "text-green-700",  bg: "bg-green-50 border-green-200",   icon: CheckCircle2  },
    pending:      { color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",   icon: Clock         },
    active:       { color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",     icon: Activity      },
    inprogress:   { color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",     icon: Activity      },
    failed:       { color: "text-red-700",    bg: "bg-red-50 border-red-200",       icon: AlertCircle   },
    cancelled:    { color: "text-gray-600",   bg: "bg-gray-100 border-gray-200",    icon: AlertCircle   },
};



// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
    const key = (status ?? "").toLowerCase();
    const cfg = STATUS_CONFIG[key] ?? { color: "text-gray-600", bg: "bg-gray-100 border-gray-200", icon: Clock };
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color}`}>
            <Icon size={10} />
            {status}
        </span>
    );
}

// ─── Timeline event card ──────────────────────────────────────────────────────

function EventCard({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
    const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.registration;
    const Icon = cfg.icon;

    return (
        <div className="flex gap-4">
            {/* Left: icon + connecting line */}
            <div className="flex flex-col items-center shrink-0">
                <div className={`w-10 h-10 rounded-2xl ${cfg.bg} border ${cfg.border} flex items-center justify-center z-10`}>
                    <Icon size={16} className={cfg.color} />
                </div>
                {!isLast && <div className={`w-0.5 flex-1 mt-2 rounded-full ${cfg.line} opacity-50 min-h-[24px]`} />}
            </div>

            {/* Right: card content */}
            <div className="flex-1 pb-6 min-w-0">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-gray-200 transition-all">
                    {/* Header strip */}
                    <div className={`h-0.5 w-full ${cfg.line}`} />
                    <div className="p-4 space-y-2.5">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-bold text-gray-900">{event.title}</p>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                                        {cfg.label}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Calendar size={10} className="text-gray-400" />
                                    <p className="text-[11px] font-medium text-gray-400">{fmtFull(event.timestamp)}</p>
                                </div>
                            </div>
                            {event.status && <StatusBadge status={event.status} />}
                        </div>

                        {/* Description */}
                        {event.description && (
                            <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">{event.description}</p>
                        )}

                        {/* Meta */}
                        {event.meta && (
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                                <p className={`text-[10px] font-bold ${cfg.color}`}>{event.meta}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Filter button ────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick, color, bg }: {
    label: string; active: boolean; onClick: () => void; color: string; bg: string;
}) {
    return (
        <button onClick={onClick}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all
                ${active ? `${bg} ${color} border-current/20` : "bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600"}`}>
            {label}
        </button>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PatientTimelinePage() {
    const params    = useParams();
    const router    = useRouter();
    const patientId = (params?.id ?? params?.patientId ?? params?.userId) as string;

    const { data: patient, isLoading: pLoading } = useQuery({
        queryKey: ["patient", patientId],
        queryFn:  () => getPatientById(patientId),
        enabled:  !!patientId,
    });

    const { data: consultations } = useConsultationsByPatient(patientId);
    const { data: labRequests   } = useLabRequestsByPatient(patientId);
    const { data: nursing       } = useNursingActionsByPatient(patientId);
    const { data: payments      } = usePaymentsByPatient(patientId);

    const [activeFilter, setActiveFilter] = useState<string | null>(null);

    const allEvents = useMemo<TimelineEvent[]>(() => {
        const events: TimelineEvent[] = [];

        // Registration
        if (patient) {
            events.push({
                id:          `reg-${patient.id}`,
                type:        "registration",
                title:       "Patient Registered",
                description: `${patient.name} was registered at Nile Valley Hospital. Blood Group: ${patient.blood_group ?? "—"} · Genotype: ${patient.geno_type ?? "—"}`,
                timestamp:   patient.created_at ?? patient.$createdAt ?? new Date().toISOString(),
                status:      "Completed",
            });
        }

        // Consultations
        consultations?.forEach((c: any) => {
            const desc = [
                c.symptoms  ? `Symptoms: ${c.symptoms.slice(0, 120)}${c.symptoms.length > 120 ? "…" : ""}` : null,
                c.diagnosis ? `Assessment: ${c.diagnosis.slice(0, 80)}${c.diagnosis.length > 80 ? "…" : ""}` : null,
            ].filter(Boolean).join(" · ");
            events.push({
                id:          c.id ?? c.$id,
                type:        "consultation",
                title:       "Doctor Consultation",
                description: desc || "Consultation recorded.",
                timestamp:   c.created_at ?? c.consultationDate,
                status:      c.status,
                meta:        c.referred_to ? `Referred → ${c.referred_to.replace(/-/g, " ")}` : undefined,
            });
        });

        // Lab requests (excluding radiology)
        labRequests
            ?.filter((r: any) => !String(r.test_type ?? "").startsWith("[RADIOLOGY]"))
            .forEach((r: any) => {
                events.push({
                    id:          r.id ?? r.$id,
                    type:        "lab",
                    title:       r.test_type ?? "Lab Test",
                    description: r.notes ? `Clinical indication: ${r.notes}` : r.result ? `Result: ${r.result.slice(0, 100)}` : "Lab investigation requested.",
                    timestamp:   r.created_at,
                    status:      r.status,
                    meta:        r.status === "completed" && r.completed_at ? `Completed: ${fmtFull(r.completed_at)}` : `Priority: ${r.priority ?? "routine"}`,
                });
            });

        // Radiology
        labRequests
            ?.filter((r: any) => String(r.test_type ?? "").startsWith("[RADIOLOGY]"))
            .forEach((r: any) => {
                const clean = r.test_type.replace(/^\[RADIOLOGY\]\s*/, "");
                events.push({
                    id:          `rad-${r.id}`,
                    type:        "radiology",
                    title:       clean,
                    description: r.notes ? `Clinical indication: ${r.notes}` : r.result ? r.result.slice(0, 150) : "Radiology investigation requested.",
                    timestamp:   r.created_at,
                    status:      r.status,
                    meta:        r.status === "completed" ? "Report filed" : `Priority: ${r.priority ?? "routine"}`,
                });
            });

        // Nursing
        nursing?.forEach((a: any) => {
            events.push({
                id:          a.id ?? a.$id,
                type:        "nursing",
                title:       `Nursing: ${a.action_type ?? "Care"}`,
                description: a.description ?? "Nursing action performed.",
                timestamp:   a.created_at,
                status:      a.status,
                meta:        a.completion_time ? `Completed: ${fmtFull(a.completion_time)}` : undefined,
            });
        });

        // Payments
        payments?.forEach((p: any) => {
            events.push({
                id:          p.id ?? p.$id,
                type:        "payment",
                title:       "Payment",
                description: `₦${Number(p.amount ?? 0).toLocaleString("en-NG")} — ${p.payment_method ?? p.paymentMethod ?? "—"}`,
                timestamp:   p.created_at,
                status:      p.status,
            });
        });

        return events.sort((a, b) =>
            new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime()
        );
    }, [patient, consultations, labRequests, nursing, payments]);

    const filtered = useMemo(() =>
        activeFilter ? allEvents.filter(e => e.type === activeFilter) : allEvents
    , [allEvents, activeFilter]);

    const typeCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        allEvents.forEach(e => { counts[e.type] = (counts[e.type] ?? 0) + 1; });
        return counts;
    }, [allEvents]);

    if (pLoading) return (
        <div className="min-h-screen bg-gray-50/60 flex items-center justify-center gap-3">
            <Loader2 size={20} className="text-red-500 animate-spin" />
            <p className="text-sm font-medium text-gray-500">Loading timeline...</p>
        </div>
    );

    if (!patient) return (
        <div className="min-h-screen bg-gray-50/60 flex flex-col items-center justify-center gap-4">
            <AlertCircle size={28} className="text-amber-500" />
            <p className="text-sm font-semibold text-gray-600">Patient not found</p>
            <button onClick={() => router.back()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 transition-all">
                <ArrowLeft size={14} /> Go Back
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50/60">
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

                {/* ── Back + title ── */}
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()}
                        className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-all shadow-sm shrink-0">
                        <ArrowLeft size={15} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-gray-900">Patient Timeline</h1>
                        <p className="text-xs text-gray-400 mt-0.5">Chronological medical history</p>
                    </div>
                </div>

                {/* ── Patient summary card ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-white font-black text-lg shadow-md shadow-red-200 shrink-0">
                            {patient.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-base font-black text-gray-900">{patient.name}</p>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {patient.gender    && <span className="text-xs text-gray-500 font-medium capitalize">{patient.gender}</span>}
                                {patient.date_of_birth && <span className="text-xs text-gray-500 font-medium">{calcAge(patient.date_of_birth)}</span>}
                                {patient.blood_group   && (
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                                        {patient.blood_group}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-2xl font-black text-gray-900">{allEvents.length}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">Events</p>
                        </div>
                    </div>

                    {/* Event type summary */}
                    <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-gray-50">
                        {(["consultation", "lab", "nursing", "payment"] as const).map(type => {
                            const cfg = EVENT_CONFIG[type];
                            const Icon = cfg.icon;
                            return (
                                <div key={type} className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                                    <Icon size={14} className={cfg.color} />
                                    <p className={`text-sm font-black ${cfg.color}`}>{typeCounts[type] ?? 0}</p>
                                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">{cfg.label}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Filter chips ── */}
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400">Filter:</p>
                    <FilterChip label="All" active={!activeFilter} onClick={() => setActiveFilter(null)} color="text-gray-700" bg="bg-gray-100" />
                    {Object.entries(EVENT_CONFIG).filter(([, cfg]) => typeCounts[cfg.label.toLowerCase()] ?? typeCounts[Object.keys(EVENT_CONFIG).find(k => EVENT_CONFIG[k] === cfg) ?? ""] ?? 0).map(([type, cfg]) =>
                        (typeCounts[type] ?? 0) > 0 ? (
                            <FilterChip key={type}
                                label={`${cfg.label} (${typeCounts[type]})`}
                                active={activeFilter === type}
                                onClick={() => setActiveFilter(activeFilter === type ? null : type)}
                                color={cfg.color} bg={cfg.bg} />
                        ) : null
                    )}
                </div>

                {/* ── Timeline ── */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-2xl border border-gray-100">
                        <TrendingUp size={22} className="text-gray-300" />
                        <p className="text-sm font-semibold text-gray-500">No events recorded yet</p>
                        <p className="text-xs text-gray-400">Medical events will appear here as the patient progresses through care.</p>
                    </div>
                ) : (
                    <div className="space-y-0">
                        {filtered.map((event, idx) => (
                            <EventCard key={event.id} event={event} isLast={idx === filtered.length - 1} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}