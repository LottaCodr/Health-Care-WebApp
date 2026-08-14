/** Client-safe CSV builder shared by server reporting and client export buttons. */
export function toCsv(columns: string[], rows: Array<Record<string, any>>): string {
    const escape = (v: any) => {
        const s = v === null || v === undefined ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = columns.map(escape).join(",");
    const body = rows.map((r) => columns.map((c) => escape(r[c])).join(",")).join("\n");
    return `${header}\n${body}`;
}
