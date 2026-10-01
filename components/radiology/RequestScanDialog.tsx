"use client";

/**
 * Request Scan — the order entry for radiology.
 *
 * This is the screen that was missing: radiology requests could previously only
 * be created from the Quick Route panel, whose "scan" list came from the lab
 * test catalog and was usually empty, so there was nowhere to request a scan and
 * nothing was ever billed for one.
 *
 * It does three things in one place:
 *   1. Offers the scans the unit actually performs, with their prices
 *      (`radiology_scan_catalog`, ₦23,000 each today).
 *   2. Shows, BEFORE the request is sent, whether the patient's prepaid care
 *      package covers it — an antenatal patient's scan is already paid for and
 *      must not be billed again.
 *   3. Sends the order, which either raises the bill or draws down the package.
 */

import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-provider";
import {
    useCreateRadiologyRequest,
    useRadiologyCoverage,
    useRadiologyScans,
    useSearchPatients,
} from "@/hooks/emr/use-emr";
import { coverageExplanation, describeAllowance } from "@/lib/utils/care-packages";
import { formatNaira } from "@/lib/utils/radiology-catalog";
import { displayHospitalNumber, getPatientHospitalNumber } from "@/lib/hospital-number";
import type { Patient } from "@/types/models";
import {
    Radio, X, Send, Loader2, Search, Check, Package, CreditCard,
    TriangleAlert, User, Hash,
} from "lucide-react";

const PRIORITIES: { value: "routine" | "urgent" | "stat"; label: string; desc: string; cls: string }[] = [
    { value: "routine", label: "Routine", desc: "Normal queue", cls: "border-gray-200 bg-gray-50 text-gray-600" },
    { value: "urgent", label: "Urgent", desc: "Same day", cls: "border-amber-200 bg-amber-50 text-amber-700" },
    { value: "stat", label: "STAT", desc: "Immediately", cls: "border-red-200 bg-red-50 text-red-700" },
];

// ─── Patient picker (used when the dialog is opened from the radiology board) ─

function PatientPicker({ onPick }: { onPick: (p: Patient) => void }) {
    const [term, setTerm] = useState("");
    const { data: results = [], isFetching } = useSearchPatients(term.trim());

    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
                Patient
            </label>
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    autoFocus
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Search by name, phone or hospital number…"
                    className="w-full h-10 pl-9 pr-3 text-xs bg-gray-50 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:bg-white transition-all"
                />
            </div>

            {term.trim().length >= 2 && (
                <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/50 p-1.5 space-y-1">
                    {isFetching && (
                        <p className="text-xs text-gray-400 py-2 text-center">Searching…</p>
                    )}
                    {!isFetching && (results as Patient[]).length === 0 && (
                        <p className="text-xs text-gray-400 py-2 text-center italic">No patient matches “{term}”</p>
                    )}
                    {(results as Patient[]).map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => onPick(p)}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white border border-gray-100 hover:border-cyan-200 hover:bg-cyan-50/40 text-left transition-colors"
                        >
                            <User size={13} className="text-gray-400 shrink-0" />
                            <span className="text-xs font-bold text-gray-800 truncate">{p.name || "Unnamed"}</span>
                            <span className="ml-auto text-[10px] font-mono text-gray-400 shrink-0">
                                {displayHospitalNumber(getPatientHospitalNumber(p))}
                            </span>
                        </button>
                    ))}
                </div>
            )}
            {term.trim().length < 2 && (
                <p className="text-[11px] text-gray-400">Type at least two characters to search.</p>
            )}
        </div>
    );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

export interface RequestScanDialogProps {
    /** Omit to let the caller search for the patient first (radiology board). */
    patient?: Patient | null;
    onClose: () => void;
    /** Called with the created request's billing outcome. */
    onSent?: (info: { billed: boolean; message: string }) => void;
}

