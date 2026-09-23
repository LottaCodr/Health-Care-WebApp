"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { LabRequest, UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";
import { dedupeLabTests, normalizeLabTestName } from "@/lib/utils/lab-catalog";
import { assertRecordAmendable } from "./record-lock";
import { formatFriendlyDbError } from "@/lib/utils/friendly-errors";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createNotification } from "./notification.service";
import { createPayment } from "./payment.service";

// ─── Lab Requests ─────────────────────────────────────────────────────────────

export interface CreateLabRequestInput {
    patientId: string;
    requestedBy?: string;
    testType: string;
    priority?: "routine" | "urgent" | "stat";
    notes?: string;
    status?: string;
    price?: number;
}

export async function createLabRequest(
    input: CreateLabRequestInput
): Promise<LabRequest> {
    await requireStaff([UserRole.Doctor, UserRole.FrontDesk]);
    const supabase = await createClient();

    // 1. Resolve test price (from input or catalog)
    let testPrice = typeof input.price === "number" && input.price >= 0 ? input.price : 0;
    if (testPrice === 0 && input.testType) {
        try {
            const cleanTestName = input.testType.replace(/^\[RADIOLOGY\]\s*/i, "").trim();
            // Duplicate catalog rows used to make `.maybeSingle()` error out and
            // silently bill ₦0. Prefer an active, priced row and cap at one so
            // the lookup stays correct even if duplicates still exist.
            const { data: catalogItem } = await supabase
                .from("lab_test_catalog")
                .select("price")
                .ilike("test_name", cleanTestName)
                .order("is_active", { ascending: false })
                .order("price", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (catalogItem && typeof catalogItem.price === "number" && catalogItem.price > 0) {
                testPrice = catalogItem.price;
            }
        } catch (catErr) {
            console.error("[lab] catalog lookup error:", catErr);
        }
    }

    // 2. Insert lab request
    const { data, error } = await supabase
        .from("lab_requests")
        .insert([{
            visit_id: input.patientId,
            requested_by: input.requestedBy ?? null,
            test_type: input.testType,
            priority: input.priority ?? "routine",
            notes: input.notes ?? null,
            status: input.status ?? "pending",
        }])
        .select()
        .single();

    if (error) { console.error("[lab] createRequest:", error); throw error; }

    // 3. Automatically create a pending payment in billing so it reflects in FrontDesk & Patient Billing.
    //    The bill is linked to THIS request (lab_request_id) so a later price
    //    sync can find its own bill even after settlement — no fuzzy matching.
    //    The front desk may settle this bill immediately, before results exist:
    //    settling never blocks the lab, and resulting never re-bills a settled
    //    test (see updateLabRequest).
    try {
        await createPayment({
            patient_id: input.patientId,
            amount: testPrice,
            description: `Lab Test: ${input.testType}`,
            category: "lab",
            status: "pending",
            processed_by: input.requestedBy || undefined,
            notes: input.notes ? `Clinical notes: ${input.notes}` : undefined,
            lab_request_id: data.id,
        });
    } catch (payErr) {
        console.error("[lab] auto-create payment failed:", payErr);
    }

    // 4. Update patient status to sent-to-lab so the lab queue picks them up.
    //    Anyone can request tests (doctor, front desk, admin…), so we route the
    //    patient from any "walking" state. Admitted and discharged patients keep
    //    their status — the request still lands in the lab queue.
    try {
        const { data: currentPatient } = await supabase
            .from("patients")
            .select("status")
            .eq("id", input.patientId)
            .maybeSingle();

        const KEEP_STATUS = new Set(["admitted", "discharged"]);

        if (currentPatient && !KEEP_STATUS.has(String(currentPatient.status).toLowerCase())) {
            await supabase
                .from("patients")
                .update({ status: "sent-to-lab" })
                .eq("id", input.patientId);
        }
    } catch (stErr) {
        console.error("[lab] patient status update error:", stErr);
    }

    // 5. Send notification
    await createNotification({
        role: "LabTechnician",
        title: "New Lab Request",
        message: `A new ${input.priority === "urgent" || input.priority === "stat" ? "urgent " : ""}lab test (${input.testType}) has been requested.`,
        type: input.priority === "stat" ? "alert" : "info"
    });

    return data as unknown as LabRequest;
}

export async function getLabRequestById(id: string): Promise<LabRequest | null> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .select("*")
        .eq("id", id)
        .single();

    if (error) { console.error("[lab] getById:", error); return null; }
    if (!data) return null;
    // Attach patient for richer UI
    const { data: patient } = await supabase
        .from("patients")
        .select("id, name, phone, gender, birth_date, blood_group, geno_type, address, email, hospital_number")
        .eq("id", (data as any).visit_id)
        .maybeSingle();
    return { ...(data as any), patients: patient ?? null } as unknown as LabRequest;
}

