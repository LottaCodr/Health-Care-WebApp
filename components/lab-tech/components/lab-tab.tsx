"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { toast } from "sonner";
import { useLabRequestsByPatient, useUpdateLabRequest, useCreatePayment } from "@/hooks/emr/use-emr";
import {
    FlaskConical, ClipboardList, CheckCircle2,
    Clock, Loader2, AlertTriangle, FileText, Beaker,
    Hash, Calendar, User, Phone, Droplets, Activity,
    ChevronDown, ChevronUp, Stethoscope, Search,
} from "lucide-react";
import { Patient } from "@/types/models";
import { AILabInterpretation } from "@/components/ai/AIComponents";
import TestTemplateForm from "../TestTemplateForm";
import { calculateAge } from "@/utils/export";

// ─── Priority badge ───────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string; border: string }> = {
    routine: { label: "Routine", color: "text-gray-600", bg: "bg-gray-100", dot: "bg-gray-400", border: "border-gray-200" },
    urgent: { label: "Urgent", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500", border: "border-amber-200" },
    stat: { label: "STAT", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500", border: "border-red-200" },
};

function PriorityBadge({ priority }: { priority?: string }) {
    const cfg = PRIORITY_CONFIG[priority ?? "routine"] ?? PRIORITY_CONFIG.routine;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
        </span>
    );
}

// ─── Structured result parser ──────────────────────────────────────────────────

function parseStructuredResult(result?: string) {
    if (!result) return null;
    const lines = result.split("\n");
    // Find header row
    const headerIdx = lines.findIndex(l => l.includes("TEST NAME") && l.includes("RESULT"));
    if (headerIdx === -1) {
        // Free text
        return { type: "free" as const, text: result };
    }
    const category = lines[0]?.trim() ?? "";
    const name = lines[1]?.trim() ?? "";
    const separatorIdx = headerIdx + 1;
    const rows: { label: string; value: string; ref: string; unit: string }[] = [];
    let note: string | null = null;
    for (let i = separatorIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (line.startsWith("Note:")) { note = line.replace("Note:", "").trim(); break; }
        if (line.startsWith("Additional Notes")) { note = lines.slice(i).join("\n"); break; }
        const parts = lines[i].split("\t");
        if (parts.length >= 2) {
            rows.push({
                label: parts[0]?.trim() ?? "",
                value: parts[1]?.trim() ?? "",
                ref: parts[2]?.trim() ?? "—",
                unit: parts[3]?.trim() ?? "",
            });
        }
    }
    // Also check for additional notes at end
    const additionalIdx = lines.findIndex(l => l.includes("Additional Notes"));
    if (additionalIdx !== -1) {
        note = (note ? note + "\n\n" : "") + lines.slice(additionalIdx).join("\n");
    }
    return { type: "structured" as const, category, name, rows, note };
}

