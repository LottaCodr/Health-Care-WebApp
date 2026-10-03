"use server";

import { createClient } from "@/utils/supabase/server";
import { Patient, PatientStatus, UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";
import { formatFriendlyDbError } from "@/lib/utils/friendly-errors";
import type { ServiceResult } from "@/lib/utils/service-result";

/**
 * Roles that may advance a patient through the workflow state machine
 * (QueueSuite/front desk, nurse vitals, lab results, radiology reports,
 * discharge notes — all call updatePatientStatus in this codebase).
 */
const STATUS_CHANGE_ROLES: UserRole[] = [
    UserRole.FrontDesk,
    UserRole.Doctor,
    UserRole.Nurse,
    UserRole.LabTechnician,
    UserRole.Pharmacist,
    UserRole.Radiologist,
];

/** Convert empty/whitespace strings to null so they never violate constraints or store empty text */
function cleanPatientPayload(data: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === "string") {
            const trimmed = value.trim();
            cleaned[key] = trimmed.length > 0 ? trimmed : null;
        } else {
            cleaned[key] = value ?? null;
        }
    }
    return cleaned;
}

/**
 * Result of a registration attempt.
 *
 * ⚠️ Expected failures are RETURNED, never thrown. `createPatient` is a Server
 * Action ("use server" file), and Next.js replaces the message of any error a
 * Server Action throws with a digest-only placeholder before it reaches the
 * browser — literally:
 *
 *   "An error occurred in the Server Components render. The specific message
 *    is omitted in production builds to avoid leaking sensitive details…"
 *
 * (React Flight's `resolveErrorProd()`, shipped in
 * `next/dist/compiled/react-server-dom-webpack`). That is why the front desk
 * reported the same useless text twice: the first time the real cause was a
 * phantom `user_id` column, and after that was fixed the *friendly* messages
 * produced by `formatFriendlyDbError` were thrown too — so they were redacted
 * just the same and the desk still could not see why a patient would not
 * register. Returning the message is the only way it survives the wire.
 */
export type PatientCreateResult =
    | { ok: true; patient: Patient; warnings?: string[] }
    | { ok: false; message: string; code?: string | null };

export async function createPatient(
    data: Omit<Patient, "id" | "created_at" | "updated_at">
): Promise<PatientCreateResult> {
  try {
    return await insertPatient(data);
  } catch (error: any) {
    // Anything not already converted below (auth guard, an unreachable
    // database, a bug) still has to reach the desk as words, not a digest.
    console.error("[patient] createPatient failed:", error);
    return {
        ok: false,
        code: error?.code ?? null,
        message: formatFriendlyDbError(
            error,
            error?.message || "Registration failed. Please check the entered details and try again."
        ),
    };
  }
}