/**
 * Attach patient + staff display info to lab request rows so dashboards can
 * show hospital numbers and staff names instead of raw database IDs.
 */
async function enrichLabRequests(rows: any[]): Promise<any[]> {
    if (!rows.length) return rows;
    const supabase = await createClient();

    const patientIds = [...new Set(rows.map((r) => r.visit_id ?? r.patient_id).filter(Boolean))];
    const staffIds = [...new Set(
        rows.flatMap((r) => [r.requested_by, r.completed_by]).filter(Boolean)
    )];

    const [patientRes, staffRes] = await Promise.all([
        patientIds.length
            ? supabase
                .from("patients")
                .select("id, name, phone, gender, birth_date, blood_group, geno_type, hospital_number")
                .in("id", patientIds)
            : Promise.resolve({ data: [] }),
        staffIds.length
            ? supabase
                .from("staffs")
                .select("id, name, role")
                .in("id", staffIds)
            : Promise.resolve({ data: [] }),
    ]);

    const patientMap = Object.fromEntries((patientRes.data ?? []).map((p: any) => [p.id, p]));
    const staffMap = Object.fromEntries((staffRes.data ?? []).map((s: any) => [s.id, s]));

    return rows.map((r) => ({
        ...r,
        patients: patientMap[r.visit_id ?? r.patient_id] ?? null,
        requested_by_name: staffMap[r.requested_by]?.name ?? null,
        completed_by_name: staffMap[r.completed_by]?.name ?? null,
    }));
}

export async function listLabRequestsByPatient(
    patientId: string
): Promise<LabRequest[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .select("*")
        .eq("visit_id", patientId)
        .not("test_type", "like", "[RADIOLOGY]%")   // ← exclude radiology rows
        .order("created_at", { ascending: false });

    if (error) { console.error("[lab] listByPatient:", error); return []; }
    return enrichLabRequests(data ?? []) as unknown as Promise<LabRequest[]>;
}

export async function listPendingLabRequests(): Promise<LabRequest[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .select("*")
        .eq("status", "pending")
        .not("test_type", "like", "[RADIOLOGY]%")
        .order("created_at", { ascending: true });

    if (error) { console.error("[lab] listPending:", error); return []; }
    if (!data || data.length === 0) return [];
    return enrichLabRequests(data) as unknown as Promise<LabRequest[]>;
}

export async function listCompletedLabRequests(): Promise<LabRequest[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_requests")
        .select("*")
        .eq("status", "completed")
        .not("test_type", "like", "[RADIOLOGY]%")
        .order("completed_at", { ascending: false });

    if (error) { console.error("[lab] listCompleted:", error); return []; }
    if (!data || data.length === 0) return [];
    return enrichLabRequests(data) as unknown as Promise<LabRequest[]>;
}

export interface UpdateLabRequestInput {
    status?: string;
    result?: string;
    /**
     * Legacy client fields. The server deliberately ignores both values and
     * stamps the authenticated actor/time itself when a result is first filed.
     */
    completed_by?: string;
    completed_at?: string;
    priority?: string;
    notes?: string;
    price?: number;
}

/**
 * Expected submission failures are returned across the Server Action boundary.
 * Next.js redacts thrown Server Action errors in production, which previously
 * left the laboratory with only the generic "Server Components render" error.
 * The React Query hook turns an `ok: false` result into a client-side Error so
 * the real, safe message reaches the toast.
 */
export type LabRequestUpdateResult =
    | { ok: true; request: LabRequest }
    | { ok: false; message: string; code?: string | null };

type LabSupabase = SupabaseClient<any>;

function labErrorCode(error: unknown): string | null {
    const value = (error as any)?.code;
    return value === null || value === undefined ? null : String(value);
}

