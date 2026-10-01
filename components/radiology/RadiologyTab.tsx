"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { toast } from "sonner";
import {
    useRadiologyRequestsByPatient,
    useSubmitRadiologyReport,
    useUpdatePatientStatus,
    usePatientPackages,
} from "@/hooks/emr/use-emr";
import { stripRadiologyPrefix } from "@/lib/utils";
import { formatNaira, templatesForScan } from "@/lib/utils/radiology-catalog";
import { describeAllowance, isEnrolmentActive } from "@/lib/utils/care-packages";
import {
    Radio, CheckCircle2, Clock, FileText,
    Loader2, AlertTriangle, ChevronDown, Plus, Package,
    CreditCard, Sparkles,
} from "lucide-react";
import type { Patient } from "@/types/models";
import { useRadiologyStore } from "@/store/radiology-store";
import { RecordAmendmentControls } from "@/components/records";
import RequestScanDialog from "./RequestScanDialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
    routine: { label: "Routine", color: "text-gray-600", bg: "bg-gray-100", border: "border-gray-200", dot: "bg-gray-400" },
    urgent: { label: "Urgent", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
    stat: { label: "STAT", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500" },
};

function PriorityBadge({ priority }: { priority?: string }) {
    const cfg = PRIORITY_CONFIG[priority ?? "routine"] ?? PRIORITY_CONFIG.routine;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

function fmtDate(iso?: string) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
    });
}

/**
 * How the scan was settled. A covered scan must be visibly NOT billed, so the
 * doctor and the desk never charge an antenatal patient for a scan their
 * prepaid package already includes.
 */
function BillingBadge({ request }: { request: any }) {
    const covered = request.billing_status === "covered";
    const amount = typeof request.price === "number" ? request.price : null;

    if (covered) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Package size={9} /> Covered by package
            </span>
        );
    }
    if (amount === null) return null;
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <CreditCard size={9} /> {amount > 0 ? formatNaira(amount) : "₦0 — price at desk"}
        </span>
    );
}

// ─── Active care packages strip ───────────────────────────────────────────────

