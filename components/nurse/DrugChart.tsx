"use client";

import React from "react";
import { AmendmentChip } from "@/components/records";
import { useNurseChartsStore } from "@/store/nurse-chart-store";
import { fmtFull } from "@/lib/utils";
import type { DrugRoute, DrugFrequency, AdminStatus } from "@/store/nurse-chart-store";
import {
    useDrugChartByPatient,
    useCreateDrugChartEntry,
    useUpdateDrugChartEntry,
    useDeleteDrugChartEntry,
    useLogDrugAdministration,
} from "@/hooks/emr/use-nurse-chart";

// ─── Constants ────────────────────────────────────────────────────────────────

const ROUTES: DrugRoute[]       = ["oral","IV","IM","SC","topical","sublingual","rectal","inhaled"];
const FREQUENCIES: DrugFrequency[] = ["OD","BD","TDS","QDS","PRN","STAT","nocte","mane"];

const ADMIN_STATUS_COLORS: Record<AdminStatus, string> = {
    pending:  "bg-slate-100 text-slate-500",
    given:    "bg-green-100 text-green-700",
    missed:   "bg-red-100   text-red-600",
    refused:  "bg-orange-100 text-orange-600",
    held:     "bg-yellow-100 text-yellow-700",
};

const ADMIN_STATUSES: AdminStatus[] = ["given","missed","refused","held"];

// ─── Drug Form Modal ──────────────────────────────────────────────────────────

interface DrugFormModalProps {
    patientId: string;
    staffId:   string;
}