function labErrorMessage(error: unknown): string {
    const raw = error instanceof Error
        ? error.message
        : String((error as any)?.message ?? "");

    // Machine-readable record-lock errors are already safe and intentionally
    // consumed by the amendment UI; do not strip their prefix.
    if (/^LOCKED:/i.test(raw)) return raw;

    const code = labErrorCode(error);
    const combined = `${raw} ${(error as any)?.details ?? ""} ${(error as any)?.hint ?? ""}`.toLowerCase();

    if (
        code === "42501" ||
        combined.includes("row-level security") ||
        combined.includes("permission denied")
    ) {
        return (
            "The laboratory result was not saved because the database's lab permissions are out of date. " +
            "Please ask an administrator to apply the pending Supabase migration " +
            "20260923143000_fix_lab_result_submission.sql, then submit again. Your entered result is still on this page."
        );
    }

    if (code === "PGRST116" || combined.includes("0 rows") || combined.includes("no rows")) {
        return (
            "The laboratory result was not saved because the database rejected the update. " +
            "Please ask an administrator to apply 20260923143000_fix_lab_result_submission.sql, " +
            "then submit again. Your entered result is still on this page."
        );
    }

    return formatFriendlyDbError(
        error,
        "The laboratory result could not be saved. Please try again; your entered result is still on this page."
    );
}

function isMissingColumnError(error: unknown, column: string): boolean {
    const code = labErrorCode(error);
    const text = `${(error as any)?.message ?? ""} ${(error as any)?.details ?? ""}`.toLowerCase();
    return (
        code === "PGRST204" ||
        text.includes("schema cache") ||
        text.includes("does not exist")
    ) && text.includes(column.toLowerCase());
}

function isPermissionOrFilteredWrite(error: unknown, data: unknown): boolean {
    const code = labErrorCode(error);
    const text = `${(error as any)?.message ?? ""} ${(error as any)?.details ?? ""}`.toLowerCase();
    return (
        (!error && !data) ||
        code === "42501" ||
        code === "PGRST116" ||
        text.includes("row-level security") ||
        text.includes("permission denied") ||
        text.includes("0 rows") ||
        text.includes("no rows")
    );
}

async function writeLabRequestRow(
    client: LabSupabase,
    id: string,
    payload: Record<string, unknown>
) {
    return client
        .from("lab_requests")
        .update(payload)
        .eq("id", id)
        .select("*")
        .maybeSingle();
}

export async function updateLabRequest(
    id: string,
    updates: UpdateLabRequestInput
): Promise<LabRequestUpdateResult> {
    try {
        const request = await updateLabRequestOrThrow(id, updates);
        return { ok: true, request };
    } catch (error) {
        console.error("[lab] updateRequest failed:", error);
        return {
            ok: false,
            code: labErrorCode(error),
            message: labErrorMessage(error),
        };
    }
}

