"use server";

/**
 * Amendment + correction-note server actions.
 *
 * Two capabilities live here:
 *
 *  1. `amendRecord` — the sanctioned way to change a record's CONTENT. It
 *     writes through the registry (never a client-named column) and is guarded
 *     by `record-lock.ts`: author only, inside the 24-hour window, every edit
 *     diffed into the audit trail.
 *
 *  2. `addRecordAddendum` / `listRecordAddenda` — append-only correction
 *     notes. This is the escape valve once the window closes: the original
 *     entry is never rewritten, but a dated, signed note is shown right next to
 *     it ("24h freeze, corrections still possible"). Notes cannot be edited or
 *     deleted by design — see the RLS policies in
 *     supabase/migrations/20260908_record_amendment_window.sql.
 */

import { createClient } from "@/utils/supabase/server";
import { requireStaff } from "@/lib/services/auth-guard";
import { logAction } from "@/lib/services/audit.service";
import { writeRecordAmendment } from "@/lib/services/record-lock";
import {
    getRecordDef,
    isAmendableRecordType,
    type AmendableRecordType,
} from "@/lib/records/registry";

const MAX_ADDENDUM_CHARS = 4000;

export interface AmendRecordResult {
    record: Record<string, any>;
    amended: string[];
}

/**
 * Amend the content of a governed record (consultation, lab result, nursing
 * note, discharge note, …). Throws `LOCKED:<reason> …` when the caller is not
 * the author or the 24-hour window has passed.
 */
export async function amendRecord(input: {
    type: AmendableRecordType;
    id: string;
    updates: Record<string, any>;
    reason?: string | null;
    note?: string | null;
}): Promise<AmendRecordResult> {
    if (!isAmendableRecordType(input?.type)) {
        throw new Error("FORBIDDEN: That record type cannot be amended from the app.");
    }
    if (!input.id) throw new Error("BAD_REQUEST: Missing record id.");

    const { record, amended } = await writeRecordAmendment({
        type: input.type,
        id: String(input.id),
        // Never trust a client-supplied column set beyond the registry; the
        // write path filters again, this is the first net.
        updates: sanitizeUpdates(input.type, input.updates),
        reason: input.reason ?? null,
        note: input.note ?? null,
    });

    return { record, amended };
}

/** Keep only the columns the registry says are amendable. */
function sanitizeUpdates(type: AmendableRecordType, updates: Record<string, any>): Record<string, any> {
    const def = getRecordDef(type);
    const allowed = new Set<string>([...def.content, ...def.fields.map((f) => f.column)]);
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates ?? {})) {
        if (allowed.has(key)) out[key] = value;
    }
    return out;
}

export interface RecordAddendum {
    id: string;
    entity_type: string;
    entity_id: string;
    content: string;
    reason: string | null;
    author_id: string | null;
    author_role: string | null;
    created_at: string;
    author_name?: string | null;
}

/**
 * Attach a correction note to a record. Allowed at any time — including after
 * the window closes, which is the whole point of the freeze.
 */
export async function addRecordAddendum(input: {
    type: AmendableRecordType;
    id: string;
    content: string;
    reason?: string | null;
    patientId?: string | null;
}): Promise<RecordAddendum> {
    if (!isAmendableRecordType(input?.type)) {
        throw new Error("FORBIDDEN: Unknown record type.");
    }
    const def = getRecordDef(input.type);
    const staff = await requireStaff([...def.editorRoles] as any);

    const content = String(input.content ?? "").trim();
    if (!content) throw new Error("VALIDATION: Write the correction before saving it.");
    if (content.length > MAX_ADDENDUM_CHARS) {
        throw new Error(`VALIDATION: Correction notes are limited to ${MAX_ADDENDUM_CHARS} characters.`);
    }

    const supabase = await createClient();

    // Snapshot the signer's name: audit trails that only hold a UUID have a
    // way of going mute the day an account is renamed or removed.
    const { data: staffRow } = await supabase
        .from("staffs")
        .select("name")
        .eq("id", staff.userId)
        .maybeSingle();

    const payload: Record<string, any> = {
        entity_type: input.type,
        entity_id: String(input.id),
        content,
        reason: input.reason?.trim() ? String(input.reason).trim() : null,
        author_id: staff.userId,
        author_role: staff.role,
        author_name: staffRow?.name ?? null,
    };
    if (def.patientColumn && input.patientId) payload.patient_id = input.patientId;

    const { data, error } = await supabase
        .from("record_addenda")
        .insert([payload])
        .select("*")
        .single();

    if (error) {
        // The table is created by the amendment migration. Until it is
        // applied, keep the clinician's note out of nowhere — report it
        // clearly instead of a stack trace.
        if (error.code === "42P01" || /record_addenda/i.test(error.message)) {
            throw new Error(
                "NOT_CONFIGURED: The correction-note table is not set up yet. Apply supabase/migrations/20260908_record_amendment_window.sql."
            );
        }
        console.error("[amendment] addRecordAddendum:", error);
        throw error;
    }

    await logAction("RECORD_ADDENDUM_ADDED", def.table, String(input.id), {
        record_type: input.type,
        addendum_id: (data as any)?.id ?? null,
        reason: payload.reason,
        by: staff.userId,
        chars: content.length,
    });

    return data as RecordAddendum;
}

/** Correction notes attached to one record, oldest first. */
export async function listRecordAddenda(
    type: AmendableRecordType,
    id: string
): Promise<RecordAddendum[]> {
    if (!isAmendableRecordType(type) || !id) return [];
    await requireStaff();

    const supabase = await createClient();
    const { data, error } = await supabase
        .from("record_addenda")
        .select("*")
        .eq("entity_type", type)
        .eq("entity_id", String(id))
        .order("created_at", { ascending: true });

    if (error) {
        // Table not created yet (migration pending) is the likely case.
        console.error("[amendment] listRecordAddenda:", error);
        return [];
    }

    const rows = (data ?? []) as any[];

    // Resolve display names in a second query rather than a PostgREST embed:
    // record_addenda.author_id is text on purpose (staffs.id is text in the
    // legacy schema and uuid in newer ones), so there is no FK to embed.
    // Same approach as audit.service.ts#listAuditLogs.
    const staffIds = [...new Set(rows.map((r) => r.author_id).filter(Boolean))];
    let staffMap: Record<string, any> = {};
    if (staffIds.length) {
        const { data: staff } = await supabase
            .from("staffs")
            .select("id, name, role")
            .in("id", staffIds);
        staffMap = Object.fromEntries((staff ?? []).map((s: any) => [String(s.id), s]));
    }

    return rows.map((row: any) => ({
        ...row,
        author_name: row.author_name ?? staffMap[String(row.author_id)]?.name ?? null,
        author_role: row.author_role ?? staffMap[String(row.author_id)]?.role ?? null,
    })) as unknown as RecordAddendum[];
}
