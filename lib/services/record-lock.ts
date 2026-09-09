/**
 * Server-side enforcement of the 24-hour amendment window.
 *
 * This is the layer that makes the rule real. `lib/records/row-state.ts` only
 * decides what a button looks like; every write that touches record CONTENT
 * goes through `assertRecordAmendable()` here before it reaches Postgres, so
 * neither a crafted client nor a legacy code path can rewrite a chart that has
 * already been filed. (`supabase/migrations/20260908_record_amendment_window.sql`
 * repeats the rule in a trigger, which also covers direct PostgREST calls made
 * with the public anon key.)
 *
 * Error contract — the app's convention (see `auth-guard.ts`) of a
 * machine-readable prefix:
 *
 *   `LOCKED:<reason> <human sentence>`
 *
 * so the UI can react to `err.message.startsWith("LOCKED")` and offer the
 * append-only correction note instead of a retry.
 *
 * Deliberately NOT exported as a server action ("use server"): it is an
 * internal guard for the service layer.
 */

import { createClient } from "@/utils/supabase/server";
import { requireStaff, type StaffSession } from "@/lib/services/auth-guard";
import { logAction } from "@/lib/services/audit.service";
import {
    AMENDMENT_WINDOW_HOURS,
    evaluateAmendmentWindow,
    pickAnchor,
    pickAuthor,
    type AmendmentWindow,
} from "@/lib/records/amendment-policy";
import {
    fieldLabel,
    getRecordDef,
    isFirstFilling,
    pickContentChanges,
    type AmendableRecordDef,
    type AmendableRecordType,
} from "@/lib/records/registry";

export interface AmendmentContext {
    type: AmendableRecordType;
    def: AmendableRecordDef;
    id: string;
    actor: StaffSession;
    window: AmendmentWindow;
    /** Content columns the write actually changes, with before/after values. */
    changes: Record<string, { before: unknown; after: unknown }>;
    /** True when the row had no content yet (first filing, not an amendment). */
    firstFiling: boolean;
    row: Record<string, any>;
    /**
     * Extra column(s) the caller should merge into the write — currently only
     * authorship claiming on legacy rows that have no author stamped.
     */
    patch: Record<string, unknown>;
}

/** Human sentence a clinician sees when the guard refuses their edit. */
function lockMessage(win: AmendmentWindow, def: AmendableRecordDef): string {
    if (win.blockedOn === "not_author") {
        return `${def.label} belongs to another member of staff. Only the person who filed it may amend it — if something needs correcting, attach a correction note instead.`;
    }
    return `${def.label} is locked: the ${AMENDMENT_WINDOW_HOURS}-hour amendment window closed. The entry stays as filed; attach a correction note so the change is visible next to it.`;
}

/** Trim a value so the audit trail holds evidence without ballooning. */
function auditValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    const text = Array.isArray(value) ? value.join(", ") : String(value);
    return text.length > 600 ? `${text.slice(0, 600)}…` : text;
}

/**
 * Read the row, work out whether the write is a permitted amendment, and
 * return the context a caller needs (changed columns, patch, window).
 *
 * Graceful degradation, on purpose: when the table/row cannot be read (an
 * older deployment without the migration, a renamed column) the guard does not
 * invent a refusal — the write proceeds and the attempt is logged. The
 * integrity guarantee lives in the DB trigger; this layer is the friendly,
 * informative one.
 */