async function updateLabRequestOrThrow(
    id: string,
    updates: UpdateLabRequestInput
): Promise<LabRequest> {
    if (!id?.trim()) throw new Error("A laboratory request was not selected.");
    if (updates.status === "completed" && updates.result !== undefined && !updates.result.trim()) {
        throw new Error("Enter the laboratory result before submitting.");
    }
    if (
        updates.price !== undefined &&
        (!Number.isFinite(updates.price) || updates.price < 0)
    ) {
        throw new Error("Enter a valid laboratory price (zero or more).");
    }

    const actor = await requireStaff([UserRole.LabTechnician, UserRole.Doctor]);

    // ── 24-hour amendment window ─────────────────────────────────────────────
    // The RESULT (and the scientist's comment) is clinical content: only the
    // scientist who filed it may change it, and only for 24 hours. Status,
    // priority and price are workflow/billing fields and stay editable — that
    // is why the guard inspects which columns actually change.
    const ctx = await assertRecordAmendable("lab_result", id, updates as Record<string, any>, {
        roles: false,
        actor,
        // Radiology shares this table; classify by its test_type prefix so the
        // audit entry and the correction note name the right kind of record.
        resolveType: (row) =>
            String(row?.test_type ?? "").trim().toUpperCase().startsWith("[RADIOLOGY]")
                ? "radiology_report"
                : "lab_result",
    });

    // Build a SPARSE payload. Sending undefined/legacy keys to PostgREST has
    // caused schema-cache failures in older deployments. Authorship is never
    // trusted from the browser: first filing is stamped from the server session.
    const payload: Record<string, unknown> = {};
    for (const key of ["status", "result", "priority", "notes", "price"] as const) {
        if (updates[key] !== undefined) payload[key] = updates[key];
    }
    if (ctx?.firstFiling && updates.result !== undefined) {
        payload.completed_by = actor.userId;
        payload.completed_at = new Date().toISOString();
    }
    Object.assign(payload, ctx?.patch ?? {});

    if (!Object.keys(payload).length) {
        throw new Error("No laboratory result changes were supplied.");
    }

    const supabase = await createClient();
    const admin = createAdminClient();
    let writeClient: LabSupabase = supabase;
    let writePayload = { ...payload };
    let schemaWarning: string | null = null;

    let write = await writeLabRequestRow(writeClient, id, writePayload);

    // Older databases may not yet have lab_requests.price. Filing clinical
    // results must not be blocked by that optional billing metadata: retry
    // without the column, then sync the requested price to the bill below.
    if (write.error && "price" in writePayload && isMissingColumnError(write.error, "price")) {
        const { price: _price, ...withoutPrice } = writePayload;
        void _price;
        writePayload = withoutPrice;
        schemaWarning =
            "Result saved, but the lab request price field is missing from the database. " +
            "Billing was still attempted; ask an administrator to apply the pending Supabase migrations.";
        write = await writeLabRequestRow(writeClient, id, writePayload);
    }

    // A known production failure is role-policy drift: requireStaff authorizes
    // the scientist, but Postgres RLS filters the UPDATE to zero rows. When the
    // service-role key is configured, this is a trusted server-side hand-off:
    // authorization + amendment-window checks have already passed above. Retry
    // only the filtered/permission class — never bypass data constraints.
    if (
        admin &&
        // Never use a privileged write for clinical text unless the app-side
        // amendment guard actually inspected that change. This keeps the
        // service-role fallback from becoming a way around the 24-hour lock.
        (updates.result === undefined || ctx !== null) &&
        (write.error || !write.data) &&
        isPermissionOrFilteredWrite(write.error, write.data)
    ) {
        console.warn(
            `[lab] authenticated update was rejected for request ${id}; ` +
            "retrying with the trusted server client after RBAC/amendment checks."
        );
        writeClient = admin;
        write = await writeLabRequestRow(writeClient, id, writePayload);

        if (write.error && "price" in writePayload && isMissingColumnError(write.error, "price")) {
            const { price: _price, ...withoutPrice } = writePayload;
            void _price;
            writePayload = withoutPrice;
            schemaWarning =
                "Result saved, but the lab request price field is missing from the database. " +
                "Billing was still attempted; ask an administrator to apply the pending Supabase migrations.";
            write = await writeLabRequestRow(writeClient, id, writePayload);
        }
    }

    const { data, error } = write;
    if (error) {
        if (/amendment window/i.test(error.message ?? "")) {
            throw new Error("LOCKED:window_expired This result is past its 24-hour amendment window. Attach a correction note instead.");
        }
        throw error;
    }
    if (!data) {
        const noRowsError = new Error(
            "The database returned 0 rows while saving this laboratory result."
        ) as Error & { code?: string };
        noRowsError.code = "PGRST116";
        throw noRowsError;
    }

    // ── Billing: sync the price onto THIS test's bill ──────────────────────────
    // Clinical work and billing are decoupled: the front desk may settle the
    // lab bill BEFORE results exist, and the lab may file results AFTER the
    // bill is settled. Filing a result must therefore NEVER fail — and never
    // duplicate-bill — just because of the payment state.
    let billingWarning: string | null = schemaWarning;
    if (typeof updates.price === "number" && updates.price > 0 && data.visit_id) {
        try {
            const syncWarning = await syncLabPriceToBill(
                supabase,
                id,
                data.visit_id,
                String(data.test_type ?? ""),
                updates.price,
                actor.userId
            );
            billingWarning = [billingWarning, syncWarning].filter(Boolean).join(" ") || null;
        } catch (payErr) {
            const syncWarning = payErr instanceof Error ? payErr.message : String(payErr);
            billingWarning = [billingWarning, syncWarning].filter(Boolean).join(" ") || null;
            console.error("[lab] error syncing price to bill:", payErr);
        }
    } else if (typeof updates.price === "number" && updates.price > 0 && !data.visit_id) {
        console.warn("[lab] price set but lab request has no visit_id — no bill was created or updated");
    }

    // ── Route patient after test completion ──────────────────────────────────
    // Routing follows REALITY, not the price argument. Use the same trusted
    // client that saved the result so an RLS mismatch cannot save the result
    // but strand the patient in the laboratory queue.
    if (updates.status === "completed" && data.visit_id) {
        let paymentPending = false;
        try {
            paymentPending = await routePatientAfterLabCompletion(
                writeClient,
                id,
                data.visit_id,
                typeof updates.price === "number" && updates.price > 0
            );
        } catch (routeErr) {
            console.error("[lab] patient routing after completion failed:", routeErr);
        }

        // Notifications are secondary. A notification-table mismatch must
        // never turn a successfully filed clinical result into a failed submit.
        try {
            await createNotification({
                recipient_id: data.requested_by ?? undefined,
                role: data.requested_by ? undefined : "Doctor",
                title: "Lab Result Ready",
                message: `Results for ${data.test_type} are now available.${paymentPending ? " A payment is pending — please settle at the front desk." : ""}`,
                type: "success"
            });
        } catch (notifyError) {
            console.error("[lab] result notification failed after save:", notifyError);
        }
    }

    // The result is saved; a billing/schema hiccup rides along as a warning so
    // it can never masquerade as a failed clinical submission.
    if (billingWarning) {
        return { ...(data as any), billing_warning: billingWarning } as unknown as LabRequest;
    }
    return data as unknown as LabRequest;
}

