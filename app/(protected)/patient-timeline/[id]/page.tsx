"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
    useConsultationsByPatient,
    useLabRequestsByPatient,
    useRadiologyRequestsByPatient,
    usePrescriptionsByPatient,
    useNursingActionsByPatient,
    usePaymentsByPatient,
    usePatient,
} from "@/hooks/emr/use-emr";
import {
    ArrowLeft, Calendar, Stethoscope, FlaskConical, HeartPulse,
    CreditCard, CheckCircle2, Clock, AlertCircle, Loader2,
    User, Activity, Radio, Pill, ClipboardList, RefreshCcw,
    TrendingUp, Search, SlidersHorizontal, ArrowUpDown, Printer,
    Download, ExternalLink, ShieldAlert, Phone, Mail, MapPin,
    Droplets, Dna, Building2, Check, Copy, ChevronDown,
    ChevronUp, Layers, Sparkles, FileText, Syringe, FileCheck,
    X, Baby, Briefcase, ChevronRight,
} from "lucide-react";
import { fmtFull, calcAge, hasActualAllergy } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PatientRecordDownload, { DownloadOptions } from "@/components/patients/patient-record-download";
import { generatePatientRecord } from "@/lib/actions/generate-patient-record";
import { toast } from "sonner";

// ─── Event Types & Interfaces ─────────────────────────────────────────────────

export type TimelineEventType =
    | "registration"
    | "consultation"
    | "lab"
    | "radiology"
    | "pharmacy"
    | "nursing"
    | "discharge"
    | "payment";

export interface TimelineEvent {
    id: string;
    type: TimelineEventType;
    title: string;
    description?: string;
    timestamp: string;
    status?: string;
    priority?: "routine" | "urgent" | "stat" | string;
    actor?: string;
    meta?: string;
    details?: {
        label?: string;
        value?: string | number;
        tag?: string;
        items?: { k: string; v: string }[];
        fullText?: string;
    };
    raw?: any;
}

// ─── Event Type Configuration ─────────────────────────────────────────────────

const EVENT_CONFIG: Record<TimelineEventType, {
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
    badgeBg: string;
    badgeText: string;
    label: string;
    line: string;
    glow: string;
}> = {
    registration: {
        icon: User,
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
        badgeBg: "bg-blue-100",
        badgeText: "text-blue-700",
        label: "Registration",
        line: "bg-blue-400",
        glow: "shadow-blue-100",
    },
    consultation: {
        icon: Stethoscope,
        color: "text-rose-600",
        bg: "bg-rose-50",
        border: "border-rose-200",
        badgeBg: "bg-rose-100",
        badgeText: "text-rose-700",
        label: "Consultation",
        line: "bg-rose-400",
        glow: "shadow-rose-100",
    },
    lab: {
        icon: FlaskConical,
        color: "text-indigo-600",
        bg: "bg-indigo-50",
        border: "border-indigo-200",
        badgeBg: "bg-indigo-100",
        badgeText: "text-indigo-700",
        label: "Laboratory",
        line: "bg-indigo-400",
        glow: "shadow-indigo-100",
    },
    radiology: {
        icon: Radio,
        color: "text-cyan-600",
        bg: "bg-cyan-50",
        border: "border-cyan-200",
        badgeBg: "bg-cyan-100",
        badgeText: "text-cyan-700",
        label: "Radiology",
        line: "bg-cyan-400",
        glow: "shadow-cyan-100",
    },
    pharmacy: {
        icon: Pill,
        color: "text-violet-600",
        bg: "bg-violet-50",
        border: "border-violet-200",
        badgeBg: "bg-violet-100",
        badgeText: "text-violet-700",
        label: "Prescription",
        line: "bg-violet-400",
        glow: "shadow-violet-100",
    },
    nursing: {
        icon: HeartPulse,
        color: "text-teal-600",
        bg: "bg-teal-50",
        border: "border-teal-200",
        badgeBg: "bg-teal-100",
        badgeText: "text-teal-700",
        label: "Nursing & Vitals",
        line: "bg-teal-400",
        glow: "shadow-teal-100",
    },
    discharge: {
        icon: FileCheck,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        badgeBg: "bg-emerald-100",
        badgeText: "text-emerald-700",
        label: "Discharge",
        line: "bg-emerald-400",
        glow: "shadow-emerald-100",
    },
    payment: {
        icon: CreditCard,
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        badgeBg: "bg-amber-100",
        badgeText: "text-amber-700",
        label: "Billing & Payment",
        line: "bg-amber-400",
        glow: "shadow-amber-100",
    },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
    completed: { color: "text-green-700", bg: "bg-green-50 border-green-200", icon: CheckCircle2 },
    dispensed: { color: "text-green-700", bg: "bg-green-50 border-green-200", icon: CheckCircle2 },
    paid: { color: "text-green-700", bg: "bg-green-50 border-green-200", icon: CheckCircle2 },
    pending: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock },
    partial: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Clock },
    active: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Activity },
    inprogress: { color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: Activity },
    failed: { color: "text-red-700", bg: "bg-red-50 border-red-200", icon: AlertCircle },
    cancelled: { color: "text-gray-600", bg: "bg-gray-100 border-gray-200", icon: AlertCircle },
    waived: { color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: CheckCircle2 },
};

