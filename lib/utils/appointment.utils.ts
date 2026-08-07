export function resolvePatientName(appt: any): string {
    return appt?.patients?.name ?? appt?.patient_name_override ?? "External Patient";
}

export function toLocalISODate(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/** Calendar date at the hospital, independent of the server's UTC timezone. */
export function toHospitalISODate(date = new Date()): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Lagos",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day}`;
}

export function parseLocalISODate(iso: string): Date {
    const [year, month, day] = iso.split("-").map(Number);
    if (!year || !month || !day) return new Date(Number.NaN);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function shiftLocalISODate(iso: string, days: number): string {
    const date = parseLocalISODate(iso);
    if (Number.isNaN(date.getTime())) return toLocalISODate();
    date.setDate(date.getDate() + days);
    return toLocalISODate(date);
}

export function generateRecurringAppointmentDates(
    start: string,
    frequency: "weekly" | "biweekly" | "monthly",
    count: number,
): string[] {
    const initial = parseLocalISODate(start);
    if (Number.isNaN(initial.getTime())) return [];

    const safeCount = Math.min(12, Math.max(1, Math.trunc(count || 1)));
    return Array.from({ length: safeCount }, (_, index) => {
        if (frequency === "monthly") {
            const targetMonth = initial.getMonth() + index;
            const targetYear = initial.getFullYear() + Math.floor(targetMonth / 12);
            const normalizedMonth = ((targetMonth % 12) + 12) % 12;
            const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
            const date = new Date(targetYear, normalizedMonth, Math.min(initial.getDate(), lastDay), 12);
            return toLocalISODate(date);
        }

        const date = new Date(initial);
        const interval = frequency === "biweekly" ? 14 : 7;
        date.setDate(date.getDate() + interval * index);
        return toLocalISODate(date);
    });
}

/** Escape user-entered values before writing an appointment slip document. */
export function escapeAppointmentHtml(value: unknown): string {
    return String(value ?? "—")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}
