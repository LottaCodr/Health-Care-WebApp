"use client";

import { useMemo, useState } from "react";
import {
    FlaskConical, CheckCircle, AlertTriangle, Info,
    FileText, ArrowRight, Layers, Printer, User, CalendarClock,
} from "lucide-react";
import {
    HEMATOLOGY_CATEGORIES,
    HEMATOLOGY_PARAMETERS,
    HEMATOLOGY_INPUT_KEYS,
    DEFAULT_HEMATOLOGY_CATEGORY,
    buildHematologyResultString,
    categoryDef,
    computeDerivedValues,
    evaluateFlag,
    formatAgeLabel,
    rangeFor,
    resolveHematologyCategory,
    type HematologyCategory,
} from "@/lib/clinical/hematology-reference-ranges";

// ─── Props ──────────────────────────────────────────────────────────────────

interface HematologyAnalyzerFormProps {
    testType: string;
    onSubmit: (resultString: string) => void | Promise<void>;
    submitting?: boolean;
    patient?: { age?: number | null; gender?: string | null; name?: string | null } | null;
    sampleId?: string | null;
}

const MODES = ["Whole Blood", "Capillary", "Prediluted"];

const FLAG_CHIP: Record<string, string> = {
    H: "bg-red-50 text-red-700 border-red-200",
    L: "bg-sky-50 text-sky-700 border-sky-200",
};

// ─── Field renderer ─────────────────────────────────────────────────────────