export default function RequestScanDialog({ patient: initialPatient, onClose, onSent }: RequestScanDialogProps) {
    const { user } = useAuth();
    const { mutate: createRequest, isPending } = useCreateRadiologyRequest();

    const [patient, setPatient] = useState<Patient | null>(initialPatient ?? null);

    // Enabled from the picked patient, not just the prop: the radiology board
    // opens this dialog with no patient and searches for one first.
    const { data: scans = [], isLoading: loadingScans } = useRadiologyScans({
        enabled: !!patient,
    });
    const [scanCode, setScanCode] = useState<string>("");
    const [priority, setPriority] = useState<"routine" | "urgent" | "stat">("routine");
    const [notes, setNotes] = useState("");
    const [billAnyway, setBillAnyway] = useState(false);

    const selected = useMemo(
        () => (scans as any[]).find((s) => s.code === scanCode) ?? null,
        [scans, scanCode]
    );

    // Coverage is resolved server-side, so the banner reflects the same rule the
    // create call will apply (active enrolment + entitlement + allowance left).
    const { data: coverage, isFetching: checkingCoverage } = useRadiologyCoverage(
        patient?.id ?? "",
        selected?.name ?? ""
    );

    const covered = !!coverage?.covered && !billAnyway;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!patient?.id) { toast.error("Choose the patient first."); return; }
        if (!selected) { toast.error("Choose the scan to request."); return; }

        createRequest(
            {
                patientId: patient.id,
                requestedBy: user?.$id ?? user?.id ?? "",
                testType: selected.name,
                priority,
                notes: notes.trim() || undefined,
                billAnyway: billAnyway || undefined,
            },
            {
                onSuccess: (result) => {
                    const billed = result.billing.status !== "covered";
                    toast.success(
                        billed
                            ? `${selected.name} requested — ${result.billing.message}`
                            : `${selected.name} requested — ${result.billing.message}`
                    );
                    onSent?.({ billed, message: result.billing.message });
                    onClose();
                },
                onError: (err: any) => toast.error(err?.message ?? "Failed to send the request."),
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-cyan-50/80 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-cyan-600 flex items-center justify-center text-white shadow-sm shadow-cyan-200">
                            <Radio size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm">Request a Scan</h3>
                            <p className="text-xs text-gray-400">
                                {patient
                                    ? `${patient.name} • ${covered ? "covered by package" : "auto-billed to Front Desk"}`
                                    : "Choose a patient to begin"}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">

                    {/* Patient */}
                    {patient ? (
                        <div className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-gray-50 border border-gray-100">
                            <div className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                                {(patient.name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-gray-900 truncate">{patient.name}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-600">
                                        <Hash size={9} /> {displayHospitalNumber(getPatientHospitalNumber(patient))}
                                    </span>
                                    {patient.phone && <span className="text-[11px] text-gray-500">{patient.phone}</span>}
                                </div>
                            </div>
                            {!initialPatient && (
                                <button
                                    type="button"
                                    onClick={() => { setPatient(null); setScanCode(""); }}
                                    className="text-[10px] font-bold text-cyan-700 hover:underline shrink-0"
                                >
                                    Change
                                </button>
                            )}
                        </div>
                    ) : (
                        <PatientPicker onPick={setPatient} />
                    )}

                    {/* Scan picker */}
                    {patient && (
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                Scan
                            </label>

                            {loadingScans ? (
                                <p className="text-xs text-gray-400 py-3">Loading the scan catalog…</p>
                            ) : (
                                <div className="grid gap-2">
                                    {(scans as any[]).map((scan) => {
                                        const isSelected = scanCode === scan.code;
                                        return (
                                            <button
                                                key={scan.code}
                                                type="button"
                                                onClick={() => { setScanCode(scan.code); setBillAnyway(false); }}
                                                className={`flex items-start gap-3 px-3.5 py-3 rounded-2xl border text-left transition-all ${
                                                    isSelected
                                                        ? "border-cyan-500 bg-cyan-50/70 shadow-sm"
                                                        : "border-gray-200 bg-white hover:border-cyan-200"
                                                }`}
                                            >
                                                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                                                    isSelected ? "border-cyan-600 bg-cyan-600" : "border-gray-300"
                                                }`}>
                                                    {isSelected && <Check size={9} className="text-white" strokeWidth={4} />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-xs font-bold text-gray-900">{scan.name}</p>
                                                        <span className={`text-[10px] font-mono font-bold ${isSelected ? "text-cyan-700" : "text-gray-500"}`}>
                                                            {formatNaira(scan.price)}
                                                        </span>
                                                    </div>
                                                    {scan.description && (
                                                        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{scan.description}</p>
                                                    )}
                                                </div>
                                            </button>
                                        );
                                    })}
                                    {(scans as any[]).length === 0 && (
                                        <p className="text-xs text-amber-600 py-2">
                                            No scans are configured. Ask an administrator to add them to the radiology catalog.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Coverage / billing banner */}
                    {patient && selected && (
                        checkingCoverage ? (
                            <div className="flex items-center gap-2 px-3.5 py-3 rounded-2xl bg-gray-50 border border-gray-100">
                                <Loader2 size={13} className="animate-spin text-gray-400" />
                                <p className="text-[11px] text-gray-500">Checking the patient&apos;s care package…</p>
                            </div>
                        ) : covered ? (
                            <div className="px-3.5 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                                <div className="flex items-start gap-2">
                                    <Package size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-emerald-800">
                                            Covered by {coverage?.packageName ?? "a prepaid package"}
                                        </p>
                                        <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                                            {coverageExplanation(coverage!)} This scan will NOT appear in the
                                            patient&apos;s billing.
                                        </p>
                                        {coverage?.includedQuantity !== undefined && (
                                            <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                                                {describeAllowance(
                                                    coverage!.includedQuantity,
                                                    (coverage!.usedQuantity ?? 0) + 1,
                                                    "scan"
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-emerald-200/70">
                                    <input
                                        type="checkbox"
                                        checked={billAnyway}
                                        onChange={(e) => setBillAnyway(e.target.checked)}
                                        className="w-3.5 h-3.5 accent-emerald-600"
                                    />
                                    <span className="text-[11px] text-emerald-800 font-semibold">
                                        Bill this scan anyway ({formatNaira(selected.price)})
                                    </span>
                                </label>
                            </div>
                        ) : (
                            <div className="px-3.5 py-3 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                                <div className="flex items-start gap-2">
                                    <CreditCard size={14} className="text-indigo-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-indigo-900">
                                            {formatNaira(selected.price)} will be billed
                                        </p>
                                        <p className="text-[11px] text-indigo-700 mt-0.5 leading-relaxed">
                                            {coverage ? coverageExplanation(coverage) : "The bill appears in the patient's Billing tab and the front desk checkout queue immediately."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    )}

                    {/* Priority */}
                    {patient && (
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1.5">
                                Priority
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {PRIORITIES.map((p) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => setPriority(p.value)}
                                        className={`px-2 py-2 rounded-xl border text-center transition-all ${
                                            priority === p.value ? `${p.cls} ring-2 ring-offset-1 ring-cyan-300` : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                                        }`}
                                    >
                                        <p className="text-[11px] font-bold">{p.label}</p>
                                        <p className="text-[9px] opacity-70">{p.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Clinical indication */}
                    {patient && (
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                Clinical indication <span className="text-gray-300 normal-case font-medium">(optional)</span>
                            </label>
                            <textarea
                                rows={3}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="e.g. 8 weeks by LMP, confirm viability and dating. Mild lower abdominal pain."
                                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-xs text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 resize-none"
                            />
                        </div>
                    )}

                    {/* Actions */}
                    {patient && (
                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isPending || !selected}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold shadow-sm shadow-cyan-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isPending ? (
                                    <><Loader2 size={13} className="animate-spin" /> Sending…</>
                                ) : (
                                    <>
                                        <Send size={13} />
                                        {covered ? "Send Request (Covered)" : `Send Request & Bill ${formatNaira(selected?.price ?? 0)}`}
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Note about who sees it */}
                    {patient && (
                        <p className="flex items-start gap-1.5 text-[10px] text-gray-400 leading-relaxed">
                            <TriangleAlert size={11} className="shrink-0 mt-0.5" />
                            The patient is routed to the radiology queue and the unit is notified. Results are
                            entered on the patient&apos;s Radiology tab by the radiologist, the doctor or the front desk.
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
}
