"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
    useUpcomingAppointments,
    useAppointmentsByDate,
    useCreateAppointment,
    useUpdateAppointment,
    useUpdateAppointmentStatus,
    useDeleteAppointment,
} from "@/hooks/emr/use-appointments";
import { useAllPatients }  from "@/hooks/emr/use-emr";
import { useAllStaff }     from "@/hooks/emr/use-staff";
import { useAppointmentStore } from "@/store/appoointment-store";
import type {
    AppointmentStatus,
    AppointmentDept,
    AppointmentPriority,
} from "@/store/appoointment-store";
import { resolvePatientName } from "@/lib/utils/appointment.utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    scheduled:   "bg-blue-50 text-blue-700 border-blue-200",
    confirmed:   "bg-green-50 text-green-700 border-green-200",
    in_progress: "bg-yellow-50 text-yellow-700 border-yellow-200",
    completed:   "bg-slate-50 text-slate-600 border-slate-200",
    cancelled:   "bg-red-50 text-red-600 border-red-200",
    no_show:     "bg-orange-50 text-orange-600 border-orange-200",
};

const PRIORITY_DOT: Record<AppointmentPriority, string> = {
    routine:   "bg-slate-400",
    urgent:    "bg-orange-400",
    emergency: "bg-red-500",
};

const DEPARTMENTS: AppointmentDept[]     = ["Doctor", "Nurse", "Lab", "Radiology", "Pharmacy"];
const PRIORITIES:  AppointmentPriority[] = ["routine", "urgent", "emergency"];
const STATUSES: (AppointmentStatus | "all")[] = [
    "all", "scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show",
];

const DOCTOR_ROLES = ["Doctor", "doctor", "Consultant", "consultant"];

function todayISO() { return new Date().toISOString().slice(0, 10); }

// ─── Patient combobox ─────────────────────────────────────────────────────────

interface PatientComboboxProps {
    patientId:         string;
    patientName:       string;
    isExternal:        boolean;
    onSelectPatient:   (id: string, name: string) => void;
    onExternalName:    (name: string) => void;
    onToggleExternal:  (v: boolean) => void;
}

function PatientCombobox({
    patientId, patientName, isExternal,
    onSelectPatient, onExternalName, onToggleExternal,
}: PatientComboboxProps) {
    const { data: allPatients = [] } = useAllPatients();
    const [query,  setQuery]  = useState(patientName);
    const [open,   setOpen]   = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Sync input when form is reset or edit loaded
    useEffect(() => { setQuery(patientName); }, [patientName]);

    // Close on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const filtered = useMemo(() => {
        if (!query.trim()) return allPatients.slice(0, 8);
        const q = query.toLowerCase();
        return allPatients
            .filter((p: any) =>
                p.name?.toLowerCase().includes(q) ||
                p.phone?.toLowerCase().includes(q)
            )
            .slice(0, 8);
    }, [allPatients, query]);

    if (isExternal) {
        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <input
                        value={patientName}
                        onChange={(e) => onExternalName(e.target.value)}
                        placeholder="Enter patient name"
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => { onToggleExternal(false); onSelectPatient("", ""); }}
                    className="text-xs text-blue-600 hover:underline"
                >
                    ← Search registered patients instead
                </button>
            </div>
        );
    }

    return (
        <div ref={ref} className="relative">
            <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder="Search by name or phone…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />

            {/* Selected badge */}
            {patientId && !open && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        Selected
                    </span>
                </div>
            )}

            {/* Dropdown */}
            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-400">No patients found</div>
                    ) : (
                        filtered.map((p: any) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                    onSelectPatient(p.id, p.name);
                                    setQuery(p.name);
                                    setOpen(false);
                                }}
                                className={`w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors ${
                                    patientId === p.id ? "bg-blue-50" : ""
                                }`}
                            >
                                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-xs font-bold text-blue-600">
                                    {(p.name ?? "?")[0].toUpperCase()}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-slate-800">{p.name}</div>
                                    <div className="text-xs text-slate-400">{p.phone ?? "No phone"}</div>
                                </div>
                                {patientId === p.id && (
                                    <span className="ml-auto text-blue-600 text-xs font-semibold">✓</span>
                                )}
                            </button>
                        ))
                    )}
                    <div className="border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => { onToggleExternal(true); onSelectPatient("", query); setOpen(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 flex items-center gap-2"
                        >
                            <span className="text-slate-400">+</span>
                            <span>Patient not registered? Enter name manually</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Staff dropdown ───────────────────────────────────────────────────────────

