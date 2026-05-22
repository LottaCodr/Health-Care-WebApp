"use client";

import React, { useState } from "react";
import {
    useUpcomingAppointments,
    useAppointmentsByDate,
    useCreateAppointment,
    useUpdateAppointment,
    useUpdateAppointmentStatus,
    useDeleteAppointment,
} from "@/hooks/emr/use-appointments";
import { useAppointmentStore } from "@/store/appoointment-store";
import type { AppointmentStatus, AppointmentDept, AppointmentPriority } from "@/store/appoointment-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<AppointmentStatus | string, string> = {
    scheduled:  "bg-blue-50 text-blue-700 border-blue-200",
    confirmed:  "bg-green-50 text-green-700 border-green-200",
    in_progress:"bg-yellow-50 text-yellow-700 border-yellow-200",
    completed:  "bg-slate-50 text-slate-600 border-slate-200",
    cancelled:  "bg-red-50 text-red-600 border-red-200",
    no_show:    "bg-orange-50 text-orange-600 border-orange-200",
};

const PRIORITY_DOT: Record<AppointmentPriority, string> = {
    routine:   "bg-slate-400",
    urgent:    "bg-orange-400",
    emergency: "bg-red-500",
};

const DEPARTMENTS: AppointmentDept[] = ["Doctor", "Nurse", "Lab", "Radiology", "Pharmacy"];
const PRIORITIES: AppointmentPriority[] = ["routine", "urgent", "emergency"];
const STATUSES: (AppointmentStatus | "all")[] = [
    "all","scheduled","confirmed","in_progress","completed","cancelled","no_show",
];

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface AppointmentBadgeProps { status: string }
function AppointmentBadge({ status }: AppointmentBadgeProps) {
    return (
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[status] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}>
            {status.replace("_", " ")}
        </span>
    );
}

// ─── Appointment Form Modal ───────────────────────────────────────────────────

interface FormModalProps {
    staffId: string;
    onClose: () => void;
}

