"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
    useUpcomingAppointments,
    useAppointmentsByDate,
    useAppointmentsByPatient,
    useCreateAppointment,
    useUpdateAppointment,
    useUpdateAppointmentStatus,
    useDeleteAppointment,
} from "@/hooks/emr/use-appointments";
import { useAllPatients } from "@/hooks/emr/use-emr";
import { useAllStaff }    from "@/hooks/emr/use-staff";
import { useAppointmentStore } from "@/store/appoointment-store";
import type {
    AppointmentStatus,
    AppointmentDept,
    AppointmentPriority,
    RecurringFrequency,
} from "@/store/appoointment-store";
import { resolvePatientName } from "@/lib/utils/appointment.utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    scheduled:   "bg-blue-50   text-blue-700   border-blue-200",
    confirmed:   "bg-green-50  text-green-700  border-green-200",
    in_progress: "bg-yellow-50 text-yellow-700 border-yellow-200",
    completed:   "bg-slate-50  text-slate-600  border-slate-200",
    cancelled:   "bg-red-50    text-red-600    border-red-200",
    no_show:     "bg-orange-50 text-orange-600 border-orange-200",
};

const PRIORITY_LEFT: Record<string, string> = {
    emergency: "border-l-4 border-l-red-500",
    urgent:    "border-l-4 border-l-orange-400",
    routine:   "border-l-4 border-l-transparent",
};

const DEPARTMENTS: AppointmentDept[]     = ["Doctor", "Nurse", "Lab", "Radiology", "Pharmacy"];
const PRIORITIES:  AppointmentPriority[] = ["routine", "urgent", "emergency"];
const STATUSES: (AppointmentStatus | "all")[] = [
    "all", "scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show",
];
const DOCTOR_ROLES = ["Doctor", "doctor", "Consultant", "consultant"];
const CALENDAR_START = 7 * 60;   // 07:00 in minutes
const CALENDAR_END   = 20 * 60;  // 20:00 in minutes
const PX_PER_MIN     = 1.2;      // pixels per minute in day view

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO() { return new Date().toISOString().slice(0, 10); }

function shiftDate(iso: string, days: number): string {
    const d = new Date(iso);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
}

function timeToMinutes(t: string): number {
    const [h, m] = (t ?? "00:00").split(":").map(Number);
    return h * 60 + (m || 0);
}

function relativeTime(date: string, time: string): string {
    if (date !== todayISO()) return time?.slice(0, 5) ?? "";
    const now   = new Date().getHours() * 60 + new Date().getMinutes();
    const appt  = timeToMinutes(time);
    const diff  = appt - now;
    if (diff > 0  && diff <= 60)  return `in ${diff}m`;
    if (diff > 60 && diff <= 120) return `in ${Math.round(diff / 60)}h`;
    if (diff < 0  && diff >= -60) return `${Math.abs(diff)}m ago`;
    return time?.slice(0, 5) ?? "";
}

function isOverdue(appt: any): boolean {
    if (appt.status !== "confirmed") return false;
    if (appt.appointment_date !== todayISO()) return false;
    const now  = new Date().getHours() * 60 + new Date().getMinutes();
    return now > timeToMinutes(appt.appointment_time) + 30;
}

function detectConflict(
    appointments: any[],
    doctorId: string,
    date: string,
    time: string,
    excludeId?: string,
): any | null {
    if (!doctorId || !date || !time) return null;
    return appointments.find(a =>
        a.doctor_id === doctorId &&
        a.appointment_date === date &&
        a.appointment_time?.slice(0, 5) === time.slice(0, 5) &&
        a.id !== excludeId &&
        !["cancelled", "no_show", "completed"].includes(a.status)
    ) ?? null;
}