function AnalyzerField({
    label,
    value,
    unit,
    refRange,
    flag,
    onChange,
}: {
    label: string;
    value: string;
    unit: string;
    refRange: string;
    flag: "" | "L" | "H";
    onChange: (v: string) => void;
}) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-1">
                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    {label}
                </label>
                {flag && (
                    <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-black border ${FLAG_CHIP[flag]}`}>
                        {flag}
                    </span>
                )}
            </div>
            <div className="relative">
                <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="—"
                    className={`w-full h-10 px-3 rounded-xl border bg-gray-50 text-sm font-mono font-semibold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/25 focus:border-indigo-400 focus:bg-white transition-all ${unit ? "pr-12" : ""}`}
                />
                {unit && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md pointer-events-none whitespace-nowrap">
                        {unit}
                    </span>
                )}
            </div>
            <p className={`text-[10px] font-medium ${refRange ? "text-gray-400" : "text-gray-300"}`}>
                Ref: {refRange || "—"}
            </p>
        </div>
    );
}

// ─── Main ───────────────────────────────────────────────────────────────────

export default function HematologyAnalyzerForm({
    testType,
    onSubmit,
    submitting,
    patient,
    sampleId,
}: HematologyAnalyzerFormProps) {
    const [values, setValues] = useState<Record<string, string>>({});
    const [category, setCategory] = useState<HematologyCategory | null>(null);
    const [mode, setMode] = useState(MODES[0]);
    const [extraNotes, setExtraNotes] = useState("");
    const [touched, setTouched] = useState(false);

    // Auto-resolve the reference partition from the patient (age + sex).
    const resolved = useMemo(
        () => resolveHematologyCategory(patient?.age ?? null, patient?.gender ?? null),
        [patient?.age, patient?.gender],
    );

    const activeCategory: HematologyCategory = category ?? resolved.category ?? DEFAULT_HEMATOLOGY_CATEGORY;
    const isManual = category !== null && category !== (resolved.category ?? null);
    const warn = resolved.note?.includes("unknown") || resolved.note?.includes("confirm");

    const derived = useMemo(() => computeDerivedValues(values), [values]);
    const inputCount = HEMATOLOGY_INPUT_KEYS.length;
    const filledCount = HEMATOLOGY_INPUT_KEYS.filter((k) => values[k]?.trim()).length;

    const handleChange = (key: string, val: string) => {
        setValues((prev) => ({ ...prev, [key]: val }));
        setTouched(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const resultString = buildHematologyResultString({
            category: activeCategory,
            categoryNote: isManual ? "Selected manually" : (resolved.note ?? undefined),
            mode,
            sampleId: sampleId ?? null,
            testTime: new Date().toISOString(),
            values,
            extraNotes,
        });
        await onSubmit(resultString);
    };

    const ageLabel =
        patient?.age !== null && patient?.age !== undefined
            ? formatAgeLabel(patient.age)
            : null;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header card */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <FlaskConical size={16} className="text-indigo-700" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                            Hematology Analyzer · {HEMATOLOGY_PARAMETERS.length} rows · 5-part differential
                        </p>
                        <p className="text-base font-bold text-gray-900">{testType || "Full Blood Count (FBC)"}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                    <div className="flex-1 h-2 bg-white rounded-full overflow-hidden border border-indigo-100">
                        <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${inputCount > 0 ? (filledCount / inputCount) * 100 : 0}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 shrink-0">
                        {filledCount}/{inputCount} fields
                    </span>
                </div>
            </div>

            {/* Reference set + run meta */}
            <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100 space-y-4">
                <div className="flex items-center gap-2">
                    <Layers size={14} className="text-indigo-600" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Reference Set &amp; Run Details
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Reference Range Set</label>
                        <select
                            value={activeCategory}
                            onChange={(e) => setCategory(e.target.value as HematologyCategory)}
                            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400/25 focus:border-indigo-400 cursor-pointer appearance-none"
                        >
                            {HEMATOLOGY_CATEGORIES.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.label} ({c.population})
                                </option>
                            ))}
                        </select>
                        <p className="text-[10px] font-medium text-gray-400">
                            {isManual ? "Selected manually by lab tech" : (resolved.note ?? "Age unknown — verify manually")}
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">Mode</label>
                        <select
                            value={mode}
                            onChange={(e) => setMode(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400/25 focus:border-indigo-400 cursor-pointer appearance-none"
                        >
                            {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1 text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                            <User size={10} /> Patient
                        </label>
                        <div className="h-10 flex items-center px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-800 truncate">
                            {patient?.name ?? "—"}
                            {ageLabel && <span className="ml-2 text-[10px] font-bold text-gray-400 shrink-0">({ageLabel}, {patient?.gender ?? "?"})</span>}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1 text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                            <CalendarClock size={10} /> Sample ID / Time
                        </label>
                        <div className="h-10 flex items-center px-3 rounded-xl border border-gray-200 bg-gray-50 text-xs font-mono font-bold text-gray-700 truncate">
                            {sampleId?.slice(-8).toUpperCase() ?? "—"}
                            <span className="ml-2 font-sans font-medium text-gray-400 shrink-0">
                                {new Date().toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                        </div>
                    </div>
                </div>

                {warn && (
                    <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800 leading-relaxed">
                            {resolved.note} Flags are computed against the reference set selected above — please confirm it matches the patient.
                        </p>
                    </div>
                )}
            </div>

            {/* Parameters grid */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Test Parameters — flags auto-computed vs {categoryDef(activeCategory).label}
                    </p>
                    <span className="text-[10px] font-bold text-gray-400">
                        H = high · L = low
                    </span>
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {HEMATOLOGY_PARAMETERS.map((p) => {
                        if (p.derived) return null;
                        const value = values[p.key] ?? "";
                        const ref = rangeFor(p, activeCategory);
                        const flag = evaluateFlag(value, ref);
                        return (
                            <AnalyzerField
                                key={p.key}
                                label={p.label}
                                value={value}
                                unit={p.unit}
                                refRange={ref}
                                flag={flag}
                                onChange={(v) => handleChange(p.key, v)}
                            />
                        );
                    })}
                </div>

                {/* Derived parameters */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3">
                        Derived Parameters (auto-computed)
                    </p>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">NLR</label>
                                <span className="text-[9px] font-bold text-indigo-500 bg-white border border-indigo-100 px-1.5 py-0.5 rounded-md">Gran# ÷ Lym#</span>
                            </div>
                            <div className="h-10 flex items-center px-3 rounded-xl border border-indigo-100 bg-white text-sm font-mono font-bold text-indigo-700">
                                {derived.nlr}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">PLR</label>
                                <span className="text-[9px] font-bold text-indigo-500 bg-white border border-indigo-100 px-1.5 py-0.5 rounded-md">PLT ÷ Lym#</span>
                            </div>
                            <div className="h-10 flex items-center px-3 rounded-xl border border-indigo-100 bg-white text-sm font-mono font-bold text-indigo-700">
                                {derived.plr}
                            </div>
                        </div>
                    </div>
                </div>

                {touched && filledCount === 0 && (
                    <p className="text-[10px] font-semibold text-amber-600 flex items-center gap-1">
                        <Info size={10} /> No results entered yet — empty rows will print as “—” on the report.
                    </p>
                )}
            </div>

            {/* Extra notes */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-3">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <FileText size={12} className="text-indigo-500" />
                    Additional Notes / Observations
                </label>
                <textarea
                    value={extraNotes}
                    onChange={(e) => setExtraNotes(e.target.value)}
                    rows={3}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400/25 focus:border-indigo-400 text-sm placeholder:text-gray-300 transition-all resize-none"
                    placeholder="Smear comments, sample quality, flags requiring manual review…"
                />
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={submitting}
                className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-base font-bold shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {submitting ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing Results...
                    </>
                ) : (
                    <>
                        <Printer size={18} />
                        Authorize &amp; Release Analyzer Report
                        <ArrowRight size={16} />
                    </>
                )}
            </button>
        </form>
    );
}