// ─── Lab ↔ billing helpers ────────────────────────────────────────────────────
// The lab and the front desk work independently: payment may be settled before
// results exist, and results may be filed after payment is settled. These
// helpers keep that true.

function labBillAmountKobo(bill: any): number {
    if (typeof bill?.amount_kobo === "number") return bill.amount_kobo;
    if (typeof bill?.amount === "number") return Math.round(bill.amount * 100);
    return 0;
}

function labBillPaidKobo(bill: any): number {
    return typeof bill?.amount_paid_kobo === "number" ? bill.amount_paid_kobo : 0;
}

function labBillStatus(bill: any): string {
    return String(bill?.status ?? "").toLowerCase();
}

/** All lab bills for a patient (any status — settled bills matter here). */
async function listPatientLabBills(client: LabSupabase, patientId: string): Promise<any[]> {
    const withLink = await client
        .from("payments")
        .select("id, amount, amount_kobo, amount_paid_kobo, status, description, lab_request_id, created_at")
        .eq("patient_id", patientId)
        .eq("category", "lab")
        .order("created_at", { ascending: false })
        .limit(50);
    if (!withLink.error) return withLink.data ?? [];

    // Older schema without the lab_request_id column — retry without it and
    // fall back to description matching.
    if (/lab_request_id|does not exist/i.test(withLink.error.message ?? "")) {
        const legacy = await client
            .from("payments")
            .select("id, amount, amount_kobo, amount_paid_kobo, status, description, created_at")
            .eq("patient_id", patientId)
            .eq("category", "lab")
            .order("created_at", { ascending: false })
            .limit(50);
        if (!legacy.error) return legacy.data ?? [];
        console.error("[lab] lab bill lookup failed:", legacy.error);
        return [];
    }

    console.error("[lab] lab bill lookup failed:", withLink.error);
    return [];
}

/**
 * Outstanding (unpaid) balance across ALL of a patient's bills, in kobo.
 * Deposit rows are credit, not debt, so they are excluded. Returns `null`
 * when the lookup itself fails so callers can fall back explicitly.
 */
async function patientOutstandingKobo(
    client: LabSupabase,
    patientId: string
): Promise<number | null> {
    const { data, error } = await client
        .from("payments")
        .select("amount, amount_kobo, amount_paid_kobo, status, category, payment_type")
        .eq("patient_id", patientId)
        .in("status", ["pending", "partial"])
        .limit(200);

    if (error) {
        console.error("[lab] outstanding-balance lookup failed:", error);
        return null;
    }

    let outstanding = 0;
    for (const row of data ?? []) {
        const category = String((row as any)?.category ?? "").toLowerCase();
        const type = String((row as any)?.payment_type ?? "").toLowerCase();
        if (category === "deposit" || type === "deposit" || type === "advance") continue;
        const total = labBillAmountKobo(row);
        const paid = labBillPaidKobo(row);
        outstanding += Math.max(0, total - paid);
    }
    return outstanding;
}

/**
 * Write a lab price onto the bill that belongs to THIS lab request.
 * Settlement-aware: settled bills are never re-billed in full. Returns a
 * warning message when the price could not be reflected (caller surfaces it
 * without failing the result), otherwise null.
 */