function DrugFormModal({ patientId, staffId }: DrugFormModalProps) {
    const store    = useNurseChartsStore();
    const create   = useCreateDrugChartEntry();
    const update   = useUpdateDrugChartEntry();
    const isEdit   = !!store.editDrugId;
    const form     = store.drugForm;

    const disabled = !form.drugName.trim() || !form.dose.trim() || !form.startDate;

    async function handleSubmit() {
        if (isEdit) {
            await update.mutateAsync({
                id: store.editDrugId!,
                updates: {
                    drugName:  form.drugName,
                    dose:      form.dose,
                    route:     form.route,
                    frequency: form.frequency,
                    endDate:   form.endDate || undefined,
                    notes:     form.notes   || undefined,
                },
            });
        } else {
            await create.mutateAsync({
                patientId,
                drugName:    form.drugName,
                genericName: form.genericName || undefined,
                dose:        form.dose,
                route:       form.route,
                frequency:   form.frequency,
                startDate:   form.startDate,
                endDate:     form.endDate    || undefined,
                prescribedBy:staffId,
                notes:       form.notes      || undefined,
            });
        }
        store.closeDrugForm();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-800">{isEdit ? "Edit Drug" : "Add Drug to Chart"}</h3>
                    <button onClick={() => store.closeDrugForm()} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
                </div>

                <div className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="label-sm">Drug Name *</label>
                            <input
                                className="input-base"
                                value={form.drugName}
                                onChange={(e) => store.setDrugField("drugName", e.target.value)}
                                placeholder="e.g. Amoxicillin"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="label-sm">Generic Name</label>
                            <input
                                className="input-base"
                                value={form.genericName}
                                onChange={(e) => store.setDrugField("genericName", e.target.value)}
                                placeholder="Generic / INN name"
                            />
                        </div>
                        <div>
                            <label className="label-sm">Dose *</label>
                            <input
                                className="input-base"
                                value={form.dose}
                                onChange={(e) => store.setDrugField("dose", e.target.value)}
                                placeholder="e.g. 500mg"
                            />
                        </div>
                        <div>
                            <label className="label-sm">Route</label>
                            <select
                                className="input-base bg-white"
                                value={form.route}
                                onChange={(e) => store.setDrugField("route", e.target.value as DrugRoute)}
                            >
                                {ROUTES.map((r) => <option key={r}>{r}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label-sm">Frequency</label>
                            <select
                                className="input-base bg-white"
                                value={form.frequency}
                                onChange={(e) => store.setDrugField("frequency", e.target.value as DrugFrequency)}
                            >
                                {FREQUENCIES.map((f) => <option key={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label-sm">Start Date *</label>
                            <input
                                type="date"
                                className="input-base"
                                value={form.startDate}
                                onChange={(e) => store.setDrugField("startDate", e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="label-sm">End Date</label>
                            <input
                                type="date"
                                className="input-base"
                                value={form.endDate}
                                onChange={(e) => store.setDrugField("endDate", e.target.value)}
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="label-sm">Notes</label>
                            <textarea
                                className="input-base resize-none"
                                rows={2}
                                value={form.notes}
                                onChange={(e) => store.setDrugField("notes", e.target.value)}
                                placeholder="Special instructions…"
                            />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={() => store.closeDrugForm()} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={disabled || create.isPending || update.isPending}
                        className="px-5 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                    >
                        {create.isPending || update.isPending ? "Saving…" : isEdit ? "Update" : "Add Drug"}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .label-sm { display: block; font-size: 0.7rem; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
                .input-base { width: 100%; border-radius: 0.5rem; border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; font-size: 0.875rem; color: #1e293b; outline: none; }
                .input-base:focus { box-shadow: 0 0 0 2px #5eead4; }
            `}</style>
        </div>
    );
}

// ─── Admin Log Modal ──────────────────────────────────────────────────────────

interface AdminLogModalProps {
    drugChartId: string;
    patientId:   string;
    staffId:     string;
}

function AdminLogModal({ drugChartId, patientId, staffId }: AdminLogModalProps) {
    const store  = useNurseChartsStore();
    const logAdm = useLogDrugAdministration();
    const [form, setForm] = React.useState({
        scheduledTime:  new Date().toTimeString().slice(0, 5),
        status:         "given" as AdminStatus,
        administeredAt: new Date().toISOString().slice(0, 16),
        notes:          "",
    });

    async function handleLog() {
        await logAdm.mutateAsync({
            drugChartId,
            patientId,
            scheduledTime:  form.scheduledTime,
            status:         form.status,
            givenBy:        staffId,
            administeredAt: form.administeredAt ? new Date(form.administeredAt).toISOString() : undefined,
            notes:          form.notes || undefined,
        });
        store.setLoggingAdmin(null);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-800">Log Administration</h3>
                    <button onClick={() => store.setLoggingAdmin(null)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
                </div>

                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Scheduled Time</label>
                        <input
                            type="time"
                            value={form.scheduledTime}
                            onChange={(e) => setForm((f) => ({ ...f, scheduledTime: e.target.value }))}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Status</label>
                        <div className="flex flex-wrap gap-2">
                            {ADMIN_STATUSES.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setForm((f) => ({ ...f, status: s }))}
                                    className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                                        form.status === s ? ADMIN_STATUS_COLORS[s] + " ring-2 ring-offset-1 ring-teal-400" : "bg-slate-100 text-slate-500"
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    {form.status === "given" && (
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Administered At</label>
                            <input
                                type="datetime-local"
                                value={form.administeredAt}
                                onChange={(e) => setForm((f) => ({ ...f, administeredAt: e.target.value }))}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                            />
                        </div>
                    )}
                    <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Notes</label>
                        <textarea
                            rows={2}
                            value={form.notes}
                            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                            placeholder="Optional notes…"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={() => store.setLoggingAdmin(null)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
                    <button
                        onClick={handleLog}
                        disabled={logAdm.isPending}
                        className="px-5 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                    >
                        {logAdm.isPending ? "Saving…" : "Log"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Drug Row ─────────────────────────────────────────────────────────────────

interface DrugRowProps {
    drug:      any;
    patientId: string;
    staffId:   string;
}

function DrugRow({ drug, patientId, staffId }: DrugRowProps) {
    const store      = useNurseChartsStore();
    const deactivate = useUpdateDrugChartEntry();
    const del        = useDeleteDrugChartEntry();
    const [expanded, setExpanded] = React.useState(false);

    const latestRecord = drug.drug_administration_records?.[0];
    const latestStatus: AdminStatus = latestRecord?.status ?? "pending";

    return (
        <>
            <tr className={`border-b border-slate-100 transition-colors ${drug.is_active ? "bg-white hover:bg-slate-50" : "bg-slate-50 opacity-60"}`}>
                <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 text-sm">{drug.drug_name}</div>
                    {drug.generic_name && <div className="text-xs text-slate-400 italic">{drug.generic_name}</div>}
                    {/* Editing a chart line follows the 24h rule (see
                        updateDrugChartEntry) — say so before the nurse clicks. */}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <AmendmentChip type="drug_chart" row={drug} actorId={staffId} compact />
                    </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{drug.dose}</td>
                <td className="px-4 py-3 text-sm text-slate-600 uppercase">{drug.route}</td>
                <td className="px-4 py-3 text-sm text-slate-600">{drug.frequency}</td>
                <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{drug.start_date}{drug.end_date ? ` → ${drug.end_date}` : ""}</td>
                <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${ADMIN_STATUS_COLORS[latestStatus]}`}>
                        {latestStatus}
                    </span>
                </td>
                <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        {drug.is_active && (
                            <>
                                <button
                                    onClick={() => store.setLoggingAdmin(drug.id)}
                                    className="text-xs text-teal-600 hover:underline"
                                >
                                    Log
                                </button>
                                <button
                                    onClick={() => store.openDrugForm({
                                        id:          drug.id,
                                        drugName:    drug.drug_name,
                                        genericName: drug.generic_name ?? "",
                                        dose:        drug.dose,
                                        route:       drug.route,
                                        frequency:   drug.frequency,
                                        startDate:   drug.start_date,
                                        endDate:     drug.end_date ?? "",
                                        notes:       drug.notes    ?? "",
                                    })}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => deactivate.mutate({ id: drug.id, updates: { isActive: false } })}
                                    className="text-xs text-orange-500 hover:underline"
                                >
                                    D/C
                                </button>
                            </>
                        )}
                        {(drug.drug_administration_records?.length > 0) && (
                            <button onClick={() => setExpanded((v) => !v)} className="text-xs text-slate-400 hover:text-slate-600">
                                {expanded ? "▲" : "▼"} {drug.drug_administration_records.length}
                            </button>
                        )}
                    </div>
                </td>
            </tr>

            {/* Administration log expansion */}
            {expanded && drug.drug_administration_records?.map((rec: any) => (
                <tr key={rec.id} className="bg-teal-50/40 border-b border-teal-100/60 text-xs">
                    <td colSpan={2} className="px-6 py-2 text-slate-500">
                        {rec.administered_at ? fmtFull(rec.administered_at) : "—"}
                    </td>
                    <td colSpan={2} className="px-4 py-2">
                        <span className={`font-medium capitalize px-2 py-0.5 rounded-full ${ADMIN_STATUS_COLORS[rec.status as AdminStatus]}`}>
                            {rec.status}
                        </span>
                    </td>
                    <td colSpan={2} className="px-4 py-2 text-slate-500">{rec.given_by}</td>
                    <td className="px-4 py-2 text-slate-400 italic">{rec.notes}</td>
                </tr>
            ))}

            {/* Admin log modal */}
            {store.loggingAdminId === drug.id && (
                <AdminLogModal drugChartId={drug.id} patientId={patientId} staffId={staffId} />
            )}
        </>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface DrugChartProps {
    patientId: string;
    staffId:   string;
    readOnly?: boolean;
}

export default function DrugChart({ patientId, staffId, readOnly = false }: DrugChartProps) {
    const store   = useNurseChartsStore();
    const { data, isLoading, isError } = useDrugChartByPatient(patientId);

    const active   = (data ?? []).filter((d: any) =>  d.is_active);
    const inactive = (data ?? []).filter((d: any) => !d.is_active);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Drug Chart</h3>
                {!readOnly && (
                    <button
                        onClick={() => store.openDrugForm()}
                        className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                        + Add Drug
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="text-sm text-slate-400 py-8 text-center">Loading drug chart…</div>
            ) : isError ? (
                <div className="text-sm text-red-400 py-8 text-center">Failed to load drug chart</div>
            ) : active.length === 0 && inactive.length === 0 ? (
                <div className="text-sm text-slate-400 py-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                    No drugs prescribed
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                                <th className="px-4 py-3 text-left font-medium">Drug</th>
                                <th className="px-4 py-3 text-left font-medium">Dose</th>
                                <th className="px-4 py-3 text-left font-medium">Route</th>
                                <th className="px-4 py-3 text-left font-medium">Freq</th>
                                <th className="px-4 py-3 text-left font-medium">Duration</th>
                                <th className="px-4 py-3 text-left font-medium">Last Status</th>
                                <th className="px-4 py-3 text-left font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {active.map((drug: any) => (
                                <DrugRow key={drug.id} drug={drug} patientId={patientId} staffId={staffId} />
                            ))}
                            {inactive.length > 0 && active.length > 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-1.5 text-xs text-slate-400 bg-slate-50 uppercase tracking-wide font-medium">
                                        Discontinued
                                    </td>
                                </tr>
                            )}
                            {inactive.map((drug: any) => (
                                <DrugRow key={drug.id} drug={drug} patientId={patientId} staffId={staffId} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {store.showDrugForm && (
                <DrugFormModal patientId={patientId} staffId={staffId} />
            )}
        </div>
    );
}