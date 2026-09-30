"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { usePendingLabRequests, useCompletedLabRequests, useUpdateLabRequest } from "@/hooks/emr/use-emr";
import { LoadingSkeleton } from "@/components/emr";
import {
    FlaskConical, CheckCircle2, Clock,
    RefreshCcw, FileText, AlertTriangle, User,
    Phone, Calendar, Droplets, Beaker, Hash,
    ChevronDown, ChevronUp, Activity, Microscope,
    Search, ArrowUpDown, Filter, Eye, Check,
    Layers,
} from "lucide-react";
import { toast } from "sonner";
import { fmtDate, fmtFull, fmtTime } from "@/lib/utils";
import { displayHospitalNumber, getPatientHospitalNumber } from "@/lib/hospital-number";
import { useLabStore } from "@/store/lab-store";
import TestTemplateForm from "./TestTemplateForm";
import { patientAgeOn, patientAgeYearsPrecise } from "@/lib/clinical/patient-age";
import { RecordAmendmentControls } from "@/components/records";
import Link from "next/link";
import { DashboardHeader } from "@/components/layout/DashboardHeader";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso?: string) {
    if (!iso) return "";
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1)  return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; border: string }> = {
    routine: { label: "Routine", color: "text-gray-600",  bg: "bg-gray-100",  dot: "bg-gray-400", border: "border-gray-200"  },
    urgent:  { label: "Urgent",  color: "text-amber-700", bg: "bg-amber-50",  dot: "bg-amber-500", border: "border-amber-200" },
    stat:    { label: "STAT",    color: "text-red-700",   bg: "bg-red-50",    dot: "bg-red-500", border: "border-red-200"   },
};

function PriorityBadge({ priority }: { priority?: string }) {
    const cfg = PRIORITY_CONFIG[priority ?? "routine"] ?? PRIORITY_CONFIG.routine;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
        </span>
    );
}

function getInitials(name?: string) {
    if (!name) return "?";
    return name.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase();
}

// ─── Result preview parser for completed ─────────────────────────────────────
const PREVIEW_SKIP = [
    "TEST NAME", "PARAMETER", "─", "Note:", "Additional Notes",
    "Reference set:", "Sample ID:", "Mode:", "Test Time:",
    "HEMATOLOGY ANALYZER", "Full Blood Count (FBC)",
    "[The test result only accounts for this test sample]",
];

