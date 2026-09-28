"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback, useId } from "react";
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
import {
    escapeAppointmentHtml,
    generateRecurringAppointmentDates,
    resolvePatientName,
    shiftLocalISODate,
    toHospitalISODate,
} from "@/lib/utils/appointment.utils";
import { toast } from "sonner";
import {
    AlertCircle, CalendarDays, List, Loader2, Plus, RefreshCcw, X,
} from "lucide-react";

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

function todayISO() { return toHospitalISODate(); }

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

function useCloseOnEscape(onClose: () => void, disabled = false) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !disabled) onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [disabled, onClose]);
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

function printAppointmentSlip(appt: any) {
    const name   = resolvePatientName(appt);
    const doctor = appt.staffs?.name ?? "Not assigned";
    const priority = PRIORITIES.includes(appt.priority) ? appt.priority : "routine";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Appointment Slip</title>
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
    background: ${priority === "emergency" ? "#FEE2E2" : priority === "urgent" ? "#FEF3C7" : "#F1F5F9"};
    color: ${priority === "emergency" ? "#DC2626" : priority === "urgent" ? "#D97706" : "#475569"};
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
].map(([l, v]) => `<div class="row"><span class="label">${escapeAppointmentHtml(l)}</span><span class="value">${escapeAppointmentHtml(v)}</span></div>`).join("")}
<div class="row"><span class="label">Priority</span><span class="badge">${escapeAppointmentHtml(priority)}</span></div>
${appt.notes ? `<div class="row"><span class="label">Notes</span><span class="value">${escapeAppointmentHtml(appt.notes)}</span></div>` : ""}
<div class="footer">Please arrive 15 minutes before your appointment time · Keep this slip for your records</div>
<br/><button onclick="window.print()" style="margin-top:16px;padding:8px 20px;background:#0B3D6B;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px">🖨️ Print</button>
</body></html>`;
    const win = window.open("", "_blank", "width=560,height=700");
    if (!win) {
        toast.error("Your browser blocked the appointment slip. Allow pop-ups and try again.");
        return;
    }
    win.opener = null;
    win.document.write(html);
    win.document.close();
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
    const listboxId = useId();

    useEffect(() => { setQuery(patientName); }, [patientName]);
    useEffect(() => {
        if (!patientId || patientName || !(allPatients as any[]).length) return;
        const selected = (allPatients as any[]).find((patient) => patient.id === patientId);
        if (selected?.name) onSelectPatient(selected.id, selected.name);
    }, [allPatients, patientId, patientName, onSelectPatient]);
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
            <input
                value={query}
                onChange={event => {
                    setQuery(event.target.value);
                    if (patientId) onSelectPatient("", event.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={event => { if (event.key === "Escape") setOpen(false); }}
                role="combobox"
                aria-expanded={open}
                aria-controls={listboxId}
                aria-autocomplete="list"
                placeholder="Search by name or phone…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {patientId && !open && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">✓ Selected</span>
            )}
            {open && (
                <div id={listboxId} role="listbox" className="absolute z-50 top-full left-0 right-0 mt-1 max-h-72 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl">
                    {filtered.length === 0
                        ? <p className="px-4 py-3 text-sm text-slate-400">No patients match "{query}"</p>
                        : filtered.map((p: any) => (
                            <button key={p.id} type="button" role="option" aria-selected={patientId === p.id} onClick={() => { onSelectPatient(p.id, p.name); setQuery(p.name); setOpen(false); }}
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

    const [submitError, setSubmitError] = useState<string | null>(null);
    const [allowConflict, setAllowConflict] = useState(false);

    const recurringDates = useMemo(() =>
        store.isRecurring && store.appointmentDate
            ? generateRecurringAppointmentDates(store.appointmentDate, store.recurringFrequency, store.recurringCount)
            : [],
        [store.isRecurring, store.appointmentDate, store.recurringFrequency, store.recurringCount]
    );

    const conflictingAppointments = useMemo(() => {
        const dates = store.isRecurring ? recurringDates : [store.appointmentDate];
        return dates
            .map(date => detectConflict(allAppointments, store.doctorId, date, store.appointmentTime, store.editTargetId ?? undefined))
            .filter(Boolean) as any[];
    }, [allAppointments, recurringDates, store.appointmentDate, store.appointmentTime, store.doctorId, store.editTargetId, store.isRecurring]);

    useEffect(() => {
        setAllowConflict(false);
    }, [store.appointmentDate, store.appointmentTime, store.doctorId, store.isRecurring, store.recurringCount, store.recurringFrequency]);

    const isPastDate = !!store.appointmentDate && store.appointmentDate < todayISO();
    const formInvalid =
        (!store.isExternalPatient && !store.patientId) ||
        (store.isExternalPatient && !store.patientName.trim()) ||
        !store.appointmentDate ||
        !store.appointmentTime ||
        !store.reason.trim() ||
        isPastDate ||
        (store.isRecurring && (store.recurringCount < 2 || store.recurringCount > 12)) ||
        (conflictingAppointments.length > 0 && !allowConflict);

    useCloseOnEscape(onClose, create.isPending || update.isPending);

    async function handleSubmit(event?: React.FormEvent) {
        event?.preventDefault();
        if (formInvalid) return;
        setSubmitError(null);

        const base = {
            // Explicit nulls are important when changing an existing appointment
            // between a registered patient and a walk-in patient.
            patientId:           store.isExternalPatient ? null : store.patientId || null,
            patientNameOverride: store.isExternalPatient ? store.patientName.trim() : null,
            scheduledBy:         staffId,
            doctorId:            store.doctorId || null,
            appointmentTime:     store.appointmentTime,
            reason:              store.reason.trim(),
            department:          store.department,
            priority:            store.priority,
            notes:               store.notes.trim() || undefined,
        };

        try {
            if (isEdit) {
                await update.mutateAsync({ id: store.editTargetId!, updates: { ...base, appointmentDate: store.appointmentDate } });
                toast.success("Appointment updated.");
            } else if (store.isRecurring) {
                let createdCount = 0;
                try {
                    for (const date of recurringDates) {
                        await create.mutateAsync({ ...base, appointmentDate: date });
                        createdCount += 1;
                    }
                } catch (error) {
                    if (createdCount > 0) {
                        throw new Error(`${createdCount} appointment${createdCount === 1 ? " was" : "s were"} scheduled before the remaining series failed. Review the calendar before retrying.`);
                    }
                    throw error;
                }
                toast.success(`${createdCount} appointments scheduled.`);
            } else {
                await create.mutateAsync({ ...base, appointmentDate: store.appointmentDate });
                toast.success("Appointment scheduled.");
            }

            store.resetForm();
            onClose();
        } catch (error) {
            const message = error instanceof Error ? error.message : "Could not save this appointment.";
            setSubmitError(message);
            toast.error(message);
        }
    }

    const isPending = create.isPending || update.isPending;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-[2px] sm:p-4" role="presentation">
            <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-labelledby="appointment-form-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh]">
                <div className="flex items-center justify-between px-4 py-4 sm:px-6 border-b border-slate-100 shrink-0">
                    <div>
                        <h2 id="appointment-form-title" className="text-base font-bold text-slate-900">{isEdit ? "Edit appointment" : "New appointment"}</h2>
                        <p className="mt-0.5 text-xs text-slate-500">Required fields are marked with an asterisk.</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={isPending} aria-label="Close appointment form" className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 disabled:opacity-50"><X size={16} /></button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 space-y-4">
                    {submitError && (
                        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            <span>{submitError}</span>
                        </div>
                    )}

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
                    {conflictingAppointments.length > 0 && (
                        <div className="space-y-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs text-red-700">
                            <div className="flex items-start gap-2">
                                <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-600" />
                                <span>
                                    {conflictingAppointments.length === 1
                                        ? `${conflictingAppointments[0].staffs?.name ?? "This staff member"} already has an active appointment at this time.`
                                        : `${conflictingAppointments.length} dates in this recurring series conflict with active appointments.`}
                                </span>
                            </div>
                            <label className="flex cursor-pointer items-center gap-2 font-semibold">
                                <input type="checkbox" checked={allowConflict} onChange={event => setAllowConflict(event.target.checked)} className="h-4 w-4 rounded border-red-300 text-red-600" />
                                Schedule anyway after reviewing the conflict
                            </label>
                        </div>
                    )}

                    {/* Date + Time */}
                    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
                        <div>
                            <label className="lbl">Date *</label>
                            <input type="date" min={todayISO()} value={store.appointmentDate}
                                onChange={e => store.setFormField("appointmentDate", e.target.value)} aria-invalid={isPastDate} className="inp" />
                            {isPastDate && <p className="mt-1 text-xs font-medium text-red-600">Choose today or a future date.</p>}
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
                    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
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
                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={store.isRecurring}
                                    onClick={() => store.setFormField("isRecurring", !store.isRecurring)}
                                    className={`w-9 h-5 rounded-full transition-colors relative ${store.isRecurring ? "bg-blue-600" : "bg-slate-300"}`}>
                                    <span className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow ${store.isRecurring ? "left-4" : "left-0.5"}`} />
                                </button>
                                <span className="text-sm font-medium text-slate-700">Recurring appointment</span>
                            </div>

                            {store.isRecurring && (
                                <div className="space-y-3 pt-1">
                                    <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
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

                <div className="px-4 py-4 sm:px-6 border-t border-slate-100 shrink-0 flex flex-col-reverse min-[380px]:flex-row min-[380px]:justify-end gap-2 min-[380px]:gap-3">
                    <button type="button" onClick={onClose} disabled={isPending} className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={formInvalid || isPending}
                        className="inline-flex min-h-10 items-center justify-center gap-2 px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
                        {isPending && <Loader2 size={14} className="animate-spin" />}
                        {isPending ? "Saving…" : isEdit ? "Update appointment" : store.isRecurring ? `Schedule ${store.recurringCount} appointments` : "Schedule appointment"}
                    </button>
                </div>
            </form>

            <style jsx>{`
                .lbl { display:block; font-size:0.7rem; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.25rem; }
                .inp { width:100%; border-radius:0.5rem; border:1px solid #e2e8f0; padding:0.5rem 0.75rem; font-size:0.875rem; color:#1e293b; }
                .inp:focus { outline:none; box-shadow:0 0 0 2px #93c5fd; }
            `}</style>
        </div>
    );
}

