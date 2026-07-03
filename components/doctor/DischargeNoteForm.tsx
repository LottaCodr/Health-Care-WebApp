"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useDischargeStore } from "@/store/discharge-store";
import type { ConditionOnDischarge, DischargeType } from "@/store/discharge-store";
import { useCreateDischargeNote } from "@/hooks/emr/use-discharge";
import { useUpdatePatientStatus } from "@/hooks/emr/use-emr";
import { getAdmissionsByPatient, dischargeFromWard } from "@/lib/services/admission.service";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const CONDITIONS: ConditionOnDischarge[] = ["stable","improved","critical","deceased","transferred"];
const DISCHARGE_TYPES: DischargeType[]   = ["regular","ama","transfer","deceased"];

const CONDITION_COLORS: Record<ConditionOnDischarge, string> = {
    stable:      "text-green-700  bg-green-50  border-green-200",
    improved:    "text-teal-700   bg-teal-50   border-teal-200",
    critical:    "text-orange-700 bg-orange-50 border-orange-200",
    deceased:    "text-slate-600  bg-slate-100 border-slate-300",
    transferred: "text-blue-700   bg-blue-50   border-blue-200",
};

// ─── Field ────────────────────────────────────────────────────────────────────

interface FieldProps {
    label:    string;
    required?: boolean;
    error?:    boolean;
    children:  React.ReactNode;
}
function Field({ label, required, error, children }: FieldProps) {
    return (
        <div className="space-y-1">
            <label className={`text-xs font-medium uppercase tracking-wide ${error ? "text-red-500" : "text-slate-500"}`}>
                {label}{required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="text-[11px] text-red-500 font-medium">Required</p>}
        </div>
    );
}

const baseInput = "w-full rounded-lg border px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-slate-300 transition-colors";
const okBorder  = "border-slate-200";
const errBorder = "border-red-300 bg-red-50/40";

// ─── Main Component ───────────────────────────────────────────────────────────

interface DischargeNoteFormProps {
    staffId:    string;
    onSuccess?: () => void;
    /** When true, renders inline inside a patient tab — no modal, no backdrop, no close button. */
    embedded?:  boolean;
}