export async function inspectRecordAmendment(opts: {
    type: AmendableRecordType;
    id: string;
    updates: Record<string, any>;
    /** Skip the role list when the caller already authorised the request. */
    roles?: boolean;
    actor?: StaffSession;
    /**
     * Some tables host more than one kind of record — radiology reports live in
     * `lab_requests` next to lab results. The caller can re-classify the row
     * once the guard has it, so labels, roles and the addendum key all follow
     * the record rather than the entry point.
     */
    resolveType?: (row: Record<string, any>) => AmendableRecordType | null;
}): Promise<AmendmentContext | null> {
    let type = opts.type;
    let def = getRecordDef(type);
    const actor = opts.actor ?? (await requireStaff(opts.roles === false ? undefined : [...def.editorRoles] as any));

    const supabase = await createClient();
    const { data, error } = await supabase
        .from(def.table)
        .select("*")
        .eq("id", opts.id)
        .maybeSingle();

    if (error) {
        console.warn(`[record-lock] ${def.table} pre-read failed, skipping app-side check:`, error.message);
        return null;
    }
    if (!data) return null;

    const row = data as Record<string, any>;

    if (opts.resolveType) {
        const resolved = opts.resolveType(row);
        if (resolved && resolved !== type) {
            type = resolved;
            def = getRecordDef(type);
        }
    }

    const changes = pickContentChanges(def, opts.updates ?? {}, row);
    const changedColumns = Object.keys(changes);

    // Nothing clinical is changing (status, routing, price, dispensed flag…) —
    // the workflow stays free.
    if (!changedColumns.length) return null;

    // Scoped to the columns being written, so filing a result on an old request
    // is a filing and not a (blocked) amendment.
    const firstFiling = isFirstFilling(changes);
    const window = evaluateAmendmentWindow({
        anchor: pickAnchor(row, def.anchor),
        authorId: pickAuthor(row, def.author),
        actorId: actor.userId,
        firstFiling,
    });

    const ctx: AmendmentContext = {
        type,
        def,
        id: opts.id,
        actor,
        window,
        changes,
        firstFiling,
        row,
        patch: {},
    };

    if (!window.editable) {
        // Log the refused attempt: "who tried to change a locked chart" is
        // exactly what the audit review screen is for.
        await logAction("RECORD_AMENDMENT_BLOCKED", def.table, opts.id, {
            record_type: type,
            blocked_on: window.blockedOn,
            attempted_fields: changedColumns,
            window_hours: AMENDMENT_WINDOW_HOURS,
            anchor: pickAnchor(row, def.anchor) ?? null,
            attempted_by: actor.userId,
        });
        throw new Error(`LOCKED:${window.blockedOn} ${lockMessage(window, def)}`);
    }

    // A legacy row with no author: whoever files the correction becomes the
    // owner from now on, so the "authors only" rule can actually bite next time.
    if (window.unowned && def.author.length) {
        const claimColumn = String(def.author[0]);
        if (row[claimColumn] === null || row[claimColumn] === undefined) {
            ctx.patch[claimColumn] = actor.userId;
        }
    }

    return ctx;
}

/**
 * Guard used INSIDE the department services' own update functions, so the
 * legacy entry points (a lab scientist re-submitting a result, a nurse editing
 * a task note) are covered too — not only the new amendment dialog.
 */
export async function assertRecordAmendable(
    type: AmendableRecordType,
    id: string,
    updates: Record<string, any>,
    opts?: {
        /** Skip the registry role check when the caller already authorised. */
        roles?: boolean;
        actor?: StaffSession;
        /** Re-classify shared-table rows (radiology inside lab_requests). */
        resolveType?: (row: Record<string, any>) => AmendableRecordType | null;
    }
): Promise<AmendmentContext | null> {
    const ctx = await inspectRecordAmendment({ type, id, updates, ...opts });
    // `resubmission` distinguishes "the department form was submitted again"
    // from a deliberate amendment made through the audit-visible dialog.
    if (ctx) await logAmendment(ctx, "resubmission");
    return ctx;
}

/**
 * Amend a record's content. Returns the fresh row plus the amended column
 * names so the UI can invalidate and re-render.
 */
