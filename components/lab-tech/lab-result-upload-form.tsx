"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { useLabRequestsByPatient, useUpdateLabRequest } from "@/hooks/emr/use-emr";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Loader2, CheckCircle2, Upload, FlaskConical,
    AlertCircle, FileText, Microscope, ClipboardList,
    StickyNote, ArrowRight, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

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

function FieldCard({ icon, label, helper, required, children }: {
    icon: React.ReactNode; label: string; helper?: string;
    required?: boolean; children: React.ReactNode;
}) {
    return (
        <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all duration-150 overflow-hidden">
            <div className="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-50">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 group-focus-within:bg-indigo-100 transition-colors">
                    {icon}
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-800">
                        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                    </p>
                    {helper && <p className="text-xs text-gray-400 mt-0.5">{helper}</p>}
                </div>
            </div>
            <div className="px-6 py-4">{children}</div>
            <div className="h-0.5 w-0 group-focus-within:w-full bg-indigo-500 transition-all duration-300 ease-out" />
        </div>
    );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
            <div className="text-sm font-semibold text-gray-800">{value ?? "—"}</div>
        </div>
    );
}

// ─── Single request form ──────────────────────────────────────────────────────

function RequestForm({ req, onSuccess }: { req: any; onSuccess?: () => void }) {
    const router = useRouter();
    const { user } = useAuth();

    // FIX: hook takes no arguments; isPending renamed to `completing` to match
    // all the existing disabled/loading references in the JSX below.
    const { mutate: updateLabRequest, isPending: completing } = useUpdateLabRequest();

    const [form, setForm] = useState({
        results: "", normalRange: "", interpretation: "", remarks: "",
        resultFile: null as File | null,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [expanded, setExpanded] = useState(true);

    const priorityCfg = PRIORITY_CONFIG[req.priority ?? "routine"] ?? PRIORITY_CONFIG.routine;

    const update = (field: string, val: string) => {
        setForm((p) => ({ ...p, [field]: val }));
        setErrors((p) => { const n = { ...p }; delete n[field]; return n; });
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            setErrors((p) => ({ ...p, resultFile: "File must be under 10MB" }));
            return;
        }
        setForm((p) => ({ ...p, resultFile: file }));
        setErrors((p) => { const n = { ...p }; delete n.resultFile; return n; });
    };

    const validate = () => {
        const errs: Record<string, string> = {};
        if (!form.results.trim()) errs.results = "Required";
        if (!form.interpretation.trim()) errs.interpretation = "Required";
        setErrors(errs);
        return !Object.keys(errs).length;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) { toast.error("Please fill all required fields."); return; }

        const combinedResult = [
            `Test Type: ${req.test_type ?? "Lab Test"}`,
            `Date: ${new Date().toLocaleDateString("en-GB")}`,
            `\nResults:\n${form.results}`,
            form.normalRange ? `\nNormal Range:\n${form.normalRange}` : null,
            `\nInterpretation:\n${form.interpretation}`,
            form.remarks ? `\nRemarks:\n${form.remarks}` : null,
        ].filter(Boolean).join("\n");

        updateLabRequest(
            {
                id: req.id,
                updates: {
                    status: "completed",
                    result: combinedResult,
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
                onClick={() => setExpanded((v) => !v)}
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
                                ? new Date(req.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
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
                        <span className="font-bold">Doctor's note:</span> {req.notes}
                    </p>
                </div>
            )}

            {/* ── Expandable form ── */}
            {expanded && (
                <form onSubmit={handleSubmit} className="space-y-4 p-6">

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
                            <InfoItem label="Patient ID" value={<span className="font-mono text-xs">{req.visit_id?.slice(-8) ?? "—"}</span>} />
                            <InfoItem label="Request Date" value={req.created_at
                                ? new Date(req.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                                : "—"} />
                        </div>
                    </div>

                    <FieldCard icon={<ClipboardList size={16} className="text-indigo-600" />} label="Test Results" helper="Enter all measured values and findings in detail." required>
                        <Textarea
                            placeholder="e.g. WBC: 7.5K/μL, RBC: 4.8M/μL, Haemoglobin: 14.2 g/dL, Platelets: 250K/μL..."
                            value={form.results}
                            onChange={(e) => update("results", e.target.value)}
                            rows={5}
                            disabled={completing}
                            className={`text-sm border-0 bg-transparent resize-none focus-visible:ring-0 placeholder:text-gray-300 p-0 ${errors.results ? "text-red-600" : "text-gray-800"}`}
                        />
                        {errors.results && <p className="flex items-center gap-1 text-[10px] text-red-500 font-semibold mt-1"><AlertCircle size={10} /> {errors.results}</p>}
                    </FieldCard>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FieldCard icon={<FlaskConical size={16} className="text-indigo-600" />} label="Normal Range" helper="Reference range for this test.">
                            <Input placeholder="e.g. 4.5K – 11K/μL" value={form.normalRange}
                                onChange={(e) => update("normalRange", e.target.value)} disabled={completing}
                                className="text-sm border-0 bg-transparent focus-visible:ring-0 placeholder:text-gray-300 p-0 h-auto" />
                        </FieldCard>
                        <FieldCard icon={<StickyNote size={16} className="text-indigo-600" />} label="Additional Remarks" helper="Optional observations or follow-up notes.">
                            <Input placeholder="e.g. Repeat test recommended in 48hrs" value={form.remarks}
                                onChange={(e) => update("remarks", e.target.value)} disabled={completing}
                                className="text-sm border-0 bg-transparent focus-visible:ring-0 placeholder:text-gray-300 p-0 h-auto" />
                        </FieldCard>
                    </div>

                    <FieldCard icon={<Microscope size={16} className="text-indigo-600" />} label="Clinical Interpretation" helper="Your professional interpretation of the findings." required>
                        <Textarea
                            placeholder="e.g. Results indicate mild leukocytosis. Suggest clinical correlation with symptoms. No evidence of anaemia..."
                            value={form.interpretation}
                            onChange={(e) => update("interpretation", e.target.value)}
                            rows={4}
                            disabled={completing}
                            className={`text-sm border-0 bg-transparent resize-none focus-visible:ring-0 placeholder:text-gray-300 p-0 ${errors.interpretation ? "text-red-600" : "text-gray-800"}`}
                        />
                        {errors.interpretation && <p className="flex items-center gap-1 text-[10px] text-red-500 font-semibold mt-1"><AlertCircle size={10} /> {errors.interpretation}</p>}
                    </FieldCard>

                    {/* File upload */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-50">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                <Upload size={15} className="text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-800">Attach Report</p>
                                <p className="text-xs text-gray-400 mt-0.5">PDF, DOC, JPG or PNG — max 10MB</p>
                            </div>
                        </div>
                        <div className="px-6 py-4">
                            <label htmlFor={`resultFile-${req.id}`}
                                className={`flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all
                                    ${form.resultFile ? "border-indigo-300 bg-indigo-50/40" : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30"}`}
                            >
                                {form.resultFile ? (
                                    <>
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                                            <FileText size={18} className="text-indigo-600" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-indigo-700">{form.resultFile.name}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{(form.resultFile.size / 1024).toFixed(0)} KB — click to change</p>
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
                            {errors.resultFile && (
                                <p className="flex items-center gap-1 text-[10px] text-red-500 font-semibold mt-2">
                                    <AlertCircle size={10} /> {errors.resultFile}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Info banner */}
                    <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
                        <AlertCircle size={13} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                            After submitting, the patient will automatically be moved to <strong>Awaiting Payment</strong>. Ensure all results are accurate before submission.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => router.back()} disabled={completing}
                            className="px-5 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={completing}
                            className="flex-1 h-12 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                            {completing
                                ? <><Loader2 size={16} className="animate-spin" /> Submitting Results...</>
                                : <><CheckCircle2 size={16} /> Submit Results <ArrowRight size={15} /></>
                            }
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LabResultUploadForm({ patientId, onSuccess }: LabResultUploadFormProps) {
    const { data, isLoading: loading, error } = useLabRequestsByPatient(patientId);

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

    // ── Pending requests ──
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
                    </div>
                </div>
                {pendingRequests.length > 1 && (
                    <span className="text-xs font-bold px-2.5 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                        {pendingRequests.length} pending
                    </span>
                )}
            </div>

            <div className="space-y-4">
                {pendingRequests.map((req: any) => (
                    <RequestForm key={req.id} req={req} onSuccess={onSuccess} />
                ))}
            </div>
        </div>
    );
}