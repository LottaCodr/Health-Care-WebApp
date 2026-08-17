"use client";

import { useState, useMemo, useCallback } from "react";
import {
    FileText, CheckCircle, AlertCircle,
    Info, ChevronDown, ChevronUp, FlaskConical,
    ClipboardList, Activity, ArrowRight,
} from "lucide-react";
import {
    findTemplate,
    buildResultString,
    type InterpretationTable,
    type TemplateField,
} from "./test-templates";
import HematologyAnalyzerForm from "./HematologyAnalyzerForm";

// ─── Props ──────────────────────────────────────────────────────────────────

export interface PatientContext {
    age?: number | null;
    gender?: string | null;
    name?: string | null;
}

interface TestTemplateFormProps {
    testType: string;
    onSubmit: (resultString: string) => void | Promise<void>;
    submitting?: boolean;
    /**
     * Patient age (years) and gender — used by age/sex-partitioned templates
     * (e.g. the hematology analyzer) to pick the correct reference set.
     */
    patient?: PatientContext | null;
    /** Sample / visit id shown on analyzer printouts. */
    sampleId?: string | null;
}

// ─── Colour helpers ─────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
    green:  "bg-green-50 text-green-800 border-green-200",
    yellow: "bg-amber-50 text-amber-800 border-amber-200",
    red:    "bg-red-50 text-red-800 border-red-200",
    blue:   "bg-blue-50 text-blue-800 border-blue-200",
    gray:   "bg-gray-50 text-gray-700 border-gray-200",
};

// ─── Single field renderer ──────────────────────────────────────────────────