async function insertPatient(
    data: Omit<Patient, "id" | "created_at" | "updated_at">
): Promise<PatientCreateResult> {
    const actor = await requireStaff([UserRole.FrontDesk]);
    const supabase = await createClient();

    // Hospital number: assigned BY THE DATABASE at insert time
    // (trg_patients_assign_hospital_number fills a blank hospital_number from
    // the shared NVH-XXXXX series). Nothing is drawn before the insert, so a
    // failed registration consumes NO number and the series can never skip —
    // the old code pre-drew a number per attempt and burned it on every
    // failure (RLS refusal, PGRST204 retry, dropped connection). Do NOT add a
    // pre-insert allocation back here; the returned row carries the assigned
    // number in result.hospital_number.
    let payload = cleanPatientPayload({
        ...data,
        status: data.status || "registered",
    });

    // Insert, tolerating a database that hasn't received a column migration
    // yet. PostgREST rejects the WHOLE insert when any payload key has no
    // matching column (PGRST204 — even a null-valued key), and in production
    // Next.js redacts the thrown message, so the front desk only ever saw
    // "An error occurred in the Server Components render …" and registration
    // was dead until someone read the server logs. Registering the patient
    // matters more than the extra columns: drop the unknown keys, log loudly
    // so the drift is visible, and retry.
    let result: Patient | null = null;
    // Columns the insert had to drop because the database hasn't received the
    // migration that adds them. The patient still registers — but the desk
    // must be TOLD what was not saved. Silent loss here is how an HMO patient
    // ends up registered with no insurer on file (billing chases a payer that
    // was never written down).
    const droppedColumns: string[] = [];
    for (let attempt = 0; ; attempt++) {
        const { data, error } = await supabase
            .from("patients")
            .insert([payload])
            .select()
            .single();

        if (!error) {
            result = data as unknown as Patient;
            break;
        }

        const unknownColumn =
            error.code === "PGRST204"
                ? /Could not find the '([^']+)' column of 'patients'/i.exec(
                      String(error.message ?? "")
                  )?.[1] ?? null
                : null;

        const droppable =
            unknownColumn !== null &&
            Object.prototype.hasOwnProperty.call(payload, unknownColumn) &&
            attempt < 5;

        if (!droppable) {
            console.error("[patient] createPatient:", error);
            // Diagnostic context for the RLS-era failure class. Keys only —
            // patient values (PHI) never go to the logs.
            if (error.code === "42501" || /row-level security|permission denied/i.test(String(error.message ?? ""))) {
                console.error(
                    `[patient] createPatient: the DATABASE refused the insert (RLS/policy). ` +
                        `App-side guard passed (actor role=${actor.role}, actor id=${actor.userId}). ` +
                        `payload keys: ${Object.keys(payload).join(", ")}. ` +
                        `The database's staff-role policies have drifted from the app's RBAC — ` +
                        `apply supabase/migrations and run scripts/diagnose-registration-rls.sql.`
                );
            }
            // Returned, not thrown: a thrown message is redacted by Next.js
            // before it reaches the browser, so throwing here is exactly what
            // left the front desk staring at "An error occurred in the Server
            // Components render …" with no idea which field to fix.
            return {
                ok: false,
                code: error.code ?? null,
                message: formatFriendlyDbError(
                    error,
                    "Failed to register patient. Please check the entered details."
                ),
            };
        }

        console.error(
            `[patient] createPatient: patients.${unknownColumn} does not exist yet ` +
                `(migration not applied?) — dropping it and retrying. ` +
                `Apply the pending supabase migrations so this field is stored.`
        );
        droppedColumns.push(unknownColumn as string);
        const { [unknownColumn as string]: _dropped, ...rest } = payload;
        payload = rest;
    }

    if (!result) {
        // `.single()` resolved with no row (row-level security can hide a row
        // that was actually written). Tell the desk to check the list rather
        // than re-registering the same patient twice.
        console.error("[patient] createPatient: insert returned no row");
        return {
            ok: false,
            code: null,
            message:
                "The patient may have been saved but the system could not read the record back. " +
                "Please check the patient list before registering again.",
        };
    }

    await logAction("PATIENT_REGISTERED", "patients", result.id, {
        name: result.name,
        hospital_number: result.hospital_number ?? null,
        registered_by: actor.userId,
    });

    // The patient IS registered — but if insurance columns had to be dropped
    // (schema drift), the desk must know the HMO/company detail did not save.
    const warnings = droppedColumns.length
        ? droppedColumns.map(
              (column) =>
                  `The database does not have the "${column}" field yet, so that detail was NOT saved for this patient ` +
                  `(registration succeeded anyway). Ask an administrator to apply the pending database migrations, ` +
                  `then add the missing detail to the patient's record.`
          )
        : undefined;

    return { ok: true, patient: result as unknown as Patient, warnings };
}

/**
 * A failed read, as words. Friendly sentence first, then the raw code/message
 * so a screenshot of the screen is diagnosable (the guard prefixes
 * `UNAUTHORIZED:` / `STAFF_LOOKUP_FAILED:` already carry their own detail).
 */
function describeReadFailure(error: any, fallback: string): { message: string; code: string | null } {
    const code = error?.code ? String(error.code) : null;
    const friendly = formatFriendlyDbError(error, fallback);
    const raw = String(error?.message ?? "").trim();
    const alreadyShown =
        !raw ||
        friendly.includes(raw) ||
        /^(unauthorized|forbidden|staff_lookup_failed):/i.test(raw);
    const technical = alreadyShown ? "" : ` [${code ? `${code}: ` : ""}${raw}]`;
    return { message: `${friendly}${technical}`, code };
}

