"use client";

/**
 * AI Components — Nile Valley Hospital
 * ─────────────────────────────────────
 * AITriageScore        → Nurse vitals form
 * AILabInterpretation  → Lab result view
 * AIPrescriptionCheck  → Pharmacist dispense
 * AIPatientSummary     → Any patient detail tab
 */

import React, { useState } from "react";
import { getAITriageScore, getAILabInterpretation, getAIPrescriptionSafetyCheck, getAIPatientSummary } from "@/lib/services/ai-service";
import {
    Sparkles, Loader2, AlertTriangle, CheckCircle2,
    ShieldAlert, Activity, ChevronDown, ChevronUp,
    Pill, FlaskConical, User, BookOpen,
} from "lucide-react";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function AIBadge() {
    return (
        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-400">
            <Sparkles size={9} /> Claude
        </span>
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

function AIDisclaimer() {
    return <p className="text-[9px] text-gray-300 text-center pt-1">AI-generated. Apply professional clinical judgement.</p>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AI TRIAGE SCORE
// ═══════════════════════════════════════════════════════════════════════════════

const RISK_CONFIG = {
    Critical: { color: "text-red-700", bg: "bg-red-600", light: "bg-red-50", border: "border-red-200", label: "CRITICAL" },
    High: { color: "text-orange-700", bg: "bg-orange-500", light: "bg-orange-50", border: "border-orange-200", label: "HIGH" },
    Medium: { color: "text-amber-700", bg: "bg-amber-500", light: "bg-amber-50", border: "border-amber-200", label: "MEDIUM" },
    Low: { color: "text-green-700", bg: "bg-green-500", light: "bg-green-50", border: "border-green-200", label: "LOW" },
};

interface TriageProps {
    bloodPressure?: string;
    temperature?: string;
    pulse?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
    bmi?: string;
    patientAge?: number;
    patientGender?: string;
    chiefComplaint?: string;
}

export function AITriageScore(props: TriageProps) {
    const [result, setResult] = useState<Awaited<ReturnType<typeof getAITriageScore>> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyse = async () => {
        setLoading(true); setError(null);
        try { setResult(await getAITriageScore(props)); }
        catch (e: any) { setError(e.message ?? "Triage analysis failed."); }
        finally { setLoading(false); }
    };

    const riskCfg = result ? RISK_CONFIG[result.riskLevel] : null;

    return (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-50 to-transparent border-b border-indigo-100/60">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center">
                        <Activity size={13} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800">AI Triage Score</p>
                        <AIBadge />
                    </div>
                </div>
                <button onClick={analyse} disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-all disabled:opacity-50">
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {loading ? "Scoring..." : result ? "Rescore" : "Score Risk"}
                </button>
            </div>

            {!result && !loading && !error && (
                <p className="px-5 py-5 text-xs text-gray-400 text-center">Click <strong className="text-indigo-600">Score Risk</strong> to generate an AI triage assessment from the vitals above.</p>
            )}
            {error && (
                <div className="px-5 py-4 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-500 shrink-0" />
                    <p className="text-xs text-red-600">{error}</p>
                </div>
            )}
            {loading && (
                <div className="px-5 py-6 flex items-center justify-center gap-3">
                    <Loader2 size={16} className="text-indigo-500 animate-spin" />
                    <p className="text-sm text-gray-400">Analysing vitals...</p>
                </div>
            )}

            {result && !loading && riskCfg && (
                <div className="px-5 py-4 space-y-4">

                    {/* Risk level hero */}
                    <div className={`flex items-center justify-between p-4 rounded-2xl border ${riskCfg.border} ${riskCfg.light}`}>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Risk Level</p>
                            <p className={`text-2xl font-black ${riskCfg.color}`}>{riskCfg.label}</p>
                            <p className="text-xs text-gray-600 mt-1 max-w-xs">{result.reasoning}</p>
                        </div>
                        <div className="relative w-16 h-16 shrink-0">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3"
                                    stroke={result.riskLevel === "Critical" ? "#dc2626" : result.riskLevel === "High" ? "#f97316" : result.riskLevel === "Medium" ? "#f59e0b" : "#22c55e"}
                                    strokeDasharray={`${result.score} 100`}
                                    strokeLinecap="round" />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-gray-700">{result.score}</span>
                        </div>
                    </div>

                    {/* Abnormal vitals */}
                    {result.abnormals.length > 0 && (
                        <Section icon={<AlertTriangle size={13} className="text-amber-600" />} label="Abnormal Findings">
                            <div className="space-y-1.5">
                                {result.abnormals.map((a, i) => (
                                    <div key={i} className="flex items-start gap-2.5 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                                        <div className="flex-1">
                                            <p className="text-[11px] font-bold text-amber-800">{a.vital}: <span className="font-black">{a.value}</span></p>
                                            <p className="text-[10px] text-amber-600 mt-0.5">{a.concern}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Actions */}
                    {result.actions.length > 0 && (
                        <Section icon={<CheckCircle2 size={13} className="text-indigo-600" />} label="Recommended Actions">
                            <div className="space-y-1.5">
                                {result.actions.map((a, i) => (
                                    <div key={i} className="flex items-start gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                                        <span className="text-indigo-400 font-black text-[10px] shrink-0 mt-0.5">{i + 1}.</span>
                                        <p className="text-[11px] text-indigo-700">{a}</p>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Escalate banner */}
                    {result.escalate && (
                        <div className="flex items-center gap-2.5 px-4 py-3 bg-red-600 rounded-2xl">
                            <ShieldAlert size={16} className="text-white shrink-0" />
                            <p className="text-xs font-bold text-white">Escalate to senior clinician immediately</p>
                        </div>
                    )}

                    <AIDisclaimer />
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. AI LAB INTERPRETATION
// ═══════════════════════════════════════════════════════════════════════════════

const FLAG_CONFIG = {
    Critical: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
    High: { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
    Low: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
    Normal: { color: "text-green-700", bg: "bg-green-50", border: "border-green-100" },
};

const URGENCY_CONFIG = {
    Immediate: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
    Urgent: { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-100" },
    Soon: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100" },
    Routine: { color: "text-green-700", bg: "bg-green-50", border: "border-green-100" },
};

interface LabProps {
    testType: string;
    result: string;
    patientAge?: number;
    patientGender?: string;
    medicalHistory?: string;
    currentMeds?: string;
}

export function AILabInterpretation(props: LabProps) {
    const [result, setResult] = useState<Awaited<ReturnType<typeof getAILabInterpretation>> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyse = async () => {
        setLoading(true); setError(null);
        try { setResult(await getAILabInterpretation(props)); }
        catch (e: any) { setError(e.message ?? "Interpretation failed."); }
        finally { setLoading(false); }
    };

    return (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-50 to-transparent border-b border-indigo-100/60">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center">
                        <FlaskConical size={13} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800">AI Lab Interpretation</p>
                        <AIBadge />
                    </div>
                </div>
                <button onClick={analyse} disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-all disabled:opacity-50">
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {loading ? "Interpreting..." : result ? "Re-interpret" : "Interpret Results"}
                </button>
            </div>

            {!result && !loading && !error && (
                <p className="px-5 py-5 text-xs text-gray-400 text-center">Click <strong className="text-indigo-600">Interpret Results</strong> for an AI clinical interpretation.</p>
            )}
            {error && <div className="px-5 py-4 flex items-center gap-2"><AlertTriangle size={14} className="text-red-500" /><p className="text-xs text-red-600">{error}</p></div>}
            {loading && <div className="px-5 py-6 flex items-center justify-center gap-3"><Loader2 size={16} className="text-indigo-500 animate-spin" /><p className="text-sm text-gray-400">Interpreting lab results...</p></div>}

            {result && !loading && (
                <div className="px-5 py-4 space-y-4">

                    {/* Summary + urgency */}
                    <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-gray-700 leading-relaxed flex-1">{result.summary}</p>
                        {(() => {
                            const u = URGENCY_CONFIG[result.urgency];
                            return (
                                <span className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${u.bg} ${u.color} ${u.border}`}>
                                    {result.urgency}
                                </span>
                            );
                        })()}
                    </div>

                    {/* Abnormal values */}
                    {result.abnormalValues.filter(v => v.flag !== "Normal").length > 0 && (
                        <Section icon={<AlertTriangle size={13} className="text-amber-600" />} label="Abnormal Values">
                            <div className="space-y-1.5">
                                {result.abnormalValues.filter(v => v.flag !== "Normal").map((v, i) => {
                                    const f = FLAG_CONFIG[v.flag];
                                    return (
                                        <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-xl border ${f.border} ${f.bg}`}>
                                            <div>
                                                <p className="text-[11px] font-bold text-gray-800">{v.parameter}</p>
                                                <p className="text-[10px] text-gray-500">Normal: {v.normalRange}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-black ${f.color}`}>{v.value}</p>
                                                <p className={`text-[9px] font-black uppercase ${f.color}`}>{v.flag}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Section>
                    )}

                    {/* Clinical significance */}
                    <div className="px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Clinical Significance</p>
                        <p className="text-xs text-blue-700">{result.clinicalSignificance}</p>
                    </div>

                    {/* Recommendations */}
                    {result.recommendations.length > 0 && (
                        <Section icon={<CheckCircle2 size={13} className="text-indigo-600" />} label="Recommendations">
                            <div className="space-y-1.5">
                                {result.recommendations.map((r, i) => (
                                    <div key={i} className="flex items-start gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                                        <span className="text-indigo-400 font-black text-[10px] shrink-0 mt-0.5">{i + 1}.</span>
                                        <p className="text-[11px] text-indigo-700">{r}</p>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    <AIDisclaimer />
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. AI PRESCRIPTION SAFETY CHECK
// ═══════════════════════════════════════════════════════════════════════════════

const RISK_BADGE = {
    Safe: { color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
    Caution: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
    Warning: { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
    Danger: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
};

const SEVERITY_COLOR = { Mild: "text-amber-600", Moderate: "text-orange-600", Severe: "text-red-600" };

interface RxProps {
    drugName: string;
    dosage: string;
    duration?: string;
    patientAge?: number;
    patientWeight?: number;
    patientGender?: string;
    allergies?: string;
    currentMeds?: string;
    medicalHistory?: string;
}

export function AIPrescriptionCheck(props: RxProps) {
    const [result, setResult] = useState<Awaited<ReturnType<typeof getAIPrescriptionSafetyCheck>> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyse = async () => {
        setLoading(true); setError(null);
        try { setResult(await getAIPrescriptionSafetyCheck(props)); }
        catch (e: any) { setError(e.message ?? "Safety check failed."); }
        finally { setLoading(false); }
    };

    const badge = result ? RISK_BADGE[result.overallRisk] : null;

    return (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-50 to-transparent border-b border-indigo-100/60">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center">
                        <Pill size={13} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800">AI Safety Check</p>
                        <AIBadge />
                    </div>
                </div>
                <button onClick={analyse} disabled={loading || !props.drugName}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-all disabled:opacity-50">
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {loading ? "Checking..." : result ? "Re-check" : "Check Safety"}
                </button>
            </div>

            {!result && !loading && !error && (
                <p className="px-5 py-5 text-xs text-gray-400 text-center">Click <strong className="text-indigo-600">Check Safety</strong> to screen this prescription for interactions and contraindications.</p>
            )}
            {error && <div className="px-5 py-4 flex items-center gap-2"><AlertTriangle size={14} className="text-red-500" /><p className="text-xs text-red-600">{error}</p></div>}
            {loading && <div className="px-5 py-6 flex items-center justify-center gap-3"><Loader2 size={16} className="text-indigo-500 animate-spin" /><p className="text-sm text-gray-400">Screening prescription...</p></div>}

            {result && !loading && badge && (
                <div className="px-5 py-4 space-y-4">

                    {/* Overall risk banner */}
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${badge.border} ${badge.bg}`}>
                        {result.safe
                            ? <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                            : <ShieldAlert size={18} className={`shrink-0 ${badge.color}`} />
                        }
                        <div>
                            <p className={`text-sm font-black ${badge.color}`}>{result.overallRisk}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{result.pharmacistNotes}</p>
                        </div>
                    </div>

                    {/* Allergy flags */}
                    {result.allergyFlags.length > 0 && (
                        <Section icon={<AlertTriangle size={13} className="text-red-600" />} label="Allergy Warnings">
                            {result.allergyFlags.map((f, i) => (
                                <div key={i} className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                                    <AlertTriangle size={11} className="text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-[11px] text-red-700 font-medium">{f}</p>
                                </div>
                            ))}
                        </Section>
                    )}

                    {/* Interactions */}
                    {result.interactions.length > 0 && (
                        <Section icon={<ShieldAlert size={13} className="text-orange-600" />} label="Drug Interactions">
                            <div className="space-y-1.5">
                                {result.interactions.map((ix, i) => (
                                    <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 bg-orange-50 border border-orange-100 rounded-xl">
                                        <span className={`text-[9px] font-black uppercase tracking-widest shrink-0 mt-0.5 ${SEVERITY_COLOR[ix.severity]}`}>{ix.severity}</span>
                                        <div>
                                            <p className="text-[11px] font-bold text-gray-800">{ix.drug}</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">{ix.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Dosage check */}
                    <Section icon={<CheckCircle2 size={13} className="text-indigo-600" />} label="Dosage Check">
                        <div className={`px-3 py-2.5 rounded-xl border ${result.dosageCheck.appropriate ? "bg-green-50 border-green-100" : "bg-amber-50 border-amber-100"}`}>
                            <p className={`text-[11px] font-bold ${result.dosageCheck.appropriate ? "text-green-700" : "text-amber-700"}`}>
                                {result.dosageCheck.appropriate ? "✓ Dosage appears appropriate" : "⚠ Dosage concern"}
                            </p>
                            {result.dosageCheck.concern && <p className="text-[10px] text-gray-600 mt-0.5">{result.dosageCheck.concern}</p>}
                            {result.dosageCheck.suggestion && <p className="text-[10px] text-indigo-600 mt-0.5 font-medium">{result.dosageCheck.suggestion}</p>}
                        </div>
                    </Section>

                    <AIDisclaimer />
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. AI PATIENT SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

interface SummaryProps {
    patient: {
        name: string; age?: number; gender?: string;
        blood_group?: string; geno_type?: string;
        allergies?: string; significant_medication_history?: string; currentMeds?: string;
    };
    consultations?: { symptoms: string; diagnosis: string; date: string }[];
    prescriptions?: { drugName: string; dosage: string; date: string; status: string }[];
    labResults?: { testType: string; result: string; date: string; status: string }[];
    vitals?: { bloodPressure?: string; temperature?: string; pulse?: string; date: string };
    viewerRole?: string;
}

export function AIPatientSummary(props: SummaryProps) {
    const [result, setResult] = useState<Awaited<ReturnType<typeof getAIPatientSummary>> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(true);

    const generate = async () => {
        setLoading(true); setError(null);
        try { setResult(await getAIPatientSummary(props)); setExpanded(true); }
        catch (e: any) { setError(e.message ?? "Summary generation failed."); }
        finally { setLoading(false); }
    };

    return (
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-50 to-transparent border-b border-indigo-100/60">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center">
                        <User size={13} className="text-white" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-800">AI Patient Summary</p>
                        <AIBadge />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {result && (
                        <button onClick={() => setExpanded(v => !v)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                    )}
                    <button onClick={generate} disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-all disabled:opacity-50">
                        {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        {loading ? "Generating..." : result ? "Regenerate" : "Generate Summary"}
                    </button>
                </div>
            </div>

            {!result && !loading && !error && (
                <p className="px-5 py-5 text-xs text-gray-400 text-center">Click <strong className="text-indigo-600">Generate Summary</strong> for an AI clinical briefing on this patient.</p>
            )}
            {error && <div className="px-5 py-4 flex items-center gap-2"><AlertTriangle size={14} className="text-red-500" /><p className="text-xs text-red-600">{error}</p></div>}
            {loading && <div className="px-5 py-6 flex items-center justify-center gap-3"><Loader2 size={16} className="text-indigo-500 animate-spin" /><p className="text-sm text-gray-400">Generating clinical summary...</p></div>}

            {result && !loading && expanded && (
                <div className="px-5 py-4 space-y-4">

                    {/* Headline */}
                    <div className="px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
                        <p className="text-sm font-bold text-indigo-800">{result.headline}</p>
                        <p className="text-xs text-indigo-600 mt-1.5 leading-relaxed">{result.summary}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        {/* Key findings */}
                        {result.keyFindings.length > 0 && (
                            <Section icon={<BookOpen size={13} className="text-indigo-600" />} label="Key Findings">
                                <div className="space-y-1.5">
                                    {result.keyFindings.map((f, i) => (
                                        <div key={i} className="flex items-start gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl">
                                            <span className="text-gray-300 font-black text-[10px] shrink-0 mt-0.5">•</span>
                                            <p className="text-[11px] text-gray-700">{f}</p>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* Active concerns */}
                        {result.activeConcerns.length > 0 && (
                            <Section icon={<AlertTriangle size={13} className="text-amber-600" />} label="Active Concerns">
                                <div className="space-y-1.5">
                                    {result.activeConcerns.map((c, i) => (
                                        <div key={i} className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                                            <AlertTriangle size={10} className="text-amber-500 shrink-0 mt-0.5" />
                                            <p className="text-[11px] text-amber-700">{c}</p>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}
                    </div>

                    {/* Current treatment */}
                    {result.currentTreatment && (
                        <div className="px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Current Treatment</p>
                            <p className="text-xs text-blue-700">{result.currentTreatment}</p>
                        </div>
                    )}

                    {/* Follow-up */}
                    {result.followUpNeeded && result.followUpActions.length > 0 && (
                        <Section icon={<CheckCircle2 size={13} className="text-green-600" />} label="Follow-up Actions">
                            <div className="space-y-1.5">
                                {result.followUpActions.map((a, i) => (
                                    <div key={i} className="flex items-start gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl">
                                        <span className="text-green-400 font-black text-[10px] shrink-0 mt-0.5">{i + 1}.</span>
                                        <p className="text-[11px] text-green-700">{a}</p>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Risk flags */}
                    {result.riskFlags.length > 0 && (
                        <Section icon={<ShieldAlert size={13} className="text-red-600" />} label="Risk Flags">
                            <div className="space-y-1.5">
                                {result.riskFlags.map((f, i) => (
                                    <div key={i} className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                                        <ShieldAlert size={11} className="text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-red-700 font-medium">{f}</p>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    )}

                    <AIDisclaimer />
                </div>
            )}
        </div>
    );
}