async function syncLabPriceToBill(
    supabase: LabSupabase,
    labRequestId: string,
    patientId: string,
    testType: string,
    price: number,
    completedBy?: string
): Promise<string | null> {
    const desc = `Lab Test: ${testType}`;
    const priceKobo = Math.round(price * 100);
    const bills = await listPatientLabBills(supabase, patientId);

    // Match priority: exact request link → exact description → fuzzy
    // description. (Orders for tests outside the catalogue are auto-billed at
    // ₦0, so a zero-amount open bill is the orphan this order created.)
    const testTypeLower = testType.trim().toLowerCase();
    const linked = bills.find((p) => p.lab_request_id && String(p.lab_request_id) === String(labRequestId));
    const exact = bills.find((p) => String(p.description ?? "").trim().toLowerCase() === desc.trim().toLowerCase());
    const fuzzy = testTypeLower
        ? bills.find((p) => String(p.description ?? "").toLowerCase().includes(testTypeLower))
        : undefined;
    const match = linked ?? exact ?? fuzzy;

    // ── Case 1: this test's bill is still open → update its amount ──
    const openStatuses = new Set(["pending", "partial"]);
    const openTarget =
        (match && openStatuses.has(labBillStatus(match)) ? match : null) ??
        bills.find((p) => openStatuses.has(labBillStatus(p)) && labBillAmountKobo(p) <= 0) ??
        null;

    if (openTarget) {
        // Never drop the bill below what the front desk already collected.
        const paidKobo = labBillPaidKobo(openTarget);
        const effectiveKobo = Math.max(priceKobo, paidKobo);

        // RLS: the `payments` table only allows FrontDesk/Admin to update
        // rows, and this runs as the lab tech — so writing with the caller's
        // session would silently match zero rows and the bill would stay at
        // ₦0 forever. The sync is a trusted server-side hand-off (the lab
        // tech already passed requireStaff above), so prefer the service-role
        // client when configured and verify the write changed a row.
        const pricePayload: Record<string, any> = {
            amount: effectiveKobo / 100,
            amount_kobo: effectiveKobo,
            updated_at: new Date().toISOString(),
        };

        const writeClient = createAdminClient() ?? supabase;
        const first = await writeClient
            .from("payments")
            .update(pricePayload, { count: "exact" })
            .eq("id", openTarget.id);

        let applied = !first.error && ((first.count as number | null) ?? 0) > 0;

        if (!applied) {
            // Schema-tolerant retry: `updated_at` may be missing on older tables.
            const { updated_at: _omit, ...retryPayload } = pricePayload;
            void _omit;
            const retry = await writeClient
                .from("payments")
                .update(retryPayload, { count: "exact" })
                .eq("id", openTarget.id);
            applied = !retry.error && ((retry.count as number | null) ?? 0) > 0;

            if (!applied) {
                console.error(
                    "[lab] failed to update lab bill price:",
                    retry.error ?? first.error ?? "0 rows changed",
                    { billId: openTarget.id, labRequestId }
                );
                return (
                    "Result saved, but the price could not be written to the bill " +
                    "(the database rejected the write). Ask the front desk to correct " +
                    "the bill price, or configure SUPABASE_SERVICE_ROLE_KEY and set " +
                    "the price again."
                );
            }
        }
        return null;
    }

    // ── Case 2: this test's bill is already settled ──
    // The front desk settled before results existed — the normal, supported
    // flow. Never create a duplicate full-price bill.
    if (match && !openStatuses.has(labBillStatus(match))) {
        const status = labBillStatus(match);
        if (status !== "paid") {
            // Waived / refunded / failed: the money question is already
            // decided — leave it alone.
            console.info(
                `[lab] price set on ${status} lab bill ${match.id} — no new bill raised.`
            );
            return null;
        }
        const settledKobo = labBillAmountKobo(match);
        if (settledKobo >= priceKobo) {
            // Already paid in full (or over the new price) — nothing to bill.
            console.info(
                `[lab] lab bill ${match.id} already settled at/above the new price — no new bill raised.`
            );
            return null;
        }
        // Settled for less than the new price (e.g. a ₦0 catalogue-miss bill
        // settled early): bill ONLY the difference.
        const balanceKobo = priceKobo - settledKobo;
        await createPayment({
            patient_id: patientId,
            amount: balanceKobo / 100,
            description: `${desc} (balance)`,
            category: "lab",
            status: "pending",
            processed_by: completedBy || undefined,
            notes:
                `Balance on settled lab bill: priced ₦${(priceKobo / 100).toLocaleString("en-NG")} ` +
                `after ₦${(settledKobo / 100).toLocaleString("en-NG")} was already settled.`,
            lab_request_id: labRequestId,
        });
        console.info(
            `[lab] raised balance bill of ${balanceKobo} kobo for settled lab bill ${match.id}.`
        );
        return null;
    }

    // ── Case 3: no bill for this test at all (legacy rows) → create one ──
    await createPayment({
        patient_id: patientId,
        amount: price,
        description: desc,
        category: "lab",
        status: "pending",
        processed_by: completedBy || undefined,
        lab_request_id: labRequestId,
    });
    return null;
}

