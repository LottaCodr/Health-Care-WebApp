"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useActiveAdmissions, useAssignWard, useDischargeFromWard } from "@/hooks/emr/use-admissions";
import {
    ADMISSION_TYPE_CONFIG,
    URGENCY_CONFIG,
    type AdmissionType,
    type AdmissionUrgency,
    type PatientAdmission,
} from "@/types/admission.types";
import {
    BedDouble, RefreshCcw, CheckCircle2, AlertTriangle,
    Clock, X, Loader2, ChevronRight, MapPin,
    User, LogOut, Info,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeWaiting(iso: string): string {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1)    return "Just admitted";
    if (mins < 60)   return `${mins}m waiting`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ${mins % 60}m waiting`;
    return `${Math.floor(mins / 1440)}d waiting`;
}

function calcAge(dob?: string | null): string | null {
    if (!dob) return null;
    const y = new Date().getFullYear() - new Date(dob).getFullYear();
    return y < 1 ? "< 1 yr" : `${y} yrs`;
}

// ─── Assign ward form ─────────────────────────────────────────────────────────

interface AssignFormProps {
    admission: PatientAdmission;
    staffId:   string;
    onDone:    () => void;
}

function AssignWardForm({ admission, staffId, onDone }: AssignFormProps) {
    const assign = useAssignWard();

    const [wardName,  setWardName]  = useState(admission.ward_name  ?? "");
    const [bedNumber, setBedNumber] = useState(admission.bed_number ?? "");
    const [notes,     setNotes]     = useState(admission.notes      ?? "");

    const isEditing = !!(admission.ward_name);

    async function handleSave() {
        if (!wardName.trim()) { toast.error("Ward name is required."); return; }
        try {
            await assign.mutateAsync({
                id:          admission.id,
                ward_name:   wardName.trim(),
                bed_number:  bedNumber.trim() || undefined,
                notes:       notes.trim()     || undefined,
                assigned_by: staffId,
            });
            toast.success(
                isEditing
                    ? `Ward updated for ${admission.patients?.name}`
                    : `${admission.patients?.name} assigned to ${wardName}`
            );
            onDone();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to assign ward.");
        }
    }

    return (
        <div className="border-t border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-white px-5 pb-5 pt-4 space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                    {isEditing ? "Update Ward Assignment" : "Assign Ward & Bed"}
                </p>
                <button onClick={onDone} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                    <X size={12} />
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">
                        Ward / Unit <span className="text-red-400">*</span>
                    </label>
                    <input
                        value={wardName}
                        onChange={e => setWardName(e.target.value)}
                        placeholder="e.g. Maternity Ward B"
                        autoFocus
                        className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-gray-300 transition-all"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">
                        Bed Number
                    </label>
                    <input
                        value={bedNumber}
                        onChange={e => setBedNumber(e.target.value)}
                        placeholder="e.g. Bed 4, 12A"
                        className="w-full h-9 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-gray-300 transition-all"
                    />
                </div>
                <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">
                        Special Instructions
                    </label>
                    <textarea
                        rows={2}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Isolation, dietary restrictions, monitoring frequency, nil by mouth…"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-gray-300 transition-all"
                    />
                </div>
            </div>

            <div className="flex gap-2 pt-1">
                <button onClick={onDone}
                    className="px-4 py-2.5 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl bg-white hover:border-gray-300 hover:text-gray-700 transition-colors">
                    Cancel
                </button>
                <button onClick={handleSave} disabled={assign.isPending || !wardName.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors shadow-sm shadow-indigo-200">
                    {assign.isPending
                        ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                        : <><BedDouble size={13} /> {isEditing ? "Update Assignment" : "Confirm Ward Assignment"}</>
                    }
                </button>
            </div>
        </div>
    );
}

// ─── Admission card ───────────────────────────────────────────────────────────

interface AdmissionCardProps {
    admission: PatientAdmission;
    staffId:   string;
    index:     number;
}

function AdmissionCard({ admission, staffId, index }: AdmissionCardProps) {
    const [showForm, setShowForm] = useState(false);
    const discharge               = useDischargeFromWard();

    const patient     = admission.patients;
    const age         = calcAge(patient?.birth_date);
    const isFemale    = (patient?.gender ?? "").toLowerCase() === "female";
    const elapsed     = timeWaiting(admission.admitted_at);
    const typeConfig  = ADMISSION_TYPE_CONFIG[admission.admission_type] ?? ADMISSION_TYPE_CONFIG.ward;
    const urgConfig   = URGENCY_CONFIG[admission.urgency]               ?? URGENCY_CONFIG.routine;
    const hasWard     = !!admission.ward_name;
    const isEmergency = admission.urgency === "emergency";

    async function handleDischarge() {
        if (!confirm(`Discharge ${patient?.name ?? "this patient"} from ward?`)) return;
        try {
            await discharge.mutateAsync(admission.id);
            toast.success(`${patient?.name} discharged from ward.`);
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to discharge.");
        }
    }

    return (
        <div className={`rounded-2xl border overflow-hidden bg-white transition-all duration-200 ${
            isEmergency
                ? "border-red-200 shadow-sm shadow-red-100"
                : showForm
                    ? "border-indigo-200 shadow-md"
                    : "border-gray-100 shadow-sm hover:border-indigo-100 hover:shadow-md"
        }`}>
            {/* Emergency pulse bar */}
            {isEmergency && (
                <div className="h-1 bg-gradient-to-r from-red-500 to-rose-400" />
            )}

            <div className="flex items-start gap-3 p-4">
                {/* Queue number */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 ${
                    isEmergency ? "bg-red-600 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                    {index + 1}
                </div>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                    isFemale
                        ? "bg-pink-50 border-pink-100 text-pink-600"
                        : "bg-indigo-50 border-indigo-100 text-indigo-600"
                }`}>
                    {(patient?.name ?? "?")[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Name + badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900 truncate">{patient?.name ?? "—"}</p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgConfig.bg} ${urgConfig.color} ${urgConfig.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${urgConfig.dot}`} />
                            {urgConfig.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeConfig.bg} ${typeConfig.color} ${typeConfig.border}`}>
                            {typeConfig.emoji} {typeConfig.label}
                        </span>
                    </div>

                    {/* Demographics */}
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 flex-wrap">
                        {patient?.gender && <span className={isFemale ? "text-pink-500 font-medium" : "text-indigo-500 font-medium"}>{patient.gender}</span>}
                        {age            && <span>· {age}</span>}
                        {patient?.phone && <span className="flex items-center gap-0.5"><User size={9} /> {patient.phone}</span>}
                    </div>

                    {/* Ward assignment status */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {hasWard ? (
                            <span className="flex items-center gap-1 text-[11px] text-green-700 font-semibold bg-green-50 border border-green-100 px-2 py-0.5 rounded-lg">
                                <MapPin size={10} /> {admission.ward_name}{admission.bed_number ? ` · ${admission.bed_number}` : ""}
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-[11px] text-amber-700 font-semibold bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-lg">
                                <Clock size={10} /> Awaiting bed assignment
                            </span>
                        )}
                        <span className={`text-[10px] font-medium ${isEmergency ? "text-red-500" : "text-gray-400"}`}>
                            {elapsed}
                        </span>
                    </div>

                    {/* Indication */}
                    {admission.indication && !showForm && (
                        <p className="text-[11px] text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100 line-clamp-2">
                            <span className="font-semibold text-gray-600">Indication:</span> {admission.indication}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => setShowForm(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                            showForm
                                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                : hasWard
                                    ? "bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200"
                        }`}>
                        <BedDouble size={12} />
                        {showForm ? "Cancel" : hasWard ? "Edit Ward" : "Assign Bed"}
                    </button>

                    {hasWard && !showForm && (
                        <button onClick={handleDischarge} disabled={discharge.isPending}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-colors disabled:opacity-50">
                            {discharge.isPending
                                ? <Loader2 size={11} className="animate-spin" />
                                : <LogOut size={11} />
                            }
                            Discharge
                        </button>
                    )}
                </div>
            </div>

            {/* Assign ward form */}
            {showForm && (
                <AssignWardForm
                    admission={admission}
                    staffId={staffId}
                    onDone={() => setShowForm(false)}
                />
            )}
        </div>
    );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar({ admissions }: { admissions: PatientAdmission[] }) {
    const total     = admissions.length;
    const unassigned= admissions.filter(a => !a.ward_name).length;
    const emergency = admissions.filter(a => a.urgency === "emergency").length;
    const urgent    = admissions.filter(a => a.urgency === "urgent").length;

    const stats = [
        { label: "Total Admitted",  value: total,      icon: BedDouble,      color: "text-indigo-600", bg: "bg-indigo-50",  border: "border-indigo-100" },
        { label: "Awaiting Bed",    value: unassigned,  icon: Clock,          color: "text-amber-600",  bg: "bg-amber-50",   border: "border-amber-100"  },
        { label: "Emergency",       value: emergency,   icon: AlertTriangle,  color: "text-red-600",    bg: "bg-red-50",     border: "border-red-100"    },
        { label: "Urgent",          value: urgent,      icon: AlertTriangle,  color: "text-orange-600", bg: "bg-orange-50",  border: "border-orange-100" },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map(s => {
                const Icon = s.icon;
                return (
                    <div key={s.label} className={`bg-white rounded-2xl border ${s.border} shadow-sm px-4 py-4 flex items-center gap-3`}>
                        <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                            <Icon size={17} className={s.color} />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold text-gray-900 leading-none">{s.value}</p>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5 leading-tight">{s.label}</p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AdmissionsQueueProps {
    staffId: string;
}

export default function AdmissionsQueue({ staffId }: AdmissionsQueueProps) {
    const { data: admissions = [], isLoading, isError, refetch } = useActiveAdmissions();

    // Sort: emergency → urgent → routine, then by time (longest waiting first)
    const sorted = [...admissions].sort((a, b) => {
        const urgencyOrder = { emergency: 0, urgent: 1, routine: 2 };
        const uDiff = (urgencyOrder[a.urgency] ?? 2) - (urgencyOrder[b.urgency] ?? 2);
        if (uDiff !== 0) return uDiff;
        return new Date(a.admitted_at).getTime() - new Date(b.admitted_at).getTime();
    });

    return (
        <div className="space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-gray-900">Admissions</h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        {admissions.length > 0
                            ? `${admissions.filter(a => !a.ward_name).length} awaiting bed assignment · sorted by priority`
                            : "Ward and bed assignment management"}
                    </p>
                </div>
                <button onClick={() => refetch()}
                    className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors shadow-sm">
                    <RefreshCcw size={13} />
                </button>
            </div>

            {/* Stats */}
            {admissions.length > 0 && <StatsBar admissions={admissions} />}

            {/* List */}
            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="animate-pulse h-24 bg-white rounded-2xl border border-gray-100 shadow-sm" />
                    ))}
                </div>
            ) : isError ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-2xl border border-red-100 shadow-sm">
                    <AlertTriangle size={20} className="text-red-400" />
                    <p className="text-sm font-semibold text-gray-500">Failed to load admissions</p>
                    <button onClick={() => refetch()} className="text-xs text-red-600 hover:underline font-semibold">Retry</button>
                </div>
            ) : sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                        <CheckCircle2 size={24} className="text-green-500" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-gray-600">No active admissions</p>
                        <p className="text-xs text-gray-400 mt-1">All beds are assigned or the ward is clear</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {sorted.map((admission, index) => (
                        <AdmissionCard
                            key={admission.id}
                            admission={admission}
                            staffId={staffId}
                            index={index}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}