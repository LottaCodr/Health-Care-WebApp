"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useCreatePrescription } from "@/hooks/use-emr";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Pill, AlertCircle, FlaskConical, BadgeDollarSign } from "lucide-react";
import { toast } from "sonner";
import { Patient } from "@/types/models";
import { AIPrescriptionCheck } from "../ai/AIComponents";



// ─── Types ────────────────────────────────────────────────────────────────────

interface MedicationInput {
    drugName: string;
    dosage: string;
    duration: string;
    price: string;
    notes: string;
}

interface Props {
    patientId: string;
    onSuccess?: () => void;
    patient: Patient
}

const BLANK: MedicationInput = {
    drugName: "", dosage: "", duration: "", price: "", notes: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrescriptionDetails({ patientId, onSuccess, patient }: Props) {
    const { user } = useAuth();
    const { mutate: createPrescription, loading: creating } = useCreatePrescription();

    const [medications, setMedications] = useState<MedicationInput[]>([{ ...BLANK }]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const busy = submitting || creating;

    const update = (idx: number, field: keyof MedicationInput, val: string) => {
        setMedications((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: val };
            return next;
        });
        setErrors((prev) => { const n = { ...prev }; delete n[`${idx}_${field}`]; return n; });
    };

    const addMed = () => setMedications((p) => [...p, { ...BLANK }]);
    const removeMed = (idx: number) => setMedications((p) => p.filter((_, i) => i !== idx));

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!patientId) errs.global = "No patient selected.";
        medications.forEach((med, idx) => {
            if (!med.drugName.trim()) errs[`${idx}_drugName`] = "Required";
            if (!med.dosage.trim()) errs[`${idx}_dosage`] = "Required";
            if (!med.price.trim() || isNaN(parseFloat(med.price)) || parseFloat(med.price) < 0)
                errs[`${idx}_price`] = "Valid price required";
        });
        setErrors(errs);
        return !Object.keys(errs).length;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) { toast.error("Please fill all required fields."); return; }

        setSubmitting(true);
        try {
            // Create one prescription row per medication, auto-dispensed = true
            // The DB trigger fires on dispensed = true and creates a payment row
            await Promise.all(
                medications.map((med) =>
                    createPrescription({
                        patientId,
                        pharmacistId: user?.$id,
                        drugName: med.drugName,
                        dosage: med.dosage,
                        duration: med.duration || undefined,
                        price: parseFloat(med.price),
                        notes: med.notes || undefined,
                        dispensed: true,
                    })
                )
            );

            toast.success(`${medications.length} prescription${medications.length > 1 ? "s" : ""} dispensed. Payment pending confirmation.`);
            setMedications([{ ...BLANK }]);
            onSuccess?.();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to dispense. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const total = medications.reduce((sum, m) => sum + (parseFloat(m.price) || 0), 0);
    const hasPrice = medications.some((m) => m.price && !isNaN(parseFloat(m.price)));

    return (
        <form onSubmit={handleSubmit} className="space-y-4">

            {errors.global && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                    <AlertCircle size={13} className="text-red-500 shrink-0" />
                    <p className="text-xs text-red-600 font-medium">{errors.global}</p>
                </div>
            )}

            {/* ── Medication cards ── */}
            <div className="space-y-3">
                {medications.map((med, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100/80">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                                    <FlaskConical size={13} className="text-violet-600" />
                                </div>
                                <p className="text-xs font-bold text-gray-700">
                                    {med.drugName.trim() || `Medication ${idx + 1}`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeMed(idx)}
                                disabled={busy || medications.length === 1}
                                className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-red-50 hover:border-red-100 flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>

                        {/* Fields */}
                        <div className="px-5 py-4 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <FieldInput label="Drug Name" required placeholder="e.g. Paracetamol 500mg"
                                    value={med.drugName} error={errors[`${idx}_drugName`]} disabled={busy}
                                    onChange={(v) => update(idx, "drugName", v)} />
                                <FieldInput label="Dosage" required placeholder="e.g. 1 tablet every 8h"
                                    value={med.dosage} error={errors[`${idx}_dosage`]} disabled={busy}
                                    onChange={(v) => update(idx, "dosage", v)} />
                                <FieldInput label="Price (₦)" required placeholder="e.g. 2500" type="number"
                                    value={med.price} error={errors[`${idx}_price`]} disabled={busy}
                                    onChange={(v) => update(idx, "price", v)}
                                    icon={<BadgeDollarSign size={12} className="text-gray-400" />} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FieldInput label="Duration" placeholder="e.g. 5 days"
                                    value={med.duration} disabled={busy}
                                    onChange={(v) => update(idx, "duration", v)} />
                                <FieldInput label="Notes" placeholder="e.g. Take after meals"
                                    value={med.notes} disabled={busy}
                                    onChange={(v) => update(idx, "notes", v)} />
                            </div>
                            {/* AI prescription check per medication card */}
                            <div className="mt-2">
                                <AIPrescriptionCheck
                                    drugName={med.drugName}
                                    dosage={med.dosage}
                                    allergies={patient?.allergies}
                                    currentMeds={patient?.long_term_medication}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Add medication ── */}
            <button
                type="button"
                onClick={addMed}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 hover:border-violet-300 hover:bg-violet-50/40 text-gray-400 hover:text-violet-600 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
            >
                <Plus size={13} /> Add Another Medication
            </button>

            {/* ── Total price ── */}
            {hasPrice && (
                <div className="flex items-center justify-between px-4 py-3 bg-violet-50 border border-violet-100 rounded-2xl">
                    <p className="text-xs font-bold text-violet-600 uppercase tracking-widest">Total Amount</p>
                    <p className="text-base font-extrabold text-violet-800">
                        ₦{total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                    </p>
                </div>
            )}

            {/* ── Info ── */}
            <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
                <AlertCircle size={13} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                    Prescriptions are automatically dispensed on submit. A payment record will be created and sent to the front desk for confirmation.
                </p>
            </div>

            {/* ── Submit ── */}
            <button
                type="submit"
                disabled={busy || !medications.length || !patientId}
                className="w-full h-12 flex items-center justify-center gap-2 bg-violet-700 hover:bg-violet-800 text-white font-bold text-sm rounded-2xl shadow-lg shadow-violet-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {busy
                    ? <><Loader2 size={15} className="animate-spin" /> Dispensing...</>
                    : <><Pill size={15} /> Dispense & Create Payment</>
                }
            </button>
        </form>
    );
}

// ─── Field input helper ───────────────────────────────────────────────────────

function FieldInput({
    label, required, placeholder, value, error, disabled, onChange, type = "text", icon,
}: {
    label: string; required?: boolean; placeholder?: string;
    value: string; error?: string; disabled?: boolean;
    onChange: (v: string) => void; type?: string;
    icon?: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
            </Label>
            <div className="relative">
                {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>}
                <Input
                    type={type}
                    value={value}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                    disabled={disabled}
                    className={`h-9 text-sm rounded-xl border-gray-200 bg-white focus:border-violet-400 transition-colors
                        ${icon ? "pl-8" : ""}
                        ${error ? "border-red-300 bg-red-50" : ""}`}
                />
            </div>
            {error && (
                <p className="flex items-center gap-1 text-[10px] text-red-500 font-semibold">
                    <AlertCircle size={9} /> {error}
                </p>
            )}
        </div>
    );
}