function PackageStrip({ patientId }: { patientId: string }) {
    const { data } = usePatientPackages(patientId);
    const enrolments = (data?.enrolments ?? []).filter((e: any) => isEnrolmentActive(e));
    if (!enrolments.length) return null;

    return (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 space-y-2">
            {enrolments.map((e: any) => {
                const pkg = e.care_packages ?? null;
                const scanItem = (pkg?.items ?? []).find((i: any) => i.item_kind === "radiology_scan");
                const used = (data?.usage ?? []).filter(
                    (u: any) => u.enrolment_id === e.id && (!u.item_kind || u.item_kind === "radiology_scan")
                ).length;

                return (
                    <div key={e.id} className="flex items-start gap-2.5">
                        <Package size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-emerald-900">
                                {pkg?.name ?? "Prepaid care package"}
                                <span className="font-medium text-emerald-700">
                                    {" "}· {scanItem ? describeAllowance(scanItem.included_quantity, used, "scan") : "active"}
                                </span>
                            </p>
                            <p className="text-[11px] text-emerald-700 mt-0.5">
                                Scans requested on this package are covered by it and are not billed again.
                                {e.expires_on ? ` Valid until ${fmtDate(e.expires_on)}.` : ""}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Inline report form ───────────────────────────────────────────────────────

/**
 * The report is ONE free-text field: the clinician types the observations.
 * Templates only pre-fill that field — they are starting points for the two
 * scans the unit performs, never a substitute for the findings.
 */
function InlineReportForm({
    request,
    patientId,
    onClose,
}: {
    request: any;
    patientId: string;
    onClose: () => void;
}) {
    const { user } = useAuth();
    const { mutate: submitReport, isPending: saving } = useSubmitRadiologyReport();
    const { mutate: updateStatus } = useUpdatePatientStatus();

    const { inlineForms, setInlineFormField, clearInlineForm } = useRadiologyStore();
    const form = inlineForms[request.id] || { resultText: "", isCritical: false, criticalNote: "" };
    const observations = form.resultText ?? "";

    const templates = templatesForScan(stripRadiologyPrefix(request.test_type));

    const appendTemplate = (text: string) => {
        const current = observations.trim();
        setInlineFormField(
            request.id,
            "resultText",
            current ? `${current}\n\n${text}` : text
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!observations.trim()) { toast.error("Enter the observations before filing the report."); return; }

        submitReport(
            {
                id: request.id,
                report: {
                    status: "completed",
                    result: observations.trim(),
                    completed_by: user?.id ?? user?.$id ?? "",
                    completed_at: new Date().toISOString(),
                },
            },
            {
                onSuccess: () => {
                    updateStatus(
                        { id: patientId, status: "awaiting-consultation" as any },
                        { onError: () => toast.error("Report saved, but patient status could not be updated.") }
                    );
                    toast.success("Report filed and the patient is back in the doctor's queue.");
                    clearInlineForm(request.id);
                    onClose();
                },
                onError: (err: any) => toast.error(err?.message ?? "Failed to submit report."),
            }
        );
    };

    return (
        <form onSubmit={handleSubmit} className="border-t border-cyan-100 bg-cyan-50/20 px-4 py-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600">
                    Enter Report
                </p>
                <p className="text-[10px] text-gray-400">
                    Filed by you · editable for 24 hours, then corrections are added as notes
                </p>
            </div>

            {/* Quick templates */}
            {templates.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    <Sparkles size={11} className="text-cyan-500" />
                    {templates.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => appendTemplate(t.text)}
                            className="px-2 py-1 rounded-lg bg-white border border-cyan-100 text-[10px] font-bold text-cyan-700 hover:bg-cyan-50 transition-colors"
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Observations <span className="text-red-500">*</span>
                </p>
                <textarea
                    rows={10}
                    value={observations}
                    onChange={(e) => setInlineFormField(request.id, "resultText", e.target.value)}
                    placeholder={"Type the observations…\n\nUterus: …\nEndometrium: …\nOvaries: …\n\nIMPRESSION: …"}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 focus:border-cyan-400 resize-y transition-all leading-relaxed"
                />
            </div>

            <div className="flex gap-2">
                <button type="button" onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600 transition-colors">
                    Cancel
                </button>
                <button type="submit" disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-sm shadow-cyan-200 transition-all disabled:opacity-60">
                    {saving
                        ? <><Loader2 size={12} className="animate-spin" /> Filing…</>
                        : <><CheckCircle2 size={12} /> File Report</>
                    }
                </button>
            </div>
        </form>
    );
}

// ─── Pending request row ──────────────────────────────────────────────────────

function PendingRow({
    request,
    patientId,
    canReport,
}: {
    request: any;
    patientId: string;
    canReport: boolean;
}) {
    const { inlineExpanded, toggleInlineExpanded } = useRadiologyStore();
    const open = inlineExpanded[request.id] ?? false;

    return (
        <div className={`rounded-2xl border overflow-hidden transition-all ${open ? "border-cyan-200" : "border-amber-100 bg-white"}`}>
            <div className="flex items-center gap-3 p-4">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Radio size={14} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-800">{stripRadiologyPrefix(request.test_type)}</p>
                        <BillingBadge request={request} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <p className="text-xs text-gray-400">Requested {fmtDate(request.created_at)}</p>
                        {request.requested_by_name && (
                            <p className="text-xs text-gray-400">by {request.requested_by_name}</p>
                        )}
                        {request.notes && (
                            <p className="text-xs text-blue-600 italic">&quot;{request.notes}&quot;</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <PriorityBadge priority={request.priority} />
                    {canReport && (
                        <button
                            onClick={() => toggleInlineExpanded(request.id)}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors
                                ${open
                                    ? "bg-gray-100 hover:bg-gray-200 text-gray-600"
                                    : "bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm shadow-cyan-200"
                                }`}
                        >
                            <FileText size={11} />
                            {open ? "Cancel" : "Report"}
                        </button>
                    )}
                </div>
            </div>
            {open && (
                <InlineReportForm
                    request={request}
                    patientId={patientId}
                    onClose={() => toggleInlineExpanded(request.id)}
                />
            )}
        </div>
    );
}

// ─── Completed report row ─────────────────────────────────────────────────────

function CompletedRow({ request }: { request: any }) {
    const { inlineExpanded, toggleInlineExpanded } = useRadiologyStore();
    const expanded = inlineExpanded[request.id] ?? false;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={() => toggleInlineExpanded(request.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/60 transition-colors"
            >
                <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                    <CheckCircle2 size={14} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-800">{stripRadiologyPrefix(request.test_type)}</p>
                        <BillingBadge request={request} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Reported {fmtDate(request.completed_at)}
                        {request.completed_by_name ? ` by ${request.completed_by_name}` : ""}
                    </p>
                </div>
                <ChevronDown
                    size={14}
                    className={`text-gray-400 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
                />
            </button>

            {expanded && request.result && (
                <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Radiology Report</p>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
                        {request.result}
                    </pre>
                    {request.notes && (
                        <div className="px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                            <p className="text-xs text-blue-700">
                                <span className="font-bold">Clinical indication: </span>
                                {request.notes}
                            </p>
                        </div>
                    )}

                    {/* 24-hour amendment window for whoever filed the report.
                        Re-submitting would overwrite a filed report; this is the
                        sanctioned path, and it degrades into a correction note
                        once the window closes. */}
                    <div className="pt-3 border-t border-gray-50">
                        <RecordAmendmentControls
                            type="radiology_report"
                            id={request.id}
                            row={request}
                            patientId={request.visit_id ?? null}
                            invalidateKeys={[["radiology"]]}
                            contextLine={stripRadiologyPrefix(request.test_type)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main RadiologyTab ────────────────────────────────────────────────────────

/** Roles that may ORDER a scan (mirrors ORDER_ROLES in radiology.service.ts). */
const ORDER_ROLES = new Set(["Doctor", "FrontDesk", "Radiologist", "Admin"]);
/** Roles that may FILE the observations (mirrors submitRadiologyReport). */
const REPORT_ROLES = new Set(["Radiologist", "Doctor", "FrontDesk", "Admin"]);

export function RadiologyTab({
    patient,
    userRole,
}: {
    patient: Patient;
    userRole?: string;
}) {
    const patientId = patient.id ?? "";
    const canOrder = !!userRole && ORDER_ROLES.has(userRole);
    const canReport = !!userRole && REPORT_ROLES.has(userRole);
    const [ordering, setOrdering] = useState(false);

    const {
        data: requests = [],
        isPending: loading,
        isError: hasError,
        refetch,
    } = useRadiologyRequestsByPatient(patientId);

    const pending = (requests as any[]).filter(r => r.status === "pending");
    const completed = (requests as any[]).filter(r => r.status === "completed");

    const header = (
        <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
                    <Radio size={17} className="text-cyan-600" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-gray-900">Radiology</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Imaging requests, reports and billing</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {pending.length > 0 && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                        {pending.length} pending
                    </span>
                )}
                {completed.length > 0 && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                        {completed.length} reported
                    </span>
                )}
                {canOrder && patientId && (
                    <button
                        type="button"
                        onClick={() => setOrdering(true)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-sm shadow-cyan-200 transition-colors"
                    >
                        <Plus size={14} /> Request Scan
                    </button>
                )}
            </div>
        </div>
    );

    // ── Loading ──
    if (loading) return (
        <div className="space-y-5">
            {header}
            <div className="flex items-center justify-center py-16 gap-3">
                <Loader2 size={16} className="text-cyan-500 animate-spin" />
                <p className="text-sm text-gray-400">Loading radiology data...</p>
            </div>
            {ordering && patient && (
                <RequestScanDialog patient={patient} onClose={() => setOrdering(false)} />
            )}
        </div>
    );

    // ── Error ──
    if (hasError) return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertTriangle size={18} className="text-red-500" />
            <p className="text-sm text-gray-500">Failed to load radiology requests</p>
            <button onClick={() => refetch()} className="text-xs text-red-600 hover:underline">Retry</button>
        </div>
    );

    return (
        <div className="space-y-5">
            {header}

            {patientId && <PackageStrip patientId={patientId} />}

            {/* Pending */}
            {pending.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Clock size={12} className="text-amber-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Pending</p>
                    </div>
                    {pending.map((req: any) => (
                        <PendingRow
                            key={req.id}
                            request={req}
                            patientId={patientId}
                            canReport={canReport}
                        />
                    ))}
                </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-green-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Reports</p>
                    </div>
                    {completed.map((req: any) => (
                        <CompletedRow key={req.id} request={req} />
                    ))}
                </div>
            )}

            {/* Empty */}
            {!requests.length && (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <Radio size={20} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-semibold text-gray-500">No radiology requests</p>
                    <p className="text-xs text-gray-400 max-w-sm">
                        {canOrder
                            ? "Use “Request Scan” above to order a scan. It is billed to the front desk automatically — or covered by the patient's care package."
                            : "Imaging investigations appear here after a doctor or the front desk requests a scan."}
                    </p>
                </div>
            )}

            {ordering && patient && (
                <RequestScanDialog
                    patient={patient}
                    onClose={() => setOrdering(false)}
                    onSent={() => setTimeout(() => refetch(), 0)}
                />
            )}
        </div>
    );
}

export default RadiologyTab;
