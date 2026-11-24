/** Client-safe CSV builder shared by server reporting and client export buttons. */

const FORMULA_LEAD_RE = /^[=+@\t\r]|^-(?![0-9]+(?:\.[0-9]+)?$)/;

/**
 * Format a single CSV cell safely:
 *  - neutralizes spreadsheet formula injection (`=`, `+`, `-` non-numeric, `@`, `\t`, `\r`)
 *  - quotes values containing commas, quotes, or newlines
 */
export function csvCell(value: unknown): string {
    let s = value === null || value === undefined ? "" : String(value);
    if (FORMULA_LEAD_RE.test(s)) {
        s = `'${s}`;
    }
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(columns: string[], rows: Array<Record<string, any>>): string {
    const header = columns.map(csvCell).join(",");
    const body = rows.map((r) => columns.map((c) => csvCell(r[c])).join(",")).join("\n");
    return `${header}\n${body}`;
}
