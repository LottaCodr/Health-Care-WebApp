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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
                <Button onClick={onDone} variant="ghost" size="icon" className="h-6 w-6 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
                    <X size={12} />
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        Ward / Unit <span className="text-red-400">*</span>
                    </Label>
                    <Input
                        value={wardName}
                        onChange={e => setWardName(e.target.value)}
                        placeholder="e.g. Maternity Ward B"
                        autoFocus
                        className="h-9 rounded-xl border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-gray-300"
                    />
                </div>
                <div>
                    <Label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        Bed Number
                    </Label>
                    <Input
                        value={bedNumber}
                        onChange={e => setBedNumber(e.target.value)}
                        placeholder="e.g. Bed 4, 12A"
                        className="h-9 rounded-xl border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-gray-300"
                    />
                </div>
                <div className="col-span-2">
                    <Label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        Special Instructions
                    </Label>
                    <Textarea
                        rows={2}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Isolation, dietary restrictions, monitoring frequency, nil by mouth…"
                        className="rounded-xl border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-gray-300"
                    />
                </div>
            </div>

            <div className="flex gap-2 pt-1">
                <Button onClick={onDone} variant="outline"
                    className="rounded-xl border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-500 hover:border-gray-300 hover:text-gray-700">
                    Cancel
                </Button>
                <Button onClick={handleSave} disabled={assign.isPending || !wardName.trim()}
                    className="flex-1 gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700">
                    {assign.isPending
                        ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                        : <><BedDouble size={13} /> {isEditing ? "Update Assignment" : "Confirm Ward Assignment"}</>}
                </Button>
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
        <Card className={`overflow-hidden rounded-2xl bg-white transition-all duration-200 ${
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
                        <Badge variant="outline" className={`gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${urgConfig.bg} ${urgConfig.color} ${urgConfig.border}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${urgConfig.dot}`} />
                            {urgConfig.label}
                        </Badge>
                        <Badge variant="outline" className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${typeConfig.bg} ${typeConfig.color} ${typeConfig.border}`}>
                            {typeConfig.emoji} {typeConfig.label}
                        </Badge>
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
                            <Badge variant="outline" className="gap-1 rounded-lg border-green-100 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                                <MapPin size={10} /> {admission.ward_name}{admission.bed_number ? ` · ${admission.bed_number}` : ""}
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="gap-1 rounded-lg border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                <Clock size={10} /> Awaiting bed assignment
                            </Badge>
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
                    <Button onClick={() => setShowForm(v => !v)}
                        className={`gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ${
                            showForm
                                ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                : hasWard
                                    ? "border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                    : "bg-indigo-600 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700"
                        }`}>
                        <BedDouble size={12} />
                        {showForm ? "Cancel" : hasWard ? "Edit Ward" : "Assign Bed"}
                    </Button>

                    {hasWard && !showForm && (
                        <Button onClick={handleDischarge} disabled={discharge.isPending}
                            className="gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">
                            {discharge.isPending
                                ? <Loader2 size={11} className="animate-spin" />
                                : <LogOut size={11} />
                            }
                            Discharge
                        </Button>
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
        </Card>
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
                    <Card key={s.label} className={`flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm ${s.border}`}>
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
                            <Icon size={17} className={s.color} />
                        </div>
                        <div>
                            <p className="text-2xl font-extrabold leading-none text-gray-900">{s.value}</p>
                            <p className="mt-0.5 text-[10px] font-medium leading-tight text-gray-400">{s.label}</p>
                        </div>
                    </Card>
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
                <Button onClick={() => refetch()} variant="outline" size="icon"
                    className="h-9 w-9 rounded-xl border-gray-200 bg-white text-gray-400 shadow-sm hover:text-gray-700"
                    aria-label="Refresh admissions">
                    <RefreshCcw size={13} />
                </Button>
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
                <Card className="flex flex-col items-center justify-center gap-3 rounded-2xl border-red-100 bg-white py-16 shadow-sm">
                    <AlertTriangle size={20} className="text-red-400" />
                    <p className="text-sm font-semibold text-gray-500">Failed to load admissions</p>
                    <Button onClick={() => refetch()} variant="link" size="sm" className="h-auto p-0 text-xs font-semibold text-red-600">
                        Retry
                    </Button>
                </Card>
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