/**
 * One patient, by id — returned as a RESULT, never thrown.
 *
 * `{ ok: true, data: null }` means the database was asked and there is
 * genuinely no such patient. `{ ok: false }` means the read FAILED (no/expired
 * session, staff-profile lookup failed, RLS/policy drift, PostgREST/5xx, a
 * dropped connection) and carries the reason in plain words.
 *
 * Why not throw? This is a Server Action. Next.js redacts the message of any
 * error an action throws before it reaches the browser in production, so the
 * previous "throw a friendly reason" design reached every department as
 * "This record could not be opened … An error occurred in the Server
 * Components render. The specific message is omitted…" — no reason, nothing a
 * desk could screenshot, nothing an admin could act on. Returning the message
 * is the only way it survives the wire (same rule as `createPatient`).
 * Client callers go through `fetchPatient` in `hooks/emr/use-patients.ts`,
 * which re-throws CLIENT-side so React Query's error state keeps working.
 */
export async function lookupPatient(id: string): Promise<ServiceResult<Patient | null>> {
    try {
        const patientId = typeof id === "string" ? id.trim() : "";
        // A route param that never resolved ("undefined"/"null") cannot match
        // anything — and sending it to a uuid column is a 22P02 error that
        // used to be reported as a broken record.
        if (!patientId || patientId === "undefined" || patientId === "null") {
            return { ok: true, data: null };
        }

        await requireStaff();
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("patients")
            .select("*")
            .eq("id", patientId)
            .maybeSingle();

        if (error) {
            // A malformed id is "no such patient", not a failed read.
            if (error.code === "22P02") return { ok: true, data: null };
            console.error("[patient] lookupPatient:", error);
            return {
                ok: false,
                ...describeReadFailure(error, "Could not load this patient's record. Please try again."),
            };
        }
        return { ok: true, data: (data ?? null) as unknown as Patient | null };
    } catch (error: any) {
        console.error("[patient] lookupPatient failed:", error);
        return {
            ok: false,
            ...describeReadFailure(error, "Could not load this patient's record. Please try again."),
        };
    }
}

export async function updatePatient(
    id: string,
    updates: Partial<Patient>
): Promise<Patient> {
    const actor = await requireStaff([UserRole.FrontDesk, UserRole.Doctor, UserRole.Nurse]);
    const supabase = await createClient();
    const payload = cleanPatientPayload(updates);

    const { data, error } = await supabase
        .from("patients")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("[patient] updatePatient:", error);
        throw new Error(formatFriendlyDbError(error, "Failed to update patient record."));
    }

    // Audit trail — who changed which fields (admins correcting front-desk
    // typos, front desk editing contacts, …). Values are deliberately NOT
    // logged (PHI minimisation); the field list plus the actor is enough to
    // investigate a bad edit.
    await logAction("PATIENT_RECORD_UPDATED", "patients", id, {
        updated_fields: Object.keys(payload),
        changed_by: actor.userId,
    });

    return data as unknown as Patient;
}

export async function updatePatientStatus(
    id: string,
    status: PatientStatus
): Promise<Patient> {
    const actor = await requireStaff(STATUS_CHANGE_ROLES);
    if (status === PatientStatus.Discharged) {
        throw new Error("Use the guarded Front Desk closeout action to discharge a patient.");
    }

    const supabase = await createClient();
    const { data: before } = await supabase
        .from("patients")
        .select("status")
        .eq("id", id)
        .maybeSingle();

    const { data, error } = await supabase
        .from("patients")
        .update({ status })
        .eq("id", id)
        .select()
        .single();

    if (error) {
        console.error("[patient] updatePatientStatus:", error);
        throw new Error(formatFriendlyDbError(error, "Failed to update patient status."));
    }

    await logAction("PATIENT_STATUS_CHANGED", "patients", id, {
        from: before?.status ?? null,
        to: status,
        changed_by: actor.userId,
    });

    return data as Patient;
}

