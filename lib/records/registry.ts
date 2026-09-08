/**
 * Registry of the clinical records that are governed by the 24-hour amendment
 * window (`lib/records/amendment-policy.ts`).
 *
 * One entry per record type describes everything needed to enforce and to
 * render the amendment UI, so the rule is declared once and stays identical
 * for every department:
 *
 *   • `anchor`   — which timestamp starts the 24h clock. For records whose
 *                  content is filed later than the row itself (a lab result on
 *                  an old request, a completed nursing task) the "filed at"
 *                  column wins, otherwise the scientist would already be out of
 *                  time before they ever wrote anything.
 *   • `author`   — which column holds the staff id that owns the content.
 *                  Authors only: a colleague cannot fix someone else's note,
 *                  they attach a correction instead.
 *   • `content`  — columns whose change counts as an AMENDMENT. Everything
 *                  else (workflow status, routing, price, dispensed flag) stays
 *                  freely editable, because locking the status machine would
 *                  break the patient journey while adding no integrity.
 *   • `fields`   — the editable fields surfaced in the amendment dialog.
 *
 * Tables/roles mirror the service layer (see `lib/services/*`): if a service
 * allows a role, this registry must agree, otherwise the amendment dialog
 * offers a write the guard will refuse.
 */

import type { UserRole } from "@/types/models";

export type AmendableRecordType =
    | "consultation"
    | "lab_result"
    | "radiology_report"
    | "nursing_action"
    | "prescription"
    | "dispensing"
    | "discharge_note"
    | "drug_chart"
    | "fluid_balance";

export interface AmendableFieldDef {
    /** DB column name (snake_case, as stored). */
    column: string;
    /** Label in the amendment dialog. */
    label: string;
    /** Long free text gets a textarea; short text gets an input. */
    multiline?: boolean;
    /** Numeric input (e.g. dispensed quantity). */
    numeric?: boolean;
    help?: string;
}

export interface AmendableRecordDef {
    type: AmendableRecordType;
    /** Human name of the record, used in chips, dialogs and audit text. */
    label: string;
    /** Plural, for list headings. */
    labelPlural: string;
    /** Postgres table the record lives in. */
    table: string;
    /** Timestamp columns that can start the clock, in priority order. */
    anchor: readonly string[];
    /** Author (staff id) columns, in priority order. Empty = department-wide. */
    author: readonly string[];
    /** Patient column, when the table has one (used on the addendum row). */
    patientColumn?: string;
    /** Columns whose change is an amendment. */
    content: readonly string[];
    /** Fields the amendment dialog exposes. Must be a subset of `content`. */
    fields: readonly AmendableFieldDef[];
    /** Roles allowed to amend their own record (Admin always passes `requireStaff`). */
    editorRoles: readonly UserRole[];
}

