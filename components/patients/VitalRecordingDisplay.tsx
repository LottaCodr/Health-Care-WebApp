"use client";

import { useNursingActionsByPatient } from "@/hooks/use-emr";
import {
    Activity, Thermometer, HeartPulse, Wind,
    Droplets, Weight, Ruler, Calculator,
    ClipboardList, StickyNote, Clock, User,
    CheckCircle2, Loader2, AlertTriangle, FlaskConical,
} from "lucide-react";
import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NursingActionRow {
    id: string; patient_id: string; action_type: string;
    description: string; status: string; assigned_nurse: string;
    completed_by: string; completion_time: string;
    created_at: string; updated_at: string;
}

interface ParsedVitals {
    bloodPressure?: string; temperature?: string;
    pulse?: string; respiration?: string; spo2?: string;
    weight?: string; height?: string; bmi?: string;
    treatment?: string; notes?: string;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseDescription(desc: string): ParsedVitals {
    const get = (p: RegExp) => desc.match(p)?.[1]?.trim() || undefined;
    const treatmentRaw = get(/Treatment:\s*(.+?)(?:\.\s*Notes:|$)/);
    return {
        bloodPressure: get(/BP:\s*([^\s.]+)/),
        temperature: get(/Temp:\s*([\d.]+)/),
        pulse: get(/Pulse:\s*([\d.]+)/),
        respiration: get(/Resp:\s*([\d./]+)/),
        spo2: get(/SpO[₂2]:\s*([\d.]+)/),
        weight: get(/Wt:\s*([\d.]+)/),
        height: get(/Ht:\s*([\d.]+)/),
        bmi: get(/BMI:\s*([\d.]+)/),
        treatment: treatmentRaw === "None" ? undefined : treatmentRaw,
        notes: get(/Notes:\s*(.+)$/),
    };
}

// ─── Config ───────────────────────────────────────────────────────────────────

const VITAL_TILES = [
    { key: "bloodPressure", label: "Blood Pressure", unit: "mmHg", icon: Activity, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", bar: "bg-blue-500" },
    { key: "temperature", label: "Temperature", unit: "°C", icon: Thermometer, color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-100", bar: "bg-orange-500" },
    { key: "pulse", label: "Pulse Rate", unit: "bpm", icon: HeartPulse, color: "text-red-500", bg: "bg-red-50", border: "border-red-100", bar: "bg-red-500" },
    { key: "respiration", label: "Respiration", unit: "breaths/min", icon: Wind, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-100", bar: "bg-teal-500" },
    { key: "spo2", label: "O₂ Saturation", unit: "SpO₂ %", icon: Droplets, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-100", bar: "bg-cyan-500" },
    { key: "weight", label: "Weight", unit: "kg", icon: Weight, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100", bar: "bg-violet-500" },
    { key: "height", label: "Height", unit: "cm", icon: Ruler, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", bar: "bg-indigo-500" },
    { key: "bmi", label: "BMI", unit: "", icon: Calculator, color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-100", bar: "bg-pink-500" },
] as const;

function getBMICategory(bmi: string) {
    const v = parseFloat(bmi);
    if (isNaN(v)) return null;
    if (v < 18.5) return { label: "Underweight", color: "text-blue-700", bg: "bg-blue-50" };
    if (v < 25) return { label: "Normal", color: "text-green-700", bg: "bg-green-50" };
    if (v < 30) return { label: "Overweight", color: "text-amber-700", bg: "bg-amber-50" };
    return { label: "Obese", color: "text-red-700", bg: "bg-red-50" };
}

function formatDateTime(iso?: string) {
    if (!iso) return null;
    return new Date(iso).toLocaleString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VitalsRecordDisplay({ patientId, onClose }: { patientId: string; onClose?: () => void }) {
    const { data, loading, error } = useNursingActionsByPatient(patientId, { enabled: !!patientId });

    const latestAction: NursingActionRow | null = Array.isArray(data)
        ? ([...data] as NursingActionRow[])
            .filter((a) => a.action_type === "Vitals")
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null
        : null;

    const vitals = latestAction ? parseDescription(latestAction.description) : null;

    if (loading) return (
        <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 size={18} className="text-blue-500 animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Loading vitals...</p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-500" />
            </div>
            <p className="text-sm font-semibold text-gray-600">Failed to load vitals</p>
        </div>
    );

    if (!latestAction || !vitals) return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <FlaskConical size={20} className="text-gray-300" />
            </div>
            <div className="text-center">
                <p className="text-sm font-semibold text-gray-500">No vitals recorded yet</p>
                <p className="text-xs text-gray-400 mt-1">Vitals will appear here after a nurse records them</p>
            </div>
            {onClose && (
                <button onClick={onClose}
                    className="mt-2 px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-colors">
                    Dismiss
                </button>
            )}
        </div>
    );

    const filledTiles = VITAL_TILES.filter((t) => !!vitals[t.key as keyof ParsedVitals]);
    const bmiCategory = vitals.bmi ? getBMICategory(vitals.bmi) : null;
    const recordedAt = formatDateTime(latestAction.completion_time ?? latestAction.created_at);

    return (
        <div className="space-y-4">

            {/* ── Meta row ── */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-green-500" />
                    <p className="text-xs font-bold text-green-700">Vitals recorded</p>
                </div>
                <div className="flex items-center gap-3">
                    {recordedAt && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Clock size={10} /> <span>{recordedAt}</span>
                        </div>
                    )}
                    {latestAction.completed_by && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                            <User size={10} />
                            <span className="font-mono">{latestAction.completed_by.slice(0, 8)}…</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Tiles grid ── */}
            {filledTiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {filledTiles.map((tile) => {
                        const Icon = tile.icon;
                        const value = vitals[tile.key as keyof ParsedVitals] as string;
                        const bmi = tile.key === "bmi" && bmiCategory;
                        return (
                            <div key={tile.key}
                                className={`relative overflow-hidden rounded-2xl border ${tile.border} ${tile.bg} p-4 flex flex-col gap-2`}>
                                <div className={`absolute top-0 left-0 w-1 h-full ${tile.bar} rounded-l-2xl opacity-60`} />
                                <div className="flex items-center gap-2 pl-2">
                                    <Icon size={13} className={tile.color} />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{tile.label}</p>
                                </div>
                                <div className="pl-2">
                                    <span className="text-xl font-extrabold text-gray-900 leading-none">{value}</span>
                                    {tile.unit && <span className="ml-1 text-[10px] text-gray-400">{tile.unit}</span>}
                                    {bmi && (
                                        <div className={`mt-1.5 inline-flex px-2 py-0.5 rounded-full text-[9px] font-black ${bmi.bg} ${bmi.color}`}>
                                            {bmi.label}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Treatment + Notes ── */}
            {(vitals.treatment || vitals.notes) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {vitals.treatment && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-50">
                                <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                    <ClipboardList size={12} className="text-blue-600" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Treatment / Care</p>
                            </div>
                            <p className="px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{vitals.treatment}</p>
                        </div>
                    )}
                    {vitals.notes && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-50">
                                <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                                    <StickyNote size={12} className="text-amber-500" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Additional Notes</p>
                            </div>
                            <p className="px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{vitals.notes}</p>
                        </div>
                    )}
                </div>
            )}

            {onClose && (
                <div className="flex justify-end">
                    <button onClick={onClose}
                        className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-colors">
                        Dismiss
                    </button>
                </div>
            )}
        </div>
    );
}