// ─── Consultation-queue close (admin bulk action) ─────────────────────────────
//
// The admin "Close queue" action discharges patients who are still
// `awaiting-consultation` (left without being seen, end-of-session sweep,
// registered in error…). It is deliberately NOT the billing auto-discharge path
// (`payment.service.ts`): it touches `patients.status` only — no bills, no
// discharge notes — and the `reason` is recorded so an administrative
// queue-close can be told apart from a real, billing-cleared discharge.
//
// `QueueCloseResult` is RETURNED (never thrown) for the same reason as
// `PatientCreateResult` — see the comment above `createPatient`.

export type QueueCloseReason =
    | "left-without-being-seen"
    | "queue-closed"
    | "registered-in-error"
    | "referred-elsewhere"
    | "other";

// Runtime list lives on the client (a "use server" file may only export async
// functions); this private copy is what the guard below validates against.
const QUEUE_CLOSE_REASONS: QueueCloseReason[] = [
    "left-without-being-seen",
    "queue-closed",
    "registered-in-error",
    "referred-elsewhere",
    "other",
];

export type QueueCloseResult =
    | {
          ok: true;
          closed: { id: string; hospital_number: string | null }[];
          /** Requested patients that were NOT closed — status changed under us. */
          skipped: { id: string; status: string }[];
      }
    | { ok: false; message: string; code?: string | null };

export interface QueueCloseInput {
    /** Omit ⇒ everyone currently `awaiting-consultation` ("close the queue"). */
    patientIds?: string[];
    reason: QueueCloseReason;
    note?: string;
}

/**
 * Discharge patients from the consultation queue in ONE guarded bulk update.
 *
 * The guard matters: the `.eq("status", "awaiting-consultation")` predicate is
 * part of the UPDATE itself, so a doctor who starts a consultation while the
 * admin's confirmation dialog is open is never clobbered — their row simply
 * doesn't match and is reported back as `skipped`.
 */
