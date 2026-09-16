"use server";

import { createClient } from "@/utils/supabase/server";
import { Patient, PatientStatus, UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";
import { normalizeHospitalNumber } from "@/lib/hospital-number";
import { formatFriendlyDbError } from "@/lib/utils/friendly-errors";

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

    // Hospital number: every patient — EMR-registered or bulk-imported — uses
    // the same shared NVH-XXXXX series.
    // Degrades gracefully if the hospital_number migration hasn't been applied.
    let hospital_number: string | null = null;
    try {
        const { data: hn, error: hnError } = await supabase
            .rpc("next_hospital_number", { p_prefix: "NVH" });
        if (!hnError && typeof hn === "string") hospital_number = normalizeHospitalNumber(hn) ?? hn;
        else if (hnError) console.error("[patient] next_hospital_number:", hnError);
    } catch (e) {
        console.error("[patient] hospital number generation skipped:", e);
    }

    let payload = cleanPatientPayload({
        ...data,
        ...(hospital_number ? { hospital_number } : {}),
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

export async function getPatientById(id: string): Promise<Patient | null> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .single();

    if (error) { console.error("[patient] getPatientById:", error); return null; }
    return data as unknown as Patient;
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
        if (data.length < 100) break;
        from += data.length;
    }

    return allData;
}

export async function searchPatients(query: string): Promise<Patient[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("patients")
        .select("*")
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,hospital_number.ilike.%${query}%`)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(100);

    if (error) { console.error("[patient] searchPatients:", error); return []; }
    return data as Patient[];
}

export async function getAllPatients(
    page = 0,
    limit?: number
): Promise<Patient[]> {
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

        if (error) { console.error("[patient] getAllPatients:", error); return []; }
        return data as Patient[];
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

        if (error) { console.error("[patient] getAllPatients:", error); break; }
        if (!data || data.length === 0) break;
        allData.push(...(data as Patient[]));
        if (data.length < 100) break;
        from += data.length;
        if (limit && allData.length >= limit) break;
    }

    return allData;
}
