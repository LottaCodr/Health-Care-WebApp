"use client";

import React, { useState } from "react";
import { getAIClinicalAssistance } from "@/lib/ai-service";
import {
    Sparkles, Loader2, ChevronDown, ChevronUp,
    AlertTriangle, FlaskConical, BookOpen, Activity,
    ShieldAlert, CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    symptoms: string;
    diagnosis?: string;
    patientAge?: number;
    patientGender?: string;
    medicalHistory?: string;
    currentMeds?: string;
    allergies?: string;
}

type AIResult = Awaited<ReturnType<typeof getAIClinicalAssistance>>;

const LIKELIHOOD_CONFIG = {
    High: { color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
    Medium: { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    Low: { color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIClinicalAssistant({ symptoms, diagnosis, patientAge, patientGender, medicalHistory, currentMeds, allergies }: Props) {
    const [result, setResult] = useState<AIResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(true);

    const analyse = async () => {
        if (!symptoms.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await getAIClinicalAssistance({ symptoms, existingDiagnosis: diagnosis, patientAge, patientGender, medicalHistory, currentMeds, allergies });
            setResult(res);
            setExpanded(true);
        } catch (e: any) {
            setError(e.message ?? "AI analysis failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-50 to-transparent border-b border-indigo-100/60">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center">
                        <Sparkles size={13} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800">AI Clinical Assistant</p>
                        <p className="text-[10px] text-indigo-500 font-medium">Powered by Claude</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {result && (
                        <button onClick={() => setExpanded(v => !v)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    )}
                    <button
                        onClick={analyse}
                        disabled={loading || !symptoms.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        {loading ? "Analysing..." : result ? "Re-analyse" : "Analyse"}
                    </button>
                </div>
            </div>

            {/* Empty prompt */}
            {!result && !loading && !error && (
                <div className="px-5 py-5 text-center">
                    <p className="text-xs text-gray-400">Enter symptoms above then click <strong className="text-indigo-600">Analyse</strong> for AI-assisted clinical decision support.</p>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="px-5 py-4 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-500 shrink-0" />
                    <p className="text-xs text-red-600">{error}</p>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="px-5 py-6 flex items-center justify-center gap-3">
                    <Loader2 size={16} className="text-indigo-500 animate-spin" />
                    <p className="text-sm text-gray-400">Claude is analysing the presentation...</p>
                </div>
            )}

            {/* Results */}
            {result && expanded && !loading && (
                <div className="px-5 py-4 space-y-4">

                    {/* Differentials */}
                    <Section icon={<Activity size={13} className="text-indigo-600" />} label="Differential Diagnoses">
                        <div className="space-y-2">
                            {result.differentials.map((d, i) => {
                                const cfg = LIKELIHOOD_CONFIG[d.likelihood];
                                return (
                                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.border} ${cfg.bg}`}>
                                        <span className={`text-[10px] font-black uppercase tracking-widest shrink-0 mt-0.5 ${cfg.color}`}>{d.likelihood}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-800">{d.diagnosis}</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{d.reasoning}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Section>

                    {/* Red flags */}
                    {result.redFlags.length > 0 && (
                        <Section icon={<ShieldAlert size={13} className="text-red-600" />} label="Red Flags">
                            <div className="space-y-1.5">
                                {result.redFlags.map((flag, i) => (
                                    <div key={i} className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
                                        <AlertTriangle size={11} className="text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-red-700 font-medium">{flag}</p>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Suggested tests */}
                    <Section icon={<FlaskConical size={13} className="text-indigo-600" />} label="Suggested Investigations">
                        <div className="flex flex-wrap gap-1.5">
                            {result.suggestedTests.map((test, i) => (
                                <span key={i} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    {test}
                                </span>
                            ))}
                        </div>
                    </Section>

                    {/* ICD-10 */}
                    <Section icon={<BookOpen size={13} className="text-indigo-600" />} label="ICD-10 Codes">
                        <div className="flex flex-wrap gap-1.5">
                            {result.icd10Codes.map((code, i) => (
                                <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-xl">
                                    <span className="text-[10px] font-black text-gray-500">{code.code}</span>
                                    <span className="text-[10px] text-gray-600">{code.description}</span>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Clinical notes */}
                    {result.clinicalNotes && (
                        <div className="flex items-start gap-2.5 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                            <CheckCircle2 size={13} className="text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-blue-700 leading-relaxed">{result.clinicalNotes}</p>
                        </div>
                    )}

                    {/* Disclaimer */}
                    <p className="text-[9px] text-gray-300 text-center">AI suggestions are for clinical decision support only. Always apply professional medical judgement.</p>
                </div>
            )}
        </div>
    );
}

function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1.5">
                {icon}
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
            </div>
            {children}
        </div>
    );
}