export async function closeConsultationQueue(
    input: QueueCloseInput
): Promise<QueueCloseResult> {
    try {
        const actor = await requireStaff([UserRole.Admin]);

        if (!input || !QUEUE_CLOSE_REASONS.includes(input.reason)) {
            return {
                ok: false,
                code: "INVALID_REASON",
                message: "Please choose why the queue is being closed.",
            };
        }
        const note = typeof input.note === "string" ? input.note.trim() : "";
        if (input.reason === "other" && note.length === 0) {
            return {
                ok: false,
                code: "NOTE_REQUIRED",
                message: 'Please add a short note when the reason is "Other".',
            };
        }

        // Explicit ids: validate. Omitted: everyone currently awaiting.
        let requestedIds: string[] | null = null;
        if (input.patientIds !== undefined) {
            if (!Array.isArray(input.patientIds)) {
                return { ok: false, code: "BAD_INPUT", message: "Invalid patient selection." };
            }
            requestedIds = [...new Set(
                input.patientIds.filter((id) => typeof id === "string" && id.trim().length > 0)
            )];
            if (requestedIds.length === 0) {
                return { ok: false, code: "NOTHING_SELECTED", message: "No patients selected." };
            }
            if (requestedIds.length > 500) {
                return {
                    ok: false,
                    code: "TOO_MANY",
                    message: "Close at most 500 patients at a time.",
                };
            }
        }

        const supabase = await createClient();

        // 1. Resolve targets NOW (and, for an explicit selection, capture who is
        //    already ineligible so the caller learns what was skipped and why).
        const skipped: { id: string; status: string }[] = [];
        let targets: { id: string; hospital_number: string | null }[];

        if (requestedIds) {
            const { data: rows, error } = await supabase
                .from("patients")
                .select("id, hospital_number, status")
                .in("id", requestedIds);
            if (error) throw error;

            const byId = new Map((rows ?? []).map((r: any) => [r.id, r]));
            for (const id of requestedIds) {
                const row = byId.get(id);
                if (!row) skipped.push({ id, status: "not-found" });
                else if (row.status !== "awaiting-consultation") {
                    skipped.push({ id, status: row.status ?? "no-status" });
                }
            }
            targets = (rows ?? [])
                .filter((r: any) => r.status === "awaiting-consultation")
                .map((r: any) => ({ id: r.id, hospital_number: r.hospital_number ?? null }));
        } else {
            const { data: rows, error } = await supabase
                .from("patients")
                .select("id, hospital_number")
                .eq("status", "awaiting-consultation");
            if (error) throw error;
            targets = (rows ?? []).map((r: any) => ({
                id: r.id,
                hospital_number: r.hospital_number ?? null,
            }));
        }

        // 2. One set-based UPDATE, guarded so only rows STILL awaiting move.
        let closed: { id: string; hospital_number: string | null }[] = [];
        if (targets.length > 0) {
            const { data: updated, error } = await supabase
                .from("patients")
                .update({ status: "discharged", updated_at: new Date().toISOString() })
                .in("id", targets.map((t) => t.id))
                .eq("status", "awaiting-consultation")
                .select("id, hospital_number");
            if (error) throw error;
            closed = (updated ?? []).map((r: any) => ({
                id: r.id,
                hospital_number: r.hospital_number ?? null,
            }));

            // Rows that raced away between 1 and 2 — report their new status.
            const closedIds = new Set(closed.map((c) => c.id));
            const raced = targets.filter((t) => !closedIds.has(t.id));
            if (raced.length > 0) {
                const { data: nowRows } = await supabase
                    .from("patients")
                    .select("id, status")
                    .in("id", raced.map((t) => t.id));
                const statusById = new Map((nowRows ?? []).map((r: any) => [r.id, r.status]));
                for (const t of raced) {
                    skipped.push({ id: t.id, status: statusById.get(t.id) ?? "changed" });
                }
            }
        }

        // 3. One batch audit entry: who closed the queue, why, and whom.
        //    PHI minimisation — ids and hospital numbers only, no names.
        await logAction("QUEUE_CLOSED", "patients", crypto.randomUUID(), {
            from: "awaiting-consultation",
            to: "discharged",
            reason: input.reason,
            note: note || null,
            scope: requestedIds ? "selection" : "all",
            closed_count: closed.length,
            skipped_count: skipped.length,
            patient_ids: closed.map((c) => c.id),
            changed_by: actor.userId,
        });

        return { ok: true, closed, skipped };
    } catch (error: any) {
        const raw = String(error?.message ?? "");
        // Auth-guard failures arrive as thrown errors with machine-readable
        // prefixes — forward the friendly half instead of a stack trace.
        if (raw.startsWith("UNAUTHORIZED") || raw.startsWith("FORBIDDEN")) {
            return {
                ok: false,
                code: raw.split(":")[0],
                message: raw.slice(raw.indexOf(":") + 1).trim(),
            };
        }
        console.error("[patient] closeConsultationQueue:", error);
        return {
            ok: false,
            code: error?.code ?? null,
            message: formatFriendlyDbError(
                error,
                "Failed to close the consultation queue. Please try again."
            ),
        };
    }
}

export async function listPatientsByStatus(
    status: PatientStatus
): Promise<Patient[]> {
    await requireStaff();
    const supabase = await createClient();
    const allData: Patient[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from("patients")
            .select("*")
            .eq("status", status)
            // FIFO: earliest arrivals first. `id` as a stable tie-breaker keeps
            // range() pagination deterministic when timestamps collide.
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(from, from + batchSize - 1);

        if (error) { console.error("[patient] listPatientsByStatus:", error); break; }
        if (!data || data.length === 0) break;
        allData.push(...(data as Patient[]));
        // A short batch means the end of the table — compare against the batch
        // size actually requested, not a hard-coded 100 (which sent one more
        // empty round trip after every queue load).
        if (data.length < batchSize) break;
        from += data.length;
    }

    return allData;
}

/**
 * Exact count of patients registered since a UTC timestamp.
 *
 * Backs the front-desk dashboard's "New Arrivals" stat with a single
 * lightweight `count: exact` round-trip instead of loading the whole
 * patients table into the browser and filtering it client-side.
 * Throws a friendly error so the UI can show *why* the card is empty
 * (RLS drift, missing table…) rather than silently reading zero.
 */
export async function countPatientsCreatedSince(sinceIso: string): Promise<number> {
    await requireStaff();
    const supabase = await createClient();
    const { count, error } = await supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .gte("created_at", sinceIso);

    if (error) {
        throw new Error(formatFriendlyDbError(error, "Failed to load today's arrivals."));
    }
    return count ?? 0;
}

