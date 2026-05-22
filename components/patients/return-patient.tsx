"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { patientKeys, appointmentKeys } from "@/hooks/query-keys";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReturnType = "outpatient" | "inpatient" | "emergency";

export interface ReturnPatientInput {
    patientId:        string;
    returnType:       ReturnType;
    reason:           string;
    referredDoctor?:  string;
    priority:         "routine" | "urgent" | "emergency";
    appointmentDate?: string;
    appointmentTime?: string;
    notes?:           string;
    registeredBy:     string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ReturnPatientProps {
    patientId:   string;
    patientName: string;
    staffId:     string;
    onReturn:    (input: ReturnPatientInput) => Promise<void>;
    onCancel?:   () => void;
}

// ─── Visit Type Card ──────────────────────────────────────────────────────────

interface TypeCardProps {
    value:       ReturnType;
    selected:    boolean;
    onSelect:    () => void;
    icon:        string;
    title:       string;
    description: string;
}

function TypeCard({ value, selected, onSelect, icon, title, description }: TypeCardProps) {
    return (
        <button
            onClick={onSelect}
            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selected
                    ? "border-teal-500 bg-teal-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-teal-200 hover:bg-slate-50"
            }`}
        >
            <div className="flex items-start gap-3">
                <span className="text-xl leading-none mt-0.5">{icon}</span>
                <div>
                    <p className={`text-sm font-semibold ${selected ? "text-teal-700" : "text-slate-700"}`}>{title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                </div>
                {selected && (
                    <div className="ml-auto w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                )}
            </div>
        </button>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReturnPatient({ patientId, patientName, staffId, onReturn, onCancel }: ReturnPatientProps) {
    const qc = useQueryClient();

    const [form, setForm] = useState<Omit<ReturnPatientInput, "registeredBy">>({
        patientId,
        returnType:       "outpatient",
        reason:           "",
        referredDoctor:   "",
        priority:         "routine",
        appointmentDate:  new Date().toISOString().slice(0, 10),
        appointmentTime:  "",
        notes:            "",
    });

    const [success, setSuccess] = useState(false);

    const mutation = useMutation({
        mutationFn: () => onReturn({ ...form, registeredBy: staffId }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: patientKeys.lists() });
            qc.invalidateQueries({ queryKey: appointmentKeys.upcoming() });
            setSuccess(true);
        },
    });

    const isEmergency  = form.returnType === "emergency";
    const formInvalid  = !form.reason.trim();

    function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
        setForm((f) => ({ ...f, [k]: v }));
    }

    if (success) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center space-y-4 w-full max-w-md">
                <div className="w-14 h-14 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-base font-semibold text-slate-800">Patient Returned</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        <span className="font-medium text-slate-700">{patientName}</span> has been checked in as a returning patient.
                    </p>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl text-sm text-slate-600">
                    <span className="capitalize">{form.returnType}</span>
                    <span className="text-slate-300">·</span>
                    <span className="capitalize">{form.priority}</span>
                    {form.appointmentDate && (
                        <>
                            <span className="text-slate-300">·</span>
                            <span>{form.appointmentDate}</span>
                        </>
                    )}
                </div>
                {onCancel && (
                    <button onClick={onCancel} className="text-sm text-teal-600 hover:underline">
                        Close
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden w-full max-w-lg">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-800">Return Visit</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{patientName} · ID: {patientId}</p>
                    </div>
                    {onCancel && (
                        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
                            ×
                        </button>
                    )}
                </div>
            </div>

            <div className="px-6 py-5 space-y-5">
                {/* Return type */}
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Visit Type</p>
                    <div className="space-y-2">
                        <TypeCard
                            value="outpatient"
                            selected={form.returnType === "outpatient"}
                            onSelect={() => set("returnType", "outpatient")}
                            icon="🏥"
                            title="Outpatient"
                            description="Scheduled follow-up or walk-in consultation"
                        />
                        <TypeCard
                            value="inpatient"
                            selected={form.returnType === "inpatient"}
                            onSelect={() => set("returnType", "inpatient")}
                            icon="🛏️"
                            title="Re-admission"
                            description="Patient requires inpatient care and ward bed"
                        />
                        <TypeCard
                            value="emergency"
                            selected={form.returnType === "emergency"}
                            onSelect={() => { set("returnType", "emergency"); set("priority", "emergency"); }}
                            icon="🚨"
                            title="Emergency"
                            description="Urgent or emergency presentation"
                        />
                    </div>
                </div>

                {/* Reason */}
                <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">
                        Reason for Visit <span className="text-red-400">*</span>
                    </label>
                    <textarea
                        rows={3}
                        value={form.reason}
                        onChange={(e) => set("reason", e.target.value)}
                        placeholder={isEmergency ? "Describe the emergency presentation…" : "Reason for returning, chief complaint…"}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-slate-300"
                    />
                </div>

                {/* Priority (only editable if not emergency) */}
                {!isEmergency && (
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Priority</p>
                        <div className="flex gap-2">
                            {(["routine", "urgent"] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => set("priority", p)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium border capitalize transition-colors ${
                                        form.priority === p
                                            ? p === "urgent" ? "bg-orange-500 text-white border-orange-500" : "bg-teal-600 text-white border-teal-600"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                    }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Appointment scheduling */}
                {!isEmergency && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Appointment Date</label>
                            <input
                                type="date"
                                value={form.appointmentDate}
                                min={new Date().toISOString().slice(0, 10)}
                                onChange={(e) => set("appointmentDate", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Appointment Time</label>
                            <input
                                type="time"
                                value={form.appointmentTime}
                                onChange={(e) => set("appointmentTime", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                            />
                        </div>
                    </div>
                )}

                {/* Doctor */}
                <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Referred Doctor (optional)</label>
                    <input
                        value={form.referredDoctor}
                        onChange={(e) => set("referredDoctor", e.target.value)}
                        placeholder="Doctor ID or name"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-slate-300"
                    />
                </div>

                {/* Notes */}
                <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide block mb-1">Additional Notes</label>
                    <textarea
                        rows={2}
                        value={form.notes}
                        onChange={(e) => set("notes", e.target.value)}
                        placeholder="Any additional information…"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 placeholder:text-slate-300"
                    />
                </div>

                {/* Error */}
                {mutation.isError && (
                    <p className="text-xs text-red-500">Failed to register return visit. Please try again.</p>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                    {onCancel && (
                        <button onClick={onCancel} className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800">
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={() => mutation.mutate()}
                        disabled={formInvalid || mutation.isPending}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors disabled:opacity-50 text-white ${
                            isEmergency
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-teal-600 hover:bg-teal-700"
                        }`}
                    >
                        {mutation.isPending
                            ? "Registering…"
                            : isEmergency
                                ? "🚨 Register Emergency Visit"
                                : "Register Return Visit"
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}