"use client";

import React from "react";
import { useNurseChartsStore } from "@/store/nurse-chart-store";
import {
    useFluidBalanceByPatientDate,
    useCreateFluidEntry,
    useDeleteFluidEntry,
} from "@/hooks/emr/use-nurse-chart";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sumField(rows: any[], field: string): number {
    return rows.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
}

function balance(rows: any[]): number {
    const totalIn  = sumField(rows, "oral_ml") + sumField(rows, "iv_ml") + sumField(rows, "ng_ml") + sumField(rows, "other_input_ml");
    const totalOut = sumField(rows, "urine_ml") + sumField(rows, "aspirate_ml") + sumField(rows, "vomit_ml") + sumField(rows, "bowel_ml") + sumField(rows, "drain_ml") + sumField(rows, "other_output_ml");
    return totalIn - totalOut;
}

function mlOrDash(val: any): string {
    const n = Number(val);
    return n > 0 ? `${n}` : "—";
}

// ─── Fluid Form Modal ─────────────────────────────────────────────────────────

interface FluidFormModalProps {
    patientId: string;
    staffId:   string;
}

function FluidFormModal({ patientId, staffId }: FluidFormModalProps) {
    const store  = useNurseChartsStore();
    const create = useCreateFluidEntry();
    const form   = store.fluidForm;

    const inputNum = (field: keyof typeof form, placeholder: string) => (
        <input
            type="number"
            min="0"
            value={form[field] as string}
            onChange={(e) => store.setFluidField(field, e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
    );

    async function handleSubmit() {
        const toNum = (v: string) => (v === "" ? undefined : Number(v));
        await create.mutateAsync({
            patientId,
            recordDate:     form.recordDate,
            recordTime:     form.recordTime,
            oralMl:         toNum(form.oralMl),
            ivMl:           toNum(form.ivMl),
            ngMl:           toNum(form.ngMl),
            otherInputMl:   toNum(form.otherInputMl),
            otherInputType: form.otherInputType || undefined,
            urineMl:        toNum(form.urineMl),
            aspirateMl:     toNum(form.aspirateMl),
            vomitMl:        toNum(form.vomitMl),
            bowelMl:        toNum(form.bowelMl),
            drainMl:        toNum(form.drainMl),
            otherOutputMl:  toNum(form.otherOutputMl),
            signedBy:       staffId,
            notes:          form.notes || undefined,
        });
        store.closeFluidForm();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <h3 className="text-sm font-semibold text-slate-800">Record Fluid Balance</h3>
                    <button onClick={() => store.closeFluidForm()} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    {/* Date + Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label-xs">Date *</label>
                            <input type="date" value={form.recordDate}
                                onChange={(e) => store.setFluidField("recordDate", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                            />
                        </div>
                        <div>
                            <label className="label-xs">Time *</label>
                            <input type="time" value={form.recordTime}
                                onChange={(e) => store.setFluidField("recordTime", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                            />
                        </div>
                    </div>

                    {/* Intake */}
                    <div>
                        <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" /> Intake (mL)
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="label-xs">Oral</label>{inputNum("oralMl", "0")}</div>
                            <div><label className="label-xs">IV</label>{inputNum("ivMl", "0")}</div>
                            <div><label className="label-xs">NG Tube</label>{inputNum("ngMl", "0")}</div>
                            <div>
                                <label className="label-xs">Other Input</label>
                                {inputNum("otherInputMl", "0")}
                            </div>
                            <div className="col-span-2">
                                <label className="label-xs">Other Input Type</label>
                                <input
                                    value={form.otherInputType}
                                    onChange={(e) => store.setFluidField("otherInputType", e.target.value)}
                                    placeholder="e.g. TPN, blood"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Output */}
                    <div>
                        <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Output (mL)
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className="label-xs">Urine</label>{inputNum("urineMl", "0")}</div>
                            <div><label className="label-xs">Aspirate</label>{inputNum("aspirateMl", "0")}</div>
                            <div><label className="label-xs">Vomit</label>{inputNum("vomitMl", "0")}</div>
                            <div><label className="label-xs">Bowel</label>{inputNum("bowelMl", "0")}</div>
                            <div><label className="label-xs">Drain</label>{inputNum("drainMl", "0")}</div>
                            <div><label className="label-xs">Other Output</label>{inputNum("otherOutputMl", "0")}</div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="label-xs">Notes</label>
                        <textarea rows={2}
                            value={form.notes}
                            onChange={(e) => store.setFluidField("notes", e.target.value)}
                            placeholder="Clinical notes…"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex justify-end gap-3">
                    <button onClick={() => store.closeFluidForm()} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={!form.recordDate || !form.recordTime || create.isPending}
                        className="px-5 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                    >
                        {create.isPending ? "Saving…" : "Record Entry"}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .label-xs { display: block; font-size: 0.7rem; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
            `}</style>
        </div>
    );
}

// ─── Summary Bar ─────────────────────────────────────────────────────────────

function SummaryBar({ rows }: { rows: any[] }) {
    const totalIn  = sumField(rows, "oral_ml") + sumField(rows, "iv_ml") + sumField(rows, "ng_ml") + sumField(rows, "other_input_ml");
    const totalOut = sumField(rows, "urine_ml") + sumField(rows, "aspirate_ml") + sumField(rows, "vomit_ml") + sumField(rows, "bowel_ml") + sumField(rows, "drain_ml") + sumField(rows, "other_output_ml");
    const bal      = totalIn - totalOut;
    const isPos    = bal >= 0;

    return (
        <div className="grid grid-cols-3 gap-3">
            <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-teal-600 font-medium uppercase tracking-wide">Total Intake</p>
                <p className="text-xl font-bold text-teal-700 mt-0.5">{totalIn} <span className="text-sm font-normal">mL</span></p>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-center">
                <p className="text-xs text-rose-600 font-medium uppercase tracking-wide">Total Output</p>
                <p className="text-xl font-bold text-rose-600 mt-0.5">{totalOut} <span className="text-sm font-normal">mL</span></p>
            </div>
            <div className={`rounded-xl px-4 py-3 text-center border ${isPos ? "bg-blue-50 border-blue-100" : "bg-orange-50 border-orange-100"}`}>
                <p className={`text-xs font-medium uppercase tracking-wide ${isPos ? "text-blue-600" : "text-orange-600"}`}>Net Balance</p>
                <p className={`text-xl font-bold mt-0.5 ${isPos ? "text-blue-700" : "text-orange-600"}`}>
                    {isPos ? "+" : ""}{bal} <span className="text-sm font-normal">mL</span>
                </p>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface FluidBalanceChartProps {
    patientId: string;
    staffId:   string;
    readOnly?: boolean;
}

export default function FluidBalanceChart({ patientId, staffId, readOnly = false }: FluidBalanceChartProps) {
    const store     = useNurseChartsStore();
    const deleteEntry = useDeleteFluidEntry();
    const dateFilter  = store.fluidDateFilter || new Date().toISOString().slice(0, 10);
    const { data, isLoading } = useFluidBalanceByPatientDate(patientId, dateFilter);
    const rows = data ?? [];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Fluid Balance Chart</h3>
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => store.setFluidDate(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    {!readOnly && (
                        <button
                            onClick={() => store.openFluidForm()}
                            className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                            + Add Entry
                        </button>
                    )}
                </div>
            </div>

            {/* Summary */}
            {rows.length > 0 && <SummaryBar rows={rows} />}

            {/* Table */}
            {isLoading ? (
                <div className="text-sm text-slate-400 py-8 text-center">Loading fluid chart…</div>
            ) : rows.length === 0 ? (
                <div className="text-sm text-slate-400 py-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                    No fluid entries for {dateFilter}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wide">
                                <th className="px-3 py-2.5 text-left font-medium">Time</th>
                                {/* Intake */}
                                <th className="px-3 py-2.5 text-center font-medium bg-teal-50/60 text-teal-700">Oral</th>
                                <th className="px-3 py-2.5 text-center font-medium bg-teal-50/60 text-teal-700">IV</th>
                                <th className="px-3 py-2.5 text-center font-medium bg-teal-50/60 text-teal-700">NG</th>
                                <th className="px-3 py-2.5 text-center font-medium bg-teal-50/60 text-teal-700">Other In</th>
                                {/* Output */}
                                <th className="px-3 py-2.5 text-center font-medium bg-rose-50/60 text-rose-600">Urine</th>
                                <th className="px-3 py-2.5 text-center font-medium bg-rose-50/60 text-rose-600">Aspirate</th>
                                <th className="px-3 py-2.5 text-center font-medium bg-rose-50/60 text-rose-600">Vomit</th>
                                <th className="px-3 py-2.5 text-center font-medium bg-rose-50/60 text-rose-600">Bowel</th>
                                <th className="px-3 py-2.5 text-center font-medium bg-rose-50/60 text-rose-600">Drain</th>
                                <th className="px-3 py-2.5 text-center font-medium">Balance</th>
                                <th className="px-3 py-2.5 text-left font-medium">Signed</th>
                                {!readOnly && <th className="px-3 py-2.5" />}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((row: any) => {
                                const rowIn  = (row.oral_ml || 0) + (row.iv_ml || 0) + (row.ng_ml || 0) + (row.other_input_ml || 0);
                                const rowOut = (row.urine_ml || 0) + (row.aspirate_ml || 0) + (row.vomit_ml || 0) + (row.bowel_ml || 0) + (row.drain_ml || 0) + (row.other_output_ml || 0);
                                const rowBal = rowIn - rowOut;

                                return (
                                    <tr key={row.id} className="bg-white hover:bg-slate-50 transition-colors">
                                        <td className="px-3 py-2.5 font-medium text-slate-700 whitespace-nowrap">{row.record_time?.slice(0, 5)}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 bg-teal-50/30">{mlOrDash(row.oral_ml)}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 bg-teal-50/30">{mlOrDash(row.iv_ml)}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 bg-teal-50/30">{mlOrDash(row.ng_ml)}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 bg-teal-50/30">{mlOrDash(row.other_input_ml)}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 bg-rose-50/30">{mlOrDash(row.urine_ml)}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 bg-rose-50/30">{mlOrDash(row.aspirate_ml)}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 bg-rose-50/30">{mlOrDash(row.vomit_ml)}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 bg-rose-50/30">{mlOrDash(row.bowel_ml)}</td>
                                        <td className="px-3 py-2.5 text-center text-slate-600 bg-rose-50/30">{mlOrDash(row.drain_ml)}</td>
                                        <td className="px-3 py-2.5 text-center font-semibold">
                                            <span className={rowBal >= 0 ? "text-blue-600" : "text-orange-600"}>
                                                {rowBal >= 0 ? "+" : ""}{rowBal}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-slate-500">{row.signed_by}</td>
                                        {!readOnly && (
                                            <td className="px-3 py-2.5">
                                                <button
                                                    onClick={() => deleteEntry.mutate({ id: row.id, patientId, date: dateFilter })}
                                                    className="text-red-400 hover:text-red-600 text-xs"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {store.showFluidForm && <FluidFormModal patientId={patientId} staffId={staffId} />}
        </div>
    );
}