export const AMENDMENT_REGISTRY = {
    consultation: {
        type: "consultation",
        label: "Consultation",
        labelPlural: "Consultations",
        table: "consultations",
        // The clock starts when the note was SAVED, not at the (date-only)
        // consultation_date column — a date would silently shorten the window
        // for anyone consulting in the afternoon.
        anchor: ["created_at"],
        author: ["doctor_id"],
        patientColumn: "patient_id",
        content: ["symptoms", "diagnosis", "prescriptions", "recommendations", "icd10_codes"],
        fields: [
            { column: "symptoms", label: "Section A — History", multiline: true },
            { column: "diagnosis", label: "Sections B+C — Examination", multiline: true },
            { column: "recommendations", label: "Sections E+F — Assessment & management", multiline: true },
            {
                column: "prescriptions",
                label: "Treatment plan / prescriptions",
                multiline: true,
                help: "Anything you change here is what the pharmacy sees — amendments are stamped in the audit trail.",
            },
        ],
        editorRoles: ["Doctor"] as unknown as UserRole[],
    },
    lab_result: {
        type: "lab_result",
        label: "Lab result",
        labelPlural: "Lab results",
        table: "lab_requests",
        anchor: ["completed_at", "updated_at", "created_at"],
        author: ["completed_by", "requested_by"],
        patientColumn: "visit_id",
        // `notes` is guarded as content but NOT offered in the dialog: on this
        // table notes are what the requesting clinician wrote with the order,
        // and a scientist must never be able to rewrite that. Their own
        // comment belongs beside the result text, or in a correction note.
        content: ["result", "notes", "test_type"],
        fields: [
            { column: "result", label: "Result", multiline: true },
        ],
        editorRoles: ["LabTechnician"] as unknown as UserRole[],
    },
    radiology_report: {
        // Radiology rides on lab_requests with a "[RADIOLOGY]" test_type prefix.
        type: "radiology_report",
        label: "Radiology report",
        labelPlural: "Radiology reports",
        table: "lab_requests",
        anchor: ["completed_at", "updated_at", "created_at"],
        author: ["completed_by", "requested_by"],
        patientColumn: "visit_id",
        content: ["result", "notes"],
        fields: [
            { column: "result", label: "Findings / impression", multiline: true },
        ],
        editorRoles: ["Radiologist"] as unknown as UserRole[],
    },
    nursing_action: {
        type: "nursing_action",
        label: "Nursing note",
        labelPlural: "Nursing notes",
        table: "nursing_actions",
        anchor: ["completion_time", "updated_at", "created_at"],
        author: ["completed_by", "assigned_nurse"],
        patientColumn: "patient_id",
        content: ["description", "action_type"],
        fields: [
            { column: "description", label: "Care note / observation", multiline: true },
        ],
        editorRoles: ["Nurse"] as unknown as UserRole[],
    },
    prescription: {
        type: "prescription",
        label: "Prescription",
        labelPlural: "Prescriptions",
        table: "prescriptions",
        anchor: ["created_at"],
        // created_by is stamped at insert (20260908 migration) and is the
        // filer; pharmacist_id/nurse_id are only a fallback on legacy rows
        // where they happen to be the same person who wrote it.
        author: ["created_by", "pharmacist_id", "nurse_id"],
        patientColumn: "patient_id",
        content: ["drug_name", "dosage", "duration", "notes"],
        fields: [
            { column: "drug_name", label: "Drug" },
            { column: "dosage", label: "Dosage" },
            { column: "duration", label: "Duration" },
            { column: "notes", label: "Instructions", multiline: true },
        ],
        editorRoles: ["Doctor", "Pharmacist"] as unknown as UserRole[],
    },
    dispensing: {
        type: "dispensing",
        label: "Dispensing record",
        labelPlural: "Dispensing records",
        table: "drug_dispensing",
        anchor: ["dispensed_at", "created_at"],
        author: ["dispensed_by"],
        patientColumn: "patient_id",
        content: ["drug_name", "quantity", "batch_number"],
        fields: [
            { column: "drug_name", label: "Drug dispensed" },
            { column: "quantity", label: "Quantity", numeric: true },
            { column: "batch_number", label: "Batch number" },
        ],
        editorRoles: ["Pharmacist"] as unknown as UserRole[],
    },
    discharge_note: {
        type: "discharge_note",
        label: "Discharge note",
        labelPlural: "Discharge notes",
        table: "discharge_notes",
        anchor: ["created_at"],
        author: ["doctor_id"],
        patientColumn: "patient_id",
        content: [
            "final_diagnosis",
            "condition_on_discharge",
            "hospital_course",
            "medications_on_discharge",
            "follow_up_instructions",
            "activity_restrictions",
            "diet_instructions",
            "emergency_return_criteria",
        ],
        fields: [
            { column: "final_diagnosis", label: "Final diagnosis", multiline: true },
            { column: "condition_on_discharge", label: "Condition on discharge", multiline: true },
            { column: "medications_on_discharge", label: "Medications on discharge", multiline: true },
            { column: "follow_up_instructions", label: "Follow-up instructions", multiline: true },
            { column: "activity_restrictions", label: "Activity restrictions", multiline: true },
            { column: "diet_instructions", label: "Diet instructions", multiline: true },
            { column: "emergency_return_criteria", label: "Return immediately if", multiline: true },
        ],
        editorRoles: ["Doctor"] as unknown as UserRole[],
    },
    drug_chart: {
        type: "drug_chart",
        label: "Drug chart entry",
        labelPlural: "Drug chart entries",
        table: "nurse_drug_chart",
        anchor: ["created_at"],
        author: ["prescribed_by"],
        patientColumn: "patient_id",
        content: ["drug_name", "generic_name", "dose", "route", "frequency", "notes"],
        fields: [
            { column: "drug_name", label: "Drug" },
            { column: "dose", label: "Dose" },
            { column: "route", label: "Route" },
            { column: "frequency", label: "Frequency" },
            { column: "notes", label: "Chart note", multiline: true },
        ],
        editorRoles: ["Nurse"] as unknown as UserRole[],
    },
    fluid_balance: {
        type: "fluid_balance",
        label: "Fluid balance entry",
        labelPlural: "Fluid balance entries",
        table: "fluid_balance",
        anchor: ["created_at"],
        author: ["signed_by"],
        patientColumn: "patient_id",
        content: [
            "oral_ml", "iv_ml", "ng_ml", "other_input_ml", "other_input_type", "input_fluid_type",
            "urine_ml", "aspirate_ml", "vomit_ml", "bowel_ml", "drain_ml", "other_output_ml", "notes",
        ],
        fields: [
            { column: "oral_ml", label: "Oral intake (ml)", numeric: true },
            { column: "iv_ml", label: "IV (ml)", numeric: true },
            { column: "urine_ml", label: "Urine output (ml)", numeric: true },
            { column: "vomit_ml", label: "Vomit (ml)", numeric: true },
            { column: "notes", label: "Note", multiline: true },
        ],
        editorRoles: ["Nurse"] as unknown as UserRole[],
    },
} as const satisfies Record<AmendableRecordType, AmendableRecordDef>;

