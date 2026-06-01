"use client";

import React from "react";
import { useDischargeStore } from "@/store/discharge-store";
import type { ConditionOnDischarge, DischargeType } from "@/store/discharge-store";
import { useCreateDischargeNote } from "@/hooks/emr/use-discharge";

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
    children:  React.ReactNode;
}
function Field({ label, required, children }: FieldProps) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {label}{required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );
}

const inputClass =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-slate-300";

const textareaClass =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-slate-300";

// ─── Main Component ───────────────────────────────────────────────────────────

interface DischargeNoteFormProps {
    staffId:    string;
    onSuccess?: () => void;
    /** When true, always render inside a patient tab (no modal gate). */
    embedded?:  boolean;
}

export default function DischargeNoteForm({ staffId, onSuccess, embedded = false }: DischargeNoteFormProps) {
    const store  = useDischargeStore();
    const create = useCreateDischargeNote();

    if (!embedded && !store.showForm) return null;

    const isTransfer  = store.dischargeType === "transfer";
    const isDeceased  = store.dischargeType === "deceased";
    const formInvalid = !store.finalDiagnosis.trim() || !store.hospitalCourse.trim();

    async function handleSubmit() {
        if (!store.patientId) return;
        store.setUI("submitting", true);
        try {
            await create.mutateAsync({
                patientId:              store.patientId,
                consultationId:         store.consultationId ?? undefined,
                finalDiagnosis:         store.finalDiagnosis,
                conditionOnDischarge:   store.conditionOnDischarge,
                hospitalCourse:         store.hospitalCourse,
                medicationsOnDischarge: store.medicationsOnDischarge,
                followUpDate:           store.followUpDate    || undefined,
                followUpInstructions:   store.followUpInstructions,
                activityRestrictions:   store.activityRestrictions,
                dietInstructions:       store.dietInstructions,
                emergencyReturnCriteria:store.emergencyReturnCriteria,
                dischargeType:          store.dischargeType,
                transferredTo:          isTransfer ? store.transferredTo : undefined,
                doctorId:           staffId,
            });
            store.resetForm();
            onSuccess?.();
        } finally {
            store.setUI("submitting", false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[92vh]">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-base font-semibold text-slate-800">Discharge Summary</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Patient ID: {store.patientId}</p>
                    </div>
                    <button
                        onClick={() => store.closeForm()}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                    {/* Discharge Type Banner */}
                    <div className="grid grid-cols-4 gap-2">
                        {DISCHARGE_TYPES.map((t) => (
                            <button
                                key={t}
                                onClick={() => store.setField("dischargeType", t)}
                                className={`py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                                    store.dischargeType === t
                                        ? "bg-teal-600 text-white border-teal-600"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
                                }`}
                            >
                                {t === "ama" ? "AMA" : t}
                            </button>
                        ))}
                    </div>

                    {isTransfer && (
                        <Field label="Transfer Destination" required>
                            <input
                                className={inputClass}
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
                                <button
                                    key={c}
                                    onClick={() => store.setField("conditionOnDischarge", c)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-colors ${
                                        store.conditionOnDischarge === c
                                            ? CONDITION_COLORS[c]
                                            : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                    }`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </Field>

                    {/* Final Diagnosis */}
                    <Field label="Final Diagnosis" required>
                        <input
                            className={inputClass}
                            value={store.finalDiagnosis}
                            onChange={(e) => store.setField("finalDiagnosis", e.target.value)}
                            placeholder="Primary diagnosis at discharge"
                        />
                    </Field>

                    {/* Hospital Course */}
                    <Field label="Hospital Course" required>
                        <textarea
                            className={textareaClass}
                            rows={4}
                            value={store.hospitalCourse}
                            onChange={(e) => store.setField("hospitalCourse", e.target.value)}
                            placeholder="Summary of treatment, procedures, and clinical progress…"
                        />
                    </Field>

                    {/* Medications */}
                    <Field label="Medications on Discharge">
                        <textarea
                            className={textareaClass}
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
                                <input
                                    type="date"
                                    className={inputClass}
                                    value={store.followUpDate}
                                    onChange={(e) => store.setField("followUpDate", e.target.value)}
                                />
                            </Field>
                            <Field label="Follow-up Instructions">
                                <input
                                    className={inputClass}
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
                                    className={textareaClass}
                                    rows={2}
                                    value={store.activityRestrictions}
                                    onChange={(e) => store.setField("activityRestrictions", e.target.value)}
                                    placeholder="Bed rest, no lifting, etc."
                                />
                            </Field>
                            <Field label="Diet Instructions">
                                <textarea
                                    className={textareaClass}
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
                                className={textareaClass}
                                rows={2}
                                value={store.emergencyReturnCriteria}
                                onChange={(e) => store.setField("emergencyReturnCriteria", e.target.value)}
                                placeholder="Return if: fever > 38.5°C, chest pain, difficulty breathing…"
                            />
                        </Field>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex justify-between items-center gap-3">
                    {create.isError && (
                        <p className="text-xs text-red-500">Failed to save discharge note. Please try again.</p>
                    )}
                    <div className="flex gap-3 ml-auto">
                        <button
                            onClick={() => store.closeForm()}
                            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={formInvalid || store.submitting}
                            className="px-5 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                        >
                            {store.submitting ? "Saving…" : "Save Discharge Note"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}