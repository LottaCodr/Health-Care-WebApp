"use client";

import { useNursingActionsByPatient } from "@/hooks/use-emr";
import {
    Activity,
    Thermometer,
    HeartPulse,
    Wind,
    Droplets,
    Weight,
    Ruler,
    Calculator,
    ClipboardList,
    StickyNote,
    CheckCircle2,
    Clock,
    User,
} from "lucide-react";
import React from "react";

// ─── Raw Supabase row shape ───────────────────────────────────────────────────

interface NursingActionRow {
    id: string;
    patient_id: string;
    action_type: string;
    description: string;
    status: string;
    assigned_nurse: string;
    completed_by: string;
    completion_time: string;
    created_at: string;
    updated_at: string;
}

// ─── Parsed vitals ────────────────────────────────────────────────────────────

interface ParsedVitals {
    bloodPressure?: string;
    temperature?: string;
    pulse?: string;
    respiration?: string;
    spo2?: string;
    weight?: string;
    height?: string;
    bmi?: string;
    treatment?: string;
    notes?: string;
}

// ─── Parser ───────────────────────────────────────────────────────────────────
// Handles the description string produced by VitalsCheckinAdvancedComponent:
// "BP: 98. Temp: 78°C. Pulse: 78 bpm. Resp: 78/min. SpO2: 78%. Wt: 78kg. Ht: 79cm. BMI: 125.0. Treatment: None. Notes: ..."

function parseDescription(desc: string): ParsedVitals {
    const get = (pattern: RegExp) => desc.match(pattern)?.[1]?.trim() || undefined;

    const treatmentRaw = get(/Treatment:\s*(.+?)(?:\.\s*Notes:|$)/);
    const notesRaw = get(/Notes:\s*(.+)$/);

    return {
        bloodPressure: get(/BP:\s*([^\s.]+)/),
        temperature: get(/Temp:\s*([\d.]+)/),
        pulse: get(/Pulse:\s*([\d.]+)/),
        respiration: get(/Resp:\s*([\d./]+)/),
        // handles both "SpO2" (ASCII saved to DB) and "SpO₂" (unicode)
        spo2: get(/SpO[₂2]:\s*([\d.]+)/),
        weight: get(/Wt:\s*([\d.]+)/),
        height: get(/Ht:\s*([\d.]+)/),
        bmi: get(/BMI:\s*([\d.]+)/),
        treatment: treatmentRaw === "None" ? undefined : treatmentRaw,
        notes: notesRaw,
    };
}

// ─── Vital tile config ────────────────────────────────────────────────────────