function parseResultPreview(result?: string, maxLen = 100) {
    if (!result) return "Result recorded";
    const lines = result.split("\n").map(l => l.trim()).filter(Boolean);
    const meaningful = lines.filter(t => !PREVIEW_SKIP.some(s => t.includes(s)));
    if (meaningful.length === 0) return result.slice(0, maxLen);
    const cleaned = meaningful.slice(2).join(" • ").replace(/\t+/g, " · ") || meaningful.join(" • ");
    return cleaned.slice(0, maxLen) + (cleaned.length > maxLen ? "…" : "");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LabTechDashboard() {
    const { user }   = useAuth();
    const { authorized } = useRoleProtection([UserRole.LabTechnician, UserRole.Admin]);
    const { data: pendingData = [], isLoading: pendingLoading, refetch: refetchPending } = usePendingLabRequests();
    const { data: completedData = [], isLoading: completedLoading, refetch: refetchCompleted } = useCompletedLabRequests();

    const [activeTab, setActiveTab] = useState<"pending" | "completed" | "all">("pending");
    const [searchQuery, setSearchQuery] = useState("");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [sortOrder, setSortOrder] = useState<"latest" | "priority" | "oldest">("latest");
    const [expandedResultId, setExpandedResultId] = useState<string | null>(null);

    const {
        dashboardActiveId:     activeId,
        dashboardResultText:   resultText,
        dashboardSubmittingId: submittingId,
        setField,
        setDashboardResultText,
    } = useLabStore();

    const { mutate: updateLabRequest } = useUpdateLabRequest();

    const pending   = useMemo(() => (pendingData as any[]).filter(r => r.status === "pending"), [pendingData]);
    const completed = useMemo(() => (completedData as any[]), [completedData]);

    // Stack of unattended requests starts from latest (newest to oldest)
    const sortedPending = useMemo(() => {
        let list = [...pending];
        if (priorityFilter !== "all") {
            list = list.filter((r: any) => r.priority === priorityFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((r: any) => {
                const patient = r.patients ?? {};
                const name = (patient.name ?? r.patient_name ?? "").toLowerCase();
                const hn = String(getPatientHospitalNumber(patient) ?? "").toLowerCase();
                const test = (r.test_type ?? "").toLowerCase();
                return name.includes(q) || hn.includes(q) || test.includes(q);
            });
        }
        return list.sort((a: any, b: any) => {
            if (sortOrder === "priority") {
                const order = { stat: 0, urgent: 1, routine: 2 };
                const priDiff = (order[a.priority as keyof typeof order] ?? 2) - (order[b.priority as keyof typeof order] ?? 2);
                if (priDiff !== 0) return priDiff;
            }
            const timeA = new Date(a.created_at || 0).getTime();
            const timeB = new Date(b.created_at || 0).getTime();
            if (sortOrder === "oldest") return timeA - timeB;
            // Default "latest" first so unattended tests appear newest first
            return timeB - timeA;
        });
    }, [pending, priorityFilter, searchQuery, sortOrder]);

    const filteredCompleted = useMemo(() => {
        let list = [...completed];
        if (priorityFilter !== "all") {
            list = list.filter((r: any) => r.priority === priorityFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((r: any) => {
                const patient = r.patients ?? {};
                const name = (patient.name ?? r.patient_name ?? "").toLowerCase();
                const hn = String(getPatientHospitalNumber(patient) ?? "").toLowerCase();
                const test = (r.test_type ?? "").toLowerCase();
                return name.includes(q) || hn.includes(q) || test.includes(q);
            });
        }
        return list.sort((a: any, b: any) => {
            const timeA = new Date(a.completed_at || a.created_at || 0).getTime();
            const timeB = new Date(b.completed_at || b.created_at || 0).getTime();
            return timeB - timeA;
        });
    }, [completed, priorityFilter, searchQuery]);

    const allRequests = useMemo(() => {
        const combined = [
            ...pending.map((r: any) => ({ ...r, _status: "pending" })),
            ...completed.map((r: any) => ({ ...r, _status: "completed" })),
        ];
        let list = combined;
        if (priorityFilter !== "all") {
            list = list.filter((r: any) => r.priority === priorityFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((r: any) => {
                const patient = r.patients ?? {};
                const name = (patient.name ?? r.patient_name ?? "").toLowerCase();
                const hn = String(getPatientHospitalNumber(patient) ?? "").toLowerCase();
                const test = (r.test_type ?? "").toLowerCase();
                return name.includes(q) || hn.includes(q) || test.includes(q);
            });
        }
        return list.sort((a: any, b: any) => {
            const timeA = new Date(a.created_at || 0).getTime();
            const timeB = new Date(b.created_at || 0).getTime();
            return timeB - timeA;
        });
    }, [pending, completed, priorityFilter, searchQuery]);

    if (!authorized) return null;

    const handleSubmitResult = (reqId: string, resultOverride?: string, priceOverride?: number) => {
        const result = resultOverride ?? resultText[reqId]?.trim();
        if (!result) { toast.error("Please enter the test result."); return; }
        setField("dashboardSubmittingId", reqId);
        updateLabRequest(
            {
                id: reqId,
                updates: {
                    status:       "completed",
                    result,
                    completed_by: user?.$id ?? user?.id,
                    completed_at: new Date().toISOString(),
                    ...(priceOverride && priceOverride > 0 ? { price: priceOverride } : {}),
                },
            },
            {
                onSuccess: (updated) => {
                    const warning = (updated as any)?.billing_warning as string | undefined;
                    if (warning) {
                        toast.warning(`Result submitted. ${warning}`, { duration: 9000 });
                    } else {
                        toast.success("Result submitted and updated in billing.");
                    }
                    setDashboardResultText(reqId, "");
                    setField("dashboardActiveId", null);
                    refetchPending();
                    refetchCompleted();
                },
                onError: (err) => toast.error(
                    err instanceof Error ? err.message : "Failed to submit result.",
                    { duration: 9000 }
                ),
                onSettled: () => setField("dashboardSubmittingId", null),
            }
        );
    };

    const refetch = () => { refetchPending(); refetchCompleted(); };

    const statCount = pending.filter((r: any) => r.priority === "stat").length;

    return (
        <div className="space-y-6">

            <DashboardHeader
                title="Laboratory workspace"
                description="Unattended requests ordered latest first, structured templates, and full pending & completed test records."
                icon={FlaskConical}
                tone="indigo"
                actions={
                    <Link href="/lab-tech/catalog" className="inline-flex h-9 items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100">
                        <Microscope size={13} /> Test catalog
                    </Link>
                }
            />

            {/* Interactive Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                    type="button"
                    onClick={() => { setActiveTab("pending"); setPriorityFilter("all"); }}
                    className={`bg-white rounded-2xl border transition-all text-left px-4 py-4 sm:px-5 sm:py-5 flex min-w-0 items-center gap-3 sm:gap-4 hover:shadow-md ${
                        activeTab === "pending" && priorityFilter === "all"
                            ? "border-amber-400 ring-2 ring-amber-400/20 shadow-sm"
                            : "border-amber-100 shadow-sm hover:border-amber-300"
                    }`}
                >
                    <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                        <Clock size={19} className="text-amber-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-2xl font-extrabold text-gray-900 leading-none">{pending.length}</p>
                        <p className="text-xs text-gray-500 font-bold mt-1">Pending Tests</p>
                        <p className="text-[10px] text-gray-400">Latest unattended first</p>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => { setActiveTab("completed"); setPriorityFilter("all"); }}
                    className={`bg-white rounded-2xl border transition-all text-left px-4 py-4 sm:px-5 sm:py-5 flex min-w-0 items-center gap-3 sm:gap-4 hover:shadow-md ${
                        activeTab === "completed"
                            ? "border-green-400 ring-2 ring-green-400/20 shadow-sm"
                            : "border-green-100 shadow-sm hover:border-green-300"
                    }`}
                >
                    <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={19} className="text-green-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-2xl font-extrabold text-gray-900 leading-none">{completed.length}</p>
                        <p className="text-xs text-gray-500 font-bold mt-1">Completed Results</p>
                        <p className="text-[10px] text-gray-400">Full records & reports</p>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() => { setActiveTab("pending"); setPriorityFilter("stat"); }}
                    className={`bg-white rounded-2xl border transition-all text-left px-4 py-4 sm:px-5 sm:py-5 flex min-w-0 items-center gap-3 sm:gap-4 hover:shadow-md ${
                        priorityFilter === "stat"
                            ? "border-red-400 ring-2 ring-red-400/20 shadow-sm"
                            : "border-red-100 shadow-sm hover:border-red-300"
                    }`}
                >
                    <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                        <AlertTriangle size={19} className="text-red-600" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-2xl font-extrabold text-gray-900 leading-none">{statCount}</p>
                        <p className="text-xs text-gray-500 font-bold mt-1">STAT Priority</p>
                        <p className="text-[10px] text-gray-400">Immediate attention</p>
                    </div>
                </button>
            </div>

            {/* Main Lab Workspace Card */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header with Title and Tabs */}
                <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-100 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                <FlaskConical size={18} className="text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-800">
                                    {activeTab === "pending" ? "Pending Lab Requests" : activeTab === "completed" ? "Completed Lab Results" : "All Lab Requests"}
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {activeTab === "pending"
                                        ? "Unattended requests stack starts from latest • patient demographics included"
                                        : activeTab === "completed"
                                        ? "Full test findings and authorized results • 24-hr amendment window"
                                        : "Combined view of all pending and completed laboratory work"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={refetch}
                                type="button"
                                aria-label="Refresh laboratory queues"
                                disabled={pendingLoading || completedLoading}
                                className="w-8 h-8 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors disabled:cursor-wait disabled:opacity-60">
                                <RefreshCcw size={13} className={pendingLoading || completedLoading ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>

                    {/* Tab Navigation + Search/Filter Controls */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                        {/* Tabs */}
                        <div className="flex items-center gap-1.5 p-1 bg-gray-50 rounded-2xl border border-gray-200 w-fit">
                            <button
                                type="button"
                                onClick={() => setActiveTab("pending")}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    activeTab === "pending"
                                        ? "bg-white text-indigo-700 shadow-sm border border-gray-200"
                                        : "text-gray-500 hover:text-gray-800"
                                }`}
                            >
                                <Clock size={13} />
                                <span>Pending Tests</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                    activeTab === "pending" ? "bg-amber-100 text-amber-800" : "bg-gray-200 text-gray-600"
                                }`}>
                                    {pending.length}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab("completed")}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    activeTab === "completed"
                                        ? "bg-white text-indigo-700 shadow-sm border border-gray-200"
                                        : "text-gray-500 hover:text-gray-800"
                                }`}
                            >
                                <CheckCircle2 size={13} />
                                <span>Completed Tests</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                                    activeTab === "completed" ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
                                }`}>
                                    {completed.length}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab("all")}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                    activeTab === "all"
                                        ? "bg-white text-indigo-700 shadow-sm border border-gray-200"
                                        : "text-gray-500 hover:text-gray-800"
                                }`}
                            >
                                <Layers size={13} />
                                <span>All Tests</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-gray-200 text-gray-600">
                                    {pending.length + completed.length}
                                </span>
                            </button>
                        </div>

                        {/* Search and Sort controls */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Search */}
                            <div className="relative flex-1 sm:w-60">
                                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search patient, test, HN…"
                                    className="w-full h-8 pl-8 pr-3 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 hover:text-gray-600"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Priority filter */}
                            <select
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                                className="h-8 px-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-700 focus:bg-white focus:outline-none"
                            >
                                <option value="all">All Priorities</option>
                                <option value="stat">STAT only</option>
                                <option value="urgent">Urgent only</option>
                                <option value="routine">Routine only</option>
                            </select>

                            {/* Sort order (for pending / all) */}
                            {activeTab !== "completed" && (
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value as any)}
                                    className="h-8 px-2.5 text-xs rounded-xl border border-gray-200 bg-gray-50 text-gray-700 focus:bg-white focus:outline-none font-medium"
                                >
                                    <option value="latest">Latest first (Newest)</option>
                                    <option value="priority">Priority (STAT first)</option>
                                    <option value="oldest">Oldest first</option>
                                </select>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="px-4 sm:px-6 py-5 space-y-4">

                    {/* ═══ TAB 1: PENDING REQUESTS ═══ */}
                    {activeTab === "pending" && (
                        pendingLoading ? <LoadingSkeleton rows={4} /> : sortedPending.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                                    <CheckCircle2 size={22} className="text-green-500" />
                                </div>
                                <p className="text-sm font-semibold text-gray-600">
                                    {searchQuery || priorityFilter !== "all" ? "No matching pending requests" : "Queue clear"}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {searchQuery || priorityFilter !== "all" ? "Try adjusting your search or priority filter" : "No pending lab requests awaiting attention"}
                                </p>
                            </div>
                        ) : (
                            sortedPending.map((req: any) => {
                                const isExpanded    = activeId === req.id;
                                const patient = req.patients ?? {};
                                const patientName   = patient?.name ?? req.patient_name ?? "Patient";
                                const patientPhone = patient?.phone;
                                const patientGender = patient?.gender;
                                const patientAge = patientAgeOn(patient?.birth_date);
                                const patientHospitalNumber = getPatientHospitalNumber(patient);
                                const patientBg = patient?.blood_group;
                                const requestedByName = req.requested_by_name ?? req.staffs?.name ?? null;
                                const elapsed       = timeAgo(req.created_at);

                                return (
                                    <div key={req.id} className={`rounded-2xl border overflow-hidden transition-all ${isExpanded ? "border-indigo-200 bg-indigo-50/20 shadow-sm" : "border-gray-200 bg-white hover:border-indigo-100 hover:shadow-sm"}`}>
                                        {/* Priority accent bar */}
                                        <div className={`h-1 w-full ${req.priority === "stat" ? "bg-red-500" : req.priority === "urgent" ? "bg-amber-400" : "bg-gray-200"}`} />
                                        <div className="p-4 sm:p-5">
                                            {/* Top: Patient header */}
                                            <div className="flex items-start gap-3">
                                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shrink-0 text-white font-black text-sm shadow-sm">
                                                    {getInitials(patientName)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-sm font-bold text-gray-900 truncate">{patientName}</h3>
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-[10px] font-mono font-bold text-gray-600">
                                                            <Hash size={10} /> {displayHospitalNumber(patientHospitalNumber)}
                                                        </span>
                                                        <PriorityBadge priority={req.priority} />
                                                        <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 font-bold px-2 py-0.5 rounded-full">
                                                            Pending
                                                        </span>
                                                    </div>
                                                    {/* Patient important details row */}
                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                        {patientAge !== null && (
                                                            <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                                                                <Calendar size={11} className="text-gray-400" /> {patientAge} yrs
                                                            </span>
                                                        )}
                                                        {patientGender && (
                                                            <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                                                                <User size={11} className="text-gray-400" /> {patientGender}
                                                            </span>
                                                        )}
                                                        {patientPhone && (
                                                            <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                                                                <Phone size={11} className="text-gray-400" /> {patientPhone}
                                                            </span>
                                                        )}
                                                        {patientBg && (
                                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                                                                <Droplets size={11} /> {patientBg}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* Test + meta */}
                                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700">
                                                            <Beaker size={11} /> {req.test_type ?? "Lab Test"}
                                                        </span>
                                                        {elapsed && (
                                                            <span className="text-xs text-gray-500 font-medium flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                                                                <Clock size={11} /> {elapsed}
                                                            </span>
                                                        )}
                                                        {requestedByName && (
                                                            <span className="text-xs text-gray-500">• Requested by Dr. {requestedByName}</span>
                                                        )}
                                                    </div>
                                                    {req.notes && (
                                                        <div className="mt-2.5 flex items-start gap-2 px-3 py-2 bg-blue-50/60 border border-blue-100 rounded-xl">
                                                            <FileText size={12} className="text-blue-500 shrink-0 mt-0.5" />
                                                            <p className="text-xs text-blue-700 leading-relaxed"><span className="font-bold">Doctor&apos;s note:</span> {req.notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{fmtDate(req.created_at)} · {fmtTime(req.created_at)}</span>
                                                    <button
                                                        onClick={() => setField("dashboardActiveId", isExpanded ? null : req.id)}
                                                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm ${isExpanded ? "bg-gray-100 hover:bg-gray-200 text-gray-600" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"}`}>
                                                        {isExpanded ? <><ChevronUp size={12} /> Cancel</> : <><FileText size={12} /> Enter Result</>}
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Mobile action */}
                                            <div className="sm:hidden mt-3">
                                                <button
                                                    onClick={() => setField("dashboardActiveId", isExpanded ? null : req.id)}
                                                    className={`w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm ${isExpanded ? "bg-gray-100 hover:bg-gray-200 text-gray-600" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"}`}>
                                                    {isExpanded ? <><ChevronUp size={12} /> Cancel</> : <><FileText size={12} /> Enter Result for {patientName.split(" ")[0]}</>}
                                                </button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-indigo-100 bg-white">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Activity size={14} className="text-indigo-600" />
                                                    <p className="text-xs font-black uppercase tracking-widest text-indigo-700">Enter Structured Result — {req.test_type}</p>
                                                    <span className="ml-auto text-xs text-gray-400 font-mono">{displayHospitalNumber(patientHospitalNumber)} • {patientName}</span>
                                                </div>
                                                <TestTemplateForm
                                                    testType={req.test_type ?? ""}
                                                    patient={{ age: patientAgeYearsPrecise(patient?.birth_date), gender: patientGender, name: patientName }}
                                                    sampleId={req.visit_id ?? null}
                                                    submitting={submittingId === req.id}
                                                    onSubmit={async (resultString) => {
                                                        handleSubmitResult(req.id, resultString);
                                                    }}
                                                />
                                                <div className="flex justify-end mt-3">
                                                    <button onClick={() => setField("dashboardActiveId", null)}
                                                        className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600 transition-colors">
                                                        Close
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )
                    )}

                    {/* ═══ TAB 2: COMPLETED TESTS ═══ */}
                    {activeTab === "completed" && (
                        completedLoading ? <LoadingSkeleton rows={4} /> : filteredCompleted.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
                                    <CheckCircle2 size={22} className="text-gray-400" />
                                </div>
                                <p className="text-sm font-semibold text-gray-600">
                                    {searchQuery || priorityFilter !== "all" ? "No matching completed results" : "No completed tests recorded yet"}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {searchQuery || priorityFilter !== "all" ? "Try adjusting your search criteria" : "Authorized test results will appear here"}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredCompleted.map((req: any) => {
                                    const patient = req.patients ?? {};
                                    const patientName = patient?.name ?? req.patient_name ?? "Patient";
                                    const patientHospitalNumber = getPatientHospitalNumber(patient);
                                    const patientAge = patientAgeOn(patient?.birth_date, req.completed_at);
                                    const patientGender = patient?.gender;
                                    const patientBg = patient?.blood_group;
                                    const patientPhone = patient?.phone;
                                    const isExpanded = expandedResultId === req.id;

                                    return (
                                        <div key={req.id} className="rounded-2xl bg-gray-50/50 border border-gray-200 hover:bg-white hover:border-green-200 hover:shadow-sm transition-all overflow-hidden">
                                            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center shrink-0 shadow-sm text-white font-black text-sm">
                                                    <CheckCircle2 size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="text-sm font-bold text-gray-900">{req.test_type}</h3>
                                                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                                                            <Hash size={10} className="inline mr-0.5" />
                                                            {displayHospitalNumber(patientHospitalNumber)}
                                                        </span>
                                                        <PriorityBadge priority={req.priority} />
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                                            <Check size={10} /> Completed
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-gray-600">
                                                        <span className="font-bold text-gray-800">{patientName}</span>
                                                        {patientAge !== null && <span>· {patientAge} yrs</span>}
                                                        {patientGender && <span>· {patientGender}</span>}
                                                        {patientBg && <span className="font-bold text-red-600">· {patientBg}</span>}
                                                        {patientPhone && <span>· {patientPhone}</span>}
                                                    </div>

                                                    {/* Result preview */}
                                                    <div className="mt-2.5 p-2.5 bg-white rounded-xl border border-gray-200 text-xs">
                                                        <p className="font-medium text-gray-700">
                                                            {parseResultPreview(req.result, 120)}
                                                        </p>
                                                    </div>

                                                    {/* Meta and amendment */}
                                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                                        <div className="text-[11px] text-gray-400">
                                                            Completed {fmtFull(req.completed_at)}
                                                            {req.completed_by_name && ` by ${req.completed_by_name}`}
                                                            {req.requested_by_name && ` • Ordered by Dr. ${req.requested_by_name}`}
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setExpandedResultId(isExpanded ? null : req.id)}
                                                                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                                                            >
                                                                <Eye size={12} /> {isExpanded ? "Hide Full Result" : "View Full Result"}
                                                            </button>

                                                            <RecordAmendmentControls
                                                                type="lab_result"
                                                                id={req.id}
                                                                row={req}
                                                                patientId={req.visit_id ?? req.patient_id ?? null}
                                                                invalidateKeys={[["lab"]]}
                                                                contextLine={`${req.test_type ?? "Lab test"} · ${patientName}`}
                                                                compact
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Full result expander */}
                                                    {isExpanded && (
                                                        <div className="mt-3 pt-3 border-t border-gray-100 bg-white rounded-xl p-3 border">
                                                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1.5">Full Result Record</p>
                                                            <pre className="text-xs font-mono bg-gray-50 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap text-gray-800 border border-gray-100">
                                                                {req.result || "No detailed result text"}
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}

                    {/* ═══ TAB 3: ALL REQUESTS (COMBINED) ═══ */}
                    {activeTab === "all" && (
                        pendingLoading || completedLoading ? <LoadingSkeleton rows={4} /> : allRequests.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
                                    <Layers size={22} className="text-gray-400" />
                                </div>
                                <p className="text-sm font-semibold text-gray-600">No lab requests found</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {allRequests.map((req: any) => {
                                    const isPending = req._status === "pending";
                                    const patient = req.patients ?? {};
                                    const patientName = patient?.name ?? req.patient_name ?? "Patient";
                                    const patientHospitalNumber = getPatientHospitalNumber(patient);
                                    const isEditing = activeId === req.id;

                                    return (
                                        <div key={req.id} className={`rounded-2xl border p-4 sm:p-5 transition-all ${
                                            isPending ? "bg-white border-amber-200" : "bg-gray-50/60 border-gray-200"
                                        }`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 font-bold ${
                                                        isPending ? "bg-amber-500" : "bg-green-500"
                                                    }`}>
                                                        {isPending ? <Clock size={16} /> : <CheckCircle2 size={16} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h3 className="text-sm font-bold text-gray-900">{req.test_type}</h3>
                                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
                                                                <Hash size={10} className="inline mr-0.5" />
                                                                {displayHospitalNumber(patientHospitalNumber)}
                                                            </span>
                                                            <PriorityBadge priority={req.priority} />
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                                isPending
                                                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                                                    : "bg-green-50 text-green-700 border-green-200"
                                                            }`}>
                                                                {isPending ? "Pending" : "Completed"}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs font-medium text-gray-700 mt-1">
                                                            {patientName} · {fmtDate(req.created_at)}
                                                        </p>
                                                        {!isPending && req.result && (
                                                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                                                {parseResultPreview(req.result, 90)}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="shrink-0 flex items-center gap-2">
                                                    {isPending ? (
                                                        <button
                                                            onClick={() => setField("dashboardActiveId", isEditing ? null : req.id)}
                                                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors">
                                                            {isEditing ? "Close" : "Enter Result"}
                                                        </button>
                                                    ) : (
                                                        <RecordAmendmentControls
                                                            type="lab_result"
                                                            id={req.id}
                                                            row={req}
                                                            patientId={req.visit_id ?? req.patient_id ?? null}
                                                            invalidateKeys={[["lab"]]}
                                                            contextLine={`${req.test_type ?? "Lab test"} · ${patientName}`}
                                                            compact
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            {isEditing && (
                                                <div className="mt-4 pt-4 border-t border-indigo-100 bg-white">
                                                    <TestTemplateForm
                                                        testType={req.test_type ?? ""}
                                                        patient={{ age: patientAgeYearsPrecise(patient?.birth_date), gender: patient?.gender, name: patientName }}
                                                        sampleId={req.visit_id ?? null}
                                                        submitting={submittingId === req.id}
                                                        onSubmit={async (resultString) => {
                                                            handleSubmitResult(req.id, resultString);
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}

                </div>
            </div>
        </div>
    );
}