function StatusBadge({ status }: { status?: string }) {
    if (!status) return null;
    const key = status.toLowerCase().replace(/[\s-_]/g, "");
    const cfg = STATUS_CONFIG[key] ?? { color: "text-gray-600", bg: "bg-gray-100 border-gray-200", icon: Clock };
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color}`}>
            <Icon size={10} />
            <span className="capitalize">{status}</span>
        </span>
    );
}

function PriorityBadge({ priority }: { priority?: string }) {
    if (!priority) return null;
    const p = priority.toLowerCase();
    if (p === "stat") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-100 text-red-700 border border-red-200 animate-pulse">
                STAT
            </span>
        );
    }
    if (p === "urgent") {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                URGENT
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
            {priority}
        </span>
    );
}

function timeAgo(dateString?: string) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return "Yesterday";
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function formatDateHeader(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) return "Today";
    if (isYesterday) return "Yesterday";
    return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ─── Single Timeline Event Card Component ──────────────────────────────────────

function EventCard({
    event,
    isLast,
    isExpanded,
    onToggleExpand,
}: {
    event: TimelineEvent;
    isLast: boolean;
    isExpanded: boolean;
    onToggleExpand: () => void;
}) {
    const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.registration;
    const Icon = cfg.icon;
    const [copied, setCopied] = useState(false);

    const handleCopyDetails = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const hasExpandableContent = !!(
        event.details?.fullText ||
        (event.details?.items && event.details.items.length > 2) ||
        (event.description && event.description.length > 180)
    );

    return (
        <div className="relative flex gap-4 group">
            {/* Timeline Left Node + Connecting Line */}
            <div className="flex flex-col items-center shrink-0">
                <div className={`w-10 h-10 rounded-2xl ${cfg.bg} border-2 ${cfg.border} flex items-center justify-center z-10 shadow-sm ${cfg.glow} transition-transform group-hover:scale-105 duration-200`}>
                    <Icon size={18} className={cfg.color} />
                </div>
                {!isLast && (
                    <div className={`w-0.5 flex-1 my-1.5 rounded-full ${cfg.line} opacity-30 min-h-[36px]`} />
                )}
            </div>

            {/* Timeline Right Card */}
            <div className="flex-1 pb-6 min-w-0">
                <div className="bg-white rounded-2xl border border-gray-100/80 shadow-xs hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden">
                    
                    {/* Top color bar */}
                    <div className={`h-1 w-full ${cfg.line}`} />

                    <div className="p-4 sm:p-5 space-y-3">
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
                                        {cfg.label}
                                    </span>
                                    {event.priority && <PriorityBadge priority={event.priority} />}
                                    {event.status && <StatusBadge status={event.status} />}
                                </div>
                                <h3 className="text-sm sm:text-base font-bold text-gray-900 mt-1 leading-snug">
                                    {event.title}
                                </h3>
                            </div>

                            {/* Timestamp & Relative time */}
                            <div className="text-right shrink-0">
                                <span className="text-[11px] font-semibold text-gray-500 block">
                                    {new Date(event.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                <span className="text-[10px] text-gray-400 font-medium">
                                    {timeAgo(event.timestamp)}
                                </span>
                            </div>
                        </div>

                        {/* Description */}
                        {event.description && (
                            <p className={`text-xs text-gray-600 leading-relaxed ${!isExpanded && hasExpandableContent ? "line-clamp-2" : ""}`}>
                                {event.description}
                            </p>
                        )}

                        {/* Rich Details / Structured Metrics */}
                        {event.details?.items && event.details.items.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                                {event.details.items.map(({ k, v }, i) => (
                                    <div key={i} className="bg-gray-50/80 rounded-xl px-3 py-2 border border-gray-100">
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{k}</p>
                                        <p className="text-xs font-bold text-gray-800 mt-0.5 truncate">{v}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Expandable full text / Clinical findings / Full lab result */}
                        {event.details?.fullText && isExpanded && (
                            <div className="mt-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Clinical Data / Full Report</span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyDetails(event.details?.fullText || "")}
                                        className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                        {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy Details</>}
                                    </button>
                                </div>
                                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed bg-white p-3 rounded-lg border border-gray-100 overflow-x-auto">
                                    {event.details.fullText}
                                </pre>
                            </div>
                        )}

                        {/* Footer Meta Row */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-[11px] text-gray-400 flex-wrap gap-2">
                            <div className="flex items-center gap-3 flex-wrap">
                                {event.actor && (
                                    <span className="flex items-center gap-1 font-medium text-gray-600">
                                        <User size={11} className="text-gray-400" /> {event.actor}
                                    </span>
                                )}
                                {event.meta && (
                                    <span className="font-medium text-gray-500">
                                        {event.meta}
                                    </span>
                                )}
                            </div>

                            {hasExpandableContent && (
                                <button
                                    type="button"
                                    onClick={onToggleExpand}
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors ml-auto"
                                >
                                    {isExpanded ? (
                                        <>Less details <ChevronUp size={12} /></>
                                    ) : (
                                        <>View full details <ChevronDown size={12} /></>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Timeline Page Component ─────────────────────────────────────────────

export default function PatientTimelinePage() {
    const params = useParams();
    const router = useRouter();
    const patientId = (params?.id ?? params?.patientId ?? params?.userId) as string;

    // ── Queries ──
    const { data: patient, isLoading: pLoading, error: pError } = usePatient(patientId);
    const { data: consultations = [] } = useConsultationsByPatient(patientId);
    const { data: labRequests = [] } = useLabRequestsByPatient(patientId);
    const { data: radiologyRequests = [] } = useRadiologyRequestsByPatient(patientId);
    const { data: prescriptions = [] } = usePrescriptionsByPatient(patientId);
    const { data: nursing = [] } = useNursingActionsByPatient(patientId);
    const { data: payments = [] } = usePaymentsByPatient(patientId);

    // ── UI Filters & State ──
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
    const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    const [copiedId, setCopiedId] = useState(false);

    const handleCopyPatientId = () => {
        if (!patient?.id) return;
        navigator.clipboard.writeText(patient.id);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    // ── Build Unified Timeline Events ──
    const allEvents = useMemo<TimelineEvent[]>(() => {
        const events: TimelineEvent[] = [];

        // 1. Patient Registration
        if (patient) {
            events.push({
                id: `reg-${patient.id}`,
                type: "registration",
                title: "Patient Registered at Nile Valley Hospital",
                description: `Official hospital registration for ${patient.name}. Demographics, contact information, and initial medical baseline established.`,
                timestamp: patient.created_at ?? new Date().toISOString(),
                status: "Completed",
                actor: "Front Desk Registry",
                details: {
                    items: [
                        { k: "Blood Group", v: patient.blood_group || "—" },
                        { k: "Genotype", v: patient.geno_type || "—" },
                        { k: "Allergies", v: patient.allergies || "None known" },
                        { k: "HMO/Insurance", v: patient.hmo ? (patient.hmo_name || "Yes") : "Private Client" },
                        { k: "Emergency Contact", v: patient.emergency_contact_name ? `${patient.emergency_contact_name} (${patient.emergency_contact_number || "—"})` : "—" },
                    ],
                },
            });
        }

        // 2. Doctor Consultations
        consultations.forEach((c: any) => {
            const desc = [
                c.symptoms ? `Symptoms: ${c.symptoms}` : null,
                c.diagnosis ? `Assessment / Diagnosis: ${c.diagnosis}` : null,
                c.recommendations ? `Plan: ${c.recommendations}` : null,
            ].filter(Boolean).join("\n\n");

            const items: { k: string; v: string }[] = [];
            if (c.diagnosis) items.push({ k: "Diagnosis", v: c.diagnosis });
            if (c.referred_to) items.push({ k: "Referred To", v: c.referred_to.replace(/-/g, " ").toUpperCase() });
            if (c.status) items.push({ k: "Consultation Status", v: c.status });

            events.push({
                id: `consult-${c.id ?? c.$id}`,
                type: "consultation",
                title: c.diagnosis ? `Consultation: ${c.diagnosis}` : "Doctor Clinical Consultation",
                description: desc || "Clinical consultation and examination recorded.",
                timestamp: c.created_at ?? c.consultation_date ?? c.startTime,
                status: c.status ?? "Completed",
                actor: c.staffs?.name ? `Dr. ${c.staffs.name}` : (c.doctor_id ? `Doctor ID #${c.doctor_id.slice(-6)}` : "Attending Physician"),
                meta: c.referred_to ? `Referred → ${c.referred_to.replace(/-/g, " ")}` : undefined,
                details: {
                    items,
                    fullText: desc || undefined,
                },
                raw: c,
            });
        });

        // 3. Laboratory Investigations
        labRequests
            .filter((r: any) => !String(r.test_type ?? "").startsWith("[RADIOLOGY]"))
            .forEach((r: any) => {
                const items: { k: string; v: string }[] = [
                    { k: "Test Investigation", v: r.test_type ?? "Lab Test" },
                    { k: "Priority", v: (r.priority ?? "Routine").toUpperCase() },
                    { k: "Result Status", v: r.status === "completed" ? "Completed" : "Awaiting Results" },
                ];
                if (r.completed_at) {
                    items.push({ k: "Completed At", v: fmtFull(r.completed_at) });
                }

                events.push({
                    id: `lab-${r.id ?? r.$id}`,
                    type: "lab",
                    title: `Lab Test: ${r.test_type ?? "Laboratory Test"}`,
                    description: r.notes ? `Clinical Indication: ${r.notes}` : (r.result ? "Laboratory analysis completed with findings." : "Laboratory investigation requested."),
                    timestamp: r.created_at,
                    status: r.status ?? "pending",
                    priority: r.priority ?? "routine",
                    actor: r.completed_by ? `Lab Tech #${r.completed_by.slice(-6)}` : "Laboratory Department",
                    meta: r.completed_at ? `Completed: ${fmtFull(r.completed_at)}` : `Priority: ${r.priority ?? "routine"}`,
                    details: {
                        items,
                        fullText: r.result ? `LABORATORY RESULT FINDINGS:\n\n${r.result}` : undefined,
                    },
                    raw: r,
                });
            });

        // 4. Radiology Investigations
        radiologyRequests.forEach((r: any) => {
            const cleanStudy = String(r.test_type ?? "Radiology Study").replace(/^\[RADIOLOGY\]\s*/i, "");
            const items: { k: string; v: string }[] = [
                { k: "Modality / Study", v: cleanStudy },
                { k: "Urgency", v: (r.priority ?? "Routine").toUpperCase() },
                { k: "Report Status", v: r.status === "completed" ? "Report Available" : "Scheduled" },
            ];

            events.push({
                id: `rad-${r.id ?? r.$id}`,
                type: "radiology",
                title: `Radiology: ${cleanStudy}`,
                description: r.notes ? `Clinical Indication: ${r.notes}` : (r.result ? "Radiology report and imaging findings available." : "Radiology investigation requested."),
                timestamp: r.created_at,
                status: r.status ?? "pending",
                priority: r.priority ?? "routine",
                actor: r.completed_by ? "Radiologist" : "Radiology Department",
                meta: r.status === "completed" ? "Report filed" : `Priority: ${r.priority ?? "routine"}`,
                details: {
                    items,
                    fullText: r.result ? `RADIOLOGY REPORT:\n\n${r.result}` : undefined,
                },
                raw: r,
            });
        });

        // 5. Prescriptions & Pharmacy
        prescriptions.forEach((p: any) => {
            const isDispensed = p.dispensed === true || String(p.status).toLowerCase() === "dispensed";
            const items: { k: string; v: string }[] = [
                { k: "Medication", v: p.drug_name ?? "Medication" },
                { k: "Dosage", v: p.dosage ?? "—" },
                { k: "Duration", v: p.duration ?? "—" },
            ];
            if (p.price) {
                items.push({ k: "Cost", v: `₦${Number(p.price).toLocaleString("en-NG")}` });
            }

            events.push({
                id: `rx-${p.id ?? p.$id}`,
                type: "pharmacy",
                title: `Prescription: ${p.drug_name ?? "Prescribed Drug"}`,
                description: [
                    p.dosage ? `Dosage: ${p.dosage}` : null,
                    p.duration ? `Duration: ${p.duration}` : null,
                    p.notes ? `Instructions: ${p.notes}` : null,
                ].filter(Boolean).join(" • "),
                timestamp: p.created_at ?? p.createdDate,
                status: isDispensed ? "Dispensed" : (p.status ?? "Active"),
                actor: p.pharmacist_id ? "Hospital Pharmacist" : "Prescribing Doctor",
                meta: p.price ? `₦${Number(p.price).toLocaleString("en-NG")}` : undefined,
                details: {
                    items,
                    fullText: p.notes ? `Prescription Instructions: ${p.notes}` : undefined,
                },
                raw: p,
            });
        });

        // 6. Nursing Actions & Vitals
        nursing.forEach((n: any) => {
            const isVitals = n.action_type === "Vitals" || n.action_type?.toLowerCase().includes("vital");
            const items: { k: string; v: string }[] = [
                { k: "Action Type", v: n.action_type ?? "Nursing Care" },
                { k: "Status", v: n.status ?? "Completed" },
            ];
            if (n.completion_time) {
                items.push({ k: "Completed At", v: fmtFull(n.completion_time) });
            }

            events.push({
                id: `nurse-${n.id ?? n.$id}`,
                type: "nursing",
                title: isVitals ? "Vital Signs Recorded" : `Nursing Care: ${n.action_type ?? "Action"}`,
                description: n.description || "Nursing assessment and care recorded.",
                timestamp: n.created_at,
                status: n.status ?? "Completed",
                actor: n.assigned_nurse ?? n.completed_by ? `Nurse ${n.assigned_nurse || n.completed_by}` : "Nursing Unit",
                meta: isVitals ? "Vitals Charted" : (n.action_type ?? "Nursing"),
                details: {
                    items,
                    fullText: n.description ? `Nursing Log:\n${n.description}` : undefined,
                },
                raw: n,
            });
        });

        // 7. Payments & Billing Transactions
        payments.forEach((p: any) => {
            const amountFormatted = `₦${Number(p.amount ?? p.amount_kobo ? (p.amount_kobo / 100) : 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
            const isPaid = p.status === "paid" || p.status === "Completed";
            const items: { k: string; v: string }[] = [
                { k: "Billed Amount", v: amountFormatted },
                { k: "Category", v: (p.category ?? "General").toUpperCase() },
                { k: "Payment Method", v: p.payment_method ?? p.paymentMethod ?? p.method ?? "Cash" },
            ];
            if (p.invoice_no) items.push({ k: "Invoice No", v: p.invoice_no });

            events.push({
                id: `pay-${p.id ?? p.$id}`,
                type: "payment",
                title: `Billing: ${p.description ?? "Hospital Service Invoice"}`,
                description: `Amount: ${amountFormatted} · Category: ${p.category || "Service"} · Invoice: ${p.invoice_no || "Generated"}`,
                timestamp: p.created_at ?? p.processed_date,
                status: isPaid ? "Paid" : (p.status ?? "Pending"),
                actor: p.processed_by ? `Cashier #${p.processed_by.slice(-6)}` : "Front Desk Cashier",
                meta: amountFormatted,
                details: {
                    items,
                },
                raw: p,
            });
        });

        return events;
    }, [patient, consultations, labRequests, radiologyRequests, prescriptions, nursing, payments]);

    // ── Filter & Search Logic ──
    const filteredEvents = useMemo(() => {
        return allEvents
            .filter((e) => {
                // Category filter
                if (activeCategory !== "all") {
                    if (activeCategory === "lab_radiology") {
                        if (e.type !== "lab" && e.type !== "radiology") return false;
                    } else if (e.type !== activeCategory) {
                        return false;
                    }
                }

                // Search query
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const matchTitle = e.title.toLowerCase().includes(q);
                    const matchDesc = (e.description || "").toLowerCase().includes(q);
                    const matchActor = (e.actor || "").toLowerCase().includes(q);
                    const matchMeta = (e.meta || "").toLowerCase().includes(q);
                    const matchFull = (e.details?.fullText || "").toLowerCase().includes(q);
                    if (!matchTitle && !matchDesc && !matchActor && !matchMeta && !matchFull) {
                        return false;
                    }
                }

                return true;
            })
            .sort((a, b) => {
                const timeA = new Date(a.timestamp || 0).getTime();
                const timeB = new Date(b.timestamp || 0).getTime();
                return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
            });
    }, [allEvents, activeCategory, searchQuery, sortOrder]);

    // ── Group events by date for visual clarity ──
    const groupedEvents = useMemo(() => {
        const groups: { dateKey: string; dateTitle: string; events: TimelineEvent[] }[] = [];
        const map = new Map<string, TimelineEvent[]>();

        filteredEvents.forEach((event) => {
            const dateKey = new Date(event.timestamp).toISOString().slice(0, 10);
            if (!map.has(dateKey)) {
                map.set(dateKey, []);
            }
            map.get(dateKey)!.push(event);
        });

        map.forEach((eventsInDate, dateKey) => {
            const sampleIso = eventsInDate[0]?.timestamp || dateKey;
            groups.push({
                dateKey,
                dateTitle: formatDateHeader(sampleIso),
                events: eventsInDate,
            });
        });

        return groups;
    }, [filteredEvents]);

    // ── Category Counts ──
    const typeCounts = useMemo(() => {
        const counts: Record<string, number> = { all: allEvents.length };
        allEvents.forEach((e) => {
            counts[e.type] = (counts[e.type] ?? 0) + 1;
        });
        counts.lab_radiology = (counts.lab ?? 0) + (counts.radiology ?? 0);
        return counts;
    }, [allEvents]);

    // ── Handlers ──
    const toggleExpandEvent = (id: string) => {
        setExpandedEvents((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handlePrintTimeline = () => {
        window.print();
    };

    const handleDownloadRecord = async (options: DownloadOptions) => {
        if (!patient?.id) return;
        try {
            const result = await generatePatientRecord({
                patientId: patient.id,
                sections: options.sections,
                dateFrom: options.dateFrom,
                dateTo: options.dateTo,
                format: options.format,
                includeStamp: options.includeStamp,
            });

            if (result.type === "pdf") {
                const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
                const blob = new Blob([bytes], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = result.filename;
                anchor.click();
                URL.revokeObjectURL(url);
                toast.success("Medical record downloaded as PDF.");
            } else {
                const win = window.open("", "_blank", "width=1000,height=760,scrollbars=yes");
                if (win) {
                    win.document.write(result.html);
                    win.document.close();
                } else {
                    const blob = new Blob([result.html], { type: "text/html" });
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank");
                    URL.revokeObjectURL(url);
                }
                toast.success("Print preview opened.");
            }
            setIsDownloadModalOpen(false);
        } catch (err) {
            toast.error("Failed to generate patient record.");
            throw err;
        }
    };

    // ── Loading state ──
    if (pLoading) {
        return (
            <div className="min-h-screen bg-gray-50/60 flex flex-col items-center justify-center gap-3">
                <Loader2 size={24} className="text-blue-600 animate-spin" />
                <p className="text-sm font-semibold text-gray-500">Loading comprehensive timeline…</p>
            </div>
        );
    }

    // ── Not found error state ──
    if (pError || !patient) {
        return (
            <div className="min-h-screen bg-gray-50/60 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-4">
                    <AlertCircle size={28} />
                </div>
                <h2 className="text-lg font-bold text-gray-800">Patient Record Not Found</h2>
                <p className="text-xs text-gray-500 mt-1 max-w-sm">The patient ID requested does not exist or has been removed from the system.</p>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm shadow-blue-200"
                >
                    <ArrowLeft size={14} /> Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/60 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* ── Top Bar & Breadcrumbs ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="w-10 h-10 rounded-2xl bg-white border border-gray-200 shadow-xs flex items-center justify-center text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-all shrink-0"
                            title="Go Back"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold">
                                <span>EMR</span>
                                <ChevronRight size={12} />
                                <span>Patients</span>
                                <ChevronRight size={12} />
                                <span className="text-blue-600 font-bold">Clinical Timeline</span>
                            </div>
                            <h1 className="text-xl font-black text-gray-900 mt-0.5">
                                Patient Journey Timeline
                            </h1>
                        </div>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handlePrintTimeline}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:border-gray-300 text-xs font-bold text-gray-700 shadow-xs transition-all"
                        >
                            <Printer size={14} /> Print Timeline
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsDownloadModalOpen(true)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-200 transition-all"
                        >
                            <Download size={14} /> Export Record
                        </button>
                    </div>
                </div>

                {/* ── Patient Profile Summary Card ── */}
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 sm:p-6 overflow-hidden relative">
                    <div className="flex flex-col md:flex-row md:items-center gap-5 justify-between">
                        
                        {/* Avatar + Primary Bio */}
                        <div className="flex items-start gap-4 min-w-0">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-200 shrink-0">
                                {patient.name?.[0]?.toUpperCase() ?? <User size={24} />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-lg sm:text-xl font-black text-gray-900 truncate">
                                        {patient.name}
                                    </h2>
                                    {patient.status && (
                                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 capitalize">
                                            {patient.status.replace(/-/g, " ")}
                                        </span>
                                    )}
                                </div>

                                {/* Patient ID with copy button */}
                                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700 font-mono text-[11px] font-bold">
                                        ID: {patient.id?.slice(0, 12)}…
                                        <button
                                            type="button"
                                            onClick={handleCopyPatientId}
                                            className="text-gray-400 hover:text-blue-600 transition-colors ml-0.5"
                                            title="Copy full patient ID"
                                        >
                                            {copiedId ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                                        </button>
                                    </span>
                                    {patient.gender && (
                                        <span className="text-xs text-gray-500 font-semibold bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md capitalize">
                                            {patient.gender}
                                        </span>
                                    )}
                                    {patient.birth_date && (
                                        <span className="text-xs text-gray-500 font-semibold bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                                            {calcAge(patient.birth_date)} yrs ({new Date(patient.birth_date).toLocaleDateString("en-GB")})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Quick Patient Tags */}
                        <div className="flex flex-wrap md:flex-col md:items-end gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                            <div className="flex items-center gap-2">
                                {patient.blood_group && (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-red-50 text-red-700 border border-red-100">
                                        <Droplets size={12} /> {patient.blood_group}
                                    </span>
                                )}
                                {patient.geno_type && (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                                        <Dna size={12} /> {patient.geno_type}
                                    </span>
                                )}
                            </div>
                            {hasActualAllergy(patient.allergies) && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                                    <ShieldAlert size={12} className="text-rose-500 shrink-0" />
                                    Allergy: {patient.allergies}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Secondary Contact & Insurance Metadata Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-600">
                        {patient.phone && (
                            <div className="flex items-center gap-2">
                                <Phone size={13} className="text-gray-400 shrink-0" />
                                <span className="truncate">{patient.phone}</span>
                            </div>
                        )}
                        {patient.email && (
                            <div className="flex items-center gap-2">
                                <Mail size={13} className="text-gray-400 shrink-0" />
                                <span className="truncate">{patient.email}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 sm:justify-end">
                            <Building2 size={13} className="text-gray-400 shrink-0" />
                            <span className="font-semibold text-gray-700 truncate">
                                {patient.hmo ? `HMO: ${patient.hmo_name || "Enrolled"}` : "Private Client"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Summary Stats Metric Cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 print:hidden">
                    {[
                        { label: "Total Events", count: allEvents.length, icon: Layers, color: "text-gray-700", bg: "bg-gray-100" },
                        { label: "Consults", count: consultations.length, icon: Stethoscope, color: "text-rose-600", bg: "bg-rose-50" },
                        { label: "Lab Tests", count: labRequests.length, icon: FlaskConical, color: "text-indigo-600", bg: "bg-indigo-50" },
                        { label: "Radiology", count: radiologyRequests.length, icon: Radio, color: "text-cyan-600", bg: "bg-cyan-50" },
                        { label: "Prescriptions", count: prescriptions.length, icon: Pill, color: "text-violet-600", bg: "bg-violet-50" },
                        { label: "Payments", count: payments.length, icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50" },
                    ].map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3 flex flex-col items-center text-center shadow-xs">
                                <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center mb-1.5`}>
                                    <Icon size={14} className={stat.color} />
                                </div>
                                <p className="text-base font-black text-gray-900 leading-tight">{stat.count}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5 truncate max-w-full">{stat.label}</p>
                            </div>
                        );
                    })}
                </div>

                {/* ── Interactive Controls & Filtering Toolbar ── */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-xs space-y-3 print:hidden">
                    
                    {/* Search & Sort Row */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        
                        {/* Live Search */}
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search timeline (symptoms, diagnoses, drugs, tests, doctors)..."
                                className="w-full h-10 pl-9 pr-8 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:bg-white transition-all"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Chronological Sort Toggle */}
                        <button
                            type="button"
                            onClick={() => setSortOrder(o => o === "desc" ? "asc" : "desc")}
                            className="flex items-center justify-center gap-1.5 px-3.5 h-10 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
                            title="Toggle timeline order"
                        >
                            <ArrowUpDown size={13} />
                            <span>{sortOrder === "desc" ? "Newest First" : "Oldest First"}</span>
                        </button>
                    </div>

                    {/* Category Filter Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide pt-1">
                        {[
                            { id: "all", label: "All Events", count: typeCounts.all },
                            { id: "consultation", label: "Consultations", count: typeCounts.consultation || 0 },
                            { id: "lab_radiology", label: "Labs & Radiology", count: typeCounts.lab_radiology || 0 },
                            { id: "pharmacy", label: "Prescriptions", count: typeCounts.pharmacy || 0 },
                            { id: "nursing", label: "Nursing / Vitals", count: typeCounts.nursing || 0 },
                            { id: "payment", label: "Billing / Payments", count: typeCounts.payment || 0 },
                        ].map((chip) => {
                            const isActive = activeCategory === chip.id;
                            return (
                                <button
                                    key={chip.id}
                                    type="button"
                                    onClick={() => setActiveCategory(chip.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                        isActive
                                            ? "bg-blue-600 text-white shadow-xs shadow-blue-200"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                >
                                    <span>{chip.label}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${isActive ? "bg-blue-700 text-white" : "bg-white text-gray-600"}`}>
                                        {chip.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Timeline Events Spine Display ── */}
                {filteredEvents.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400">
                            <TrendingUp size={22} />
                        </div>
                        <h3 className="text-base font-bold text-gray-800">No matching timeline events</h3>
                        <p className="text-xs text-gray-400 max-w-sm">
                            {searchQuery || activeCategory !== "all"
                                ? "Try adjusting your search query or switching the category filter."
                                : "Medical events will appear here as the patient journeys through consultation, tests, and care."}
                        </p>
                        {(searchQuery || activeCategory !== "all") && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setActiveCategory("all");
                                }}
                                className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors mt-2"
                            >
                                Reset all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {groupedEvents.map((group) => (
                            <div key={group.dateKey} className="space-y-4">
                                
                                {/* Sticky Date Group Header */}
                                <div className="flex items-center gap-3 sticky top-4 z-20">
                                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold shadow-md shadow-slate-900/10">
                                        <Calendar size={12} className="text-slate-300" />
                                        <span>{group.dateTitle}</span>
                                        <span className="text-[10px] text-slate-300 font-normal">
                                            ({group.events.length} {group.events.length === 1 ? "event" : "events"})
                                        </span>
                                    </div>
                                    <div className="flex-1 h-px bg-gray-200" />
                                </div>

                                {/* Events within this date group */}
                                <div className="space-y-0 pl-1 sm:pl-3">
                                    {group.events.map((event, idx) => (
                                        <EventCard
                                            key={event.id}
                                            event={event}
                                            isLast={idx === group.events.length - 1}
                                            isExpanded={!!expandedEvents[event.id]}
                                            onToggleExpand={() => toggleExpandEvent(event.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Export / Download Dialog ── */}
                <Dialog open={isDownloadModalOpen} onOpenChange={setIsDownloadModalOpen}>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
                                <Download size={18} className="text-blue-600" />
                                Export Patient Medical Record
                            </DialogTitle>
                        </DialogHeader>
                        {patient?.id && (
                            <PatientRecordDownload
                                patientId={patient.id}
                                patientName={patient.name ?? "Patient"}
                                onDownload={handleDownloadRecord}
                            />
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
