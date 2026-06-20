"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    getAdmissionsByPatient,
    assignWard,
    dischargeFromWard,
} from "@/lib/services/admission.service";
import {
    ADMISSION_TYPE_CONFIG,
    URGENCY_CONFIG,
    type PatientAdmission,
} from "@/types/admission.types";
import {
    BedDouble, Loader2, ArrowLeft, MapPin, Clock,
    User, Calendar, AlertTriangle, CheckCircle2,
    ClipboardList, LogOut, Edit2, History,
} from "lucide-react";
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso?: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function fmtDate(iso?: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
    });
}

function calcAge(dob?: string | null) {
    if (!dob) return null;
    const y = new Date().getFullYear() - new Date(dob).getFullYear();
    return y < 1 ? "< 1 yr" : `${y} yrs`;
}

function timeWaiting(iso?: string | null) {
    if (!iso) return null;
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
    if (mins < 60)    return `${mins} minutes`;
    if (mins < 1_440) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
    return `${Math.floor(mins / 1440)} day${Math.floor(mins / 1440) !== 1 ? "s" : ""}`;
}

// ─── Field row ────────────────────────────────────────────────────────────────

function Field({ label, value, highlight }: {
    label: string; value: React.ReactNode; highlight?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide shrink-0 mt-0.5">
                {label}
            </p>
            <p className={`text-sm text-right ${highlight ? "font-bold text-gray-900" : "text-gray-700 font-medium"}`}>
                {value ?? <span className="text-gray-300 font-normal">—</span>}
            </p>
        </div>
    );
}

// ─── Ward assignment form ─────────────────────────────────────────────────────

