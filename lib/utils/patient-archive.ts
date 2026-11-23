/**
 * Client-safe constants, types, and helpers for disabling, restoring, or
 * deleting duplicate / mistaken patient records (Admin-only).
 *
 * Kept outside `"use server"` modules because Next.js only allows async
 * function exports from server-action files.
 */

export type PatientDisableReason =
    | "duplicate-entry"
    | "registered-in-error"
    | "merged-or-consolidated"
    | "test-or-demo-record"
    | "other";

export const PATIENT_DISABLE_REASONS: {
    value: PatientDisableReason;
    label: string;
    description: string;
}[] = [
    {
        value: "duplicate-entry",
        label: "Duplicate entry (registered twice)",
        description: "Another record already exists for this same patient (e.g. registered on an earlier shift).",
    },
    {
        value: "registered-in-error",
        label: "Registered in error",
        description: "Wrong person or mistaken registration.",
    },
    {
        value: "merged-or-consolidated",
        label: "Consolidated into primary record",
        description: "Patient's care is continuing under a single primary hospital number.",
    },
    {
        value: "test-or-demo-record",
        label: "Test / training record",
        description: "Created for testing or staff training, not a real patient.",
    },
    {
        value: "other",
        label: "Other (add a note)",
        description: "Specify the reason in the note below.",
    },
];

export interface PatientActivitySummary {
    totalLinkedRecords: number;
    canHardDelete: boolean;
    counts: {
        consultations: number;
        labRequests: number;
        prescriptions: number;
        payments: number;
        admissions: number;
        appointments: number;
        nursingActions: number;
        dischargeNotes: number;
        documents: number;
        ivfCycles: number;
    };
}

export function isPatientDisabled(
    patient: { is_active?: boolean | null } | null | undefined
): boolean {
    return patient?.is_active === false;
}

export function getDisableReasonLabel(reason: PatientDisableReason): string {
    return PATIENT_DISABLE_REASONS.find((r) => r.value === reason)?.label ?? reason;
}

export function formatDisableReason(reason: PatientDisableReason, note?: string): string {
    const label = getDisableReasonLabel(reason);
    const trimmed = typeof note === "string" ? note.trim() : "";
    return trimmed ? `${label} — ${trimmed}` : label;
}

export function describeActivityBreakdown(summary: PatientActivitySummary): string[] {
    const c = summary.counts;
    const parts: string[] = [];
    if (c.consultations > 0) parts.push(`${c.consultations} consultation${c.consultations === 1 ? "" : "s"}`);
    if (c.labRequests > 0) parts.push(`${c.labRequests} lab/imaging request${c.labRequests === 1 ? "" : "s"}`);
    if (c.prescriptions > 0) parts.push(`${c.prescriptions} prescription${c.prescriptions === 1 ? "" : "s"}`);
    if (c.payments > 0) parts.push(`${c.payments} billing record${c.payments === 1 ? "" : "s"}`);
    if (c.admissions > 0) parts.push(`${c.admissions} admission${c.admissions === 1 ? "" : "s"}`);
    if (c.appointments > 0) parts.push(`${c.appointments} appointment${c.appointments === 1 ? "" : "s"}`);
    if (c.nursingActions > 0) parts.push(`${c.nursingActions} nursing action${c.nursingActions === 1 ? "" : "s"}`);
    if (c.dischargeNotes > 0) parts.push(`${c.dischargeNotes} discharge note${c.dischargeNotes === 1 ? "" : "s"}`);
    if (c.documents > 0) parts.push(`${c.documents} uploaded document${c.documents === 1 ? "" : "s"}`);
    if (c.ivfCycles > 0) parts.push(`${c.ivfCycles} IVF cycle${c.ivfCycles === 1 ? "" : "s"}`);
    return parts;
}
