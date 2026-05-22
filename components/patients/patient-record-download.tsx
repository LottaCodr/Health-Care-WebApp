"use client";

import React, { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecordSection =
    | "demographics"
    | "consultations"
    | "lab_results"
    | "radiology"
    | "drug_chart"
    | "fluid_balance"
    | "discharge_note"
    | "payments";

const SECTION_LABELS: Record<RecordSection, string> = {
    demographics:   "Patient Demographics",
    consultations:  "Consultation Notes",
    lab_results:    "Lab Results",
    radiology:      "Radiology Reports",
    drug_chart:     "Drug Chart",
    fluid_balance:  "Fluid Balance Chart",
    discharge_note: "Discharge Summary",
    payments:       "Payment History",
};

const ALL_SECTIONS: RecordSection[] = Object.keys(SECTION_LABELS) as RecordSection[];

interface DownloadOptions {
    sections:    RecordSection[];
    dateFrom:    string;
    dateTo:      string;
    format:      "pdf" | "print";
    includeStamp:boolean;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PatientRecordDownloadProps {
    patientId:   string;
    patientName: string;
    /** Called with the selected options — caller handles actual generation */
    onDownload:  (options: DownloadOptions) => Promise<void>;
}

// ─── Section Toggle ───────────────────────────────────────────────────────────

interface SectionToggleProps {
    section:   RecordSection;
    checked:   boolean;
    onChange:  (checked: boolean) => void;
}

function SectionToggle({ section, checked, onChange }: SectionToggleProps) {
    return (
        <label className="flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors group">
            <div
                onClick={() => onChange(!checked)}
                className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    checked ? "bg-teal-600 border-teal-600" : "border-slate-300 group-hover:border-teal-400"
                }`}
            >
                {checked && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>
            <span className="text-sm text-slate-700 select-none">{SECTION_LABELS[section]}</span>
        </label>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PatientRecordDownload({ patientId, patientName, onDownload }: PatientRecordDownloadProps) {
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

    function toggleSection(section: RecordSection, val: boolean) {
        setOptions((o) => ({
            ...o,
            sections: val
                ? [...o.sections, section]
                : o.sections.filter((s) => s !== section),
        }));
    }

    function toggleAll() {
        setOptions((o) => ({
            ...o,
            sections: o.sections.length === ALL_SECTIONS.length ? [] : ALL_SECTIONS,
        }));
    }

    async function handleDownload() {
        if (options.sections.length === 0) return;
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

    const allSelected = options.sections.length === ALL_SECTIONS.length;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden w-full max-w-md">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800">Download Patient Record</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{patientName}</p>
                    </div>
                </div>
            </div>

            <div className="px-5 py-4 space-y-5">
                {/* Date range */}
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Date Range</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">From</label>
                            <input
                                type="date"
                                value={options.dateFrom}
                                max={options.dateTo || today}
                                onChange={(e) => setOptions((o) => ({ ...o, dateFrom: e.target.value }))}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">To</label>
                            <input
                                type="date"
                                value={options.dateTo}
                                max={today}
                                onChange={(e) => setOptions((o) => ({ ...o, dateTo: e.target.value }))}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Sections */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sections to Include</p>
                        <button onClick={toggleAll} className="text-xs text-teal-600 hover:underline">
                            {allSelected ? "Deselect all" : "Select all"}
                        </button>
                    </div>
                    <div className="rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                        {ALL_SECTIONS.map((s) => (
                            <SectionToggle
                                key={s}
                                section={s}
                                checked={options.sections.includes(s)}
                                onChange={(val) => toggleSection(s, val)}
                            />
                        ))}
                    </div>
                </div>

                {/* Format */}
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Format</p>
                    <div className="grid grid-cols-2 gap-2">
                        {(["pdf", "print"] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setOptions((o) => ({ ...o, format: f }))}
                                className={`py-2 rounded-lg text-sm font-medium border capitalize transition-colors ${
                                    options.format === f
                                        ? "bg-teal-600 text-white border-teal-600"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
                                }`}
                            >
                                {f === "pdf" ? "📄 PDF" : "🖨️ Print"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Official stamp */}
                <label className="flex items-center gap-3 cursor-pointer">
                    <div
                        onClick={() => setOptions((o) => ({ ...o, includeStamp: !o.includeStamp }))}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            options.includeStamp ? "bg-teal-600 border-teal-600" : "border-slate-300"
                        }`}
                    >
                        {options.includeStamp && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                    </div>
                    <span className="text-sm text-slate-700 select-none">Include hospital stamp &amp; signature line</span>
                </label>

                {/* Action */}
                <button
                    onClick={handleDownload}
                    disabled={options.sections.length === 0 || loading}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        done
                            ? "bg-green-600 text-white"
                            : "bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50"
                    }`}
                >
                    {loading ? "Generating…" : done ? "✓ Downloaded" : `Generate ${options.format.toUpperCase()}`}
                </button>

                {options.sections.length === 0 && (
                    <p className="text-xs text-center text-red-400">Select at least one section</p>
                )}
            </div>
        </div>
    );
}