"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { useLabRequestsByPatient, useUpdateLabRequest } from "@/hooks/emr/use-emr";
import { usePatient } from "@/hooks/emr/use-patients";
import {
    Loader2, CheckCircle2, Upload,
    AlertCircle, FileText, Microscope,
    Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { useLabStore } from "@/store/lab-store";
import TestTemplateForm from "./TestTemplateForm";
import { displayHospitalNumber, getPatientHospitalNumber } from "@/lib/hospital-number";
import { fmtDate } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

interface LabResultUploadFormProps {
    patientId: string;
    onSuccess?: () => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    routine: { label: "Routine", color: "text-gray-600", bg: "bg-gray-100", dot: "bg-gray-400" },
    urgent: { label: "Urgent", color: "text-amber-700", bg: "bg-amber-50", dot: "bg-amber-500" },
    stat: { label: "STAT", color: "text-red-700", bg: "bg-red-50", dot: "bg-red-500" },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
            <div className="text-sm font-semibold text-gray-800">{value ?? "—"}</div>
        </div>
    );
}

// ─── Single request form ──────────────────────────────────────────────────────

function RequestForm({ req, onSuccess, patient }: { req: any; onSuccess?: () => void; patient?: any }) {
    const router = useRouter();
    const { user } = useAuth();

    const { mutate: updateLabRequest, isPending: completing } = useUpdateLabRequest();

    const { uploadExpanded, toggleUploadExpanded } = useLabStore();
    const expanded = uploadExpanded[req.id] ?? true;

    const [resultFile, setResultFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    const priorityCfg = PRIORITY_CONFIG[req.priority ?? "routine"] ?? PRIORITY_CONFIG.routine;

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) {
            setFileError("File must be under 20MB");
            return;
        }
        setResultFile(file);
        setFileError(null);
    };

    const handleTemplateSubmit = async (resultString: string) => {
        updateLabRequest(
            {
                id: req.id,
                updates: {
                    status: "completed",
                    result: resultString,
                    completed_by: user?.$id,
                    completed_at: new Date().toISOString(),
                },
            },
            {
                onSuccess: () => {
                    toast.success("Results submitted successfully.");
                    onSuccess ? onSuccess() : setTimeout(() => router.back(), 1200);
                },
                onError: (err: any) => {
                    toast.error(err?.message ?? "Failed to submit results. Please try again.");
                },
            }
        );
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

            {/* ── Request header ── */}
            <button
                type="button"
                onClick={() => toggleUploadExpanded(req.id)}
                className="w-full flex items-center justify-between px-6 py-5 border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                        <Clock size={16} className="text-amber-600" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold text-gray-800">{req.test_type ?? "Lab Test"}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Requested {req.created_at
                                ? fmtDate(req.created_at)
                                : "—"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${priorityCfg.bg} ${priorityCfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
                        {priorityCfg.label}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700">
                        Pending
                    </span>
                    {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
            </button>

            {/* Doctor notes */}
            {req.notes && (
                <div className="px-6 py-3 bg-blue-50/50 border-b border-blue-100/60">
                    <p className="text-xs text-blue-700">
                        <span className="font-bold">Doctor&apos;s note:</span> {req.notes}
                    </p>
                </div>
            )}

            {/* ── Expandable form ── */}
            {expanded && (
                <div className="space-y-4 p-6">

                    {/* Test info strip */}
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 px-5 py-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Test Information</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <InfoItem label="Test Type" value={req.test_type ?? "—"} />
                            <InfoItem label="Priority"
                                value={
                                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${priorityCfg.bg} ${priorityCfg.color}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
                                        {priorityCfg.label}
                                    </span>
                                }
                            />
                            <InfoItem label="Hospital No." value={<span className="font-mono text-xs">{displayHospitalNumber(getPatientHospitalNumber(patient))}</span>} />
                            <InfoItem label="Request Date" value={req.created_at
                                ? fmtDate(req.created_at)
                                : "—"} />
                        </div>
                    </div>

                    {/* Template-based form */}
                    <TestTemplateForm
                        testType={req.test_type ?? ""}
                        onSubmit={handleTemplateSubmit}
                        submitting={completing}
                        patient={{
                            age: patient?.birth_date
                                ? Math.max(0, (Date.now() - new Date(patient.birth_date).getTime()) / (365.25 * 86400000))
                                : null,
                            gender: patient?.gender ?? null,
                            name: patient?.name ?? null,
                        }}
                        sampleId={req.visit_id ?? null}
                    />

                    {/* File upload */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-50">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                <Upload size={15} className="text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">Attach Report (Optional)</p>
                                <p className="text-xs text-gray-400 mt-0.5">PDF, DOC, JPG or PNG — max 20MB</p>
                            </div>
                        </div>
                        <div className="px-6 py-4">
                            <label htmlFor={`resultFile-${req.id}`}
                                className={`flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all
                                    ${resultFile ? "border-indigo-300 bg-indigo-50/40" : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30"}`}
                            >
                                {resultFile ? (
                                    <>
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                            <FileText size={18} className="text-indigo-600" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-indigo-700">{resultFile.name}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{(resultFile.size / 1024).toFixed(0)} KB — click to change</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
                                            <Upload size={18} className="text-gray-400" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-semibold text-gray-600">Click to upload a file</p>
                                            <p className="text-xs text-gray-400 mt-0.5">or drag and drop</p>
                                        </div>
                                    </>
                                )}
                            </label>
                            <input id={`resultFile-${req.id}`} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={handleFile} disabled={completing} className="hidden" />
                            {fileError && (
                                <p className="flex items-center gap-1 text-[10px] text-red-500 font-semibold mt-2">
                                    <AlertCircle size={10} /> {fileError}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Info banner */}
                    <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
                        <AlertCircle size={13} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                            After submitting, the patient status will be updated automatically. Ensure all results are accurate before submission.
                        </p>
                    </div>

                    {/* Cancel */}
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => router.back()} disabled={completing}
                            className="px-5 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LabResultUploadForm({ patientId, onSuccess }: LabResultUploadFormProps) {
    const { data, isLoading: loading, error } = useLabRequestsByPatient(patientId);
    const { data: patient } = usePatient(patientId);

    const pendingRequests = data?.filter((r: any) => r.status === "pending") ?? [];

    // ── Loading ──
    if (loading) return (
        <div className="space-y-5">
            <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
                    <Microscope size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 leading-tight">Lab Result Upload</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Record and submit test findings</p>
                </div>
            </div>
            <div className="flex items-center justify-center py-16 bg-white rounded-3xl border border-gray-100 gap-3">
                <Loader2 size={18} className="text-indigo-500 animate-spin" />
                <p className="text-sm text-gray-400 font-medium">Loading lab requests...</p>
            </div>
        </div>
    );

    // ── Error ──
    if (error) return (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-gray-100 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-500" />
            </div>
            <p className="text-sm font-semibold text-gray-600">Failed to load lab requests</p>
        </div>
    );

    // ── No pending requests ──
    if (!pendingRequests.length) return (
        <div className="space-y-5">
            <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
                    <Microscope size={20} className="text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 leading-tight">Lab Result Upload</h1>
                    <p className="text-sm text-gray-400 mt-0.5">Record and submit test findings</p>
                </div>
            </div>
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-gray-100 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-green-50 border border-green-100 flex items-center justify-center">
                    <CheckCircle2 size={22} className="text-green-500" />
                </div>
                <div className="text-center">
                    <p className="text-sm font-semibold text-gray-600">No pending lab requests</p>
                    <p className="text-xs text-gray-400 mt-1">All tests for this patient have been completed</p>
                </div>
            </div>
        </div>
    );

    // ── Pending requests ── with patient header
    const patientName = (patient as any)?.name ?? null;
    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
                        <Microscope size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 leading-tight">Lab Result Upload</h1>
                        <p className="text-sm text-gray-400 mt-0.5">Record and submit test findings</p>
                        {patientName && (
                            <p className="text-xs font-semibold text-indigo-700 mt-0.5 flex items-center gap-1.5">
                                <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100">{displayHospitalNumber(getPatientHospitalNumber(patient))}</span>
                                {patientName} { (patient as any)?.phone ? `• ${(patient as any).phone}` : ""}
                            </p>
                        )}
                    </div>
                </div>
                {pendingRequests.length > 1 && (
                    <span className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                        {pendingRequests.length} pending
                    </span>
                )}
            </div>
            {patientName && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 px-4 py-3 flex flex-wrap items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center text-white font-black text-xs shrink-0">
                        {patientName.split(" ").map((n:string)=>n[0]).slice(0,2).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900">{patientName}</p>
                        <p className="text-xs text-gray-600 flex flex-wrap gap-2">
                            <span className="font-mono">HN: {displayHospitalNumber(getPatientHospitalNumber(patient))}</span>
                            { (patient as any)?.gender && <><span>•</span> {(patient as any).gender}</>}
                            { (patient as any)?.phone && <><span>•</span> {(patient as any).phone}</>}
                        </p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-white border border-indigo-100 text-indigo-700">
                        {pendingRequests.length} test{pendingRequests.length!==1?"s":""} pending
                    </span>
                </div>
            )}

            <div className="space-y-4">
                {pendingRequests.map((req: any) => (
                    <RequestForm key={req.id} req={req} onSuccess={onSuccess} patient={patient as any} />
                ))}
            </div>
        </div>
    );
}
