"use client";

import React, { useState } from "react";
import { Download, Printer, Stamp, CalendarRange, LayoutList, Check, Layers, FileText, Activity } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecordSection =
    | "demographics"
    | "vitals"
    | "consultations"
    | "prescriptions"
    | "lab_results"
    | "radiology"
    | "drug_chart"
    | "fluid_balance"
    | "discharge_note"
    | "payments";

const SECTION_META: Record<RecordSection, { label: string; icon: string; desc: string }> = {
    demographics:   { label: "Patient Demographics",    icon: "👤", desc: "Bio data, contacts, insurance, allergies" },
    vitals:         { label: "Vital Signs & Nursing",   icon: "🩺", desc: "BP, pulse, temp, SpO2, nursing logs" },
    consultations:  { label: "Consultation Notes",      icon: "📋", desc: "Doctor assessment, symptoms, diagnosis" },
    prescriptions:  { label: "Prescriptions",           icon: "💊", desc: "Prescribed drugs, dosage, duration" },
    lab_results:    { label: "Lab Results",             icon: "🧪", desc: "Laboratory investigations and findings" },
    radiology:      { label: "Radiology Reports",       icon: "📡", desc: "Imaging results, X-Ray, ultrasound" },
    drug_chart:     { label: "Inpatient Drug Chart",    icon: "💉", desc: "Hospital medication administration" },
    fluid_balance:  { label: "Fluid Balance Chart",     icon: "💧", desc: "Intake/output monitoring records" },
    discharge_note: { label: "Discharge Summary",       icon: "📄", desc: "Discharge condition, course, follow-up" },
    payments:       { label: "Payment History",         icon: "💳", desc: "Invoices, transactions, payment status" },
};

const ALL_SECTIONS = Object.keys(SECTION_META) as RecordSection[];

const CLINICAL_SECTIONS: RecordSection[] = [
    "demographics", "vitals", "consultations", "prescriptions", "lab_results", "radiology", "discharge_note"
];

const BILLING_SECTIONS: RecordSection[] = [
    "demographics", "payments"
];

export interface DownloadOptions {
    sections:     RecordSection[];
    dateFrom:     string;
    dateTo:       string;
    format:       "pdf" | "print";
    includeStamp: boolean;
}

interface PatientRecordDownloadProps {
    patientId:   string;
    patientName: string;
    onDownload:  (options: DownloadOptions) => Promise<void>;
}

// ─── Section row ──────────────────────────────────────────────────────────────