function AppointmentFormModal({ staffId, onClose }: FormModalProps) {
    const store       = useAppointmentStore();
    const create      = useCreateAppointment();
    const update      = useUpdateAppointment();
    const isEdit      = !!store.editTargetId;

    const disabled = !store.patientId || !store.appointmentDate || !store.appointmentTime || !store.reason;

    async function handleSubmit() {
        const payload = {
            patientId:       store.patientId,
            scheduledBy:     staffId,
            doctorId:        store.doctorId || undefined,
            appointmentDate: store.appointmentDate,
            appointmentTime: store.appointmentTime,
            reason:          store.reason,
            department:      store.department,
            priority:        store.priority,
            notes:           store.notes || undefined,
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
                    <h2 className="text-base font-semibold text-slate-800">
                        {isEdit ? "Edit Appointment" : "New Appointment"}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
                </div>

                <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Patient ID */}
                    <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Patient ID *</label>
                        <input
                            value={store.patientId}
                            onChange={(e) => store.setFormField("patientId", e.target.value)}
                            placeholder="Patient ID"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                    </div>

                    {/* Doctor */}
                    <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Doctor (optional)</label>
                        <input
                            value={store.doctorId}
                            onChange={(e) => store.setFormField("doctorId", e.target.value)}
                            placeholder="Doctor ID"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                    </div>

                    {/* Date + Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Date *</label>
                            <input
                                type="date"
                                value={store.appointmentDate}
                                onChange={(e) => store.setFormField("appointmentDate", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Time *</label>
                            <input
                                type="time"
                                value={store.appointmentTime}
                                onChange={(e) => store.setFormField("appointmentTime", e.target.value)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                            />
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Reason *</label>
                        <input
                            value={store.reason}
                            onChange={(e) => store.setFormField("reason", e.target.value)}
                            placeholder="Reason for visit"
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                    </div>

                    {/* Department + Priority */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Department</label>
                            <select
                                value={store.department}
                                onChange={(e) => store.setFormField("department", e.target.value as AppointmentDept)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                            >
                                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Priority</label>
                            <select
                                value={store.priority}
                                onChange={(e) => store.setFormField("priority", e.target.value as AppointmentPriority)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                            >
                                {PRIORITIES.map((p) => <option key={p} className="capitalize">{p}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Notes</label>
                        <textarea
                            rows={2}
                            value={store.notes}
                            onChange={(e) => store.setFormField("notes", e.target.value)}
                            placeholder="Additional notes..."
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
                        />
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={disabled || create.isPending || update.isPending}
                        className="px-5 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                    >
                        {create.isPending || update.isPending ? "Saving…" : isEdit ? "Update" : "Schedule"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

function CancelModal({ id, onClose }: { id: string; onClose: () => void }) {
    const [reason, setReason] = useState("");
    const updateStatus = useUpdateAppointmentStatus();

    async function handleCancel() {
        await updateStatus.mutateAsync({ id, status: "Cancelled", reason: reason || undefined });
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <h3 className="text-base font-semibold text-slate-800 mb-1">Cancel Appointment</h3>
                <p className="text-sm text-slate-500 mb-4">This will mark the appointment as cancelled.</p>
                <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for cancellation (optional)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300 mb-4"
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

// ─── Main Component ───────────────────────────────────────────────────────────

interface AppointmentComponentProps {
    staffId: string;
    patientId?: string;  // If given, show only patient-specific view
}

export default function AppointmentComponent({ staffId, patientId }: AppointmentComponentProps) {
    const store        = useAppointmentStore();
    const updateStatus = useUpdateAppointmentStatus();
    const deleteAppt   = useDeleteAppointment();

    // Use upcoming globally, or by date filter
    const dateQuery    = store.dateFilter || todayISO();
    const upcomingQ    = useUpcomingAppointments();
    const byDateQ      = useAppointmentsByDate(dateQuery);

    const appointments = store.dateFilter ? (byDateQ.data ?? []) : (upcomingQ.data ?? []);
    const loading      = store.dateFilter ? byDateQ.isLoading : upcomingQ.isLoading;

    // Filters
    const filtered = appointments.filter((a: any) => {
        const matchStatus  = store.statusFilter === "all" || a.status === store.statusFilter;
        const matchSearch  = !store.search || a.patients?.name?.toLowerCase().includes(store.search.toLowerCase()) || a.reason?.toLowerCase().includes(store.search.toLowerCase());
        const matchPatient = !patientId || a.patient_id === patientId;
        return matchStatus && matchSearch && matchPatient;
    });

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap gap-3 items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Appointments</h2>
                <button
                    onClick={() => { store.resetForm(); store.setUI("showForm", true); }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    <span>+</span> New Appointment
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <input
                    type="date"
                    value={store.dateFilter}
                    onChange={(e) => store.setUI("dateFilter", e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <select
                    value={store.statusFilter}
                    onChange={(e) => store.setUI("statusFilter", e.target.value as AppointmentStatus | "all")}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>{s === "all" ? "All statuses" : s.replace("_", " ")}</option>
                    ))}
                </select>
                <input
                    value={store.search}
                    onChange={(e) => store.setUI("search", e.target.value)}
                    placeholder="Search patient or reason…"
                    className="flex-1 min-w-40 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
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
                                <th className="px-4 py-3 text-left font-medium">Date & Time</th>
                                <th className="px-4 py-3 text-left font-medium">Dept</th>
                                <th className="px-4 py-3 text-left font-medium">Reason</th>
                                <th className="px-4 py-3 text-left font-medium">Priority</th>
                                <th className="px-4 py-3 text-left font-medium">Status</th>
                                <th className="px-4 py-3 text-left font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map((appt: any) => (
                                <tr key={appt.id} className="bg-white hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-slate-800">{appt.patients?.name ?? "—"}</div>
                                        <div className="text-xs text-slate-400">{appt.patients?.phone ?? ""}</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                                        <div>{appt.appointment_date}</div>
                                        <div className="text-xs text-slate-400">{appt.appointment_time?.slice(0, 5)}</div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{appt.department}</td>
                                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{appt.reason}</td>
                                    <td className="px-4 py-3">
                                        <span className="flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[appt.priority as AppointmentPriority] ?? "bg-slate-300"}`} />
                                            <span className="text-slate-600 capitalize">{appt.priority}</span>
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <AppointmentBadge status={appt.status} />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {appt.status === "scheduled" && (
                                                <button
                                                    onClick={() => updateStatus.mutate({ id: appt.id, status: "CheckedIn" })}
                                                    className="text-xs text-green-600 hover:underline"
                                                >
                                                    Confirm
                                                </button>
                                            )}
                                            {(appt.status === "scheduled" || appt.status === "confirmed") && (
                                                <>
                                                    <button
                                                        onClick={() => store.openEdit(appt.id, {
                                                            patientId:       appt.patient_id,
                                                            doctorId:        appt.doctor_id ?? "",
                                                            appointmentDate: appt.appointment_date,
                                                            appointmentTime: appt.appointment_time,
                                                            reason:          appt.reason,
                                                            department:      appt.department,
                                                            priority:        appt.priority,
                                                            notes:           appt.notes ?? "",
                                                        })}
                                                        className="text-xs text-blue-600 hover:underline"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => store.setUI("cancelTargetId", appt.id)}
                                                        className="text-xs text-red-500 hover:underline"
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

            {/* Modals */}
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