export type AmendableRecordDefMap = typeof AMENDMENT_REGISTRY;

/** Type guard for values arriving from the client (server actions take strings). */
export function isAmendableRecordType(value: unknown): value is AmendableRecordType {
    return typeof value === "string" && Object.prototype.hasOwnProperty.call(AMENDMENT_REGISTRY, value);
}

export function getRecordDef(type: AmendableRecordType): AmendableRecordDef {
    const def = (AMENDMENT_REGISTRY as Record<string, AmendableRecordDef>)[type];
    if (!def) throw new Error(`UNKNOWN_RECORD_TYPE: ${type}`);
    return def;
}

/** All record types, for admin screens / docs. */
export const AMENDABLE_RECORD_TYPES = Object.keys(AMENDMENT_REGISTRY) as AmendableRecordType[];

/**
 * Normalise a stored value for change detection. The DB returns NULL for
 * blanks while the form submits "" (and vice versa after a reload), so compare
 * on the trimmed-string view; `undefined` means "this field was not part of
 * the request" and is never a change.
 */
export function normalizeForCompare(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value.map((v) => String(v).trim()).join(",");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value).trim();
}

/**
 * Which of the record's AMENDMENT columns a proposed write actually changes.
 * Returns an empty object for workflow-only updates (status, routing, price,
 * dispensed flag) — those stay allowed forever.
 */
export function pickContentChanges(
    def: AmendableRecordDef,
    updates: Record<string, any>,
    current: Record<string, any> | null | undefined
): Record<string, { before: unknown; after: unknown }> {
    const changes: Record<string, { before: unknown; after: unknown }> = {};
    if (!updates) return changes;
    for (const column of def.content) {
        const next = updates[column];
        // `undefined` means "this write does not touch that column" — the
        // services build sparse payloads (`{ status, result: undefined, … }`),
        // and Supabase drops undefined keys, so they must not count as a
        // change. `null` IS an explicit clear and does count.
        if (next === undefined) continue;
        const before = current?.[column] ?? null;
        if (normalizeForCompare(before) !== normalizeForCompare(next)) {
            changes[column] = { before, after: next };
        }
    }
    return changes;
}

/**
 * True when the record has no content at all in the columns this write touches.
 *
 * This is the "first filing" test, and it must be scoped to the columns being
 * written — not to the row. A lab request always has a `test_type`, so a
 * row-wide test would call every result an amendment and lock a scientist out
 * of the very act of filing. What matters is whether THERE WAS anything to
 * correct yet: `result` empty → this write files it; `result` non-empty → this
 * write amends it.
 */
export function isFirstFilling(changes: Record<string, { before: unknown; after: unknown }>): boolean {
    const entries = Object.values(changes ?? {});
    if (!entries.length) return true;
    return entries.every((change) => normalizeForCompare(change.before) === "");
}

/** True when none of the record's content columns carry a value yet. */
export function hasNoContent(def: AmendableRecordDef, current: Record<string, any> | null | undefined): boolean {
    if (!current) return true;
    return def.content.every((column) => normalizeForCompare(current[column]) === "");
}

/** Human label for a content column, for audit text and diff lists. */
export function fieldLabel(def: AmendableRecordDef, column: string): string {
    return def.fields.find((f) => f.column === column)?.label ?? column.replace(/_/g, " ");
}