/**
 * Route the patient after a lab test completes. Returns whether a payment is
 * genuinely pending (drives the notification text).
 *
 * Rules:
 *  - Only the lab flow's own patients are routed: anyone the lab doesn't own
 *    (admitted, discharged, or sitting in another department's queue) keeps
 *    their status — the bill is still visible in the checkout queue.
 *  - Other pending lab tests → stay `sent-to-lab`.
 *  - Otherwise the REAL outstanding balance decides: > ₦0 → `awaiting-payment`,
 *    else back to the doctor via `under-observation`.
 */
async function routePatientAfterLabCompletion(
    supabase: LabSupabase,
    labRequestId: string,
    patientId: string,
    priceSetThisCall: boolean
): Promise<boolean> {
    const { data: currentPatient } = await supabase
        .from("patients")
        .select("status")
        .eq("id", patientId)
        .maybeSingle();

    const currentStatus = String(currentPatient?.status ?? "").toLowerCase();
    if (currentStatus !== "sent-to-lab") {
        // Another department (or discharge) owns this patient — don't clobber it.
        const outstanding = await patientOutstandingKobo(supabase, patientId);
        return (outstanding ?? (priceSetThisCall ? 1 : 0)) > 0;
    }

    // More lab work still pending → stay in the lab queue.
    const { data: otherPending } = await supabase
        .from("lab_requests")
        .select("id")
        .eq("visit_id", patientId)
        .eq("status", "pending")
        .neq("id", labRequestId)
        .not("test_type", "like", "[RADIOLOGY]%")
        .limit(1);
    if (otherPending && otherPending.length > 0) {
        return ((await patientOutstandingKobo(supabase, patientId)) ?? 0) > 0;
    }

    const outstanding = await patientOutstandingKobo(supabase, patientId);
    // If the balance lookup itself failed, fall back to the price heuristic
    // rather than guessing the patient needs no billing.
    const paymentPending =
        outstanding === null ? priceSetThisCall : outstanding > 0;

    await supabase
        .from("patients")
        .update({ status: paymentPending ? "awaiting-payment" : "under-observation" })
        .eq("id", patientId);

    return paymentPending;
}

// ─── Lab Test Catalog ─────────────────────────────────────────────────────────

export interface LabTestCatalogItem {
    id?: string;
    test_name: string;
    test_code?: string;
    category: string;
    description?: string;
    /** Coding standards: ICD-10 indication, LOINC, SNOMED. */
    icd10_code?: string;
    loinc_code?: string;
    snomed_code?: string;
    price: number;
    sample_type?: string;
    turnaround_time?: string;
    normal_range?: string;
    instructions?: string;
    is_active?: boolean;
}

export async function listActiveLabTests(): Promise<LabTestCatalogItem[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_test_catalog")
        .select("id, test_name, test_code, category, sample_type, turnaround_time, price, instructions")
        .eq("is_active", true)
        .order("category")
        .order("test_name");

    if (error) { console.error("[lab] listActiveTests:", error); return []; }
    // One row per test name so duplicate catalog rows never reach the UI.
    return dedupeLabTests(data as LabTestCatalogItem[]);
}

export async function listAllLabTests(): Promise<LabTestCatalogItem[]> {
    await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("lab_test_catalog")
        .select("*")
        .order("category")
        .order("test_name");

    if (error) { console.error("[lab] listAllTests:", error); return []; }
    return dedupeLabTests(data as LabTestCatalogItem[]);
}

export async function upsertLabTest(
    test: Partial<LabTestCatalogItem>,
    id?: string
): Promise<LabTestCatalogItem> {
    await requireStaff([UserRole.LabTechnician]);
    const supabase = await createClient();
    const { data, error } = id
        ? await supabase.from("lab_test_catalog").update(test).eq("id", id).select().single()
        : await supabase.from("lab_test_catalog").insert([test]).select().single();

    if (error) { console.error("[lab] upsertTest:", error); throw error; }
    return data as LabTestCatalogItem;
}

export async function deleteLabTest(id: string): Promise<void> {
    await requireStaff([UserRole.LabTechnician]);
    const supabase = await createClient();
    const { error } = await supabase.from("lab_test_catalog").delete().eq("id", id);
    if (error) { console.error("[lab] deleteTest:", error); throw error; }
}