// ─── Reschedule modal ─────────────────────────────────────────────────────────

function RescheduleModal({ appt, allAppointments, onClose }: { appt: any; allAppointments: any[]; onClose: () => void }) {
    const update = useUpdateAppointment();
    const [date, setDate] = useState(appt.appointment_date);
    const [time, setTime] = useState(appt.appointment_time?.slice(0, 5) ?? "");
    const [error, setError] = useState<string | null>(null);
    const conflict = detectConflict(allAppointments, appt.doctor_id, date, time, appt.id);
    const invalid = !date || !time || date < todayISO() || !!conflict;
    useCloseOnEscape(onClose, update.isPending);

    async function handleReschedule() {
        if (invalid) return;
        setError(null);
        try {
            await update.mutateAsync({ id: appt.id, updates: { appointmentDate: date, appointmentTime: time } });
            toast.success("Appointment rescheduled.");
            onClose();
        } catch (cause) {
            const message = cause instanceof Error ? cause.message : "Could not reschedule this appointment.";
            setError(message);
            toast.error(message);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
            <div role="dialog" aria-modal="true" aria-labelledby="reschedule-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 sm:p-6">
                <h3 id="reschedule-title" className="text-base font-bold text-slate-900 mb-0.5">Reschedule appointment</h3>
                <p className="text-xs text-slate-500 mb-4">{resolvePatientName(appt)}</p>
                {error && <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
                {conflict && <p role="alert" className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">This staff member already has an active appointment at that time.</p>}
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">New Date</label>
                        <input type="date" min={todayISO()} value={date} onChange={e => setDate(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">New Time</label>
                        <input type="time" value={time} onChange={e => setTime(e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-5">
                    <button type="button" onClick={onClose} disabled={update.isPending} className="px-4 py-2 text-sm text-slate-600 disabled:opacity-50">Cancel</button>
                    <button type="button" onClick={handleReschedule} disabled={invalid || update.isPending}
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
    const [error, setError] = useState<string | null>(null);
    const updateStatus = useUpdateAppointmentStatus();
    useCloseOnEscape(onClose, updateStatus.isPending);

    const cancelAppointment = async () => {
        setError(null);
        try {
            await updateStatus.mutateAsync({ id, status: "cancelled", reason: reason.trim() || undefined });
            toast.success("Appointment cancelled.");
            onClose();
        } catch (cause) {
            const message = cause instanceof Error ? cause.message : "Could not cancel this appointment.";
            setError(message);
            toast.error(message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
            <div role="alertdialog" aria-modal="true" aria-labelledby="cancel-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 sm:p-6">
                <h3 id="cancel-title" className="text-base font-bold text-slate-900 mb-1">Cancel appointment</h3>
                <p className="text-xs text-slate-500 mb-4">Optionally record a reason for the audit trail.</p>
                {error && <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
                <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
                    placeholder="Reason (optional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200 mb-4" />
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} disabled={updateStatus.isPending} className="px-4 py-2 text-sm text-slate-600 disabled:opacity-50">Keep appointment</button>
                    <button type="button" onClick={cancelAppointment}
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
    const [error, setError] = useState<string | null>(null);
    useCloseOnEscape(onClose, del.isPending);

    const deleteAppointment = async () => {
        setError(null);
        try {
            await del.mutateAsync(id);
            toast.success("Appointment deleted.");
            onClose();
        } catch (cause) {
            const message = cause instanceof Error ? cause.message : "Could not delete this appointment.";
            setError(message);
            toast.error(message);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]">
            <div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 sm:p-6">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mb-4">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </div>
                <h3 id="delete-title" className="text-base font-bold text-slate-900 mb-1">Delete appointment</h3>
                <p className="text-xs text-slate-500 mb-5">
                    Permanently delete the appointment for <strong className="text-slate-700">{patientName}</strong>? This cannot be undone.
                </p>
                {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} disabled={del.isPending} className="px-4 py-2 text-sm text-slate-600 disabled:opacity-50">Keep it</button>
                    <button type="button" onClick={deleteAppointment} disabled={del.isPending}
                        className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors">
                        {del.isPending ? "Deleting…" : "Yes, delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Day calendar view ────────────────────────────────────────────────────────

function DayCalendarView({ appointments, canManage, onSlotClick, onAction }: {
    appointments: any[];
    canManage: boolean;
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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
            <div className="flex min-w-[640px]">
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
                            onClick={() => { if (canManage) onSlotClick(h); }}
                            className={`absolute left-0 right-0 transition-colors group ${canManage ? "cursor-pointer hover:bg-blue-50/30" : "cursor-default"}`}>
                            {canManage && <span className="hidden group-hover:flex absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-500 items-center gap-1">
                                + New
                            </span>}
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
                                <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                    {canManage && appt.status === "confirmed" && (
                                        <button type="button" onClick={e => { e.stopPropagation(); onAction("checkin", appt); }}
                                            aria-label="Check patient in" title="Check In" className="w-6 h-6 rounded bg-green-500 text-white flex items-center justify-center text-[10px]">✓</button>
                                    )}
                                    {canManage && <button type="button" onClick={e => { e.stopPropagation(); onAction("reschedule", appt); }}
                                        aria-label="Reschedule appointment" title="Reschedule" className="w-6 h-6 rounded bg-blue-500 text-white flex items-center justify-center text-[10px]">↻</button>}
                                    <button type="button" onClick={e => { e.stopPropagation(); onAction("print", appt); }}
                                        aria-label="Print appointment slip" title="Print Slip" className="w-6 h-6 rounded bg-slate-500 text-white flex items-center justify-center text-[10px]">⎙</button>
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

function AppointmentRow({ appt, pendingIds, onAction, canManage }: {
    appt: any;
    pendingIds: Set<string>;
    onAction: (type: string, appt: any) => void;
    canManage: boolean;
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
                        {String(appt.status ?? "unknown").replace(/_/g, " ")}
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
                        {canManage && appt.status === "scheduled" && (
                            <ActionBtn onClick={() => onAction("confirm", appt)} color="green" title="Confirm appointment">Confirm</ActionBtn>
                        )}
                        {/* Check In: confirmed → in_progress */}
                        {canManage && appt.status === "confirmed" && (
                            <ActionBtn onClick={() => onAction("checkin", appt)} color="blue" title="Patient has arrived">Check In</ActionBtn>
                        )}
                        {/* No-show prompt on overdue */}
                        {canManage && overdue && (
                            <ActionBtn onClick={() => onAction("noshow", appt)} color="orange" title="Mark as no-show">No-Show</ActionBtn>
                        )}
                        {/* Active appointment actions */}
                        {canManage && (appt.status === "scheduled" || appt.status === "confirmed") && (
                            <>
                                <ActionBtn onClick={() => onAction("reschedule", appt)} color="slate" title="Reschedule">↻</ActionBtn>
                                <ActionBtn onClick={() => onAction("edit",       appt)} color="blue"  title="Edit details">Edit</ActionBtn>
                                <ActionBtn onClick={() => onAction("cancel",     appt)} color="red"   title="Cancel">Cancel</ActionBtn>
                            </>
                        )}
                        {/* Print slip — all statuses */}
                        <ActionBtn onClick={() => onAction("print", appt)} color="slate" title="Print appointment slip">⎙</ActionBtn>
                        {/* Delete — all statuses */}
                        {canManage && <ActionBtn onClick={() => onAction("delete", appt)} color="red" title="Delete permanently">✕</ActionBtn>}
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
        <button type="button" onClick={onClick} title={title} aria-label={title}
            className={`min-h-7 text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${colors[color] ?? colors.slate}`}>
            {children}
        </button>
    );
}

function AppointmentMobileCard({ appt, pendingIds, onAction, canManage }: {
    appt: any;
    pendingIds: Set<string>;
    onAction: (type: string, appt: any) => void;
    canManage: boolean;
}) {
    const loading = pendingIds.has(appt.id);
    const overdue = isOverdue(appt);

    return (
        <article className={`rounded-xl border bg-white p-3.5 ${overdue ? "border-orange-200 bg-orange-50/30" : "border-slate-100"}`}>
            <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-700">
                    {resolvePatientName(appt).charAt(0).toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-slate-900">{resolvePatientName(appt)}</h3>
                        {!appt.patient_id && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-black text-amber-700">WALK-IN</span>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{appt.staffs?.name ?? "Unassigned staff"}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${STATUS_COLORS[appt.status] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
                    {String(appt.status ?? "unknown").replace(/_/g, " ")}
                </span>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                <div>
                    <dt className="text-[9px] font-black uppercase tracking-wide text-slate-400">Date &amp; time</dt>
                    <dd className="mt-0.5 font-semibold text-slate-700">{appt.appointment_date} · {appt.appointment_time?.slice(0, 5)}</dd>
                </div>
                <div>
                    <dt className="text-[9px] font-black uppercase tracking-wide text-slate-400">Department</dt>
                    <dd className="mt-0.5 font-semibold text-slate-700">{appt.department ?? "—"}</dd>
                </div>
                <div className="col-span-2">
                    <dt className="text-[9px] font-black uppercase tracking-wide text-slate-400">Reason</dt>
                    <dd className="mt-0.5 break-words text-slate-600">{appt.reason ?? "—"}</dd>
                </div>
            </dl>

            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                {loading ? (
                    <span className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700"><Loader2 size={13} className="animate-spin" /> Updating…</span>
                ) : (
                    <>
                        {canManage && appt.status === "scheduled" && <ActionBtn onClick={() => onAction("confirm", appt)} color="green" title="Confirm appointment">Confirm</ActionBtn>}
                        {canManage && appt.status === "confirmed" && <ActionBtn onClick={() => onAction("checkin", appt)} color="blue" title="Check patient in">Check in</ActionBtn>}
                        {canManage && overdue && <ActionBtn onClick={() => onAction("noshow", appt)} color="orange" title="Mark as no-show">No-show</ActionBtn>}
                        {canManage && ["scheduled", "confirmed"].includes(appt.status) && (
                            <>
                                <ActionBtn onClick={() => onAction("reschedule", appt)} color="slate" title="Reschedule appointment">Reschedule</ActionBtn>
                                <ActionBtn onClick={() => onAction("edit", appt)} color="blue" title="Edit appointment">Edit</ActionBtn>
                                <ActionBtn onClick={() => onAction("cancel", appt)} color="red" title="Cancel appointment">Cancel</ActionBtn>
                            </>
                        )}
                        <ActionBtn onClick={() => onAction("print", appt)} color="slate" title="Print appointment slip">Print</ActionBtn>
                        {canManage && <ActionBtn onClick={() => onAction("delete", appt)} color="red" title="Delete permanently">Delete</ActionBtn>}
                    </>
                )}
            </div>
        </article>
    );
}

// ─── Appointment table ────────────────────────────────────────────────────────

function AppointmentTable({ rows, pendingIds, onAction, canManage, label, labelColor }: {
    rows:        any[];
    pendingIds:  Set<string>;
    onAction:    (type: string, appt: any) => void;
    canManage:   boolean;
    label?:      string;
    labelColor?: string;
}) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            {label && (
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
                    <div className={`w-1.5 h-4 rounded-full ${labelColor ?? "bg-slate-300"}`} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                    <span className="text-xs text-slate-400 font-medium ml-auto">{rows.length}</span>
                </div>
            )}

            <div className="space-y-2 p-2 md:hidden">
                {rows.map((appt) => (
                    <AppointmentMobileCard
                        key={appt.id}
                        appt={appt}
                        pendingIds={pendingIds}
                        onAction={onAction}
                        canManage={canManage}
                    />
                ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[960px] text-sm">
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
                                canManage={canManage}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AppointmentComponentProps {
    staffId:           string;
    patientId?:        string;
    inPatientContext?: boolean;
    canManage?:        boolean;
    scopeToStaff?:     boolean;
}

export default function AppointmentComponent({
    staffId,
    patientId,
    inPatientContext = false,
    canManage = true,
    scopeToStaff = false,
}: AppointmentComponentProps) {
    const store        = useAppointmentStore();
    const updateStatus = useUpdateAppointmentStatus();
    const { data: allStaff = [] } = useAllStaff();

    const [pendingIds,       setPendingIds]       = useState<Set<string>>(new Set());
    const [deleteTarget,     setDeleteTarget]     = useState<{ id: string; name: string } | null>(null);
    const [rescheduleTarget, setRescheduleTarget] = useState<any | null>(null);

    // ── Data sources ──────────────────────────────────────────────────────────
    // In patient context: fetch the full history for this patient (all time).
    // In global context:  fetch upcoming + by selected date.
    const upcomingQ    = useUpcomingAppointments({ enabled: !inPatientContext });
    const byDateQ      = useAppointmentsByDate(store.dateFilter, { enabled: !inPatientContext });
    const byPatientQ   = useAppointmentsByPatient(patientId ?? "", { enabled: inPatientContext });

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
    const queryError = inPatientContext
        ? byPatientQ.error
        : upcomingQ.error ?? byDateQ.error;
    const retryQueries = () => {
        if (inPatientContext) void byPatientQ.refetch();
        else void Promise.all([upcomingQ.refetch(), byDateQ.refetch()]);
    };

    // Filtered list
    const filtered = useMemo(() =>
        allAppointments.filter(a => {
            const matchDate    = inPatientContext || !store.dateFilter || a.appointment_date === store.dateFilter;
            const matchStatus  = store.statusFilter === "all" || a.status === store.statusFilter;
            const matchDoctor  = scopeToStaff
                ? a.doctor_id === staffId
                : (inPatientContext || !store.doctorFilter || a.doctor_id === store.doctorFilter);
            const matchPatient = !patientId || a.patient_id === patientId;
            const name         = resolvePatientName(a).toLowerCase();
            const matchSearch  = !store.search || name.includes(store.search.toLowerCase()) || a.reason?.toLowerCase().includes(store.search.toLowerCase());
            return matchDate && matchStatus && matchDoctor && matchPatient && matchSearch;
        }),
    [allAppointments, inPatientContext, scopeToStaff, staffId, store.dateFilter, store.statusFilter, store.doctorFilter, patientId, store.search]);

    // Per-row optimistic status handler
    const handleStatus = useCallback(async (id: string, status: string, reason?: string) => {
        setPendingIds(p => new Set([...p, id]));
        try {
            await updateStatus.mutateAsync({ id, status, reason });
            toast.success(status === "in_progress" ? "Patient checked in." : "Appointment status updated.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Could not update the appointment status.");
        } finally {
            setPendingIds(p => { const n = new Set(p); n.delete(id); return n; });
        }
    }, [updateStatus]);

    const handleAction = useCallback((type: string, appt: any) => {
        if (!canManage && type !== "print") return;
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
    }, [canManage, handleStatus, store]);

    function openNewForm(prefillTime?: string) {
        if (!canManage) return;
        store.resetForm();
        const preferredDate = !inPatientContext && store.dateFilter ? store.dateFilter : todayISO();
        store.setFormField("appointmentDate", preferredDate < todayISO() ? todayISO() : preferredDate);
        if (patientId) {
            // pre-select the patient from the DB list — name will be resolved by combobox
            store.setFormField("patientId", patientId);
        }
        if (prefillTime) store.setFormField("appointmentTime", prefillTime);
        store.setUI("showForm", true);
    }

    // Status counts reflect the current date/staff context, not every cached row.
    const counts = useMemo(() => {
        const m: Record<string, number> = {};
        allAppointments
            .filter((appointment) => {
                const dateMatches = inPatientContext || !store.dateFilter || appointment.appointment_date === store.dateFilter;
                const staffMatches = scopeToStaff
                    ? appointment.doctor_id === staffId
                    : (inPatientContext || !store.doctorFilter || appointment.doctor_id === store.doctorFilter);
                return dateMatches && staffMatches;
            })
            .forEach(appointment => { m[appointment.status] = (m[appointment.status] ?? 0) + 1; });
        return m;
    }, [allAppointments, inPatientContext, scopeToStaff, staffId, store.dateFilter, store.doctorFilter]);

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
            <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm sm:px-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-base font-bold text-slate-900">
                                {inPatientContext ? "Appointment history" : scopeToStaff ? "My appointments" : "Appointments"}
                            </h2>
                            {!canManage && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">View only</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500" aria-live="polite">
                            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
                            {inPatientContext && past.length > 0 && ` · ${past.length} past`}
                            {loading && <span className="ml-2 inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Updating</span>}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {!inPatientContext && (
                            <div className="flex rounded-xl bg-slate-100 p-0.5" aria-label="Appointment view">
                                <button type="button" onClick={() => store.setUI("viewMode", "list")} aria-pressed={store.viewMode === "list"}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${store.viewMode === "list" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                                    <List size={13} /> List
                                </button>
                                <button type="button" onClick={() => store.setUI("viewMode", "calendar")} aria-pressed={store.viewMode === "calendar"}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${store.viewMode === "calendar" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                                    <CalendarDays size={13} /> Day
                                </button>
                            </div>
                        )}

                        {canManage && (
                            <button type="button" onClick={() => openNewForm()}
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition-colors hover:bg-blue-700">
                                <Plus size={15} /> New appointment
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Filter bar — hidden in patient context ── */}
            {!inPatientContext && (
                <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm sm:px-5 space-y-3">
                    {/* Date navigation */}
                    <div className="flex items-center gap-2">
                        <button type="button" aria-label="Previous day" onClick={() => store.setUI("dateFilter", shiftLocalISODate(store.dateFilter || todayISO(), -1))}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors text-sm">
                            ‹
                        </button>
                        <input type="date" value={store.dateFilter}
                            onChange={e => store.setUI("dateFilter", e.target.value)}
                            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 text-center" />
                        <button type="button" aria-label="Next day" onClick={() => store.setUI("dateFilter", shiftLocalISODate(store.dateFilter || todayISO(), 1))}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors text-sm">
                            ›
                        </button>
                        {store.dateFilter !== todayISO() && (
                            <button type="button" onClick={() => store.setUI("dateFilter", todayISO())}
                                className="text-xs text-blue-600 hover:underline font-semibold whitespace-nowrap">
                                Today
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {!scopeToStaff && <select value={store.doctorFilter} onChange={e => store.setUI("doctorFilter", e.target.value)}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
                            <option value="">All doctors</option>
                            {doctorOptions.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>}

                        <div className="scrollbar-hide flex max-w-full items-center gap-1 overflow-x-auto pb-1">
                            {STATUSES.map(s => (
                                <button type="button" key={s} onClick={() => store.setUI("statusFilter", s)}
                                    className={`shrink-0 whitespace-nowrap text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-colors capitalize ${
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
                            aria-label="Search appointments"
                            className="w-full sm:flex-1 sm:min-w-48 rounded-xl border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                </div>
            )}

            {/* ── Patient-context status filter (compact) ── */}
            {inPatientContext && (
                <div className="scrollbar-hide flex items-center gap-1.5 overflow-x-auto pb-1">
                    {STATUSES.map(s => (
                        <button type="button" key={s} onClick={() => store.setUI("statusFilter", s)}
                            className={`shrink-0 whitespace-nowrap text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-colors capitalize ${
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
            {queryError && allAppointments.length === 0 ? (
                <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-100 bg-white px-4 py-12 text-center shadow-sm">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600"><AlertCircle size={19} /></div>
                    <div>
                        <p className="text-sm font-semibold text-slate-700">Appointments could not be loaded</p>
                        <p className="mt-1 text-xs text-slate-500">Check your connection and try again.</p>
                    </div>
                    <button type="button" onClick={retryQueries} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                        <RefreshCcw size={13} /> Try again
                    </button>
                </div>
            ) : loading && allAppointments.length === 0 ? (
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
                            {canManage
                                ? (inPatientContext ? "Schedule the first appointment for this patient." : "Choose New appointment to add one.")
                                : "No matching appointments are available to view."}
                        </p>
                    </div>
                    {canManage && <button type="button" onClick={() => openNewForm()}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
                        <Plus size={14} /> Schedule appointment
                    </button>}
                </div>
            ) : inPatientContext ? (
                /* ── Patient context: upcoming then past ── */
                <div className="space-y-3">
                    {upcoming.length > 0 && (
                        <AppointmentTable
                            rows={upcoming}
                            pendingIds={pendingIds}
                            onAction={handleAction}
                            canManage={canManage}
                            label="Upcoming"
                            labelColor="bg-blue-500"
                        />
                    )}
                    {past.length > 0 && (
                        <AppointmentTable
                            rows={past}
                            pendingIds={pendingIds}
                            onAction={handleAction}
                            canManage={canManage}
                            label="Past"
                            labelColor="bg-slate-300"
                        />
                    )}
                </div>
            ) : store.viewMode === "calendar" ? (
                <DayCalendarView
                    appointments={filtered}
                    canManage={canManage}
                    onSlotClick={time => openNewForm(time)}
                    onAction={handleAction}
                />
            ) : (
                <AppointmentTable
                    rows={filtered}
                    pendingIds={pendingIds}
                    onAction={handleAction}
                    canManage={canManage}
                />
            )}

            {/* ── Modals ── */}
            {canManage && store.showForm && (
                <AppointmentFormModal
                    staffId={staffId}
                    allAppointments={allAppointments}
                    onClose={() => store.closeForm()}
                />
            )}
            {canManage && store.cancelTargetId && (
                <CancelModal id={store.cancelTargetId} onClose={() => store.setUI("cancelTargetId", null)} />
            )}
            {canManage && rescheduleTarget && (
                <RescheduleModal appt={rescheduleTarget} allAppointments={allAppointments} onClose={() => setRescheduleTarget(null)} />
            )}
            {canManage && deleteTarget && (
                <DeleteModal id={deleteTarget.id} patientName={deleteTarget.name} onClose={() => setDeleteTarget(null)} />
            )}
        </div>
    );
}