interface StaffSelectProps {
    doctorId:   string;
    doctorName: string;
    onChange:   (id: string, name: string) => void;
}

function StaffSelect({ doctorId, doctorName, onChange }: StaffSelectProps) {
    const { data: allStaff = [] } = useAllStaff();

    // Show doctors first, then other staff
    const sorted = useMemo(() => {
        const docs   = allStaff.filter((s: any) => DOCTOR_ROLES.includes(s.role ?? ""));
        const others = allStaff.filter((s: any) => !DOCTOR_ROLES.includes(s.role ?? ""));
        return [...docs, ...others];
    }, [allStaff]);

    return (
        <select
            value={doctorId}
            onChange={(e) => {
                const staff = allStaff.find((s: any) => s.id === e.target.value);
                onChange(e.target.value, staff?.name ?? "");
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
            <option value="">— No specific doctor —</option>
            {sorted.map((s: any) => (
                <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                </option>
            ))}
        </select>
    );
}

// ─── Appointment form modal ───────────────────────────────────────────────────

interface FormModalProps {
    staffId:  string;
    onClose:  () => void;
}

function AppointmentFormModal({ staffId, onClose }: FormModalProps) {
    const store  = useAppointmentStore();
    const create = useCreateAppointment();
    const update = useUpdateAppointment();
    const isEdit = !!store.editTargetId;

    const formInvalid =
        (!store.patientId && !store.patientName.trim()) ||
        !store.appointmentDate ||
        !store.appointmentTime ||
        !store.reason.trim();

    async function handleSubmit() {
        const payload = {
            patientId:            store.isExternalPatient ? undefined        : store.patientId   || undefined,
            patientNameOverride:  store.isExternalPatient ? store.patientName : undefined,
            scheduledBy:          staffId,
            doctorId:             store.doctorId || undefined,
            appointmentDate:      store.appointmentDate,
            appointmentTime:      store.appointmentTime,
            reason:               store.reason,
            department:           store.department,
            priority:             store.priority,
            notes:                store.notes || undefined,
        };

        if (isEdit) {
            await update.mutateAsync({ id: store.editTargetId!, updates: payload });
        } else {
            await create.mutateAsync(payload);
        }

        store.resetForm();
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-800">
                        {isEdit ? "Edit Appointment" : "New Appointment"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        ✕
                    </button>
                </div>

                <div className="px-6 py-5 space-y-4 max-h-[72vh] overflow-y-auto">

                    {/* Patient */}
                    <div>
                        <label className="label-xs">Patient *</label>
                        <PatientCombobox
                            patientId={store.patientId}
                            patientName={store.patientName}
                            isExternal={store.isExternalPatient}
                            onSelectPatient={(id, name) => {
                                store.setFormField("patientId", id);
                                store.setFormField("patientName", name);
                            }}
                            onExternalName={(name) => {
                                store.setFormField("patientName", name);
                                store.setFormField("patientId", "");
                            }}
                            onToggleExternal={(v) => {
                                store.setFormField("isExternalPatient", v);
                                store.setFormField("patientId", "");
                                store.setFormField("patientName", "");
                            }}
                        />
                        {store.isExternalPatient && (
                            <p className="text-xs text-amber-600 mt-1">
                                ⚠ Walk-in patient — not linked to a registered record
                            </p>
                        )}
                    </div>

                    {/* Doctor */}
                    <div>
                        <label className="label-xs">Doctor / Staff</label>
                        <StaffSelect
                            doctorId={store.doctorId}
                            doctorName={store.doctorName}
                            onChange={(id, name) => {
                                store.setFormField("doctorId", id);
                                store.setFormField("doctorName", name);
                            }}
                        />
                    </div>

                    {/* Date + Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label-xs">Date *</label>
                            <input
                                type="date"
                                value={store.appointmentDate}
                                onChange={(e) => store.setFormField("appointmentDate", e.target.value)}
                                className="input-base"
                            />
                        </div>
                        <div>
                            <label className="label-xs">Time *</label>
                            <input
                                type="time"
                                value={store.appointmentTime}
                                onChange={(e) => store.setFormField("appointmentTime", e.target.value)}
                                className="input-base"
                            />
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="label-xs">Reason *</label>
                        <input
                            value={store.reason}
                            onChange={(e) => store.setFormField("reason", e.target.value)}
                            placeholder="Reason for visit"
                            className="input-base"
                        />
                    </div>

                    {/* Department + Priority */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="label-xs">Department</label>
                            <select
                                value={store.department}
                                onChange={(e) => store.setFormField("department", e.target.value as AppointmentDept)}
                                className="input-base bg-white"
                            >
                                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label-xs">Priority</label>
                            <select
                                value={store.priority}
                                onChange={(e) => store.setFormField("priority", e.target.value as AppointmentPriority)}
                                className="input-base bg-white"
                            >
                                {PRIORITIES.map((p) => (
                                    <option key={p} className="capitalize">{p}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="label-xs">Notes</label>
                        <textarea
                            rows={2}
                            value={store.notes}
                            onChange={(e) => store.setFormField("notes", e.target.value)}
                            placeholder="Additional notes…"
                            className="input-base resize-none"
                        />
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={formInvalid || create.isPending || update.isPending}
                        className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                    >
                        {create.isPending || update.isPending
                            ? "Saving…"
                            : isEdit ? "Update" : "Schedule"
                        }
                    </button>
                </div>
            </div>

            <style jsx>{`
                .label-xs { display:block; font-size:0.7rem; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem; }
                .input-base { width:100%; border-radius:0.5rem; border:1px solid #e2e8f0; padding:0.5rem 0.75rem; font-size:0.875rem; color:#1e293b; }
                .input-base:focus { outline:none; box-shadow:0 0 0 2px #93c5fd; }
            `}</style>
        </div>
    );
}

// ─── Cancel modal ─────────────────────────────────────────────────────────────

function CancelModal({ id, onClose }: { id: string; onClose: () => void }) {
    const [reason, setReason] = useState("");
    const updateStatus = useUpdateAppointmentStatus();

    async function handleCancel() {
        await updateStatus.mutateAsync({ id, status: "cancelled", reason: reason || undefined });
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Cancel Appointment</h3>
                <p className="text-xs text-slate-500 mb-4">This will mark the appointment as cancelled.</p>
                <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for cancellation (optional)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200 mb-4"
                />
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Dismiss</button>
                    <button
                        onClick={handleCancel}
                        disabled={updateStatus.isPending}
                        className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                        {updateStatus.isPending ? "Cancelling…" : "Cancel Appointment"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[status] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}>
            {status.replace(/_/g, " ")}
        </span>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AppointmentComponentProps {
    staffId:    string;
    patientId?: string;   // when rendered inside a patient detail page
}

export default function AppointmentComponent({ staffId, patientId }: AppointmentComponentProps) {
    const store        = useAppointmentStore();
    const updateStatus = useUpdateAppointmentStatus();

    const dateQuery  = store.dateFilter || todayISO();
    const upcomingQ  = useUpcomingAppointments();
    const byDateQ    = useAppointmentsByDate(dateQuery);

    const appointments: any[] = store.dateFilter
        ? (byDateQ.data ?? [])
        : (upcomingQ.data ?? []);

    const loading = store.dateFilter ? byDateQ.isLoading : upcomingQ.isLoading;

    // Filters
    const filtered = appointments.filter((a) => {
        const matchStatus  = store.statusFilter === "all" || a.status === store.statusFilter;
        const matchPatient = !patientId || a.patient_id === patientId;
        const displayName  = resolvePatientName(a).toLowerCase();
        const matchSearch  = !store.search ||
            displayName.includes(store.search.toLowerCase()) ||
            a.reason?.toLowerCase().includes(store.search.toLowerCase());
        return matchStatus && matchSearch && matchPatient;
    });

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800">Appointments</h2>
                <button
                    onClick={() => { store.resetForm(); store.setUI("showForm", true); }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                    <span>+</span> New Appointment
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <input
                    type="date"
                    value={store.dateFilter}
                    onChange={(e) => store.setUI("dateFilter", e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <select
                    value={store.statusFilter}
                    onChange={(e) => store.setUI("statusFilter", e.target.value as AppointmentStatus | "all")}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>
                            {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
                        </option>
                    ))}
                </select>
                <input
                    value={store.search}
                    onChange={(e) => store.setUI("search", e.target.value)}
                    placeholder="Search patient or reason…"
                    className="flex-1 min-w-40 rounded-xl border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-sm text-slate-400 py-10 text-center">Loading appointments…</div>
            ) : filtered.length === 0 ? (
                <div className="text-sm text-slate-400 py-10 text-center bg-slate-50 rounded-xl border border-slate-100">
                    No appointments found
                </div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                                <th className="px-4 py-3 text-left font-medium">Patient</th>
                                <th className="px-4 py-3 text-left font-medium">Doctor</th>
                                <th className="px-4 py-3 text-left font-medium">Date & Time</th>
                                <th className="px-4 py-3 text-left font-medium">Dept</th>
                                <th className="px-4 py-3 text-left font-medium">Reason</th>
                                <th className="px-4 py-3 text-left font-medium">Priority</th>
                                <th className="px-4 py-3 text-left font-medium">Status</th>
                                <th className="px-4 py-3 text-left font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((appt) => (
                                <tr key={appt.id} className="bg-white hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-800">
                                            {resolvePatientName(appt)}
                                        </div>
                                        {!appt.patient_id && (
                                            <div className="text-[10px] text-amber-600 font-medium mt-0.5">
                                                Walk-in
                                            </div>
                                        )}
                                        {appt.patients?.phone && (
                                            <div className="text-xs text-slate-400">{appt.patients.phone}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 text-sm">
                                        {appt.staffs?.name ?? "—"}
                                        {appt.staffs?.role && (
                                            <div className="text-xs text-slate-400">{appt.staffs.role}</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                        <div>{appt.appointment_date}</div>
                                        <div className="text-xs text-slate-400">
                                            {appt.appointment_time?.slice(0, 5)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 text-sm">{appt.department}</td>
                                    <td className="px-4 py-3 text-slate-600 text-sm max-w-[160px] truncate">
                                        {appt.reason}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[appt.priority as AppointmentPriority] ?? "bg-slate-300"}`} />
                                            <span className="text-slate-600 capitalize text-sm">{appt.priority}</span>
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={appt.status} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {appt.status === "scheduled" && (
                                                <button
                                                    onClick={() => updateStatus.mutate({ id: appt.id, status: "confirmed" })}
                                                    className="text-xs text-green-600 hover:underline font-medium"
                                                >
                                                    Confirm
                                                </button>
                                            )}
                                            {(appt.status === "scheduled" || appt.status === "confirmed") && (
                                                <>
                                                    <button
                                                        onClick={() => store.openEdit(appt.id, {
                                                            patientId:         appt.patient_id         ?? "",
                                                            patientName:       resolvePatientName(appt),
                                                            isExternalPatient: !appt.patient_id,
                                                            doctorId:          appt.doctor_id          ?? "",
                                                            doctorName:        appt.staffs?.name       ?? "",
                                                            appointmentDate:   appt.appointment_date,
                                                            appointmentTime:   appt.appointment_time,
                                                            reason:            appt.reason,
                                                            department:        appt.department,
                                                            priority:          appt.priority,
                                                            notes:             appt.notes              ?? "",
                                                        })}
                                                        className="text-xs text-blue-600 hover:underline font-medium"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => store.setUI("cancelTargetId", appt.id)}
                                                        className="text-xs text-red-500 hover:underline font-medium"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {store.showForm && (
                <AppointmentFormModal staffId={staffId} onClose={() => store.closeForm()} />
            )}
            {store.cancelTargetId && (
                <CancelModal
                    id={store.cancelTargetId}
                    onClose={() => store.setUI("cancelTargetId", null)}
                />
            )}
        </div>
    );
}