export async function toggleLabTestActive(
    id: string,
    current: boolean
): Promise<void> {
    await requireStaff([UserRole.LabTechnician]);
    const supabase = await createClient();
    const { error } = await supabase
        .from("lab_test_catalog")
        .update({ is_active: !current })
        .eq("id", id);

    if (error) { console.error("[lab] toggleActive:", error); throw error; }
}

// ─── Duplicate cleanup ───────────────────────────────────────────────────────

export interface MergeDuplicateLabTestsResult {
    /** Number of duplicate groups that were merged into a single test. */
    merged: number;
    /** Number of duplicate rows deleted. */
    removed: number;
    /** Number of tests that were already unique (untouched). */
    kept: number;
}

/**
 * One-click cleanup for duplicate lab tests. Groups rows by normalized test
 * name, keeps the best row (active → priced → has code → lowest id), merges the
 * core fields of the duplicates into it, then deletes the rest.
 *
 * Deletes/updates are performed with the service-role client when configured so
 * the cleanup also works when triggered by an Admin (whose RLS role is not
 * "LabTechnician" and would otherwise be filtered out by the delete policy).
 */
export async function mergeDuplicateLabTests(): Promise<MergeDuplicateLabTestsResult> {
    await requireStaff([UserRole.LabTechnician]);
    const supabase = await createClient();

    const { data: tests, error } = await supabase
        .from("lab_test_catalog")
        .select("id, test_name, test_code, category, price, is_active");

    if (error) { console.error("[lab] mergeDuplicates read:", error); throw error; }
    if (!tests || tests.length === 0) {
        return { merged: 0, removed: 0, kept: 0 };
    }

    // Group by normalized test name.
    const groups = new Map<string, typeof tests>();
    for (const t of tests) {
        const key = normalizeLabTestName(t.test_name);
        const group = groups.get(key) ?? [];
        group.push(t);
        groups.set(key, group);
    }

    const writeClient = createAdminClient() ?? supabase;

    const textFields = ["test_code", "category"] as const;
    let merged = 0;
    let removed = 0;
    let kept = 0;

    for (const rows of groups.values()) {
        if (rows.length < 2) { kept++; continue; }

        // Deterministic keeper, matching the SQL migration's ordering.
        const sorted = [...rows].sort((a, b) => {
            const score = (t: any): [number, number, number] => [
                t.is_active ? 0 : 1,
                typeof t.price === "number" && t.price > 0 ? 0 : 1,
                (t.test_code ?? "").trim() ? 0 : 1,
            ];
            const sa = score(a);
            const sb = score(b);
            for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sa[i] - sb[i];
            return String(a.id).localeCompare(String(b.id));
        });

        const keeper = sorted[0];
        const dups = sorted.slice(1);

        // Merge the best available values from the duplicates into the keeper.
        const patch: Record<string, unknown> = {};
        for (const f of textFields) {
            const current = (keeper[f] ?? "").toString().trim();
            if (!current) {
                const better = dups.find((d) => (d[f] ?? "").toString().trim());
                if (better) patch[f] = better[f];
            }
        }
        if (!(typeof keeper.price === "number" && keeper.price > 0)) {
            const priced = dups.find((d) => typeof d.price === "number" && d.price > 0);
            if (priced) patch.price = priced.price;
        }
        if (!keeper.is_active && dups.some((d) => d.is_active)) patch.is_active = true;

        if (Object.keys(patch).length > 0) {
            const { error: updErr } = await writeClient
                .from("lab_test_catalog")
                .update(patch)
                .eq("id", keeper.id);
            if (updErr) { console.error("[lab] mergeDuplicates update:", updErr); throw updErr; }
        }

        const dupIds = dups.map((d) => d.id);
        const { error: delErr, count } = await writeClient
            .from("lab_test_catalog")
            .delete({ count: "exact" })
            .in("id", dupIds);

        if (delErr) { console.error("[lab] mergeDuplicates delete:", delErr); throw delErr; }

        // If the write ran with the caller's session and RLS filtered it out,
        // surface that instead of silently reporting success.
        if (writeClient === supabase && (count ?? 0) < dupIds.length) {
            throw new Error(
                "Duplicates found but the database rejected the cleanup. " +
                "Run supabase/migrations/20260831_dedupe_lab_test_catalog.sql " +
                "or configure SUPABASE_SERVICE_ROLE_KEY, then try again."
            );
        }

        merged++;
        removed += dupIds.length;
    }

    return { merged, removed, kept };
}