function StructuredResultDisplay({ result }: { result?: string }) {
    const parsed = parseStructuredResult(result);
    if (!parsed) return <p className="text-xs text-gray-400 italic">No result text recorded.</p>;
    if (parsed.type === "free") {
        return (
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                {parsed.text}
            </pre>
        );
    }
    const { category, name, rows, note } = parsed;
    return (
        <div className="space-y-3">
            {(category || name) && (
                <div className="flex items-center gap-2">
                    {category && <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">{category}</span>}
                    {name && <span className="text-xs font-bold text-gray-800">{name}</span>}
                </div>
            )}
            {rows.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-gray-500">Test</th>
                                <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-gray-500">Result</th>
                                <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-gray-500 hidden sm:table-cell">Ref. Range</th>
                                <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-gray-500">Unit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {rows.map((r, i) => (
                                <tr key={i} className="hover:bg-gray-50/50">
                                    <td className="px-3 py-2.5 font-semibold text-gray-800">{r.label}</td>
                                    <td className="px-3 py-2.5 font-bold text-indigo-700">{r.value || "—"}</td>
                                    <td className="px-3 py-2.5 text-gray-500 hidden sm:table-cell">{r.ref}</td>
                                    <td className="px-3 py-2.5 text-gray-500 font-mono text-[11px]">{r.unit || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-xs text-gray-400 italic">No structured values recorded.</p>
            )}
            {note && (
                <div className="px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                    <p className="text-xs text-blue-800 whitespace-pre-wrap leading-relaxed">{note}</p>
                </div>
            )}
        </div>
    );
}

// ─── Completed result card - properly arranged ───────────────────────────────────

function LabResultCard({ req, patient }: { req: any, patient: Patient }) {
    const age = patient?.birth_date ? calculateAge(patient.birth_date) : undefined;
    const completedDate = req.completed_at ? new Date(req.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
    const completedTime = req.completed_at ? new Date(req.completed_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "";
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className="px-5 py-4 border-b border-gray-50 bg-gradient-to-r from-green-50/50 to-white">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-green-500 flex items-center justify-center shrink-0 shadow-sm">
                            <CheckCircle2 size={16} className="text-white" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-bold text-gray-900">{req.test_type ?? "Lab Test"}</p>
                                <PriorityBadge priority={req.priority} />
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Completed
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Calendar size={11} className="text-gray-400" /> {completedDate} {completedTime && `• ${completedTime}`}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-600">#{req.visit_id?.slice(-6) ?? req.id.slice(-6)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-5 py-4 space-y-4">
                {req.result ? (
                    <>
                        <div className="flex items-center gap-2">
                            <ClipboardList size={12} className="text-indigo-500" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Structured Results</p>
                            <span className="ml-auto text-[10px] text-gray-400 flex items-center gap-1">
                                <Beaker size={10} /> {req.test_type}
                            </span>
                        </div>
                        <StructuredResultDisplay result={req.result} />
                        <AILabInterpretation testType={req.test_type} result={req.result}
                            patientAge={age} patientGender={patient?.gender} />
                    </>
                ) : (
                    <p className="text-xs text-gray-400 italic">No result text recorded.</p>
                )}

                {req.notes && (
                    <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50/60 border border-blue-100/60 rounded-xl">
                        <Stethoscope size={12} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                            <span className="font-bold">Doctor&apos;s note:</span> {req.notes}
                        </p>
                    </div>
                )}

                {/* Patient context footer */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-50 text-[11px] text-gray-500">
                    <span className="inline-flex items-center gap-1">
                        <User size={11} /> {patient.name}
                    </span>
                    {patient.gender && <span>• {patient.gender}</span>}
                    {age !== undefined && <span>• {age} yrs</span>}
                    {patient.phone && <span className="flex items-center gap-1"><Phone size={10} /> {patient.phone}</span>}
                </div>
            </div>
        </div>
    );
}

// ─── Pending row (read-only — non-lab-tech roles) ─────────────────────────────

function PendingCard({ req }: { req: any }) {
    return (
        <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
            <div className="h-1 w-full bg-amber-400" />
            <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                        <Clock size={15} className="text-amber-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-800">{req.test_type ?? "Lab Test"}</p>
                            <PriorityBadge priority={req.priority} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                            <Calendar size={11} /> Requested {req.created_at ? new Date(req.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                            {req.notes && <span className="text-blue-600 italic hidden sm:inline">• &quot;{req.notes}&quot;</span>}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                        Awaiting Results
                    </span>
                </div>
            </div>
            {req.notes && (
                <div className="px-5 pb-4 sm:hidden">
                    <div className="px-3 py-2 bg-blue-50/60 rounded-xl border border-blue-100/60">
                        <p className="text-xs text-blue-700">
                            <span className="font-bold">Doctor&apos;s note:</span> {req.notes}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Pending row WITH inline result entry (lab-tech role) ─────────────────────

function LabTechPendingRow({ req, patientId, onSubmitted }: { req: any; patientId: string; onSubmitted: () => void }) {
    const { user } = useAuth();
    const { mutate: updateLabRequest, isPending: saving } = useUpdateLabRequest();
    const { mutate: createPayment } = useCreatePayment();
    const [open, setOpen] = useState(false);
    const [price, setPrice] = useState("");

    function handleSubmit(resultString: string) {
        updateLabRequest(
            {
                id: req.id,
                updates: {
                    status: "completed",
                    result: resultString,
                    completed_by: user?.$id ?? user?.id,
                    completed_at: new Date().toISOString(),
                },
            },
            {
                onSuccess: () => { 
                    if (Number(price) > 0) {
                        createPayment({
                            patient_id: patientId,
                            amount: Number(price),
                            description: `Lab Test: ${req.test_type ?? "Unknown"}`,
                            category: "lab",
                            status: "pending",
                            processed_by: user?.$id ?? user?.id,
                        });
                    }
                    toast.success("Result submitted."); 
                    setOpen(false); 
                    setPrice("");
                    onSubmitted(); 
                },
                onError: () => toast.error("Failed to submit result."),
            }
        );
    }

    return (
        <div className={`rounded-2xl border overflow-hidden transition-all ${open ? "border-indigo-300 bg-indigo-50/20 shadow-sm" : "border-amber-200 bg-white hover:border-indigo-200"}`}>
            <div className="h-1 w-full bg-amber-400" />
            <div className="flex items-center gap-3 px-5 py-4">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                    <Clock size={15} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-800">{req.test_type ?? "Lab Test"}</p>
                        <PriorityBadge priority={req.priority} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar size={11} /> {req.created_at ? new Date(req.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                        </p>
                        {req.notes && <p className="text-xs text-blue-600 italic line-clamp-1">&quot;{req.notes}&quot;</p>}
                    </div>
                </div>
                <button onClick={() => setOpen(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${open ? "bg-gray-100 hover:bg-gray-200 text-gray-600" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200"}`}>
                    {open ? <><ChevronUp size={12} /> Cancel</> : <><FileText size={11} /> Enter Result</>}
                </button>
            </div>

            {open && (
                <div className="px-5 pb-5 pt-4 space-y-4 border-t border-indigo-100 bg-white">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <Beaker size={13} className="text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-indigo-700">Result for {req.test_type}</p>
                            <p className="text-[11px] text-gray-400">Structured template • reference ranges • interpretation guides</p>
                        </div>
                    </div>

                    {/* Optional price → creates billing */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
                            <span>Test Price (NGN)</span> <span className="text-gray-300 font-normal normal-case">(Optional • creates billing)</span>
                        </label>
                        <div className="relative w-full sm:w-1/2">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">₦</span>
                            <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)}
                                placeholder="e.g. 5000"
                                className="w-full h-10 pl-7 pr-3 text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all" />
                        </div>
                    </div>

                    {/* Structured template form — same as the lab tech dashboard */}
                    <TestTemplateForm
                        testType={req.test_type ?? ""}
                        submitting={saving}
                        onSubmit={async (resultString) => handleSubmit(resultString)}
                    />

                    <div className="flex justify-end pt-1">
                        <button onClick={() => { setOpen(false); setPrice(""); }}
                            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    patient: Patient;
    userRole?: string;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LabTab({ patient, userRole }: Props) {
    const { data: labRequests, isLoading: loading, error, refetch } = useLabRequestsByPatient(patient.id ?? "");

    const isLabTech = userRole === "Labtech" || userRole === "LabTechnician" || userRole?.toLowerCase().includes("lab");
    const pendingRequests = labRequests?.filter((r: any) => r.status === "pending") ?? [];
    const completedRequests = labRequests?.filter((r: any) => r.status === "completed") ?? [];

    return (
        <div className="space-y-6">

            {/* Patient header summary - important details visible */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 p-4 flex flex-wrap items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white font-black shadow-sm shrink-0">
                    {patient.name ? patient.name.split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase() : <User size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{patient.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white border border-indigo-100 text-indigo-700">
                            <Hash size={10} /> {patient.id?.slice(-8).toUpperCase() ?? "—"}
                        </span>
                        {patient.gender && <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">{patient.gender}</span>}
                        {patient.birth_date && <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">{calculateAge(patient.birth_date)} yrs</span>}
                        {patient.phone && <span className="text-xs text-gray-600 flex items-center gap-1"><Phone size={10} className="text-gray-400" /> {patient.phone}</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {pendingRequests.length > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                            {pendingRequests.length} pending
                        </span>
                    )}
                    {completedRequests.length > 0 && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                            {completedRequests.length} completed
                        </span>
                    )}
                </div>
            </div>

            {/* ── Section header ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0 border border-sky-100">
                        <FlaskConical size={17} className="text-sky-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 leading-tight">Lab Results</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Laboratory investigations • structured • properly arranged</p>
                    </div>
                </div>
            </div>

            {/* ── Loading ── */}
            {loading && (
                <div className="flex items-center justify-center py-12 bg-white rounded-2xl border border-gray-100 gap-3">
                    <Loader2 size={18} className="text-sky-500 animate-spin" />
                    <p className="text-sm text-gray-400 font-medium">Loading lab requests...</p>
                </div>
            )}

            {/* ── Error ── */}
            {error && !loading && (
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-gray-100 gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                        <AlertTriangle size={20} className="text-red-500" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600">Failed to load lab requests</p>
                </div>
            )}

            {/* ── Empty ── */}
            {!loading && !error && !labRequests?.length && (
                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-gray-100 gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <FlaskConical size={20} className="text-gray-300" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-gray-500">No lab requests yet</p>
                        <p className="text-xs text-gray-400 mt-1">Lab requests appear here after a doctor refers the patient</p>
                    </div>
                </div>
            )}

            {/* ── Pending section ── */}
            {!loading && pendingRequests.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <Clock size={12} className="text-amber-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Pending Tests {isLabTech && `(${pendingRequests.length})`}
                        </p>
                        <div className="flex-1 h-px bg-amber-100 ml-2" />
                    </div>
                    {isLabTech
                        ? pendingRequests.map((req: any) => (
                              <LabTechPendingRow key={req.id} req={req} patientId={patient.id} onSubmitted={() => setTimeout(() => refetch(), 0)} />
                          ))
                        : pendingRequests.map((req: any) => <PendingCard key={req.id} req={req} />)
                    }
                </div>
            )}

            {/* ── Completed section ── */}
            {!loading && completedRequests.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <CheckCircle2 size={12} className="text-green-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Completed Results • Structured & Arranged</p>
                        <div className="flex-1 h-px bg-green-100 ml-2" />
                    </div>
                    <div className="space-y-4">
                        {completedRequests.map((req: any) => <LabResultCard key={req.id} req={req} patient={patient} />)}
                    </div>
                </div>
            )}
        </div>
    );
}
