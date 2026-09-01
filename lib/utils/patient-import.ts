/**
 * Bulk patient import — shared reading rules.
 *
 * Both the CSV dialog (components/BulkUpload.tsx) and the server action that
 * writes the rows (lib/actions/bulk-upload.ts) use these, so a cell the
 * preview says will be dropped is exactly the cell the importer drops.
 *
 * Nothing in a patient import is required: a blank column means "not recorded"
 * and is stored as NULL. These helpers therefore never throw — when a value
 * cannot be read they return null and the caller reports a note.
 */

const MONTH_ABBR = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** A row with no value anywhere: a stray line in the spreadsheet, not a patient. */
export function isBlankCsvRow(row: Record<string, string> | undefined): boolean {
    if (!row) return true;
    return !Object.keys(row).some((k) => String(row[k] ?? "").trim().length > 0);
}

/**
 * Builds a `YYYY-MM-DD` string from parts, rejecting anything that is not a
 * real calendar date, predates 1900, or lies in the future.
 */
function toIsoDate(year: number, month: number, day: number): string | null {
    if (![year, month, day].every((n) => Number.isFinite(n))) return null;
    if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
    if (d.getTime() > Date.now()) return null;
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Reads a date-of-birth cell into the shape the database needs.
 *
 * Year-first dates are taken as written. Day-first and month-first forms are
 * both accepted, and where `03/04/1988` could mean either, the hospital's
 * day-first convention wins. Anything that cannot be read confidently returns
 * null — a wrong date of birth on a patient record is worse than a blank one.
 */
export function parseBirthDate(raw: string | null | undefined): string | null {
    const v = String(raw ?? "").trim();
    if (!v) return null;

    // 1990-06-15, 1990/6/15, 1990.6.15
    let m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (m) return toIsoDate(+m[1], +m[2], +m[3]);

    // 15/06/1990 (day-first) or 06/15/1990 (month-first), 2-digit years allowed
    m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (m) {
        const a = +m[1];
        const b = +m[2];
        let year = +m[3];
        if (year < 100) year += year > 50 ? 1900 : 2000;
        if (a > 12 && b <= 12) return toIsoDate(year, b, a);
        if (b > 12 && a <= 12) return toIsoDate(year, a, b);
        if (a <= 12 && b <= 12) return toIsoDate(year, b, a);
        return null;
    }

    // 15 June 1990 / 15th Jun, 1990
    m = v.match(/^(\d{1,2})(?:st|nd|rd|th)?\s*([a-z]{3,})\.?,?\s*(\d{4})$/i);
    if (m) {
        const month = MONTH_ABBR.indexOf(m[2].slice(0, 3).toLowerCase());
        return month >= 0 ? toIsoDate(+m[3], month + 1, +m[1]) : null;
    }

    // June 15, 1990
    m = v.match(/^([a-z]{3,})\.?\s*(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})$/i);
    if (m) {
        const month = MONTH_ABBR.indexOf(m[1].slice(0, 3).toLowerCase());
        if (month >= 0) return toIsoDate(+m[3], month + 1, +m[2]);
    }

    return null;
}

/** Maps the spellings seen on paper registers onto the app's gender options. */
export function normalizeGender(raw: string | null | undefined): "Male" | "Female" | "Other" | null {
    const v = String(raw ?? "").trim().toLowerCase().replace(/[.\s]/g, "");
    if (!v) return null;
    if (v === "m" || v === "male" || v === "man" || v === "boy") return "Male";
    if (v === "f" || v === "female" || v === "woman" || v === "girl") return "Female";
    if (["other", "o", "intersex", "unspecified", "unknown", "na", "n/a", "none"].includes(v)) return "Other";
    return null;
}