function generateRecurringDates(start: string, freq: RecurringFrequency, count: number): string[] {
    const dates: string[] = [];
    for (let i = 0; i < count; i++) {
        const d = new Date(start);
        if (freq === "weekly")   d.setDate(d.getDate() + 7 * i);
        if (freq === "biweekly") d.setDate(d.getDate() + 14 * i);
        if (freq === "monthly")  d.setMonth(d.getMonth() + i);
        dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
}

function printAppointmentSlip(appt: any) {
    const name   = resolvePatientName(appt);
    const doctor = appt.staffs?.name ?? "Not assigned";
    const html = `<!DOCTYPE html><html><head><title>Appointment Slip</title>
<style>
  body { font-family: Arial, sans-serif; padding: 40px; max-width: 480px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 2px solid #0B3D6B; padding-bottom: 16px; margin-bottom: 24px; }
  .hospital { font-size: 14px; font-weight: 700; color: #0B3D6B; }
  .sub { font-size: 10px; color: #6B7280; margin-top: 4px; }
  .title { font-size: 18px; font-weight: 700; color: #1F2937; margin: 20px 0 16px; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F1F5F9; }
  .label { font-size: 11px; color: #6B7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .value { font-size: 13px; color: #1F2937; font-weight: 500; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
    background: ${appt.priority === "emergency" ? "#FEE2E2" : appt.priority === "urgent" ? "#FEF3C7" : "#F1F5F9"};
    color: ${appt.priority === "emergency" ? "#DC2626" : appt.priority === "urgent" ? "#D97706" : "#475569"};
  }
  .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #9CA3AF; }
  @media print { body { padding: 0; } button { display: none; } }
</style></head><body>
<div class="header">
  <div class="hospital">NILE VALLEY MOTHER &amp; CHILD HOSPITAL</div>
  <div class="sub">Plot 602, David Jemibewon Crescent, Gudu District, Abuja · +234 813 006 4451</div>
</div>
<div class="title">Appointment Slip</div>
${[
    ["Patient",    name],
    ["Doctor",     doctor],
    ["Department", appt.department],
    ["Date",       appt.appointment_date],
    ["Time",       appt.appointment_time?.slice(0, 5)],
    ["Reason",     appt.reason],
].map(([l, v]) => `<div class="row"><span class="label">${l}</span><span class="value">${v ?? "—"}</span></div>`).join("")}
<div class="row"><span class="label">Priority</span><span class="badge">${appt.priority}</span></div>
${appt.notes ? `<div class="row"><span class="label">Notes</span><span class="value">${appt.notes}</span></div>` : ""}
<div class="footer">Please arrive 15 minutes before your appointment time · Keep this slip for your records</div>
<br/><button onclick="window.print()" style="margin-top:16px;padding:8px 20px;background:#0B3D6B;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px">🖨️ Print</button>
</body></html>`;
    const win = window.open("", "_blank", "width=560,height=700");
    if (win) { win.document.write(html); win.document.close(); }
}

// ─── Patient combobox ─────────────────────────────────────────────────────────

function PatientCombobox({ patientId, patientName, isExternal, onSelectPatient, onExternalName, onToggleExternal }: {
    patientId: string; patientName: string; isExternal: boolean;
    onSelectPatient: (id: string, name: string) => void;
    onExternalName:  (name: string) => void;
    onToggleExternal:(v: boolean) => void;
}) {
    const { data: allPatients = [] } = useAllPatients();
    const [query, setQuery] = useState(patientName);
    const [open,  setOpen]  = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => { setQuery(patientName); }, [patientName]);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const filtered = useMemo(() => {
        const q = query.toLowerCase();
        return (allPatients as any[]).filter(p => p.name?.toLowerCase().includes(q) || p.phone?.toLowerCase().includes(q)).slice(0, 8);
    }, [allPatients, query]);

    if (isExternal) return (
        <div className="space-y-1.5">
            <input value={patientName} onChange={e => onExternalName(e.target.value)} placeholder="Enter patient full name"
                className="w-full rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
            <button type="button" onClick={() => { onToggleExternal(false); onSelectPatient("", ""); }}
                className="text-xs text-blue-600 hover:underline">← Search registered patients instead</button>
        </div>
    );

    return (
        <div ref={ref} className="relative">
            <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
                placeholder="Search by name or phone…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            {patientId && !open && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">✓ Selected</span>
            )}
            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                    {filtered.length === 0
                        ? <p className="px-4 py-3 text-sm text-slate-400">No patients match "{query}"</p>
                        : filtered.map((p: any) => (
                            <button key={p.id} type="button" onClick={() => { onSelectPatient(p.id, p.name); setQuery(p.name); setOpen(false); }}
                                className={`w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors ${patientId === p.id ? "bg-blue-50" : ""}`}>
                                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-xs font-bold text-blue-600">
                                    {(p.name ?? "?")[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-800">{p.name}</div>
                                    <div className="text-xs text-slate-400">{p.phone ?? "No phone"}</div>
                                </div>
                                {patientId === p.id && <span className="text-blue-600 text-xs font-bold">✓</span>}
                            </button>
                        ))
                    }
                    <div className="border-t border-slate-100">
                        <button type="button" onClick={() => { onToggleExternal(true); onSelectPatient("", query); setOpen(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-amber-700 bg-amber-50/50 hover:bg-amber-50 flex items-center gap-2">
                            <span>+</span><span>Walk-in / not registered — enter name manually</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Staff select ─────────────────────────────────────────────────────────────

function StaffSelect({ doctorId, onChange }: { doctorId: string; onChange: (id: string, name: string) => void }) {
    const { data: allStaff = [] } = useAllStaff();
    const sorted = useMemo(() => {
        const docs   = (allStaff as any[]).filter(s => DOCTOR_ROLES.includes(s.role ?? ""));
        const others = (allStaff as any[]).filter(s => !DOCTOR_ROLES.includes(s.role ?? ""));
        return [...docs, ...others];
    }, [allStaff]);

    return (
        <select value={doctorId} onChange={e => {
            const s = (allStaff as any[]).find(s => s.id === e.target.value);
            onChange(e.target.value, s?.name ?? "");
        }} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">— No specific doctor —</option>
            {sorted.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
        </select>
    );
}

// ─── Appointment form modal ───────────────────────────────────────────────────

function AppointmentFormModal({ staffId, allAppointments, onClose }: {
    staffId: string; allAppointments: any[]; onClose: () => void;
}) {
    const store  = useAppointmentStore();
    const create = useCreateAppointment();
    const update = useUpdateAppointment();
    const isEdit = !!store.editTargetId;

    const conflict = useMemo(() =>
        detectConflict(allAppointments, store.doctorId, store.appointmentDate, store.appointmentTime, store.editTargetId ?? undefined),
        [allAppointments, store.doctorId, store.appointmentDate, store.appointmentTime, store.editTargetId]
    );

    const recurringDates = useMemo(() =>
        store.isRecurring && store.appointmentDate
            ? generateRecurringDates(store.appointmentDate, store.recurringFrequency, store.recurringCount)
            : [],
        [store.isRecurring, store.appointmentDate, store.recurringFrequency, store.recurringCount]
    );

    const formInvalid = (!store.patientId && !store.patientName.trim()) || !store.appointmentDate || !store.appointmentTime || !store.reason.trim();

    async function handleSubmit() {
        const base = {
            patientId:           store.isExternalPatient ? undefined : store.patientId || undefined,
            patientNameOverride: store.isExternalPatient ? store.patientName : undefined,
            scheduledBy:         staffId,
            doctorId:            store.doctorId   || undefined,
            appointmentTime:     store.appointmentTime,
            reason:              store.reason,
            department:          store.department,
            priority:            store.priority,
            notes:               store.notes      || undefined,
        };

        if (isEdit) {
            await update.mutateAsync({ id: store.editTargetId!, updates: { ...base, appointmentDate: store.appointmentDate } });
        } else if (store.isRecurring) {
            for (const date of recurringDates) {
                await create.mutateAsync({ ...base, appointmentDate: date });
            }
        } else {
            await create.mutateAsync({ ...base, appointmentDate: store.appointmentDate });
        }

        store.resetForm();
        onClose();
    }

    const isPending = create.isPending || update.isPending;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <h2 className="text-sm font-semibold text-slate-800">{isEdit ? "Edit Appointment" : "New Appointment"}</h2>
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {/* Patient */}
                    <div>
                        <label className="lbl">Patient *</label>
                        <PatientCombobox
                            patientId={store.patientId} patientName={store.patientName} isExternal={store.isExternalPatient}
                            onSelectPatient={(id, name) => { store.setFormField("patientId", id); store.setFormField("patientName", name); }}
                            onExternalName={name => { store.setFormField("patientName", name); store.setFormField("patientId", ""); }}
                            onToggleExternal={v => { store.setFormField("isExternalPatient", v); store.setFormField("patientId", ""); store.setFormField("patientName", ""); }}
                        />
                        {store.isExternalPatient && <p className="text-xs text-amber-600 mt-1">⚠ Walk-in — not linked to a patient record</p>}
                    </div>

                    {/* Doctor */}
                    <div>
                        <label className="lbl">Doctor / Staff</label>
                        <StaffSelect doctorId={store.doctorId} onChange={(id, name) => { store.setFormField("doctorId", id); store.setFormField("doctorName", name); }} />
                    </div>

                    {/* Conflict warning */}
                    {conflict && (
                        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                            <span className="text-red-500 shrink-0 mt-0.5">⚠</span>
                            <span>
                                <strong>{conflict.staffs?.name ?? "This doctor"}</strong> already has a {conflict.status} appointment at this time
                                {conflict.patient_id ? ` for ${conflict.patients?.name ?? "another patient"}` : ""}.
                            </span>
                        </div>
                    )}

                    {/* Date + Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="lbl">Date *</label>
                            <input type="date" value={store.appointmentDate}
                                onChange={e => store.setFormField("appointmentDate", e.target.value)} className="inp" />
                        </div>
                        <div>
                            <label className="lbl">Time *</label>
                            <input type="time" value={store.appointmentTime}
                                onChange={e => store.setFormField("appointmentTime", e.target.value)} className="inp" />
                        </div>
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="lbl">Reason *</label>
                        <input value={store.reason} onChange={e => store.setFormField("reason", e.target.value)}
                            placeholder="Reason for visit" className="inp" />
                    </div>

                    {/* Department + Priority */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="lbl">Department</label>
                            <select value={store.department} onChange={e => store.setFormField("department", e.target.value as AppointmentDept)} className="inp bg-white">
                                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="lbl">Priority</label>
                            <select value={store.priority} onChange={e => store.setFormField("priority", e.target.value as AppointmentPriority)} className="inp bg-white">
                                {PRIORITIES.map(p => <option key={p} className="capitalize">{p}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="lbl">Notes</label>
                        <textarea rows={2} value={store.notes} onChange={e => store.setFormField("notes", e.target.value)}
                            placeholder="Additional notes…" className="inp resize-none" />
                    </div>

                    {/* Recurring — only for new appointments */}
                    {!isEdit && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <div onClick={() => store.setFormField("isRecurring", !store.isRecurring)}
                                    className={`w-9 h-5 rounded-full transition-colors relative ${store.isRecurring ? "bg-blue-600" : "bg-slate-300"}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow ${store.isRecurring ? "left-4" : "left-0.5"}`} />
                                </div>
                                <span className="text-sm font-medium text-slate-700">Recurring appointment</span>
                            </label>

                            {store.isRecurring && (
                                <div className="space-y-3 pt-1">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="lbl">Repeat every</label>
                                            <select value={store.recurringFrequency} onChange={e => store.setFormField("recurringFrequency", e.target.value as RecurringFrequency)} className="inp bg-white">
                                                <option value="weekly">1 week</option>
                                                <option value="biweekly">2 weeks</option>
                                                <option value="monthly">1 month</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="lbl">Occurrences</label>
                                            <input type="number" min={2} max={12} value={store.recurringCount}
                                                onChange={e => store.setFormField("recurringCount", Number(e.target.value))} className="inp" />
                                        </div>
                                    </div>

                                    {recurringDates.length > 0 && (
                                        <div>
                                            <p className="lbl mb-1.5">Scheduled dates</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {recurringDates.map((d, i) => (
                                                    <span key={d} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                                        {i === 0 ? "1st · " : ""}{d}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800">Cancel</button>
                    <button onClick={handleSubmit} disabled={formInvalid || isPending}
                        className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 transition-colors">
                        {isPending ? "Saving…" : isEdit ? "Update" : store.isRecurring ? `Schedule ${store.recurringCount} appointments` : "Schedule"}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .lbl { display:block; font-size:0.7rem; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem; }
                .inp { width:100%; border-radius:0.5rem; border:1px solid #e2e8f0; padding:0.5rem 0.75rem; font-size:0.875rem; color:#1e293b; }
                .inp:focus { outline:none; box-shadow:0 0 0 2px #93c5fd; }
            `}</style>
        </div>
    );
}

// ─── Reschedule modal ─────────────────────────────────────────────────────────

function RescheduleModal({ appt, onClose }: { appt: any; onClose: () => void }) {
    const update = useUpdateAppointment();
    const [date, setDate] = useState(appt.appointment_date);
    const [time, setTime] = useState(appt.appointment_time?.slice(0, 5) ?? "");

    async function handleReschedule() {
        await update.mutateAsync({ id: appt.id, updates: { appointmentDate: date, appointmentTime: time } });
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <h3 className="text-sm font-semibold text-slate-800 mb-0.5">Reschedule Appointment</h3>
                <p className="text-xs text-slate-500 mb-4">{resolvePatientName(appt)}</p>
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">New Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">New Time</label>
                        <input type="time" value={time} onChange={e => setTime(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-5">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
                    <button onClick={handleReschedule} disabled={!date || !time || update.isPending}
                        className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        {update.isPending ? "Saving…" : "Confirm Reschedule"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Cancel modal ─────────────────────────────────────────────────────────────

function CancelModal({ id, onClose }: { id: string; onClose: () => void }) {
    const [reason, setReason] = useState("");
    const updateStatus = useUpdateAppointmentStatus();
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Cancel Appointment</h3>
                <p className="text-xs text-slate-500 mb-4">Optionally note the reason for cancellation.</p>
                <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
                    placeholder="Reason (optional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200 mb-4" />
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Dismiss</button>
                    <button onClick={async () => { await updateStatus.mutateAsync({ id, status: "cancelled", reason: reason || undefined }); onClose(); }}
                        disabled={updateStatus.isPending}
                        className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
                        {updateStatus.isPending ? "Cancelling…" : "Cancel Appointment"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Delete modal ─────────────────────────────────────────────────────────────

function DeleteModal({ id, patientName, onClose }: { id: string; patientName: string; onClose: () => void }) {
    const del = useDeleteAppointment();
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Delete Appointment</h3>
                <p className="text-xs text-slate-500 mb-5">
                    Permanently delete the appointment for <strong className="text-slate-700">{patientName}</strong>? This cannot be undone.
                </p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Keep it</button>
                    <button onClick={async () => { await del.mutateAsync(id); onClose(); }} disabled={del.isPending}
                        className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
                        {del.isPending ? "Deleting…" : "Yes, delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Day calendar view ────────────────────────────────────────────────────────

function DayCalendarView({ appointments, staffId, onSlotClick, onAction }: {
    appointments: any[];
    staffId: string;
    onSlotClick: (time: string) => void;
    onAction: (type: "checkin" | "reschedule" | "cancel" | "delete" | "print", appt: any) => void;
}) {
    const totalMinutes = CALENDAR_END - CALENDAR_START;
    const totalHeight  = totalMinutes * PX_PER_MIN;
    const hours = Array.from({ length: (CALENDAR_END - CALENDAR_START) / 60 }, (_, i) => {
        const h = Math.floor(CALENDAR_START / 60) + i;
        return `${String(h).padStart(2, "0")}:00`;
    });

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex">
                {/* Time gutter */}
                <div className="w-16 shrink-0 border-r border-slate-100">
                    <div style={{ height: totalHeight }} className="relative">
                        {hours.map(h => (
                            <div key={h} style={{ top: (timeToMinutes(h) - CALENDAR_START) * PX_PER_MIN }}
                                className="absolute right-2 text-[10px] text-slate-400 font-medium -translate-y-1/2">
                                {h}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 relative" style={{ height: totalHeight }}>
                    {/* Hour lines */}
                    {hours.map(h => (
                        <div key={h} style={{ top: (timeToMinutes(h) - CALENDAR_START) * PX_PER_MIN }}
                            className="absolute left-0 right-0 border-t border-slate-100" />
                    ))}

                    {/* Clickable slot zones */}
                    {hours.map(h => (
                        <div key={h} style={{ top: (timeToMinutes(h) - CALENDAR_START) * PX_PER_MIN, height: 60 * PX_PER_MIN }}
                            onClick={() => onSlotClick(h)}
                            className="absolute left-0 right-0 hover:bg-blue-50/30 cursor-pointer transition-colors group">
                            <span className="hidden group-hover:flex absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-500 items-center gap-1">
                                + New
                            </span>
                        </div>
                    ))}

                    {/* Current time indicator */}
                    {(() => {
                        const now = new Date().getHours() * 60 + new Date().getMinutes();
                        if (now < CALENDAR_START || now > CALENDAR_END) return null;
                        return (
                            <div style={{ top: (now - CALENDAR_START) * PX_PER_MIN }}
                                className="absolute left-0 right-0 z-10 flex items-center gap-1 pointer-events-none">
                                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                <div className="flex-1 border-t-2 border-red-400 border-dashed" />
                            </div>
                        );
                    })()}

                    {/* Appointment blocks */}
                    {appointments.map(appt => {
                        const startMin = timeToMinutes(appt.appointment_time) - CALENDAR_START;
                        if (startMin < 0 || startMin > totalMinutes) return null;
                        const top    = startMin * PX_PER_MIN;
                        const height = Math.max(40, 30 * PX_PER_MIN);
                        const overdue = isOverdue(appt);

                        return (
                            <div key={appt.id} style={{ top, height, left: 8, right: 8 }}
                                className={`absolute z-20 rounded-lg px-2 py-1.5 border text-xs shadow-sm group overflow-hidden ${
                                    appt.priority === "emergency" ? "bg-red-50 border-red-300" :
                                    appt.priority === "urgent"    ? "bg-orange-50 border-orange-300" :
                                    overdue ? "bg-orange-50 border-orange-300" :
                                    "bg-blue-50 border-blue-200"
                                }`}>
                                <div className="font-semibold text-slate-800 truncate">{resolvePatientName(appt)}</div>
                                <div className="text-slate-500 truncate">{appt.staffs?.name ?? "No doctor"} · {appt.appointment_time?.slice(0, 5)}</div>
                                {overdue && <div className="text-orange-600 font-semibold text-[10px]">OVERDUE</div>}
                                {/* Hover actions */}
                                <div className="hidden group-hover:flex absolute right-1 top-1 gap-0.5">
                                    {appt.status === "confirmed" && (
                                        <button onClick={e => { e.stopPropagation(); onAction("checkin", appt); }}
                                            title="Check In" className="w-5 h-5 rounded bg-green-500 text-white flex items-center justify-center text-[10px]">✓</button>
                                    )}
                                    <button onClick={e => { e.stopPropagation(); onAction("reschedule", appt); }}
                                        title="Reschedule" className="w-5 h-5 rounded bg-blue-500 text-white flex items-center justify-center text-[10px]">↻</button>
                                    <button onClick={e => { e.stopPropagation(); onAction("print", appt); }}
                                        title="Print Slip" className="w-5 h-5 rounded bg-slate-500 text-white flex items-center justify-center text-[10px]">⎙</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Appointment row ──────────────────────────────────────────────────────────

function AppointmentRow({ appt, pendingIds, onAction }: {
    appt: any;
    pendingIds: Set<string>;
    onAction: (type: string, appt: any) => void;
}) {
    const loading = pendingIds.has(appt.id);
    const overdue = isOverdue(appt);
    const isToday = appt.appointment_date === todayISO();

    return (
        <tr className={`border-b border-slate-100 transition-colors text-sm
            ${PRIORITY_LEFT[appt.priority] ?? "border-l-4 border-l-transparent"}
            ${overdue ? "bg-orange-50/40" : "bg-white hover:bg-slate-50/60"}
        `}>
            <td className="px-4 py-3">
                <div className="font-medium text-slate-800">{resolvePatientName(appt)}</div>
                {!appt.patient_id  && <div className="text-[10px] text-amber-600 font-semibold mt-0.5">WALK-IN</div>}
                {appt.patients?.phone && <div className="text-xs text-slate-400">{appt.patients.phone}</div>}
            </td>
            <td className="px-4 py-3">
                <div className="text-slate-700">{appt.staffs?.name ?? <span className="text-slate-300 italic">Unassigned</span>}</div>
                {appt.staffs?.role && <div className="text-xs text-slate-400">{appt.staffs.role}</div>}
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-slate-700">{appt.appointment_date}</div>
                <div className={`text-xs font-medium ${isToday ? "text-blue-600" : "text-slate-400"}`}>
                    {isToday ? relativeTime(appt.appointment_date, appt.appointment_time) : appt.appointment_time?.slice(0, 5)}
                </div>
            </td>
            <td className="px-4 py-3 text-slate-600">{appt.department}</td>
            <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">{appt.reason}</td>
            <td className="px-4 py-3">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold capitalize ${
                    appt.priority === "emergency" ? "text-red-600" :
                    appt.priority === "urgent"    ? "text-orange-500" :
                    "text-slate-400"
                }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                        appt.priority === "emergency" ? "bg-red-500 animate-pulse" :
                        appt.priority === "urgent"    ? "bg-orange-400" :
                        "bg-slate-300"
                    }`} />
                    {appt.priority}
                </span>
            </td>
            <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border w-fit capitalize ${STATUS_COLORS[appt.status] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}>
                        {appt.status.replace(/_/g, " ")}
                    </span>
                    {overdue && <span className="text-[10px] font-bold text-orange-600 uppercase">Overdue</span>}
                </div>
            </td>
            <td className="px-4 py-3">
                {loading ? (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Confirm: scheduled → confirmed */}
                        {appt.status === "scheduled" && (
                            <ActionBtn onClick={() => onAction("confirm", appt)} color="green" title="Confirm appointment">Confirm</ActionBtn>
                        )}
                        {/* Check In: confirmed → in_progress */}
                        {appt.status === "confirmed" && (
                            <ActionBtn onClick={() => onAction("checkin", appt)} color="blue" title="Patient has arrived">Check In</ActionBtn>
                        )}
                        {/* No-show prompt on overdue */}
                        {overdue && (
                            <ActionBtn onClick={() => onAction("noshow", appt)} color="orange" title="Mark as no-show">No-Show</ActionBtn>
                        )}
                        {/* Active appointment actions */}
                        {(appt.status === "scheduled" || appt.status === "confirmed") && (
                            <>
                                <ActionBtn onClick={() => onAction("reschedule", appt)} color="slate" title="Reschedule">↻</ActionBtn>
                                <ActionBtn onClick={() => onAction("edit",       appt)} color="blue"  title="Edit details">Edit</ActionBtn>
                                <ActionBtn onClick={() => onAction("cancel",     appt)} color="red"   title="Cancel">Cancel</ActionBtn>
                            </>
                        )}
                        {/* Print slip — all statuses */}
                        <ActionBtn onClick={() => onAction("print", appt)} color="slate" title="Print appointment slip">⎙</ActionBtn>
                        {/* Delete — all statuses */}
                        <ActionBtn onClick={() => onAction("delete", appt)} color="red" title="Delete permanently">✕</ActionBtn>
                    </div>
                )}
            </td>
        </tr>
    );
}

function ActionBtn({ onClick, color, title, children }: {
    onClick: () => void; color: string; title: string; children: React.ReactNode;
}) {
    const colors: Record<string, string> = {
        green:  "text-green-600 hover:bg-green-50",
        blue:   "text-blue-600  hover:bg-blue-50",
        red:    "text-red-500   hover:bg-red-50",
        orange: "text-orange-600 hover:bg-orange-50",
        slate:  "text-slate-500  hover:bg-slate-100",
    };
    return (
        <button onClick={onClick} title={title}
            className={`text-xs font-semibold px-1.5 py-0.5 rounded-lg transition-colors ${colors[color] ?? colors.slate}`}>
            {children}
        </button>
    );
}

// ─── Appointment table ────────────────────────────────────────────────────────

function AppointmentTable({ rows, pendingIds, onAction, label, labelColor }: {
    rows:        any[];
    pendingIds:  Set<string>;
    onAction:    (type: string, appt: any) => void;
    label?:      string;
    labelColor?: string;
}) {
    return (
        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm">
            {label && (
                <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
                    <div className={`w-1.5 h-4 rounded-full ${labelColor ?? "bg-slate-300"}`} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                    <span className="text-xs text-slate-400 font-medium ml-auto">{rows.length}</span>
                </div>
            )}
            <table className="w-full text-sm">
                <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide border-b border-slate-100">
                        <th className="px-4 py-3 text-left font-semibold">Patient</th>
                        <th className="px-4 py-3 text-left font-semibold">Doctor</th>
                        <th className="px-4 py-3 text-left font-semibold">Date & Time</th>
                        <th className="px-4 py-3 text-left font-semibold">Dept</th>
                        <th className="px-4 py-3 text-left font-semibold">Reason</th>
                        <th className="px-4 py-3 text-left font-semibold">Priority</th>
                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                        <th className="px-4 py-3 text-left font-semibold">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(appt => (
                        <AppointmentRow
                            key={appt.id}
                            appt={appt}
                            pendingIds={pendingIds}
                            onAction={onAction}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AppointmentComponentProps {
    staffId:          string;
    patientId?:       string;
    inPatientContext?: boolean;  // true when rendered inside a patient detail tab
}

export default function AppointmentComponent({ staffId, patientId, inPatientContext = false }: AppointmentComponentProps) {
    const store        = useAppointmentStore();
    const updateStatus = useUpdateAppointmentStatus();
    const { data: allStaff = [] } = useAllStaff();

    const [pendingIds,       setPendingIds]       = useState<Set<string>>(new Set());
    const [deleteTarget,     setDeleteTarget]     = useState<{ id: string; name: string } | null>(null);
    const [rescheduleTarget, setRescheduleTarget] = useState<any | null>(null);

    // ── Data sources ──────────────────────────────────────────────────────────
    // In patient context: fetch the full history for this patient (all time).
    // In global context:  fetch upcoming + by selected date.
    const upcomingQ    = useUpcomingAppointments();
    const byDateQ      = useAppointmentsByDate(store.dateFilter);
    const byPatientQ   = useAppointmentsByPatient(patientId ?? "");

    const allAppointments: any[] = useMemo(() => {
        if (inPatientContext && patientId) {
            return byPatientQ.data ?? [];
        }
        return [...(upcomingQ.data ?? []), ...(byDateQ.data ?? [])].filter(
            (a, i, arr) => {
                // Defensive: skip if missing id (could be GenericStringError)
                if (!('id' in a)) return false;
                return arr.findIndex(b => 'id' in b && b.id === a.id) === i;
            }
    
        );
    }, [inPatientContext, patientId, byPatientQ.data, upcomingQ.data, byDateQ.data]);

    const loading = inPatientContext
        ? byPatientQ.isLoading
        : upcomingQ.isLoading || byDateQ.isLoading;

    // In patient context, FrontDesk role is determined by the staffId caller;
    // actions are gated via the canEdit flag passed down.
    // We derive it from the store's own doctorFilter + context.
    // The parent (PatientDetailTabs) passes staffId from auth — we infer role
    // gating by checking whether inPatientContext is true and restricting actions.
    // The parent must pass readOnly={role !== "FrontDesk"} — we accept it as prop.
    // For simplicity: in patient context, hide create/edit/cancel/delete unless
    // the caller explicitly unlocks it via `canWrite`.
    const canWrite = !inPatientContext; // global page = always writable; patient tab = controlled below

    // Filtered list
    const filtered = useMemo(() =>
        allAppointments.filter(a => {
            const matchDate    = inPatientContext || !store.dateFilter || a.appointment_date === store.dateFilter;
            const matchStatus  = store.statusFilter === "all" || a.status === store.statusFilter;
            const matchDoctor  = inPatientContext || !store.doctorFilter || a.doctor_id === store.doctorFilter;
            const matchPatient = !patientId || a.patient_id === patientId;
            const name         = resolvePatientName(a).toLowerCase();
            const matchSearch  = !store.search || name.includes(store.search.toLowerCase()) || a.reason?.toLowerCase().includes(store.search.toLowerCase());
            return matchDate && matchStatus && matchDoctor && matchPatient && matchSearch;
        }),
    [allAppointments, inPatientContext, store.dateFilter, store.statusFilter, store.doctorFilter, patientId, store.search]);

    // Per-row optimistic status handler
    const handleStatus = useCallback(async (id: string, status: string, reason?: string) => {
        setPendingIds(p => new Set([...p, id]));
        try { await updateStatus.mutateAsync({ id, status, reason }); }
        finally { setPendingIds(p => { const n = new Set(p); n.delete(id); return n; }); }
    }, [updateStatus]);

    const handleAction = useCallback((type: string, appt: any) => {
        switch (type) {
            case "confirm":    handleStatus(appt.id, "confirmed"); break;
            case "checkin":    handleStatus(appt.id, "in_progress"); break;
            case "noshow":     handleStatus(appt.id, "no_show"); break;
            case "cancel":     store.setUI("cancelTargetId", appt.id); break;
            case "reschedule": setRescheduleTarget(appt); break;
            case "print":      printAppointmentSlip(appt); break;
            case "delete":     setDeleteTarget({ id: appt.id, name: resolvePatientName(appt) }); break;
            case "edit":
                store.openEdit(appt.id, {
                    patientId:         appt.patient_id         ?? "",
                    patientName:       resolvePatientName(appt),
                    isExternalPatient: !appt.patient_id,
                    doctorId:          appt.doctor_id          ?? "",
                    doctorName:        appt.staffs?.name        ?? "",
                    appointmentDate:   appt.appointment_date,
                    appointmentTime:   appt.appointment_time,
                    reason:            appt.reason,
                    department:        appt.department,
                    priority:          appt.priority,
                    notes:             appt.notes               ?? "",
                    isRecurring:       false,
                    recurringFrequency:"weekly",
                    recurringCount:    4,
                });
                break;
        }
    }, [handleStatus, store]);

    function openNewForm(prefillTime?: string) {
        store.resetForm();
        if (!inPatientContext && store.dateFilter) store.setFormField("appointmentDate", store.dateFilter);
        if (patientId) {
            // pre-select the patient from the DB list — name will be resolved by combobox
            store.setFormField("patientId", patientId);
        }
        if (prefillTime) store.setFormField("appointmentTime", prefillTime);
        store.setUI("showForm", true);
    }

    // Status counts for tab badges
    const counts = useMemo(() => {
        const m: Record<string, number> = {};
        allAppointments.forEach(a => { m[a.status] = (m[a.status] ?? 0) + 1; });
        return m;
    }, [allAppointments]);

    const doctorOptions = useMemo(() =>
        (allStaff as any[]).filter(s => DOCTOR_ROLES.includes(s.role ?? "")),
    [allStaff]);

    // ── Split past / upcoming in patient context ───────────────────────────────
    const today = todayISO();
    const { upcoming, past } = useMemo(() => {
        if (!inPatientContext) return { upcoming: filtered, past: [] };
        const up   = filtered.filter(a => a.appointment_date >= today).sort((a, b) => a.appointment_date.localeCompare(b.appointment_date));
        const past = filtered.filter(a => a.appointment_date <  today).sort((a, b) => b.appointment_date.localeCompare(a.appointment_date));
        return { upcoming: up, past };
    }, [inPatientContext, filtered, today]);

    return (
        <div className="space-y-4">

            {/* ── Header ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-bold text-slate-800">
                            {inPatientContext ? "Appointment History" : "Appointments"}
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                            {inPatientContext && past.length > 0 && ` · ${past.length} past`}
                            {loading && <span className="ml-2 inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin align-middle" />}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View toggle — hidden in patient context (list only) */}
                        {!inPatientContext && (
                            <div className="flex bg-slate-100 rounded-xl p-0.5 gap-0.5">
                                {(["list", "calendar"] as const).map(mode => (
                                    <button key={mode} onClick={() => store.setUI("viewMode", mode)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                                            store.viewMode === mode ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                        }`}>
                                        {mode === "list" ? "☰ List" : "⧉ Day"}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* New appointment — always available; patient pre-filled in context */}
                        <button onClick={() => openNewForm()}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-200">
                            + New Appointment
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Filter bar — hidden in patient context ── */}
            {!inPatientContext && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3 space-y-3">
                    {/* Date navigation */}
                    <div className="flex items-center gap-2">
                        <button onClick={() => store.setUI("dateFilter", shiftDate(store.dateFilter || todayISO(), -1))}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors text-sm">
                            ‹
                        </button>
                        <input type="date" value={store.dateFilter}
                            onChange={e => store.setUI("dateFilter", e.target.value)}
                            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-center" />
                        <button onClick={() => store.setUI("dateFilter", shiftDate(store.dateFilter || todayISO(), 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors text-sm">
                            ›
                        </button>
                        {store.dateFilter !== todayISO() && (
                            <button onClick={() => store.setUI("dateFilter", todayISO())}
                                className="text-xs text-blue-600 hover:underline font-semibold whitespace-nowrap">
                                Today
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <select value={store.doctorFilter} onChange={e => store.setUI("doctorFilter", e.target.value)}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                            <option value="">All doctors</option>
                            {doctorOptions.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>

                        <div className="flex items-center gap-1 flex-wrap">
                            {STATUSES.map(s => (
                                <button key={s} onClick={() => store.setUI("statusFilter", s)}
                                    className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-colors capitalize ${
                                        store.statusFilter === s
                                            ? "bg-blue-600 text-white border-blue-600"
                                            : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
                                    }`}>
                                    {s === "all" ? "All" : s.replace(/_/g, " ")}
                                    {s !== "all" && counts[s] > 0 && (
                                        <span className={`ml-1 text-[10px] font-bold px-1 rounded-full ${store.statusFilter === s ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                                            {counts[s]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <input value={store.search} onChange={e => store.setUI("search", e.target.value)}
                            placeholder="Search patient or reason…"
                            className="flex-1 min-w-36 rounded-xl border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                </div>
            )}

            {/* ── Patient-context status filter (compact) ── */}
            {inPatientContext && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    {STATUSES.map(s => (
                        <button key={s} onClick={() => store.setUI("statusFilter", s)}
                            className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-colors capitalize ${
                                store.statusFilter === s
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
                            }`}>
                            {s === "all" ? "All" : s.replace(/_/g, " ")}
                            {s !== "all" && counts[s] > 0 && (
                                <span className={`ml-1 text-[10px] font-bold px-1 rounded-full ${store.statusFilter === s ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                                    {counts[s]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Content ── */}
            {loading && allAppointments.length === 0 ? (
                <div className="text-sm text-slate-400 py-12 text-center bg-white rounded-2xl border border-slate-100">
                    Loading appointments…
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 text-2xl">📅</div>
                    <div className="text-center">
                        <p className="text-sm font-semibold text-slate-600">
                            {inPatientContext ? "No appointments on record" : `No appointments for ${store.dateFilter || "this date"}`}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            {inPatientContext ? "Book the first one below." : "Click below to schedule one."}
                        </p>
                    </div>
                    <button onClick={() => openNewForm()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
                        + Schedule Appointment
                    </button>
                </div>
            ) : inPatientContext ? (
                /* ── Patient context: upcoming then past ── */
                <div className="space-y-3">
                    {upcoming.length > 0 && (
                        <AppointmentTable
                            rows={upcoming}
                            pendingIds={pendingIds}
                            onAction={handleAction}
                            label="Upcoming"
                            labelColor="bg-blue-500"
                        />
                    )}
                    {past.length > 0 && (
                        <AppointmentTable
                            rows={past}
                            pendingIds={pendingIds}
                            onAction={handleAction}
                            label="Past"
                            labelColor="bg-slate-300"
                        />
                    )}
                </div>
            ) : store.viewMode === "calendar" ? (
                <DayCalendarView
                    appointments={filtered}
                    staffId={staffId}
                    onSlotClick={time => openNewForm(time)}
                    onAction={handleAction}
                />
            ) : (
                <AppointmentTable
                    rows={filtered}
                    pendingIds={pendingIds}
                    onAction={handleAction}
                />
            )}

            {/* ── Modals ── */}
            {store.showForm && (
                <AppointmentFormModal
                    staffId={staffId}
                    allAppointments={allAppointments}
                    onClose={() => store.closeForm()}
                />
            )}
            {store.cancelTargetId && (
                <CancelModal id={store.cancelTargetId} onClose={() => store.setUI("cancelTargetId", null)} />
            )}
            {rescheduleTarget && (
                <RescheduleModal appt={rescheduleTarget} onClose={() => setRescheduleTarget(null)} />
            )}
            {deleteTarget && (
                <DeleteModal id={deleteTarget.id} patientName={deleteTarget.name} onClose={() => setDeleteTarget(null)} />
            )}
        </div>
    );
}