export default function DischargeNoteForm({ staffId, onSuccess, embedded = false }: DischargeNoteFormProps) {
    const store          = useDischargeStore();
    const create         = useCreateDischargeNote();
    const updateStatus   = useUpdatePatientStatus();

    const [touched,           setTouched]           = useState(false);
    const [amaAcknowledged,   setAmaAcknowledged]   = useState(false);
    const [deceasedConfirmed, setDeceasedConfirmed] = useState(false);

    // Embedded mode always renders while the tab is open — it ignores the
    // modal-only showForm gate. Non-embedded usage (e.g. a standalone trigger
    // button elsewhere) still respects showForm.
    if (!embedded && !store.showForm) return null;

    const isTransfer = store.dischargeType === "transfer";
    const isDeceased = store.dischargeType === "deceased";
    const isAMA      = store.dischargeType === "ama";

    const missingDiagnosis = !store.finalDiagnosis.trim();
    const missingCourse    = !store.hospitalCourse.trim();
    const missingTransfer  = isTransfer && !store.transferredTo.trim();
    const missingAmaAck    = isAMA && !amaAcknowledged;
    const missingDeceasedAck = isDeceased && !deceasedConfirmed;

    const formInvalid =
        missingDiagnosis || missingCourse || missingTransfer || missingAmaAck || missingDeceasedAck;

    async function handleSubmit() {
        setTouched(true);
        if (!store.patientId || formInvalid) {
            toast.error("Please complete all required fields before saving.");
            return;
        }

        store.setUI("submitting", true);
        try {
            await create.mutateAsync({
                patientId:               store.patientId,
                consultationId:          store.consultationId ?? undefined,
                finalDiagnosis:          store.finalDiagnosis,
                conditionOnDischarge:    store.conditionOnDischarge,
                hospitalCourse:          store.hospitalCourse,
                medicationsOnDischarge:  store.medicationsOnDischarge,
                followUpDate:            store.followUpDate || undefined,
                followUpInstructions:    store.followUpInstructions,
                activityRestrictions:    store.activityRestrictions,
                dietInstructions:        store.dietInstructions,
                emergencyReturnCriteria: store.emergencyReturnCriteria,
                dischargeType:           store.dischargeType,
                transferredTo:           isTransfer ? store.transferredTo : undefined,
                doctorId:                staffId,
            });

            // ── Free the ward bed, if one is assigned ──────────────────────────
            // Best-effort: not every discharge has an active ward admission
            // (e.g. outpatient consultations never had a bed). Failure here
            // does not block the discharge note from being saved.
            try {
                const admissions = await getAdmissionsByPatient(store.patientId);
                const active     = admissions.find(a => a.status === "active");
                if (active) await dischargeFromWard(active.id);
            } catch (err) {
                console.error("Ward discharge step failed (non-fatal):", err);
            }

            // ── Move patient into the billing queue ─────────────────────────────
            updateStatus.mutateAsync(
                { id: store.patientId, status: "awaiting-payment" as any },
                { onError: () => toast.error("Discharge note saved, but patient status could not be updated. Please update manually.") }
            );

            toast.success("Discharge note saved. Patient moved to billing.");
            store.resetForm();
            setAmaAcknowledged(false);
            setDeceasedConfirmed(false);
            setTouched(false);
            onSuccess?.();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to save discharge note. Please try again.");
        } finally {
            store.setUI("submitting", false);
        }
    }

    // ── Shared form body (used by both embedded and modal render paths) ────────

    const body = (
        <>
            {/* Discharge Type */}
            <div className="grid grid-cols-4 gap-2">
                {DISCHARGE_TYPES.map((t) => (
                    <button key={t} type="button"
                        onClick={() => store.setField("dischargeType", t)}
                        className={`py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                            store.dischargeType === t
                                ? "bg-teal-600 text-white border-teal-600"
                                : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
                        }`}>
                        {t === "ama" ? "AMA" : t}
                    </button>
                ))}
            </div>

            {/* AMA acknowledgement — legal/clinical safety gate */}
            {isAMA && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                        <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 leading-relaxed">
                            This patient is leaving against medical advice. Document the risks explained
                            and the patient's decision in the Hospital Course field below.
                        </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={amaAcknowledged}
                            onChange={e => setAmaAcknowledged(e.target.checked)}
                            className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-400" />
                        <span className="text-xs font-medium text-amber-800">
                            I confirm the patient was informed of risks and chose to leave AMA
                        </span>
                    </label>
                    {touched && missingAmaAck && (
                        <p className="text-[11px] text-red-500 font-medium">This acknowledgement is required for AMA discharge.</p>
                    )}
                </div>
            )}

            {/* Deceased confirmation — irreversible action gate */}
            {isDeceased && (
                <div className="rounded-lg border border-slate-300 bg-slate-50 p-3 space-y-2">
                    <div className="flex items-start gap-2">
                        <AlertTriangle size={14} className="text-slate-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-700 leading-relaxed">
                            Marking a patient as deceased is irreversible and will close all active
                            clinical workflows for this patient.
                        </p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={deceasedConfirmed}
                            onChange={e => setDeceasedConfirmed(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-400 text-slate-700 focus:ring-slate-400" />
                        <span className="text-xs font-medium text-slate-700">
                            I confirm this patient's death and that this record is accurate
                        </span>
                    </label>
                    {touched && missingDeceasedAck && (
                        <p className="text-[11px] text-red-500 font-medium">This confirmation is required to proceed.</p>
                    )}
                </div>
            )}

            {isTransfer && (
                <Field label="Transfer Destination" required error={touched && missingTransfer}>
                    <input
                        className={`${baseInput} ${touched && missingTransfer ? errBorder : okBorder}`}
                        value={store.transferredTo}
                        onChange={(e) => store.setField("transferredTo", e.target.value)}
                        placeholder="Name of receiving facility"
                    />
                </Field>
            )}

            {/* Condition on Discharge */}
            <Field label="Condition on Discharge" required>
                <div className="flex flex-wrap gap-2">
                    {CONDITIONS.map((c) => (
                        <button key={c} type="button"
                            onClick={() => store.setField("conditionOnDischarge", c)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-colors ${
                                store.conditionOnDischarge === c
                                    ? CONDITION_COLORS[c]
                                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                            }`}>
                            {c}
                        </button>
                    ))}
                </div>
            </Field>

            {/* Final Diagnosis */}
            <Field label="Final Diagnosis" required error={touched && missingDiagnosis}>
                <input
                    className={`${baseInput} ${touched && missingDiagnosis ? errBorder : okBorder}`}
                    value={store.finalDiagnosis}
                    onChange={(e) => store.setField("finalDiagnosis", e.target.value)}
                    placeholder="Primary diagnosis at discharge"
                />
            </Field>

            {/* Hospital Course */}
            <Field label="Hospital Course" required error={touched && missingCourse}>
                <textarea
                    className={`${baseInput} resize-none ${touched && missingCourse ? errBorder : okBorder}`}
                    rows={4}
                    value={store.hospitalCourse}
                    onChange={(e) => store.setField("hospitalCourse", e.target.value)}
                    placeholder="Summary of treatment, procedures, and clinical progress…"
                />
            </Field>

            {/* Medications */}
            <Field label="Medications on Discharge">
                <textarea
                    className={`${baseInput} resize-none ${okBorder}`}
                    rows={3}
                    value={store.medicationsOnDischarge}
                    onChange={(e) => store.setField("medicationsOnDischarge", e.target.value)}
                    placeholder="Drug name, dose, frequency, duration…"
                />
            </Field>

            {/* Follow-up */}
            {!isDeceased && (
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Follow-up Date">
                        <input type="date"
                            className={`${baseInput} ${okBorder}`}
                            value={store.followUpDate}
                            onChange={(e) => store.setField("followUpDate", e.target.value)}
                        />
                    </Field>
                    <Field label="Follow-up Instructions">
                        <input
                            className={`${baseInput} ${okBorder}`}
                            value={store.followUpInstructions}
                            onChange={(e) => store.setField("followUpInstructions", e.target.value)}
                            placeholder="Clinic, department, etc."
                        />
                    </Field>
                </div>
            )}

            {/* Instructions */}
            {!isDeceased && (
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Activity Restrictions">
                        <textarea
                            className={`${baseInput} resize-none ${okBorder}`}
                            rows={2}
                            value={store.activityRestrictions}
                            onChange={(e) => store.setField("activityRestrictions", e.target.value)}
                            placeholder="Bed rest, no lifting, etc."
                        />
                    </Field>
                    <Field label="Diet Instructions">
                        <textarea
                            className={`${baseInput} resize-none ${okBorder}`}
                            rows={2}
                            value={store.dietInstructions}
                            onChange={(e) => store.setField("dietInstructions", e.target.value)}
                            placeholder="Low sodium, diabetic diet, etc."
                        />
                    </Field>
                </div>
            )}

            {/* Emergency Return */}
            {!isDeceased && (
                <Field label="Emergency Return Criteria">
                    <textarea
                        className={`${baseInput} resize-none ${okBorder}`}
                        rows={2}
                        value={store.emergencyReturnCriteria}
                        onChange={(e) => store.setField("emergencyReturnCriteria", e.target.value)}
                        placeholder="Return if: fever > 38.5°C, chest pain, difficulty breathing…"
                    />
                </Field>
            )}
        </>
    );

    const footer = (
        <div className="flex justify-between items-center gap-3">
            {create.isError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertTriangle size={12} /> Failed to save discharge note. Please try again.
                </p>
            )}
            <div className="flex gap-3 ml-auto">
                {!embedded && (
                    <button type="button" onClick={() => store.closeForm()}
                        className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
                        Cancel
                    </button>
                )}
                <button type="button" onClick={handleSubmit}
                    disabled={store.submitting}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 transition-colors">
                    {store.submitting
                        ? "Saving…"
                        : <><CheckCircle2 size={14} /> Save Discharge Note</>
                    }
                </button>
            </div>
        </div>
    );

    // ── Embedded mode: inline panel, no modal, no backdrop, no close button ───
    if (embedded) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 space-y-5">{body}</div>
                <div className="px-6 py-4 border-t border-slate-100">{footer}</div>
            </div>
        );
    }

    // ── Modal mode (standalone trigger usage) ──────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-base font-semibold text-slate-800">Discharge Summary</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Patient ID: {store.patientId}</p>
                    </div>
                    <button onClick={() => store.closeForm()}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                        ✕
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">{body}</div>
                <div className="px-6 py-4 border-t border-slate-100 shrink-0">{footer}</div>
            </div>
        </div>
    );
}