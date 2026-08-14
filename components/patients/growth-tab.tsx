"use client";

import { useMemo, useState } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, ResponsiveContainer,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ruler, Baby } from "lucide-react";
import {
    growthZScore, growthReferenceCurve, GROWTH_PERCENTILES, interpretZScore,
    type GrowthMeasure, type Sex,
} from "@/lib/clinical/growth-charts";
import type { Patient } from "@/types/models";

function ageMonths(birthDate?: string): number | null {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return null;
    const now = new Date();
    return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
}

const MEASURES: Array<{ key: GrowthMeasure; label: string; unit: string }> = [
    { key: "weight", label: "Weight-for-age", unit: "kg" },
    { key: "height", label: "Height-for-age", unit: "cm" },
    { key: "bmi", label: "BMI-for-age", unit: "kg/m²" },
];

export default function GrowthTab({ patient }: { patient: Patient }) {
    const months = ageMonths(patient.birth_date);
    const sex: Sex = patient.gender === "Male" ? "male" : "female";
    const isChild = months !== null && months <= 60;

    const [weight, setWeight] = useState("");
    const [height, setHeight] = useState("");
    const [measure, setMeasure] = useState<GrowthMeasure>("weight");

    const zScores = useMemo(() => {
        if (!isChild) return { weight: null, height: null, bmi: null } as Record<GrowthMeasure, number | null>;
        const w = weight ? parseFloat(weight) : NaN;
        const h = height ? parseFloat(height) : NaN;
        const bmi = Number.isFinite(w) && Number.isFinite(h) && h > 0 ? w / Math.pow(h / 100, 2) : NaN;
        return {
            weight: Number.isFinite(w) ? growthZScore("weight", sex, months!, w) : null,
            height: Number.isFinite(h) ? growthZScore("height", sex, months!, h) : null,
            bmi: Number.isFinite(bmi) ? growthZScore("bmi", sex, months!, bmi) : null,
        };
    }, [isChild, weight, height, sex, months]);

    const chartData = useMemo(() => {
        if (!isChild) return [];
        const series: Array<Record<string, number>> = [];
        const ages = growthReferenceCurve(measure, sex, 50).map((p) => p.month);
        for (const p of GROWTH_PERCENTILES) {
            const curve = growthReferenceCurve(measure, sex, p);
            curve.forEach((pt, i) => {
                if (!series[i]) series[i] = { month: pt.month } as Record<string, number>;
                (series[i] as Record<string, number>)[`p${p}`] = pt.value;
            });
        }
        return series.map((s) => ({ ...s, ages }));
    }, [isChild, measure, sex]);

    const currentValue = measure === "weight" ? parseFloat(weight) : measure === "height" ? parseFloat(height)
        : (() => { const w = parseFloat(weight); const h = parseFloat(height); return Number.isFinite(w) && Number.isFinite(h) && h > 0 ? w / Math.pow(h / 100, 2) : NaN; })();
    const plotPoint = Number.isFinite(currentValue) ? { x: months!, y: currentValue } : null;

    if (!isChild) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
                <Ruler size={28} className="text-gray-300" />
                <p className="text-sm font-bold text-gray-700">Growth charts apply to children 0–5 years</p>
                <p className="text-xs text-gray-400">This patient is older than 60 months, or their birth date is not on record.</p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                    <Baby size={16} className="text-pink-500" /> WHO growth reference (0–60 months)
                </p>
                <div className="grid gap-3 sm:grid-cols-4">
                    <Input type="number" placeholder="Weight (kg)" value={weight} onChange={(e) => setWeight(e.target.value)} />
                    <Input type="number" placeholder="Height (cm)" value={height} onChange={(e) => setHeight(e.target.value)} />
                    <select
                        className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm"
                        value={measure}
                        onChange={(e) => setMeasure(e.target.value as GrowthMeasure)}
                    >
                        {MEASURES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                    </select>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        Age: <b>{Math.floor(months! / 12)}y {months! % 12}m</b> · {sex === "male" ? "Boy" : "Girl"}
                    </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {MEASURES.map((m) => {
                        const z = zScores[m.key];
                        const interp = z !== null ? interpretZScore(z) : null;
                        return (
                            <div key={m.key} className={`rounded-xl border p-3 ${z === null ? "border-gray-100 bg-gray-50" : "border-gray-100 bg-white"}`}>
                                <p className="text-xs font-bold text-gray-700">{m.label}</p>
                                {z === null ? (
                                    <p className="mt-1 text-xs text-gray-400">Enter measurement to score</p>
                                ) : (
                                    <>
                                        <p className="mt-1 text-lg font-black text-gray-900">z = {z.toFixed(2)}</p>
                                        <Badge className={`mt-1 ${interp!.color.replace("text-", "bg-").replace("600", "50")} ${interp!.color}`}>
                                            {interp!.label}
                                        </Badge>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="mb-2 text-sm font-bold text-gray-900">{MEASURES.find((m) => m.key === measure)?.label} — percentiles</p>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} label={{ value: "Age (months)", position: "insideBottom", fontSize: 10, offset: -2 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ fontSize: 12 }} />
                            {GROWTH_PERCENTILES.map((p, i) => (
                                <Line key={p} type="monotone" dataKey={`p${p}`} name={`${p}th`}
                                    stroke={p === 50 ? "#0f172a" : "#94a3b8"} strokeWidth={p === 50 ? 2 : 1}
                                    dot={false} strokeDasharray={p === 50 ? undefined : "4 3"} />
                            ))}
                            {plotPoint && (
                                <ReferenceDot x={plotPoint.x} y={plotPoint.y} r={5} fill="#e11d48" stroke="#fff" strokeWidth={2} />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <p className="mt-2 text-[10px] text-gray-400">
                    Dashed curves are the 3rd–97th WHO percentiles; the red dot is this patient. Reference values are rounded approximations — verify against full WHO tables for regulatory use.
                </p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-gray-400" onClick={() => { setWeight(""); setHeight(""); }}>
                Clear inputs
            </Button>
        </div>
    );
}