export async function writeRecordAmendment(opts: {
    type: AmendableRecordType;
    id: string;
    updates: Record<string, any>;
    reason?: string | null;
    note?: string | null;
}): Promise<{ record: Record<string, any>; amended: string[]; window: AmendmentWindow | null }> {
    const def = getRecordDef(opts.type);
    const requested = opts.updates ?? {};

    // Only accept columns the registry declares amendable — never let the
    // client name an arbitrary column.
    const allowed: Record<string, any> = {};
    for (const field of def.fields) {
        const value = requested[field.column];
        if (value === undefined) continue;
        allowed[field.column] =
            typeof value === "string" ? value.trim() : field.numeric && value !== "" && value !== null
                ? Number(value)
                : value;
    }
    for (const column of def.content) {
        const value = requested[column];
        if (value === undefined || column in allowed) continue;
        allowed[column] = value;
    }

    if (!Object.keys(allowed).length) {
        throw new Error("NOTHING_TO_AMEND: No amendable field was supplied.");
    }

    const ctx = await inspectRecordAmendment({ type: opts.type, id: opts.id, updates: allowed });
    await logAmendment(ctx, opts.reason, opts.note);

    const supabase = await createClient();
    const { data, error } = await supabase
        .from(def.table)
        .update({ ...allowed, ...ctx?.patch })
        .eq("id", opts.id)
        .select("*")
        .maybeSingle();

    if (error) {
        // A Postgres refusal is almost always the window trigger firing
        // underneath the app-side check (clock skew, or the migration applied
        // with a stricter rule) — surface it as a lock, not a crash.
        if (/amendment window/i.test(error.message)) {
            throw new Error(`LOCKED:window_expired ${error.message}`);
        }
        console.error(`[record-lock] ${def.table} amend write:`, error);
        throw error;
    }
    if (!data) throw new Error("NOT_FOUND: The record no longer exists.");

    return {
        record: data as Record<string, any>,
        amended: Object.keys(ctx?.changes ?? allowed),
        window: ctx?.window ?? null,
    };
}

/** Audit the accepted edit (before/after per changed column). */
async function logAmendment(
    ctx: AmendmentContext | null,
    reason?: string | null,
    note?: string | null
): Promise<void> {
    if (!ctx) return;
    if (ctx.firstFiling) {
        await logAction(`${ctx.type.toUpperCase()}_FILED`, ctx.def.table, ctx.id, {
            record_type: ctx.type,
            fields: Object.keys(ctx.changes),
            filed_by: ctx.actor.userId,
        });
        return;
    }
    await logAction("RECORD_AMENDED", ctx.def.table, ctx.id, {
        record_type: ctx.type,
        reason: reason ?? "unspecified",
        note: note ? auditValue(note) : null,
        window_hours: AMENDMENT_WINDOW_HOURS,
        ms_remaining: ctx.window.msRemaining,
        amended_by: ctx.actor.userId,
        changes: Object.fromEntries(
            Object.entries(ctx.changes).map(([column, change]) => [
                column,
                {
                    label: fieldLabel(ctx.def, column),
                    before: auditValue(change.before),
                    after: auditValue(change.after),
                },
            ])
        ),
    });
}

/**
 * Deletion rule: a record inside its window may be withdrawn by its author
 * (fixing "wrong patient" mistakes happen); after the window it may not —
 * charts are only ever annotated, never destroyed. Admin passes, because
 * record destruction is an administrative act that the audit trail reports.
 */
export async function assertRecordDeletable(
    type: AmendableRecordType,
    id: string,
    opts?: { allowAdmin?: boolean }
): Promise<void> {
    const def = getRecordDef(type);
    const actor = await requireStaff([...def.editorRoles] as any);
    if (opts?.allowAdmin && actor.role === "Admin") return;

    const ctx = await inspectRecordAmendment({
        type,
        id,
        updates: Object.fromEntries(def.content.map((c) => [c, `__delete__${Math.random()}`])),
        actor,
    });
    // Deletion has no "before" text to diff against; reuse the window verdict.
    if (ctx && !ctx.window.editable) {
        throw new Error(`LOCKED:${ctx.window.blockedOn} ${lockMessage(ctx.window, def)}`);
    }
}
