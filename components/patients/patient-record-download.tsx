"use client";

import React, { useState } from "react";
import { Download, Printer, Stamp, CalendarRange, LayoutList } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecordSection =
    | "demographics"
    | "vitals"
    | "consultations"
    | "lab_results"
    | "radiology"
    | "drug_chart"
    | "fluid_balance"
    | "discharge_note"
    | "payments";

const SECTION_META: Record<RecordSection, { label: string; icon: string }> = {
    demographics: { label: "Patient Demographics", icon: "👤" },
    vitals: { label: "Vitals", icon: "🩺" },
    consultations:  { label: "Consultation Notes",     icon: "🩺" },
    lab_results:    { label: "Lab Results",            icon: "🧪" },
    radiology:      { label: "Radiology Reports",      icon: "📡" },
    drug_chart:     { label: "Drug Chart",             icon: "💊" },
    fluid_balance:  { label: "Fluid Balance Chart",    icon: "💧" },
    discharge_note: { label: "Discharge Summary",      icon: "📋" },
    payments:       { label: "Payment History",        icon: "💳" },
};

const ALL_SECTIONS = Object.keys(SECTION_META) as RecordSection[];

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
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                checked
                    ? "bg-blue-50 border border-blue-100 text-blue-800"
                    : "bg-gray-50 border border-transparent text-gray-500 hover:border-gray-200 hover:text-gray-700"
            }`}
        >
            <span className="text-base leading-none">{meta.icon}</span>
            <span className="flex-1 text-left font-medium text-xs">{meta.label}</span>
            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                checked ? "bg-blue-600 border-blue-600" : "border-gray-300"
            }`}>
                {checked && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                )}
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

    function toggleAll() {
        setOptions((o) => ({
            ...o,
            sections: allSelected ? [] : [...ALL_SECTIONS],
        }));
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

            {/* ── Format ─────────────────────────────────────────────────────── */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <LayoutList size={13} className="text-gray-400" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Format</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {(["pdf", "print"] as const).map((f) => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setOptions((o) => ({ ...o, format: f }))}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                                options.format === f
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200"
                                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                            }`}
                        >
                            {f === "pdf"
                                ? <Download size={14} />
                                : <Printer size={14} />
                            }
                            {f === "pdf" ? "PDF" : "Print"}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Date range ──────────────────────────────────────────────────── */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <CalendarRange size={13} className="text-gray-400" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Date Range</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide block mb-1">From</label>
                        <input
                            type="date"
                            value={options.dateFrom}
                            max={options.dateTo || today}
                            onChange={(e) => setOptions((o) => ({ ...o, dateFrom: e.target.value }))}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide block mb-1">To</label>
                        <input
                            type="date"
                            value={options.dateTo}
                            max={today}
                            onChange={(e) => setOptions((o) => ({ ...o, dateTo: e.target.value }))}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50"
                        />
                    </div>
                </div>
            </div>

            {/* ── Sections ────────────────────────────────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <LayoutList size={13} className="text-gray-400" />
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Sections</p>
                    </div>
                    <button
                        type="button"
                        onClick={toggleAll}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                    >
                        {allSelected ? "Deselect all" : "Select all"}
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
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
                    <p className="text-xs text-red-400 mt-1.5 text-center">Select at least one section</p>
                )}
            </div>

            {/* ── Hospital stamp ───────────────────────────────────────────────── */}
            <button
                type="button"
                onClick={() => setOptions((o) => ({ ...o, includeStamp: !o.includeStamp }))}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    options.includeStamp
                        ? "bg-blue-50 border-blue-100 text-blue-800"
                        : "bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-200"
                }`}
            >
                <Stamp size={15} className={options.includeStamp ? "text-blue-600" : "text-gray-400"} />
                <span className="flex-1 text-left text-sm font-medium">Include hospital stamp &amp; signature line</span>
                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                    options.includeStamp ? "bg-blue-600 border-blue-600" : "border-gray-300"
                }`}>
                    {options.includeStamp && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </span>
            </button>

            {/* ── Generate button ──────────────────────────────────────────────── */}
            <button
                type="button"
                onClick={handleDownload}
                disabled={noneSelected || loading}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    done
                        ? "bg-green-600 text-white shadow-sm shadow-green-200"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200"
                }`}
            >
                {loading ? (
                    <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Generating…
                    </>
                ) : done ? (
                    <>✓ Downloaded</>
                ) : (
                    <>
                        {options.format === "pdf" ? <Download size={15} /> : <Printer size={15} />}
                        Generate {options.format.toUpperCase()}
                    </>
                )}
            </button>
        </div>
    );
}