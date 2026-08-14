"use client";

import { useMemo } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useNursingActionsByPatient } from "@/hooks/emr/use-nursing";
import { useLabRequestsByPatient } from "@/hooks/emr/use-lab";

interface ParsedVitals {
    bloodPressure?: string;
    temperature?: string;
    pulse?: string;
    respiration?: string;
    spo2?: string;
    weight?: string;
    height?: string;
    bmi?: string;
}

function parseDescription(desc: string): ParsedVitals {
    const get = (p: RegExp) => desc.match(p)?.[1]?.trim() || undefined;
    return {
        bloodPressure: get(/BP:\s*([^\s.]+)/),
        temperature: get(/Temp:\s*([\d.]+)/),
        pulse: get(/Pulse:\s*([\d.]+)/),
        respiration: get(/Resp:\s*([\d./]+)/),
        spo2: get(/SpO[₂2]:\s*([\d.]+)/),
        weight: get(/Wt:\s*([\d.]+)/),
        height: get(/Ht:\s*([\d.]+)/),
        bmi: get(/BMI:\s*([\d.]+)/),
    };
}

const num = (v?: string) => {
    const n = parseFloat(v ?? "");
    return Number.isFinite(n) ? n : undefined;
};

function fmtTime(iso?: string) {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ChartCard({ title, unit, data, lines }: {
    title: string;
    unit: string;
    data: any[];
    lines: Array<{ key: string; name: string; color: string }>;
}) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-bold text-gray-900">{title} <span className="text-[10px] font-semibold text-gray-400">({unit})</span></p>
            {data.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-400">No data yet — record vitals to see the trend.</p>
            ) : (
                <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            {lines.map((l) => (
                                <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} dot={{ r: 2.5 }} connectNulls />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

export default function TrendsTab({ patientId }: { patientId: string }) {
    const { data: actions = [] } = useNursingActionsByPatient(patientId, { enabled: !!patientId });
    const { data: labRequests = [] } = useLabRequestsByPatient(patientId);

    const vitals = useMemo(
        () =>
            (actions as any[])
                .filter((a) => a?.action_type === "Vitals")
                .map((a) => ({ ...parseDescription(a.description ?? ""), time: fmtTime(a.created_at) }))
                .reverse(),
        [actions]
    );

    const labs = useMemo(() => {
        const byTest = new Map<string, any[]>();
        for (const l of labRequests as any[]) {
            const test = String(l.test_type ?? "").replace(/^\[RADIOLOGY\]\s*/i, "");
            const value = num(l.result);
            if (!value && !l.result) continue;
            const t = String(test).trim();
            if (!byTest.has(t)) byTest.set(t, []);
            byTest.get(t)!.push({
                time: fmtTime(l.completed_at ?? l.created_at),
                value: value ?? null,
                label: value === undefined ? l.result : value,
            });
        }
        return [...byTest.entries()].map(([test, rows]) => ({ test, rows: rows.reverse() }));
    }, [labRequests]);

    const bp = vitals.map((v) => ({
        time: v.time,
        systolic: num(v.bloodPressure?.split("/")[0]),
        diastolic: num(v.bloodPressure?.split("/")[1]),
    }));

    return (
        <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
                <ChartCard title="Blood pressure" unit="mmHg" data={bp}
                    lines={[{ key: "systolic", name: "Systolic", color: "#ef4444" }, { key: "diastolic", name: "Diastolic", color: "#3b82f6" }]} />
                <ChartCard title="Temperature" unit="°C" data={vitals}
                    lines={[{ key: "temperature", name: "Temp", color: "#f97316" }]} />
                <ChartCard title="Pulse & SpO₂" unit="bpm / %" data={vitals}
                    lines={[{ key: "pulse", name: "Pulse", color: "#dc2626" }, { key: "spo2", name: "SpO₂", color: "#0891b2" }]} />
                <ChartCard title="Weight" unit="kg" data={vitals}
                    lines={[{ key: "weight", name: "Weight", color: "#8b5cf6" }]} />
            </div>

            <p className="pt-2 text-xs font-bold uppercase tracking-wide text-gray-400">Lab result trends</p>
            {labs.length === 0 && (
                <p className="rounded-xl border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400">
                    No numeric lab results yet. Completed numeric results are charted here automatically.
                </p>
            )}
            <div className="grid gap-4 xl:grid-cols-2">
                {labs.map(({ test, rows }) => (
                    <ChartCard key={test} title={test} unit="result" data={rows}
                        lines={[{ key: "value", name: test, color: "#0d9488" }]} />
                ))}
            </div>
        </div>
    );
}
