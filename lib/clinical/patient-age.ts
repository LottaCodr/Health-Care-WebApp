/** Calendar-based age, with date-only DOBs parsed without local-timezone shifts. */
// Reports use the hospital's civil date, not the browser/server machine's
// timezone. At 00:30 in Abuja it can still be the previous day in UTC.
const HOSPITAL_TIME_ZONE = "Africa/Lagos";

function dayParts(value: string | Date, asOf = false): { year: number; month: number; day: number } | null {
    let text: string;
    if (value instanceof Date || (asOf && /[T ]\d{2}:\d{2}/.test(value))) {
        const instant = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(instant.getTime())) return null;
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: HOSPITAL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
        }).formatToParts(instant);
        const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
        return { year: get("year"), month: get("month"), day: get("day") };
    }
    // The stored DOB is a civil date; never offset it as if it were an instant.
    text = value as string;
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(text);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
    return { year, month, day };
}

/** Age on the test date (or today); null for invalid/future dates. */
export function patientAgeOn(birthDate: string | null | undefined, asOf: string | Date = new Date()): number | null {
    if (!birthDate) return null;
    const born = dayParts(birthDate);
    const now = dayParts(asOf, true);
    if (!born || !now) return null;
    const age = now.year - born.year - (now.month < born.month || (now.month === born.month && now.day < born.day) ? 1 : 0);
    return age < 0 ? null : age;
}

/** Fractional years for neonatal/paediatric analyzer reference bands (not for displayed ages). */
export function patientAgeYearsPrecise(birthDate: string | null | undefined, asOf: string | Date = new Date()): number | null {
    const completedYears = patientAgeOn(birthDate, asOf);
    if (completedYears === null) return null;
    const born = dayParts(birthDate!);
    const now = dayParts(asOf, true);
    if (!born || !now) return null;
    const elapsedYears = (Date.UTC(now.year, now.month - 1, now.day) - Date.UTC(born.year, born.month - 1, born.day)) / (365.25 * 86400000);
    // Elapsed-day approximation is needed for the 28-day neonatal boundary,
    // but cannot round a child up to adult before their calendar birthday.
    return Math.max(completedYears, Math.min(completedYears + 0.999999, elapsedYears));
}
