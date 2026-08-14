"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BarChart3, Download, Send, Siren } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import {
    useBreakGlassEvents, useDailyCensus, useLabTurnaround, useMortalityReport,
    usePharmacyReport, useRevenueReport, useSendAppointmentReminders, useSendTestMessage,
} from "@/hooks/emr/use-clinical-modules";
import { toCsv } from "@/lib/utils/csv";

function download(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export default function ReportsPage() {
    const { authorized } = useRoleProtection([UserRole.Admin]);
    const { data: census } = useDailyCensus(14);
    const { data: revenue } = useRevenueReport(30);
    const { data: tat } = useLabTurnaround(30);
    const { data: mortality } = useMortalityReport();
    const { data: pharmacy } = usePharmacyReport(30);
    const { data: breakGlass = [] } = useBreakGlassEvents();
    const sendReminders = useSendAppointmentReminders();
    const sendTest = useSendTestMessage();

    const [reminderDate, setReminderDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 10);
    });
    const [testTo, setTestTo] = useState("");
    const [testBody, setTestBody] = useState("Nile Valley Hospital test message.");

    const censusChart = useMemo(() => (census?.rows ?? []).slice(-14), [census]);
    const revenueTotal = useMemo(() => {
        const rows = revenue?.rows ?? [];
        const totalRow = rows.find((r) => r.date === "TOTAL");
        return totalRow?.amount ?? 0;
    }, [revenue]);

    if (!authorized) {
        return <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs text-red-700">Admin access required.</p>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl font-black text-gray-900">Reports & Analytics</h1>
                <p className="text-xs text-gray-500">
                    Daily census, revenue, lab turnaround, pharmacy dispense, mortality and break-glass review.
                    For scheduled delivery, wire these exports to pg_cron / an external scheduler.
                </p>
            </div>

            {/* Census */}
            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                    <p className="flex items-center gap-2 text-sm font-bold text-gray-900">
                        <BarChart3 size={16} className="text-blue-600" /> Daily census (14 days)
                    </p>
                    <Button size="sm" variant="outline" className="gap-1.5"
                        onClick={() => download("daily_census.csv", toCsv(census?.columns ?? [], census?.rows ?? []))}>
                        <Download size={13} /> CSV
                    </Button>
                </div>
                <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={censusChart} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d) => d.slice(5)} />
                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                            <Tooltip contentStyle={{ fontSize: 12 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="admissions" name="Admissions" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="discharges" name="Discharges" fill="#10b981" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="registrations" name="Registrations" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </section>

            {/* KPI strip */}
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Revenue (30d, settled)</p>
                    <p className="mt-1 text-2xl font-black text-gray-900">₦{Number(revenueTotal).toLocaleString()}</p>
                    <Button size="sm" variant="ghost" className="mt-1 text-xs text-blue-600"
                        onClick={() => download("revenue_report.csv", toCsv(revenue?.columns ?? [], revenue?.rows ?? []))}>
                        Export CSV
                    </Button>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Lab turnaround (30d)</p>
                    <p className="mt-1 text-2xl font-black text-gray-900">
                        {(() => {
                            const rows = tat?.rows ?? [];
                            if (rows.length === 0) return "—";
                            const avg = rows.reduce((s, r) => s + Number(r.turnaround_hours), 0) / rows.length;
                            return `${avg.toFixed(1)}h avg`;
                        })()}
                    </p>
                    <Button size="sm" variant="ghost" className="mt-1 text-xs text-blue-600"
                        onClick={() => download("lab_turnaround.csv", toCsv(tat?.columns ?? [], tat?.rows ?? []))}>
                        Export CSV
                    </Button>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Pharmacy dispenses (30d)</p>
                    <p className="mt-1 text-2xl font-black text-gray-900">
                        {(pharmacy?.rows ?? []).reduce((s, r) => s + Number(r.quantity ?? 0), 0)} units
                    </p>
                    <Button size="sm" variant="ghost" className="mt-1 text-xs text-blue-600"
                        onClick={() => download("pharmacy_dispense.csv", toCsv(pharmacy?.columns ?? [], pharmacy?.rows ?? []))}>
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Mortality */}
            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="mb-2 text-sm font-bold text-gray-900">Mortality register ({mortality?.rows?.length ?? 0} records)</p>
                <div className="max-h-56 overflow-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-white text-[10px] uppercase text-gray-400">
                            <tr><th className="py-1.5 pr-3">Date</th><th className="py-1.5 pr-3">Patient</th><th className="py-1.5 pr-3">Cause</th><th className="py-1.5 pr-3">ICD-10</th><th className="py-1.5">Manner</th></tr>
                        </thead>
                        <tbody>
                            {(mortality?.rows ?? []).slice(0, 30).map((r, i) => (
                                <tr key={i} className="border-t border-gray-50">
                                    <td className="py-1.5 pr-3">{r.date_of_death}</td>
                                    <td className="py-1.5 pr-3 font-semibold">{r.patient}</td>
                                    <td className="py-1.5 pr-3">{r.immediate_cause}</td>
                                    <td className="py-1.5 pr-3 font-mono">{r.icd10}</td>
                                    <td className="py-1.5">{r.manner}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Button size="sm" variant="outline" className="mt-2 gap-1.5"
                    onClick={() => download("mortality_register.csv", toCsv(mortality?.columns ?? [], mortality?.rows ?? []))}>
                    <Download size={13} /> Export register
                </Button>
            </section>

            {/* Communications */}
            <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                    <Send size={16} className="text-emerald-600" /> Communications (SMS / email)
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-gray-50 p-3">
                        <p className="mb-2 text-xs font-bold text-gray-700">Appointment reminders</p>
                        <div className="flex gap-2">
                            <Input type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />
                            <Button size="sm" disabled={sendReminders.isPending}
                                onClick={async () => {
                                    const res = await sendReminders.mutateAsync(reminderDate);
                                    toast.success(`Reminders: ${res.sent} sent, ${res.failed} failed, ${res.attempted} attempted.`);
                                }}>
                                {sendReminders.isPending ? "Sending…" : "Send"}
                            </Button>
                        </div>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-3">
                        <p className="mb-2 text-xs font-bold text-gray-700">Test gateway (uses MESSAGING_PROVIDER)</p>
                        <div className="flex gap-2">
                            <Input placeholder="Phone or email" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
                            <Button size="sm" variant="outline" disabled={sendTest.isPending || !testTo.trim()}
                                onClick={async () => {
                                    const channel: "sms" | "email" = testTo.includes("@") ? "email" : "sms";
                                    const res = await sendTest.mutateAsync({ channel, to: testTo.trim(), body: testBody });
                                    if (res.success) toast.success(`Sent via ${res.provider}${res.detail ? ` — ${res.detail}` : ""}`);
                                    else toast.error(`Send failed (${res.provider}): ${res.detail}`);
                                }}>
                                {sendTest.isPending ? "…" : "Test send"}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Break-glass review */}
            <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-800">
                    <Siren size={16} /> Break-glass review ({breakGlass.length} events)
                </p>
                {breakGlass.length === 0 && <p className="text-xs text-amber-700">No emergency access events.</p>}
                <div className="max-h-48 space-y-1 overflow-auto">
                    {breakGlass.map((b: any) => (
                        <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs">
                            <span className="font-bold text-gray-800">{new Date(b.timestamp).toLocaleString("en-GB")}</span>
                            <span className="truncate text-gray-600">{(b.changes as any)?.patient_name ?? "Patient"}: {(b.changes as any)?.reason}</span>
                            <Badge variant="outline">{b.user_id.slice(0, 8)}</Badge>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