function WardForm({ admission, staffId, onSaved }: {
    admission: PatientAdmission;
    staffId:   string;
    onSaved:   (updated: PatientAdmission) => void;
}) {
    const [wardName,  setWardName]  = useState(admission.ward_name  ?? "");
    const [bedNumber, setBedNumber] = useState(admission.bed_number ?? "");
    const [notes,     setNotes]     = useState(admission.notes      ?? "");
    const [saving,    setSaving]    = useState(false);

    async function handleSave() {
        if (!wardName.trim()) { toast.error("Ward name is required."); return; }
        setSaving(true);
        try {
            const updated = await assignWard({
                id:          admission.id,
                ward_name:   wardName.trim(),
                bed_number:  bedNumber.trim() || undefined,
                notes:       notes.trim()     || undefined,
                assigned_by: staffId,
            });
            toast.success(`Ward assigned — ${wardName}`);
            onSaved(updated);
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to assign ward.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-3 pt-4 border-t border-gray-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                {admission.ward_name ? "Update Ward Assignment" : "Assign Ward & Bed"}
            </p>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">
                        Ward / Unit <span className="text-red-400">*</span>
                    </label>
                    <input value={wardName} onChange={e => setWardName(e.target.value)}
                        placeholder="e.g. Maternity Ward B"
                        autoFocus
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-gray-300" />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">
                        Bed Number
                    </label>
                    <input value={bedNumber} onChange={e => setBedNumber(e.target.value)}
                        placeholder="e.g. Bed 4"
                        className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-gray-300" />
                </div>
                <div className="col-span-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">
                        Special Instructions
                    </label>
                    <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                        placeholder="Isolation, dietary restrictions, monitoring frequency…"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-gray-300" />
                </div>
            </div>
            <button onClick={handleSave} disabled={saving || !wardName.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl disabled:opacity-50 transition-colors shadow-sm shadow-indigo-200">
                {saving
                    ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    : <><BedDouble size={14} /> {admission.ward_name ? "Update Assignment" : "Confirm Ward Assignment"}</>
                }
            </button>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdmissionDetailPage() {
    const params  = useParams();
    const router  = useRouter();
    const id      = Array.isArray(params?.id) ? params.id[0] : params?.id;

    const [admissions, setAdmissions]   = useState<PatientAdmission[] | null>(null);
    const [loading,    setLoading]      = useState(true);
    const [showForm,   setShowForm]     = useState(false);
    const [discharging,setDischarging]  = useState(false);

    // Derive staffId from auth context — simple fallback for now
    const staffId = "system";   // replace with useAuth().user?.id

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        getAdmissionsByPatient(id as string)
            .then(data => setAdmissions(data ?? []))
            .catch(() => { setAdmissions([]); toast.error("Failed to load admission details."); })
            .finally(() => setLoading(false));
    }, [id]);

    // ── Loading ──
    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
            <p className="text-sm text-gray-400">Loading admission details…</p>
        </div>
    );

    // ── Not found ──
    if (!admissions || admissions.length === 0) return (
        <div className="max-w-lg mx-auto mt-20 bg-white rounded-3xl border border-gray-100 shadow-sm p-10 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <BedDouble size={24} className="text-gray-300" />
            </div>
            <div>
                <h2 className="text-base font-bold text-gray-800">No Admission Record</h2>
                <p className="text-sm text-gray-400 mt-1">This patient has no admission records on file.</p>
            </div>
            <Link href="/front-desk/admissions"
                className="flex items-center gap-2 text-sm text-indigo-600 font-semibold hover:underline">
                <ArrowLeft size={14} /> Back to Admissions
            </Link>
        </div>
    );

    const active  = admissions.find(a => a.status === "active");
    const current = active ?? admissions[0];
    const patient = current.patients;
    const age     = calcAge(patient?.birth_date);
    const waited  = timeWaiting(current.admitted_at);
    const typeConfig   = ADMISSION_TYPE_CONFIG[current.admission_type as keyof typeof ADMISSION_TYPE_CONFIG] ?? ADMISSION_TYPE_CONFIG.ward;
    const urgencyConfig= URGENCY_CONFIG[current.urgency as keyof typeof URGENCY_CONFIG] ?? URGENCY_CONFIG.routine;
    const hasWard      = !!current.ward_name;
    const isFemale     = (patient?.gender ?? "").toLowerCase() === "female";
    const history      = admissions.slice(1);

    async function handleDischarge() {
        if (!confirm(`Discharge ${patient?.name ?? "this patient"} from ward and move to billing?`)) return;
        setDischarging(true);
        try {
            await dischargeFromWard(current.id);
            toast.success(`${patient?.name} discharged from ward → awaiting payment.`);
            router.push("/front-desk/admissions");
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to discharge.");
            setDischarging(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto py-8 space-y-5">

            {/* ── Back nav ── */}
            <Link href="/front-desk/admissions"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 font-semibold transition-colors">
                <ArrowLeft size={15} /> Admissions Queue
            </Link>

            {/* ── Patient hero ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Colour band based on urgency */}
                <div className={`h-1.5 w-full ${urgencyConfig.dot}`} />

                <div className="px-6 py-5 flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 border ${
                        isFemale ? "bg-pink-50 border-pink-100 text-pink-600" : "bg-indigo-50 border-indigo-100 text-indigo-600"
                    }`}>
                        {(patient?.name ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-lg font-black text-gray-900 truncate">{patient?.name ?? "Unknown Patient"}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5 flex-wrap">
                            {patient?.gender && <span className={isFemale ? "text-pink-500 font-medium" : "text-indigo-500 font-medium"}>{patient.gender}</span>}
                            {age             && <span>· {age}</span>}
                            {patient?.phone  && <span>· {patient.phone}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${urgencyConfig.bg} ${urgencyConfig.color} ${urgencyConfig.border}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${urgencyConfig.dot}`} />
                                {urgencyConfig.label}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${typeConfig.bg} ${typeConfig.color} ${typeConfig.border}`}>
                                {typeConfig.emoji} {typeConfig.label}
                            </span>
                            {current.status === "active" && !hasWard && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                    <Clock size={10} /> Awaiting Bed
                                </span>
                            )}
                            {hasWard && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                                    <MapPin size={10} /> {current.ward_name}{current.bed_number ? ` · ${current.bed_number}` : ""}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Admission details ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <ClipboardList size={15} className="text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800">Current Admission</p>
                        {waited && <p className="text-xs text-amber-600 font-medium">Waiting {waited}</p>}
                    </div>
                    <div className="ml-auto">
                        {current.status === "active" && (
                            <button onClick={() => setShowForm(v => !v)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                                <Edit2 size={12} /> {hasWard ? "Edit Ward" : "Assign Ward"}
                            </button>
                        )}
                    </div>
                </div>

                <div className="px-6 py-2">
                    <Field label="Admitted"     value={fmtDateTime(current.admitted_at)} highlight />
                    <Field label="Ward"         value={
                        current.ward_name
                            ? <span className="flex items-center gap-1 justify-end"><MapPin size={12} /> {current.ward_name}</span>
                            : <span className="text-amber-500 font-semibold">Not assigned yet</span>
                    } />
                    <Field label="Bed"          value={current.bed_number ?? <span className="text-gray-300">Not assigned</span>} />
                    <Field label="Type"         value={`${typeConfig.emoji} ${typeConfig.label}`} />
                    <Field label="Urgency"      value={urgencyConfig.label} />
                    <Field label="Indication"   value={current.indication} />
                    {current.notes && <Field label="Instructions" value={current.notes} />}
                    <Field label="Assigned by"  value={current.staffs?.name ?? "—"} />
                </div>

                {/* Ward assignment form */}
                {showForm && current.status === "active" && (
                    <div className="px-6 pb-5">
                        <WardForm
                            admission={current}
                            staffId={staffId}
                            onSaved={updated => {
                                setAdmissions(prev => prev
                                    ? prev.map(a => a.id === updated.id ? updated : a)
                                    : prev
                                );
                                setShowForm(false);
                            }}
                        />
                    </div>
                )}

                {/* Discharge action */}
                {current.status === "active" && hasWard && (
                    <div className="px-6 pb-5 pt-2 border-t border-gray-50">
                        <button onClick={handleDischarge} disabled={discharging}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-bold rounded-xl border border-red-200 disabled:opacity-50 transition-colors">
                            {discharging
                                ? <><Loader2 size={14} className="animate-spin" /> Processing…</>
                                : <><LogOut size={14} /> Discharge from Ward → Billing</>
                            }
                        </button>
                    </div>
                )}
            </div>

            {/* ── Previous admissions ── */}
            {history.length > 0 && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center">
                            <History size={15} className="text-gray-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">Admission History</p>
                            <p className="text-xs text-gray-400">{history.length} previous record{history.length !== 1 ? "s" : ""}</p>
                        </div>
                    </div>
                    <div className="px-6 py-4 space-y-3">
                        {history.map(adm => {
                            const uc = URGENCY_CONFIG[adm.urgency as keyof typeof URGENCY_CONFIG] ?? URGENCY_CONFIG.routine;
                            const tc = ADMISSION_TYPE_CONFIG[adm.admission_type as keyof typeof ADMISSION_TYPE_CONFIG] ?? ADMISSION_TYPE_CONFIG.ward;
                            return (
                                <div key={adm.id} className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                                    {adm.status === "discharged"
                                        ? <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
                                        : <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                    }
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-xs font-bold text-gray-700">
                                                {tc.emoji} {tc.label}
                                            </p>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${uc.bg} ${uc.color}`}>
                                                {uc.label}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                            {fmtDate(adm.admitted_at)}
                                            {adm.discharged_at ? ` → ${fmtDate(adm.discharged_at)}` : ""}
                                            {adm.ward_name ? ` · ${adm.ward_name}` : ""}
                                            {adm.bed_number ? ` ${adm.bed_number}` : ""}
                                        </p>
                                        {adm.indication && (
                                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{adm.indication}</p>
                                        )}
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                        adm.status === "discharged"
                                            ? "bg-green-50 text-green-700"
                                            : "bg-amber-50 text-amber-700"
                                    }`}>
                                        {adm.status}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}