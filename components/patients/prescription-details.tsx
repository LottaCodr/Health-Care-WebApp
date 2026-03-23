"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/auth-provider";
import { useCreatePrescription, useDrugInventory } from "@/hooks/use-emr";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Loader2, Plus, Trash2, Pill, AlertCircle,
    FlaskConical, BadgeDollarSign, Search,
    AlertTriangle, CheckCircle2, Package,
} from "lucide-react";
import { toast } from "sonner";
import { DrugInventoryItem } from "@/types/models";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MedicationInput {
    drugName: string;
    dosage: string;
    duration: string;
    price: string;
    notes: string;
    inventoryItemId: string | null;   // tracks which inventory row was selected
    stockQty: number | null;   // for live stock warning
    unit: string;
}

interface Props {
    patientId: string;
    patient?: any;
    onSuccess?: () => void;
}

const BLANK: MedicationInput = {
    drugName: "", dosage: "", duration: "", price: "",
    notes: "", inventoryItemId: null, stockQty: null, unit: "",
};

// ─── Drug autocomplete field ──────────────────────────────────────────────────

function DrugAutocomplete({
    value, onChange, onSelect, inventory, disabled, error,
}: {
    value: string;
    onChange: (v: string) => void;
    onSelect: (item: DrugInventoryItem) => void;
    inventory: DrugInventoryItem[];
    disabled?: boolean;
    error?: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(value);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync external value changes (e.g. on reset)
    useEffect(() => { setQuery(value); }, [value]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filtered = query.trim().length < 1
        ? inventory.slice(0, 8)
        : inventory.filter((d) =>
            d.drug_name.toLowerCase().includes(query.toLowerCase()) ||
            (d.generic_name ?? "").toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10);

    const handleInput = (v: string) => {
        setQuery(v);
        onChange(v);
        setOpen(true);
    };

    const handleSelect = (item: DrugInventoryItem) => {
        setQuery(item.drug_name);
        onChange(item.drug_name);
        onSelect(item);
        setOpen(false);
    };

    const stockStatus = (item: DrugInventoryItem) => {
        if (item.quantity === 0) return { label: "Out of stock", color: "text-red-600", dot: "bg-red-500" };
        if (item.quantity <= item.reorder_level) return { label: `${item.quantity} left`, color: "text-amber-600", dot: "bg-amber-500" };
        return { label: `${item.quantity} ${item.unit}`, color: "text-green-600", dot: "bg-green-500" };
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Input */}
            <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                    value={query}
                    onChange={(e) => handleInput(e.target.value)}
                    onFocus={() => setOpen(true)}
                    placeholder="Search drug name or generic..."
                    disabled={disabled}
                    className={`w-full h-9 pl-9 pr-3 rounded-xl border bg-white text-sm font-medium text-gray-900
                        placeholder:text-gray-300 transition-all
                        focus:outline-none focus:ring-2 focus:ring-violet-400/25 focus:border-violet-400
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${error ? "border-red-300 bg-red-50 focus:ring-red-400/25 focus:border-red-400" : "border-gray-200"}`}
                />
            </div>

            {/* Dropdown */}
            {open && filtered.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
                    <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
                        {filtered.map((item) => {
                            const s = stockStatus(item);
                            const outOfStock = item.quantity === 0;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleSelect(item)}
                                    disabled={outOfStock}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                                        ${outOfStock ? "opacity-50 cursor-not-allowed bg-gray-50" : "hover:bg-violet-50/60 cursor-pointer"}`}
                                >
                                    {/* Avatar */}
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0
                                        ${outOfStock ? "bg-gray-100 text-gray-400" : "bg-violet-50 text-violet-600"}`}>
                                        {item.drug_name[0]?.toUpperCase()}
                                    </div>

                                    {/* Drug info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{item.drug_name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {item.generic_name && (
                                                <p className="text-[10px] text-gray-400 truncate">{item.generic_name}</p>
                                            )}
                                            {item.category && (
                                                <span className="text-[9px] font-bold text-gray-400 uppercase">· {item.category}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Price + stock */}
                                    <div className="text-right shrink-0 space-y-0.5">
                                        <p className="text-xs font-extrabold text-gray-800">
                                            ₦{Number(item.unit_price).toLocaleString("en-NG")}
                                        </p>
                                        <div className="flex items-center gap-1 justify-end">
                                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                            <p className={`text-[10px] font-bold ${s.color}`}>{s.label}</p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer hint */}
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400">
                            {filtered.length} result{filtered.length !== 1 ? "s" : ""} · Greyed out = out of stock
                        </p>
                    </div>
                </div>
            )}

            {/* No results */}
            {open && query.trim().length > 0 && filtered.length === 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-gray-100 shadow-xl px-4 py-4 text-center">
                    <Package size={16} className="text-gray-300 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-gray-500">No matching drug found</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">You can still type the name manually</p>
                </div>
            )}

            {error && (
                <p className="flex items-center gap-1 text-[10px] text-red-500 font-semibold mt-1">
                    <AlertCircle size={9} /> {error}
                </p>
            )}
        </div>
    );
}

// ─── Field input helper ───────────────────────────────────────────────────────