function TemplateFieldInput({
    field,
    value,
    onChange,
    error,
}: {
    field: TemplateField;
    value: string;
    onChange: (val: string) => void;
    error?: string;
}) {
    const baseInput =
        "w-full h-10 px-3 rounded-xl border bg-gray-50 text-sm font-semibold text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400/25 focus:border-indigo-400 focus:bg-white transition-all";

    if (field.type === "select" && field.options) {
        return (
            <div className="space-y-1.5">
                <label className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </span>
                    {field.refRange && (
                        <span className="text-[10px] text-gray-400 font-medium">
                            Ref: {field.refRange}
                        </span>
                    )}
                </label>
                <div className="relative">
                    <select
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className={`${baseInput} appearance-none cursor-pointer ${error ? "border-red-300 ring-1 ring-red-200" : "border-gray-200"}`}
                    >
                        <option value="">Select…</option>
                        {field.options.map((o) => (
                            <option key={o} value={o}>{o}</option>
                        ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {error && (
                    <p className="flex items-center gap-1 text-[10px] text-red-500 font-semibold">
                        <AlertCircle size={10} /> {error}
                    </p>
                )}
            </div>
        );
    }

    if (field.type === "numeric") {
        return (
            <div className="space-y-1.5">
                <label className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </span>
                    {field.refRange && (
                        <span className="text-[10px] text-gray-400 font-medium">
                            Ref: {field.refRange}
                        </span>
                    )}
                </label>
                <div className="relative">
                    <input
                        type="text"
                        inputMode="decimal"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
                        className={`${baseInput} ${field.unit ? "pr-14" : ""} ${error ? "border-red-300 ring-1 ring-red-200" : "border-gray-200"}`}
                    />
                    {field.unit && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md pointer-events-none">
                            {field.unit}
                        </span>
                    )}
                </div>
                {error && (
                    <p className="flex items-center gap-1 text-[10px] text-red-500 font-semibold">
                        <AlertCircle size={10} /> {error}
                    </p>
                )}
            </div>
        );
    }

    // text
    return (
        <div className="space-y-1.5">
            <label className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </span>
                {field.refRange && (
                    <span className="text-[10px] text-gray-400 font-medium">
                        Ref: {field.refRange}
                    </span>
                )}
            </label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
                className={`${baseInput} ${field.unit ? "pr-14" : ""} ${error ? "border-red-300 ring-1 ring-red-200" : "border-gray-200"}`}
            />
            {error && (
                <p className="flex items-center gap-1 text-[10px] text-red-500 font-semibold">
                    <AlertCircle size={10} /> {error}
                </p>
            )}
        </div>
    );
}

// ─── Interpretation Table ───────────────────────────────────────────────────

function InterpretationCard({ table }: { table: InterpretationTable }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50/60 transition-colors"
            >
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    {table.title ?? "Interpretation Guide"}
                </span>
                {expanded ? <ChevronUp size={12} className="text-gray-400" /> : <ChevronDown size={12} className="text-gray-400" />}
            </button>
            {expanded && (
                <div className="px-4 pb-3 space-y-1.5">
                    {table.rows.map((row, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border ${COLOR_MAP[row.color ?? "gray"]}`}
                        >
                            <span className="font-bold min-w-[120px] shrink-0">{row.range}</span>
                            <span className="flex-1">{row.remark}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function TestTemplateForm({ testType, onSubmit, submitting, patient, sampleId }: TestTemplateFormProps) {
    const template = useMemo(() => findTemplate(testType), [testType]);
    const [values, setValues] = useState<Record<string, string>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [extraNotes, setExtraNotes] = useState("");

    const handleChange = useCallback((key: string, val: string) => {
        setValues((prev) => ({ ...prev, [key]: val }));
        setErrors((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }, []);

    const validate = useCallback((): boolean => {
        if (!template) return true; // free-text fallback
        const errs: Record<string, string> = {};
        for (const f of template.fields) {
            if (f.required && !values[f.key]?.trim()) {
                errs[f.key] = "Required";
            }
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    }, [template, values]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        let resultString: string;

        if (template) {
            resultString = buildResultString(template, values);
            if (extraNotes.trim()) {
                resultString += `\n\nAdditional Notes:\n${extraNotes.trim()}`;
            }
        } else {
            // Fallback: just the notes
            resultString = extraNotes.trim() || "No results entered";
        }

        await onSubmit(resultString);
    };

    // ─── Age/sex-partitioned analyzer template (hematology) ───
    // Rendered after all hooks for rules-of-hooks compliance. The analyzer
    // form resolves the reference set from the patient's age & sex, computes
    // H/L flags live, auto-derives NLR/PLR, and emits the printout format.
    if (template?.kind === "hematology-analyzer") {
        return (
            <HematologyAnalyzerForm
                testType={testType}
                onSubmit={onSubmit}
                submitting={submitting}
                patient={patient ?? null}
                sampleId={sampleId ?? null}
            />
        );
    }

    // ─── No template found → free-text fallback ───
    if (!template) {
        return (
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                        <Info size={18} className="text-amber-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800">
                            No structured template for &quot;{testType}&quot;
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Please enter results in free text below.
                        </p>
                    </div>
                </div>

                <textarea
                    value={extraNotes}
                    onChange={(e) => setExtraNotes(e.target.value)}
                    rows={8}
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm"
                    placeholder="Enter specimen findings, reference ranges, and conclusions..."
                    required
                />

                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-base font-bold shadow-xl shadow-blue-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    <CheckCircle size={18} />
                    {submitting ? "Processing Results..." : "Authorize & Release Results"}
                </button>
            </form>
        );
    }

    // ─── Structured template form ───
    const fieldCount = template.fields.length;
    const filledCount = template.fields.filter((f) => values[f.key]?.trim()).length;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            {/* Template header card */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-5 rounded-2xl border border-indigo-100">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <FlaskConical size={16} className="text-indigo-700" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                            {template.category}
                        </p>
                        <p className="text-base font-bold text-gray-900">{template.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 mt-3">
                    <div className="flex-1 h-2 bg-white rounded-full overflow-hidden border border-indigo-100">
                        <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${fieldCount > 0 ? (filledCount / fieldCount) * 100 : 0}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 shrink-0">
                        {filledCount}/{fieldCount} fields
                    </span>
                </div>
            </div>

            {/* Fields grid */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-5">
                <div className="flex items-center gap-2">
                    <ClipboardList size={14} className="text-indigo-600" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Test Parameters
                    </p>
                </div>

                <div className={`grid gap-4 ${fieldCount <= 5 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
                    {template.fields.map((field) => (
                        <TemplateFieldInput
                            key={field.key}
                            field={field}
                            value={values[field.key] ?? ""}
                            onChange={(val) => handleChange(field.key, val)}
                            error={errors[field.key]}
                        />
                    ))}
                </div>
            </div>

            {/* Interpretation tables */}
            {template.interpretations && template.interpretations.length > 0 && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1">
                        <Activity size={13} className="text-indigo-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Interpretation Guides
                        </p>
                    </div>
                    <div className="space-y-2">
                        {template.interpretations.map((table, i) => (
                            <InterpretationCard key={i} table={table} />
                        ))}
                    </div>
                </div>
            )}

            {/* Note / Comment */}
            {template.note && (
                <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl">
                    <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-700 leading-relaxed">{template.note}</p>
                </div>
            )}

            {template.comment && (
                <details className="bg-gray-50 border border-gray-100 rounded-2xl overflow-hidden group">
                    <summary className="px-4 py-3 cursor-pointer text-xs font-bold text-gray-600 hover:text-gray-800 transition-colors">
                        📖 Clinical Comment / Background
                    </summary>
                    <div className="px-4 pb-4 text-xs text-gray-500 leading-relaxed whitespace-pre-line">
                        {template.comment}
                    </div>
                </details>
            )}

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
                    placeholder="Any additional clinical observations, specimen comments, etc."
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
                        <CheckCircle size={18} />
                        Authorize & Release Results
                        <ArrowRight size={16} />
                    </>
                )}
            </button>
        </form>
    );
}
