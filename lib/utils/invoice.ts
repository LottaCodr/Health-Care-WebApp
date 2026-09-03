// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoiceStatus = "pending" | "paid" | "partial" | "waived" | "refunded";

export interface InvoicePaymentItem {
    id:                   string;
    category:             string;
    description:          string;
    amount_kobo:          number;
    amount_paid_kobo:     number;
    status:               InvoiceStatus | string;
    payment_date:         string | null;
    invoice_no:           string;
    created_at:           string;
}

export interface InvoicePatientInfo {
    name?:          string | null;
    gender?:        string | null;
    birth_date?:    string | null;
    phone?:         string | null;
    email?:         string | null;
    address?:       string | null;
    hmo?:           boolean | null;
    hmo_name?:      string | null;
    policy_number?: string | null;
    hospital_number?: string | null;
}

export interface ExportInvoiceArgs {
    patientId: string;
    patient?:  InvoicePatientInfo | null;
    payments:  InvoicePaymentItem[];
}

// ─── Brand constants ──────────────────────────────────────────────────────────

const HOSPITAL_NAME    = "NILE VALLEY MOTHER & CHILD HOSPITAL";
const HOSPITAL_ADDRESS = "Plot 602, David Jemibewon Crescent, Gudu District, Abuja";
const HOSPITAL_PHONE   = "+234 813 006 4451";
const LOGO_PATH        = "/assets/icons/nilelogo.jpeg";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(input: unknown): string {
    return String(input ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatNaira(kobo: number): string {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2,
    }).format(kobo / 100);
}

function formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    const d = new Date(value.includes("T") ? value : `${value}T00:00:00`);
    if (isNaN(d.getTime())) return escapeHtml(value);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function calculateAge(dob: string): number {
    const birth = new Date(dob.includes("T") ? dob : `${dob}T00:00:00`);
    if (isNaN(birth.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return Math.max(age, 0);
}

const CATEGORY_LABELS: Record<string, string> = {
    consultation: "Consultation",
    lab:          "Lab Test",
    radiology:    "Radiology",
    pharmacy:     "Pharmacy",
    procedure:    "Procedure",
    admission:    "Admission",
    other:        "Other",
};

interface StatusMeta { label: string; fg: string; bg: string; border: string; }

const STATUS_META: Record<string, StatusMeta> = {
    pending:  { label: "Pending",   fg: "#B45309", bg: "#FFFBEB", border: "#FDE68A" },
    partial:  { label: "Part Paid", fg: "#1D4ED8", bg: "#EFF6FF", border: "#BFDBFE" },
    paid:     { label: "Paid",      fg: "#15803D", bg: "#F0FDF4", border: "#BBF7D0" },
    waived:   { label: "Waived",    fg: "#475569", bg: "#F8FAFC", border: "#E2E8F0" },
    refunded: { label: "Refunded",  fg: "#BE123C", bg: "#FFF1F2", border: "#FECDD3" },
};

function statusMeta(status: string): StatusMeta {
    return STATUS_META[status] ?? STATUS_META.pending;
}

// ─── HTML builders ────────────────────────────────────────────────────────────

function patientDetailCell(label: string, value: string | null | undefined): string {
    return `
        <div class="pd-cell">
            <div class="pd-label">${escapeHtml(label)}</div>
            <div class="pd-value">${value && String(value).trim() ? escapeHtml(value) : "—"}</div>
        </div>`;
}

function buildItemsTable(payments: InvoicePaymentItem[]): string {
    if (payments.length === 0) {
        return `<div class="empty-state">No billing items have been recorded for this patient.</div>`;
    }

    // Unpaid items first (they need attention), then most recent first.
    const sorted = [...payments].sort((a, b) => {
        const aUrgent = a.status === "pending" || a.status === "partial" ? 0 : 1;
        const bUrgent = b.status === "pending" || b.status === "partial" ? 0 : 1;
        if (aUrgent !== bUrgent) return aUrgent - bUrgent;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const rows = sorted.map((p, i) => {
        const meta    = statusMeta(p.status);
        const balance = Math.max(p.amount_kobo - p.amount_paid_kobo, 0);
        const unpaid  = (p.status === "pending" || p.status === "partial") && balance > 0;

        return `
        <tr class="item-row${unpaid ? " item-row--unpaid" : ""}">
            <td class="c-index">${i + 1}</td>
            <td class="c-desc">
                <div class="d-title">${escapeHtml(p.description)}</div>
                <div class="d-sub">Invoice N&ordm; ${escapeHtml(p.invoice_no)} &middot; Billed ${formatDate(p.created_at)}</div>
            </td>
            <td class="c-cat"><span class="cat-chip">${escapeHtml(CATEGORY_LABELS[p.category] ?? p.category)}</span></td>
            <td class="c-num">${formatNaira(p.amount_kobo)}</td>
            <td class="c-num c-paid">${formatNaira(p.amount_paid_kobo)}</td>
            <td class="c-num ${unpaid ? "c-balance" : ""}">${balance > 0 ? formatNaira(balance) : "—"}</td>
            <td class="c-status">
                <span class="status-pill" style="color:${meta.fg};background:${meta.bg};border-color:${meta.border};">
                    ${meta.label}
                </span>
            </td>
        </tr>`;
    }).join("");

    const totalBilled      = payments.reduce((s, p) => s + p.amount_kobo, 0);
    const totalPaid        = payments.reduce((s, p) => s + p.amount_paid_kobo, 0);
    const totalOutstanding = payments
        .filter((p) => p.status === "pending" || p.status === "partial")
        .reduce((s, p) => s + Math.max(p.amount_kobo - p.amount_paid_kobo, 0), 0);

    const nPaid    = payments.filter((p) => p.status === "paid").length;
    const nPartial = payments.filter((p) => p.status === "partial").length;
    const nPending = payments.filter((p) => p.status === "pending").length;
    const nOther   = payments.length - nPaid - nPartial - nPending;

    const breakdown: string[] = [];
    if (nPaid)    breakdown.push(`${nPaid} paid`);
    if (nPartial) breakdown.push(`${nPartial} part-paid`);
    if (nPending) breakdown.push(`${nPending} pending`);
    if (nOther)   breakdown.push(`${nOther} waived/refunded`);

    return `
    <table class="items">
        <thead>
            <tr>
                <th class="c-index">#</th>
                <th class="c-desc">Item / Service</th>
                <th class="c-cat">Category</th>
                <th class="c-num">Billed</th>
                <th class="c-num">Paid</th>
                <th class="c-num">Balance</th>
                <th class="c-status">Status</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
            <tr class="total-row">
                <td colspan="3">TOTALS (${payments.length} item${payments.length === 1 ? "" : "s"})</td>
                <td class="c-num">${formatNaira(totalBilled)}</td>
                <td class="c-num c-paid">${formatNaira(totalPaid)}</td>
                <td class="c-num c-balance">${totalOutstanding > 0 ? formatNaira(totalOutstanding) : "—"}</td>
                <td></td>
            </tr>
        </tfoot>
    </table>
    <p class="table-footnote">
        This statement lists <strong>all ${payments.length} billing item${payments.length === 1 ? "" : "s"}</strong>
        on record &mdash; ${breakdown.join(" &middot; ")}.
        ${totalOutstanding > 0
            ? `Outstanding balance of <strong class="due-strong">${formatNaira(totalOutstanding)}</strong> is due.`
            : `This account is fully settled.`}
    </p>`;
}

// ─── Document builder ─────────────────────────────────────────────────────────

/**
 * Builds a fully self-contained, print-ready invoice document.
 * Pure function — safe to unit-test or render anywhere.
 */
export function buildInvoiceHtml({ patientId, patient, payments, logoUrl }: ExportInvoiceArgs & { logoUrl: string }): string {
    const totalBilled      = payments.reduce((s, p) => s + p.amount_kobo, 0);
    const totalPaid        = payments.reduce((s, p) => s + p.amount_paid_kobo, 0);
    const totalOutstanding = payments
        .filter((p) => p.status === "pending" || p.status === "partial")
        .reduce((s, p) => s + Math.max(p.amount_kobo - p.amount_paid_kobo, 0), 0);

    const generatedAt = new Date();
    const dateStr  = generatedAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    const timeStr  = generatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    // Invoice references are built from the patient's hospital number so raw
    // database IDs are never exposed to staff or printed on documents.
    const hospitalRef = patient?.hospital_number?.trim() || null;
    const refBase = hospitalRef
        ? hospitalRef.toUpperCase().replace(/[^A-Z0-9]/g, "")
        : "PENDING";
    const refStr   = `NVH/${refBase}/${generatedAt.getFullYear()}${String(generatedAt.getMonth() + 1).padStart(2, "0")}${String(generatedAt.getDate()).padStart(2, "0")}`;

    const accountChip = payments.length === 0
        ? `<span class="acct-chip acct-none">NO BILLING ITEMS</span>`
        : totalOutstanding > 0
            ? `<span class="acct-chip acct-due">OUTSTANDING &middot; ${escapeHtml(formatNaira(totalOutstanding))}</span>`
            : `<span class="acct-chip acct-clear">FULLY SETTLED</span>`;

    const patientName  = patient?.name?.trim() || "Patient";
    const patientAge   = patient?.birth_date ? `${calculateAge(patient.birth_date)} yrs` : null;
    const insurance    = patient?.hmo_name
        ? `${patient.hmo_name}${patient.policy_number ? ` (${patient.policy_number})` : ""}`
        : null;

    const docTitle = `Invoice - ${patientName} - Nile Valley`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(docTitle)}</title>
<style>
    :root {
        --navy: #0B3D6B;
        --navy-dark: #082F54;
        --ink: #1E293B;
        --muted: #64748B;
        --faint: #94A3B8;
        --line: #E2E8F0;
        --soft: #F8FAFC;
        --green: #15803D;
        --amber: #B45309;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
        font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif;
        background: #F1F5F9;
        color: var(--ink);
        font-size: 13px;
        line-height: 1.5;
    }
    .page {
        max-width: 820px;
        margin: 24px auto 80px;
        background: #FFFFFF;
        box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08);
        border-radius: 12px;
        overflow: hidden;
    }

    /* ── Masthead ─────────────────────────────── */
    .brandbar { height: 6px; background: linear-gradient(90deg, var(--navy) 0%, #1366AE 60%, #1E9BC9 100%); }
    .masthead {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 24px;
        padding: 32px 40px 24px;
        border-bottom: 2px solid var(--navy);
    }
    .identity { display: flex; align-items: center; gap: 16px; }
    .logo-wrap { position: relative; width: 64px; height: 64px; flex: none; }
    .logo-wrap img {
        width: 64px; height: 64px; border-radius: 12px; object-fit: cover;
        border: 1px solid var(--line); display: block;
    }
    .logo-fallback {
        position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
        background: var(--navy); color: #fff; font-weight: 800; font-size: 22px;
        border-radius: 12px; letter-spacing: 1px;
    }
    .hospital-name { font-size: 17px; font-weight: 800; color: var(--navy); letter-spacing: 0.6px; }
    .hospital-meta { font-size: 11px; color: var(--muted); margin-top: 4px; }

    .doc-meta { text-align: right; }
    .doc-type {
        font-size: 20px; font-weight: 800; color: var(--ink); letter-spacing: 2.5px; text-transform: uppercase;
    }
    .doc-subtype { font-size: 11px; font-weight: 600; color: var(--muted); letter-spacing: 1.6px; text-transform: uppercase; margin-top: 2px; }
    .doc-ref-grid { margin-top: 12px; font-size: 11px; color: var(--muted); line-height: 1.7; }
    .doc-ref-grid strong { color: var(--ink); font-weight: 600; margin-left: 6px; }

    /* ── Account chip ─────────────────────────── */
    .chip-strip { padding: 14px 40px 0; }
    .acct-chip {
        display: inline-block; padding: 5px 14px; border-radius: 999px;
        font-size: 11px; font-weight: 700; letter-spacing: 0.8px; border: 1px solid transparent;
    }
    .acct-due   { color: var(--amber); background: #FFFBEB; border-color: #FDE68A; }
    .acct-clear { color: var(--green); background: #F0FDF4; border-color: #BBF7D0; }
    .acct-none  { color: var(--muted); background: var(--soft); border-color: var(--line); }

    /* ── Patient card ─────────────────────────── */
    .patient-card {
        margin: 16px 40px 0;
        border: 1px solid var(--line);
        border-radius: 12px;
        overflow: hidden;
    }
    .patient-card-head {
        background: var(--soft);
        border-bottom: 1px solid var(--line);
        padding: 12px 20px;
        display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap;
    }
    .pc-overline { font-size: 10px; font-weight: 800; color: var(--faint); letter-spacing: 1.8px; text-transform: uppercase; word-break: break-word; }
    .pc-name { font-size: 16px; font-weight: 700; color: var(--ink); }
    .pd-grid {
        display: grid; grid-template-columns: repeat(4, 1fr);
        gap: 14px 20px; padding: 16px 20px 18px;
    }
    .pd-cell { min-width: 0; }
    .pd-label { font-size: 9.5px; font-weight: 800; color: var(--faint); letter-spacing: 1.2px; text-transform: uppercase; }
    .pd-value { font-size: 12.5px; font-weight: 600; color: var(--ink); margin-top: 3px; word-break: break-word; }

    /* ── Summary tiles ────────────────────────── */
    .summary {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
        padding: 20px 40px 0;
    }
    .tile { border-radius: 12px; padding: 14px 18px; border: 1px solid var(--line); background: var(--soft); }
    .tile .t-label { font-size: 10px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; }
    .tile .t-value { font-size: 17px; font-weight: 800; margin-top: 5px; }
    .tile-billed .t-label { color: var(--muted); } .tile-billed .t-value { color: var(--ink); }
    .tile-paid   { background: #F0FDF4; border-color: #BBF7D0; }
    .tile-paid .t-label { color: var(--green); } .tile-paid .t-value { color: #166534; }
    .tile-due    { background: #FFFBEB; border-color: #FDE68A; }
    .tile-due .t-label { color: var(--amber); } .tile-due .t-value { color: #92400E; }
    .tile-due.tile-settled { background: var(--soft); border-color: var(--line); }
    .tile-due.tile-settled .t-label { color: var(--faint); } .tile-due.tile-settled .t-value { color: var(--faint); }

    /* ── Items table ──────────────────────────── */
    .items-wrap { padding: 20px 40px 0; }
    .section-title {
        font-size: 11px; font-weight: 800; letter-spacing: 1.8px; text-transform: uppercase;
        color: var(--muted); margin-bottom: 10px;
    }
    table.items { width: 100%; border-collapse: collapse; }
    table.items thead th {
        background: var(--navy);
        color: #FFFFFF;
        font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
        padding: 9px 10px; text-align: left;
    }
    table.items thead th.c-num { text-align: right; }
    table.items thead th:first-child { border-radius: 8px 0 0 0; }
    table.items thead th:last-child  { border-radius: 0 8px 0 0; }
    table.items td { padding: 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
    tr.item-row:nth-child(even) td { background: #FBFDFE; }
    tr.item-row--unpaid td:first-child { box-shadow: inset 3px 0 0 #F59E0B; }
    tr.item-row { page-break-inside: avoid; }
    .c-index { width: 28px; color: var(--faint); font-size: 11px; }
    .d-title { font-weight: 600; color: var(--ink); font-size: 12.5px; }
    .d-sub   { font-size: 10.5px; color: var(--faint); margin-top: 2px; }
    .cat-chip {
        display: inline-block; padding: 2px 9px; border-radius: 6px;
        background: var(--soft); border: 1px solid var(--line);
        font-size: 10.5px; font-weight: 600; color: var(--muted); white-space: nowrap;
    }
    .c-num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; font-weight: 600; }
    .c-paid { color: var(--green); }
    .c-balance { color: var(--amber); font-weight: 700; }
    .status-pill {
        display: inline-block; padding: 2px 10px; border-radius: 999px; border: 1px solid;
        font-size: 10.5px; font-weight: 700; white-space: nowrap;
    }
    .total-row td {
        background: var(--navy-dark); color: #FFFFFF;
        font-weight: 700; padding: 11px 10px; border: none;
        font-size: 12px; letter-spacing: 0.4px;
    }
    .total-row .c-paid { color: #86EFAC; }
    .total-row .c-balance { color: #FCD34D; }
    .total-row td:first-child { border-radius: 0 0 0 8px; }
    .total-row td:last-child  { border-radius: 0 0 8px 0; }
    .table-footnote { font-size: 11px; color: var(--muted); margin-top: 10px; }
    .due-strong { color: var(--amber); }
    .empty-state {
        border: 1px dashed var(--line); border-radius: 12px; background: var(--soft);
        text-align: center; color: var(--muted); font-size: 12.5px; padding: 28px 16px;
    }

    /* ── Footer ───────────────────────────────── */
    .signatures {
        display: flex; justify-content: space-between; gap: 40px;
        padding: 44px 40px 0; margin-top: 12px;
    }
    .sig-box { flex: 1; max-width: 240px; }
    .sig-line { border-top: 1px solid var(--faint); padding-top: 6px; font-size: 10.5px; color: var(--muted); font-weight: 600; letter-spacing: 0.4px; }
    .doc-footer {
        margin-top: 34px; padding: 18px 40px 22px;
        border-top: 1px solid var(--line); text-align: center;
    }
    .doc-footer .thanks { font-size: 12px; font-weight: 700; color: var(--navy); }
    .doc-footer .fine   { font-size: 10px; color: var(--faint); margin-top: 5px; line-height: 1.6; }

    /* ── Print button (screen only) ───────────── */
    .print-btn {
        position: fixed; right: 24px; bottom: 24px; z-index: 50;
        display: inline-flex; align-items: center; gap: 8px;
        background: var(--navy); color: #fff; border: none; border-radius: 999px;
        padding: 12px 22px; font-size: 13px; font-weight: 700; cursor: pointer;
        box-shadow: 0 8px 20px rgba(11, 61, 107, 0.35);
    }
    .print-btn:hover { background: var(--navy-dark); }

    @page { size: A4; margin: 10mm; }
    @media print {
        body { background: #fff; }
        .page { margin: 0; box-shadow: none; border-radius: 0; max-width: none; }
        .print-btn { display: none; }
        .masthead { padding: 20px 24px 16px; }
        .chip-strip, .summary { padding-left: 24px; padding-right: 24px; }
        .patient-card { margin-left: 24px; margin-right: 24px; break-inside: avoid; }
        .items-wrap, .signatures { padding-left: 24px; padding-right: 24px; }
        .summary, .signatures, .doc-footer, .empty-state { break-inside: avoid; }
        .doc-footer { padding-left: 24px; padding-right: 24px; }
        table.items thead { display: table-header-group; }
    }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">&#128438;&nbsp; Print / Save as PDF</button>

<div class="page">
    <div class="brandbar"></div>

    <header class="masthead">
        <div class="identity">
            <div class="logo-wrap">
                <span id="logoFallback" class="logo-fallback">NV</span>
                <img src="${logoUrl}" alt="Nile Valley Hospital logo"
                     onerror="this.style.display='none';document.getElementById('logoFallback').style.display='flex';" />
            </div>
            <div>
                <div class="hospital-name">${HOSPITAL_NAME}</div>
                <div class="hospital-meta">${HOSPITAL_ADDRESS} &middot; ${HOSPITAL_PHONE}</div>
            </div>
        </div>
        <div class="doc-meta">
            <div class="doc-type">Invoice</div>
            <div class="doc-subtype">Patient Billing Statement</div>
            <div class="doc-ref-grid">
                Statement Ref:<strong>${escapeHtml(refStr)}</strong><br/>
                Generated:<strong>${dateStr}, ${timeStr}</strong>
            </div>
        </div>
    </header>

    <div class="chip-strip">${accountChip}</div>

    <section class="patient-card">
        <div class="patient-card-head">
            <div>
                <div class="pc-overline">Billed To</div>
                <div class="pc-name">${escapeHtml(patientName)}</div>
            </div>
            <div class="pc-overline">Hospital No. &middot; ${escapeHtml(hospitalRef ?? "—")}</div>
        </div>
        <div class="pd-grid">
            ${patientDetailCell("Gender", patient?.gender)}
            ${patientDetailCell("Age", patientAge)}
            ${patientDetailCell("Date of Birth", patient?.birth_date ? formatDate(patient.birth_date) : null)}
            ${patientDetailCell("Phone", patient?.phone)}
            ${patientDetailCell("Email", patient?.email)}
            ${patientDetailCell("Address", patient?.address)}
            ${patientDetailCell("HMO / Insurance", insurance)}
        </div>
    </section>

    <section class="summary">
        <div class="tile tile-billed">
            <div class="t-label">Total Billed</div>
            <div class="t-value">${formatNaira(totalBilled)}</div>
        </div>
        <div class="tile tile-paid">
            <div class="t-label">Total Paid</div>
            <div class="t-value">${formatNaira(totalPaid)}</div>
        </div>
        <div class="tile tile-due${totalOutstanding === 0 ? " tile-settled" : ""}">
            <div class="t-label">Outstanding</div>
            <div class="t-value">${formatNaira(totalOutstanding)}</div>
        </div>
    </section>

    <section class="items-wrap">
        <div class="section-title">Billing Items &mdash; Paid &amp; Pending</div>
        ${buildItemsTable(payments)}
    </section>

    <section class="signatures">
        <div class="sig-box"><div class="sig-line">Cashier / Accounts Officer</div></div>
        <div class="sig-box"><div class="sig-line">Authorized Signatory</div></div>
    </section>

    <footer class="doc-footer">
        <div class="thanks">Thank you for choosing ${HOSPITAL_NAME.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}.</div>
        <div class="fine">
            This is a computer-generated billing statement and does not require a physical stamp.
            It contains confidential patient billing information &mdash; please handle accordingly.<br/>
            Statement Ref ${escapeHtml(refStr)} &middot; Generated ${dateStr} at ${timeStr}
        </div>
    </footer>
</div>

<script>
    window.addEventListener("load", function () {
        setTimeout(function () { window.print(); }, 450);
    });
</script>
</body>
</html>`;

    return html;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/** Opens the branded patient invoice in a new window and triggers printing. */
export function exportPatientInvoice(args: ExportInvoiceArgs): void {
    const html = buildInvoiceHtml({ ...args, logoUrl: `${window.location.origin}${LOGO_PATH}` });

    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) {
        window.alert("Please allow pop-ups for this site to export the invoice.");
        return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
}