function FieldInput({
    label, required, placeholder, value, error, disabled, onChange, type = "text", icon,
}: {
    label: string; required?: boolean; placeholder?: string;
    value: string; error?: string; disabled?: boolean;
    onChange: (v: string) => void; type?: string; icon?: React.ReactNode;
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function PrescriptionDetails({ patientId, patient, onSuccess }: Props) {
    const { user } = useAuth();
    const { mutate: createPrescription, loading: creating } = useCreatePrescription();
    const { data: inventory = [], loading: loadingInv } = useDrugInventory();

    const [medications, setMedications] = useState<MedicationInput[]>([{ ...BLANK }]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const busy = submitting || creating;

    const update = (idx: number, field: keyof MedicationInput, val: any) => {
        setMedications((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: val };
            return next;
        });
        setErrors((prev) => { const n = { ...prev }; delete n[`${idx}_${field}`]; return n; });
    };

    // Called when user picks a drug from the dropdown
    const handleDrugSelect = (idx: number, item: DrugInventoryItem) => {
        setMedications((prev) => {
            const next = [...prev];
            next[idx] = {
                ...next[idx],
                drugName: item.drug_name,
                price: String(item.unit_price),
                unit: item.unit,
                inventoryItemId: item.id,
                stockQty: item.quantity,
            };
            return next;
        });
        // Clear related errors
        setErrors((prev) => {
            const n = { ...prev };
            delete n[`${idx}_drugName`];
            delete n[`${idx}_price`];
            return n;
        });
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

            toast.success(`${medications.length} prescription${medications.length > 1 ? "s" : ""} dispensed. Payment pending front desk confirmation.`);
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

            {/* Global error */}
            {errors.global && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                    <AlertCircle size={13} className="text-red-500 shrink-0" />
                    <p className="text-xs text-red-600 font-medium">{errors.global}</p>
                </div>
            )}

            {/* Medication cards */}
            <div className="space-y-3">
                {medications.map((med, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">

                        {/* Card header */}
                        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100/80">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                                    <FlaskConical size={13} className="text-violet-600" />
                                </div>
                                <p className="text-xs font-bold text-gray-700">
                                    {med.drugName.trim() || `Medication ${idx + 1}`}
                                </p>
                                {/* Stock warning badge */}
                                {med.stockQty !== null && med.stockQty === 0 && (
                                    <span className="flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                                        <AlertTriangle size={9} /> Out of Stock
                                    </span>
                                )}
                                {med.stockQty !== null && med.stockQty > 0 && med.stockQty <= 10 && (
                                    <span className="flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                                        <AlertTriangle size={9} /> Low: {med.stockQty} left
                                    </span>
                                )}
                                {med.stockQty !== null && med.stockQty > 10 && (
                                    <span className="flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-100">
                                        <CheckCircle2 size={9} /> {med.stockQty} {med.unit} in stock
                                    </span>
                                )}
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

                            {/* Drug name autocomplete — full width */}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                    Drug Name <span className="text-red-500">*</span>
                                </Label>
                                <DrugAutocomplete
                                    value={med.drugName}
                                    onChange={(v) => update(idx, "drugName", v)}
                                    onSelect={(item) => handleDrugSelect(idx, item)}
                                    inventory={inventory}
                                    disabled={busy || loadingInv}
                                    error={errors[`${idx}_drugName`]}
                                />
                                {loadingInv && (
                                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <Loader2 size={9} className="animate-spin" /> Loading inventory...
                                    </p>
                                )}
                            </div>

                            {/* Dosage + Price */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FieldInput label="Dosage" required placeholder="e.g. 1 tablet every 8h"
                                    value={med.dosage} error={errors[`${idx}_dosage`]} disabled={busy}
                                    onChange={(v) => update(idx, "dosage", v)} />
                                <FieldInput label="Price (₦)" required placeholder="Auto-filled from inventory"
                                    type="number" value={med.price} error={errors[`${idx}_price`]} disabled={busy}
                                    onChange={(v) => update(idx, "price", v)}
                                    icon={<BadgeDollarSign size={12} className="text-gray-400" />} />
                            </div>

                            {/* Duration + Notes */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FieldInput label="Duration" placeholder="e.g. 5 days"
                                    value={med.duration} disabled={busy}
                                    onChange={(v) => update(idx, "duration", v)} />
                                <FieldInput label="Notes" placeholder="e.g. Take after meals"
                                    value={med.notes} disabled={busy}
                                    onChange={(v) => update(idx, "notes", v)} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add medication */}
            <button type="button" onClick={addMed} disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 hover:border-violet-300 hover:bg-violet-50/40 text-gray-400 hover:text-violet-600 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50">
                <Plus size={13} /> Add Another Medication
            </button>

            {/* Total */}
            {hasPrice && (
                <div className="flex items-center justify-between px-4 py-3 bg-violet-50 border border-violet-100 rounded-2xl">
                    <p className="text-xs font-bold text-violet-600 uppercase tracking-widest">Total Amount</p>
                    <p className="text-base font-extrabold text-violet-800">
                        ₦{total.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                    </p>
                </div>
            )}

            {/* Info banner */}
            <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
                <AlertCircle size={13} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                    Prescriptions are automatically dispensed on submit. A payment record will be created and sent to front desk for confirmation. Stock will be deducted automatically.
                </p>
            </div>

            {/* Submit */}
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