function SectionRow({
    section,
    checked,
    onChange,
}: {
    section:  RecordSection;
    checked:  boolean;
    onChange: (v: boolean) => void;
}) {
    const meta = SECTION_META[section];
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all ${
                checked
                    ? "bg-blue-50/80 border border-blue-200 text-blue-900 shadow-xs"
                    : "bg-gray-50/60 border border-gray-100 text-gray-500 hover:border-gray-200 hover:text-gray-700"
            }`}
        >
            <span className="text-base shrink-0 leading-none">{meta.icon}</span>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-xs leading-tight text-gray-800">{meta.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{meta.desc}</p>
            </div>
            <span className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                checked ? "bg-blue-600 border-blue-600" : "border-gray-300 bg-white"
            }`}>
                {checked && <Check size={11} className="text-white stroke-[3]" />}
            </span>
        </button>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PatientRecordDownload({
    patientId,
    patientName,
    onDownload,
}: PatientRecordDownloadProps) {
    const today = new Date().toISOString().slice(0, 10);

    const [options, setOptions] = useState<DownloadOptions>({
        sections:     ALL_SECTIONS,
        dateFrom:     "",
        dateTo:       today,
        format:       "pdf",
        includeStamp: true,
    });
    const [loading, setLoading] = useState(false);
    const [done,    setDone]    = useState(false);

    const allSelected = options.sections.length === ALL_SECTIONS.length;
    const noneSelected = options.sections.length === 0;

    function toggleSection(section: RecordSection, val: boolean) {
        setOptions((o) => ({
            ...o,
            sections: val
                ? [...o.sections, section]
                : o.sections.filter((s) => s !== section),
        }));
    }

    function applyPreset(sections: RecordSection[]) {
        setOptions((o) => ({ ...o, sections }));
    }

    async function handleDownload() {
        if (noneSelected) return;
        setLoading(true);
        setDone(false);
        try {
            await onDownload(options);
            setDone(true);
            setTimeout(() => setDone(false), 3000);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-5">

            {/* ── Format selection ────────────────────────────────────────────── */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <LayoutList size={13} className="text-gray-400" />
                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Output Format</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {(["pdf", "print"] as const).map((f) => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setOptions((o) => ({ ...o, format: f }))}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                                options.format === f
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-800"
                            }`}
                        >
                            {f === "pdf" ? <Download size={14} /> : <Printer size={14} />}
                            {f === "pdf" ? "Export as PDF File" : "Print Document"}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Presets ────────────────────────────────────────────────────── */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <Layers size={13} className="text-gray-400" />
                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Quick Presets</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <button
                        type="button"
                        onClick={() => applyPreset(ALL_SECTIONS)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                            allSelected
                                ? "bg-blue-50 border-blue-200 text-blue-700"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                        Full Record ({ALL_SECTIONS.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => applyPreset(CLINICAL_SECTIONS)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Clinical Only ({CLINICAL_SECTIONS.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => applyPreset(BILLING_SECTIONS)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Billing Only
                    </button>
                    <button
                        type="button"
                        onClick={() => applyPreset([])}
                        className="px-3 py-1 rounded-lg text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors ml-auto"
                    >
                        Clear all
                    </button>
                </div>
            </div>

            {/* ── Sections Checkboxes ────────────────────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                        Include Sections ({options.sections.length}/{ALL_SECTIONS.length})
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
                    {ALL_SECTIONS.map((s) => (
                        <SectionRow
                            key={s}
                            section={s}
                            checked={options.sections.includes(s)}
                            onChange={(val) => toggleSection(s, val)}
                        />
                    ))}
                </div>
                {noneSelected && (
                    <p className="text-xs text-red-500 font-medium mt-1.5 text-center">Select at least one section to include</p>
                )}
            </div>

            {/* ── Date range ──────────────────────────────────────────────────── */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <CalendarRange size={13} className="text-gray-400" />
                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Date Range (Optional)</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide block mb-1">From Date</label>
                        <input
                            type="date"
                            value={options.dateFrom}
                            max={options.dateTo || today}
                            onChange={(e) => setOptions((o) => ({ ...o, dateFrom: e.target.value }))}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50 text-gray-800"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide block mb-1">To Date</label>
                        <input
                            type="date"
                            value={options.dateTo}
                            max={today}
                            onChange={(e) => setOptions((o) => ({ ...o, dateTo: e.target.value }))}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50 text-gray-800"
                        />
                    </div>
                </div>
            </div>

            {/* ── Hospital stamp ───────────────────────────────────────────────── */}
            <button
                type="button"
                onClick={() => setOptions((o) => ({ ...o, includeStamp: !o.includeStamp }))}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
                    options.includeStamp
                        ? "bg-blue-50/80 border-blue-200 text-blue-900"
                        : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
            >
                <Stamp size={16} className={options.includeStamp ? "text-blue-600" : "text-gray-400"} />
                <span className="flex-1 text-left text-xs font-semibold">Include authorization stamp &amp; signature line</span>
                <span className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    options.includeStamp ? "bg-blue-600 border-blue-600" : "border-gray-300 bg-white"
                }`}>
                    {options.includeStamp && <Check size={11} className="text-white stroke-[3]" />}
                </span>
            </button>

            {/* ── Generate button ──────────────────────────────────────────────── */}
            <button
                type="button"
                onClick={handleDownload}
                disabled={noneSelected || loading}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    done
                        ? "bg-green-600 text-white shadow-green-200"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
                }`}
            >
                {loading ? (
                    <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Generating {options.format.toUpperCase()}…
                    </>
                ) : done ? (
                    <>✓ Generated Successfully</>
                ) : (
                    <>
                        {options.format === "pdf" ? <Download size={15} /> : <Printer size={15} />}
                        Generate {options.format.toUpperCase()} Record
                    </>
                )}
            </button>
        </div>
    );
}