const VITAL_TILES = [
    { key: "bloodPressure", label: "Blood Pressure", unit: "mmHg", icon: Activity, iconColor: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", accent: "bg-blue-600" },
    { key: "temperature", label: "Temperature", unit: "°C", icon: Thermometer, iconColor: "text-orange-500", bg: "bg-orange-50", border: "border-orange-100", accent: "bg-orange-500" },
    { key: "pulse", label: "Pulse Rate", unit: "bpm", icon: HeartPulse, iconColor: "text-red-500", bg: "bg-red-50", border: "border-red-100", accent: "bg-red-500" },
    { key: "respiration", label: "Respiration", unit: "breaths/min", icon: Wind, iconColor: "text-teal-600", bg: "bg-teal-50", border: "border-teal-100", accent: "bg-teal-600" },
    { key: "spo2", label: "Oxygen Sat.", unit: "SpO₂ %", icon: Droplets, iconColor: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-100", accent: "bg-cyan-600" },
    { key: "weight", label: "Weight", unit: "kg", icon: Weight, iconColor: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100", accent: "bg-violet-600" },
    { key: "height", label: "Height", unit: "cm", icon: Ruler, iconColor: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", accent: "bg-indigo-600" },
    { key: "bmi", label: "BMI", unit: "", icon: Calculator, iconColor: "text-pink-600", bg: "bg-pink-50", border: "border-pink-100", accent: "bg-pink-600" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTime(iso?: string) {
    if (!iso) return null;
    return new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function getBMICategory(bmi: string) {
    const val = parseFloat(bmi);
    if (isNaN(val)) return null;
    if (val < 18.5) return { label: "Underweight", color: "text-blue-600 bg-blue-50" };
    if (val < 25) return { label: "Normal", color: "text-green-600 bg-green-50" };
    if (val < 30) return { label: "Overweight", color: "text-yellow-600 bg-yellow-50" };
    return { label: "Obese", color: "text-red-600 bg-red-50" };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface VitalsDisplayProps {
    patientId: string;
    onClose?: () => void;
}

export default function VitalsRecordDisplay({ patientId, onClose }: VitalsDisplayProps) {
    const { data, loading, error } = useNursingActionsByPatient(patientId, {enabled: !!patientId});

    // Pick the latest Vitals action from the returned array
    const latestAction: NursingActionRow | null = Array.isArray(data)
        ? ([...data] as NursingActionRow[])
            .filter((a) => a.action_type === "Vitals")
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null
        : null;

    const vitals: ParsedVitals | null = latestAction
        ? parseDescription(latestAction.description)
        : null;

    // ── Loading ──
    if (loading) {
        return (
            <div className="flex justify-center items-center h-40">
                <div className="text-gray-500 text-sm">Loading vitals...</div>
            </div>
        );
    }

    // ── Error ──
    if (error) {
        return (
            <div className="flex justify-center items-center h-40">
                <div className="text-red-500 text-sm">Failed to load vitals.</div>
            </div>
        );
    }

    // ── No record ──
    if (!latestAction || !vitals) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="text-gray-400 text-3xl mb-4">—</div>
                <div className="text-sm text-gray-500">No vitals recorded yet.</div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="mt-5 px-6 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-colors"
                    >
                        Dismiss
                    </button>
                )}
            </div>
        );
    }

    const filledTiles = VITAL_TILES.filter((t) => !!vitals[t.key as keyof ParsedVitals]);
    const bmiCategory = vitals.bmi ? getBMICategory(vitals.bmi) : null;

    return (
        <div className="space-y-6 max-w-3xl mx-auto">

            {/* ── Success banner ── */}
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
                <CheckCircle2 size={22} className="text-green-600 shrink-0" />
                <div>
                    <p className="font-bold text-green-800 text-sm">Vitals Recorded Successfully</p>
                    <p className="text-green-600 text-xs mt-0.5">Documentation has been finalised and saved.</p>
                </div>
            </div>

            {/* ── Header card ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-8 py-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Patient Vitals Report</p>
                    <p className="text-xs text-gray-400 mt-1 font-mono">ID: {patientId}</p>
                </div>

                <div className="flex flex-col items-end gap-1 text-right text-xs text-gray-500">
                    {latestAction.completion_time && (
                        <span className="flex items-center gap-1.5">
                            <Clock size={12} />
                            {formatDateTime(latestAction.completion_time)}
                        </span>
                    )}
                    {latestAction.completed_by && (
                        <span className="flex items-center gap-1.5">
                            <User size={12} />
                            <span className="font-mono">{latestAction.completed_by.slice(0, 8)}…</span>
                        </span>
                    )}
                    <span className="mt-1 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-100">
                        {latestAction.status}
                    </span>
                </div>
            </div>

            {/* ── Vital tiles grid ── */}
            {filledTiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {filledTiles.map((tile) => {
                        const Icon = tile.icon;
                        const value = vitals[tile.key as keyof ParsedVitals] as string;

                        return (
                            <div
                                key={tile.key}
                                className={`relative overflow-hidden rounded-2xl border ${tile.border} ${tile.bg} px-4 py-4 flex flex-col gap-2`}
                            >
                                <div className={`absolute top-0 left-0 w-1 h-full ${tile.accent} rounded-l-2xl`} />

                                <div className="flex items-center gap-2 pl-2">
                                    <Icon size={15} className={tile.iconColor} />
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                        {tile.label}
                                    </span>
                                </div>

                                <div className="pl-2">
                                    <span className="text-2xl font-extrabold text-gray-800 leading-none">
                                        {value}
                                    </span>
                                    {tile.unit && (
                                        <span className="ml-1.5 text-xs text-gray-400 font-medium">{tile.unit}</span>
                                    )}
                                    {tile.key === "bmi" && bmiCategory && (
                                        <div className={`mt-1.5 inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${bmiCategory.color}`}>
                                            {bmiCategory.label}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Treatment & Notes ── */}
            {(vitals.treatment || vitals.notes) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vitals.treatment && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <ClipboardList size={15} className="text-blue-600" />
                                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                    Clinical Treatment / Nursing Care
                                </span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {vitals.treatment}
                            </p>
                        </div>
                    )}
                    {vitals.notes && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <StickyNote size={15} className="text-yellow-500" />
                                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                                    Additional Notes
                                </span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {vitals.notes}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Dismiss ── */}
            {onClose && (
                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            )}
        </div>
    );
}