/**
 * Patients registered since a UTC timestamp, newest first, capped at
 * `limit` rows. Backs the front-desk dashboard's "Today's Arrivals"
 * list (which shows at most a handful of rows).
 */
export async function listPatientsCreatedSince(
    sinceIso: string,
    limit = 50
): Promise<Patient[]> {
    await requireStaff();
    const supabase = await createClient();
    const safeLimit = Math.max(1, Math.min(Number(limit) || 50, 200));

    const { data, error } = await supabase
        .from("patients")
        .select("*")
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(safeLimit);

    if (error) {
        throw new Error(formatFriendlyDbError(error, "Failed to load today's arrivals."));
    }
    return (data ?? []) as Patient[];
}

/**
 * Free-text patient search (name / email / phone / hospital number).
 *
 * Returned as a RESULT: a failed search used to come back as `[]`, which the
 * admin's "find a patient to edit demographics" screen rendered as "No
 * patients match" — an unreadable registry looked exactly like an empty one.
 */
export async function searchPatients(query: string): Promise<ServiceResult<Patient[]>> {
    try {
        await requireStaff();
        const supabase = await createClient();

        // Neutralise the characters PostgREST parses as `or=` structure so a
        // name like "Doe, John" or "O'Brien (jr)" is matched literally instead
        // of breaking the filter (which also used to surface as "no results").
        const term = String(query ?? "").replace(/[%,()"\\*]/g, " ").replace(/\s+/g, " ").trim();
        if (!term) return { ok: true, data: [] };

        const { data, error } = await supabase
            .from("patients")
            .select("*")
            .or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,hospital_number.ilike.%${term}%`)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .limit(100);

        if (error) {
            console.error("[patient] searchPatients:", error);
            return { ok: false, ...describeReadFailure(error, "Patient search failed. Please try again.") };
        }
        return { ok: true, data: (data ?? []) as Patient[] };
    } catch (error: any) {
        console.error("[patient] searchPatients failed:", error);
        return { ok: false, ...describeReadFailure(error, "Patient search failed. Please try again.") };
    }
}

/**
 * Every value the `status` column can hold (mirrors `PatientStatus`, kept as
 * plain strings here so this file doesn't need the enum import order to
 * matter). Drives `getPatientStatusCounts` below.
 */
const ALL_PATIENT_STATUSES: string[] = [
    "registered",
    "sent-to-nurse",
    "awaiting-consultation",
    "under-consultation",
    "under-observation",
    "admitted",
    "sent-to-pharmacy",
    "sent-to-lab",
    "sent-to-radiology",
    "awaiting-payment",
    "awaiting-front-desk",
    "discharged",
    "no-status",
];

/**
 * Per-status patient counts for the queue tab badges — WITHOUT downloading a
 * single patient row. Each status is a `count: exact, head: true` request
 * (index-only, no body), fired in parallel, so this stays fast no matter how
 * many patients the hospital has on file.
 *
 * This replaces counting client-side over the result of `getAllPatients()`,
 * which pulled the ENTIRE `patients` table into the browser just to render
 * the little numbers on the status pills — the same full-table fetch the
 * queue page used to drive its "All"/"Sent to Nurse"/etc. tabs, and the
 * reason those queues got slower every week as the table grew.
 */
export async function getPatientStatusCounts(): Promise<{
    total: number;
    byStatus: Record<string, number>;
}> {
    await requireStaff();
    const supabase = await createClient();

    const results = await Promise.all(
        ALL_PATIENT_STATUSES.map(async (status) => {
            const { count, error } = await supabase
                .from("patients")
                .select("id", { count: "exact", head: true })
                .eq("status", status);
            if (error) {
                console.error(`[patient] getPatientStatusCounts(${status}):`, error);
                return [status, 0] as const;
            }
            return [status, count ?? 0] as const;
        })
    );

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const [status, count] of results) {
        byStatus[status] = count;
        total += count;
    }
    return { total, byStatus };
}

/**
 * One page of the registry, with the exact total — the front-desk "All
 * Patients" tab.
 *
 * This replaces `getAllPatients()` on that tab, which looped the ENTIRE
 * `patients` table down to the browser in 1000-row batches (every column of
 * every patient ever registered) so the UI could then slice 100 of them out
 * client-side. On a real registry that is many sequential round trips and a
 * multi-megabyte server-action payload before the first row paints — the desk
 * experienced it as the list "taking forever". Here the database does the
 * filtering, ordering, counting and slicing, so a page costs one request and
 * one screen of rows no matter how big the registry gets.
 *
 * `search` is pushed down to the database too (same columns as
 * `searchPatients`) — a server-paginated list cannot be filtered client-side,
 * because the browser only ever holds the current page.
 *
 * Failures are THROWN with a friendly reason (never swallowed into an empty
 * list): an empty registry and an unreadable one must not look the same.
 */
export interface PatientPage {
    rows: Patient[];
    /** Exact number of rows matching the filter — drives the pagination control. */
    total: number;
    page: number;
    pageSize: number;
}

export async function listPatientsPage(input: {
    /** 1-based page number. */
    page?: number;
    pageSize?: number;
    search?: string;
    /** Optional status filter — lets the status tabs share this path later. */
    status?: PatientStatus | null;
}): Promise<PatientPage> {
    await requireStaff();
    const supabase = await createClient();

    const page = Math.max(1, Math.trunc(Number(input?.page) || 1));
    const pageSize = Math.min(200, Math.max(1, Math.trunc(Number(input?.pageSize) || 100)));
    const search = (input?.search ?? "").trim();

    let query = supabase
        .from("patients")
        .select("*", { count: "exact" });

    if (input?.status) query = query.eq("status", input.status);
    if (search) {
        // Strip the characters PostgREST treats as `or=` syntax/structure
        // (commas, parens, dots) and the LIKE wildcards, so what the desk types
        // can only ever be matched literally — never re-parsed as a new filter.
        const term = search.replace(/[%,()._]/g, " ").trim();
        if (term) {
            query = query.or(
                `name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,hospital_number.ilike.%${term}%`
            );
        }
    }

    const { data, count, error } = await query
        // FIFO: earliest arrivals first (see listPatientsByStatus).
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
        console.error("[patient] listPatientsPage:", error);
        throw new Error(
            formatFriendlyDbError(error, "Failed to load the patient list. Please try again.")
        );
    }

    const rows = (data ?? []) as Patient[];
    return { rows, total: count ?? rows.length, page, pageSize };
}

export async function getAllPatients(
    page = 0,
    limit?: number
): Promise<ServiceResult<Patient[]>> {
    try {
        await requireStaff();
        const supabase = await createClient();

        if (limit && limit <= 500) {
            const { data, error } = await supabase
                .from("patients")
                .select("*")
                // FIFO: earliest arrivals first (see listPatientsByStatus).
                .order("created_at", { ascending: true })
                .order("id", { ascending: true })
                .range(page * limit, (page + 1) * limit - 1);

            if (error) {
                console.error("[patient] getAllPatients:", error);
                return { ok: false, ...describeReadFailure(error, "Failed to load patients. Please try again.") };
            }
            return { ok: true, data: (data ?? []) as Patient[] };
        }

        const allData: Patient[] = [];
        let from = page * (limit ?? 0);
        const batchSize = 1000;

        while (true) {
            const { data, error } = await supabase
                .from("patients")
                .select("*")
                // FIFO: earliest arrivals first (see listPatientsByStatus).
                .order("created_at", { ascending: true })
                .order("id", { ascending: true })
                .range(from, from + batchSize - 1);

            if (error) {
                // A partial registry shown as if it were complete is worse
                // than an error — report the failure.
                console.error("[patient] getAllPatients:", error);
                return { ok: false, ...describeReadFailure(error, "Failed to load patients. Please try again.") };
            }
            if (!data || data.length === 0) break;
            allData.push(...(data as Patient[]));
            // See listPatientsByStatus: a short batch IS the last batch.
            if (data.length < batchSize) break;
            from += data.length;
            if (limit && allData.length >= limit) break;
        }

        return { ok: true, data: allData };
    } catch (error: any) {
        console.error("[patient] getAllPatients failed:", error);
        return { ok: false, ...describeReadFailure(error, "Failed to load patients. Please try again.") };
    }
}
