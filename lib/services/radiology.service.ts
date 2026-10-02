"use server";

// ══════════════════════════════════════════════════════════════════════════════
// lib/services/radiology.service.ts
//
// All DB operations for radiology investigations.
//
// Radiology RIDES ON `lab_requests`: a radiology order is a lab request whose
// `test_type` carries the "[RADIOLOGY]" prefix, and the two departments filter
// on that prefix. Keep the prefix — the lab queue, the radiology queue and the
// amendment registry all depend on it.
//
// THE ORDER → BILL → PACKAGE RULE (2026-10-01)
//   1. The scan is resolved against `radiology_scan_catalog` (fallback: the
//      in-code catalog in lib/utils/radiology-catalog.ts). Unknown services are
//      REFUSED rather than inserted with a guessed price — an unpriced request
//      is a scan nobody bills.
//   2. If the patient holds an active care package that includes the scan (the
//      antenatal package), the order is marked `billing_status = 'covered'`,
//      the allowance is drawn down in `package_usage`, and NO `payments` row is
//      written — so it never reaches the front desk's bill or the outstanding
//      total.
//   3. Otherwise a pending `payments` row is raised for the scan's price
//      (category "radiology", linked back through `lab_request_id`), which is
//      what makes it appear in the patient's Billing tab and the checkout queue.
//   4. The patient is routed to `sent-to-radiology` and the radiology unit is
//      notified, so the order shows up in the radiologist's queue.
//
// Requires the FK lab_requests_visit_id_fkey for the patients join; PostgREST
// uses the FK name as the hint.
// ══════════════════════════════════════════════════════════════════════════════

import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";
import { assertRecordAmendable } from "./record-lock";
import { createPayment } from "./payment.service";
import { createNotification } from "./notification.service";
import { formatFriendlyDbError } from "@/lib/utils/friendly-errors";
import {
    getPackageCoverage,
    linkPackageUsage,
    releasePackageUsage,
    reservePackageUsage,
} from "./care-packages.service";
import {
    RADIOLOGY_SCAN_CATALOG,
    findScan,
    mergeScanCatalog,
    type RadiologyScan,
    type RadiologyScanRow,
} from "@/lib/utils/radiology-catalog";

const PREFIX = "[RADIOLOGY]";

// PostgREST join syntax: table!fk_constraint_name(columns)
// The FK name comes from the migration: lab_requests_visit_id_fkey
const SELECT = `
    *,
    patients!lab_requests_visit_id_fkey(
        id, name, phone, gender, birth_date,
        allergies, significant_medication_history, hospital_number
    )
`.trim();

// Shape of a radiology row (a `[RADIOLOGY]`-prefixed lab_request).
export interface RadiologyRequest {
    id: string;
    visit_id: string;
    test_type?: string;
    priority?: string | null;
    notes?: string | null;
    result?: string | null;
    status: string;
    requested_by?: string;
    completed_by?: string;
    completed_at?: string;
    created_at?: string;
    /** Price in NGN (lab_requests.price). */
    price?: number | null;
    /** 'billed' | 'covered' | 'not_billable' — how the order was settled. */
    billing_status?: string | null;
    package_enrolment_id?: string | null;
    patients?: unknown;
    /** Display names, attached by the list queries. */
    requested_by_name?: string | null;
    completed_by_name?: string | null;
    /** Not a column — how this order was settled, for the UI. */
    billing?: RadiologyBilling;
}

// ─── Scan catalog ─────────────────────────────────────────────────────────────

/**
 * The scans the unit performs, with their prices.
 *
 * Database first (`radiology_scan_catalog` is the price of record, so Admin can
 * reprice without a deploy), merged over the in-code catalog so an unmigrated
 * database still offers the two real services instead of an empty picker.
 */
export async function listRadiologyScans(): Promise<RadiologyScan[]> {
    await requireStaff();
    const sb = await createClient();

    try {
        const { data, error } = await sb
            .from("radiology_scan_catalog")
            .select("*")
            .eq("is_active", true)
            .order("sort_order", { ascending: true });

        if (error) {
            console.warn("[radiology] scan catalog read failed, using in-code catalog:", error.message);
            return RADIOLOGY_SCAN_CATALOG;
        }
        const merged = mergeScanCatalog((data ?? []) as RadiologyScanRow[]);
        return merged.length ? merged : RADIOLOGY_SCAN_CATALOG;
    } catch (err) {
        console.warn("[radiology] scan catalog exception, using in-code catalog:", err);
        return RADIOLOGY_SCAN_CATALOG;
    }
}

/**
 * Resolve free text (code, name, alias, or a prefixed test_type) to a catalog
 * scan plus the price to bill. Returns null for an unknown service — callers
 * must refuse it rather than guess a price.
 */
async function resolveScan(
    input: string,
    catalog?: RadiologyScan[]
): Promise<{ scan: RadiologyScan; price: number } | null> {
    const scans = catalog ?? (await listRadiologyScans());
    const scan = findScan(input, scans);
    if (!scan) return null;
    return { scan, price: scan.price };
}

/** The names the unit performs, for error messages. */
function catalogNames(scans: RadiologyScan[]): string {
    return scans.map((s) => s.name).join(", ");
}

// ─── Billing summary ──────────────────────────────────────────────────────────

export interface RadiologyBilling {
    /** 'billed' — a pending bill exists; 'covered' — a package paid for it. */
    status: "billed" | "covered" | "not_billable";
    /** Value of the scan in NGN (what was billed, or what the package covered). */
    amountNaira: number;
    /** The `payments` row, when billed. */
    paymentId?: string;
    /** The package that paid for it, when covered. */
    packageName?: string;
    packageEnrolmentId?: string;
    /** Included scans left after this one; null = unlimited. */
    remainingScans?: number | null;
    /** One-line explanation for toasts and cards. */
    message: string;
}

function billingFromRow(row: RadiologyRequest): RadiologyBilling {
    const amount = typeof row?.price === "number" ? row.price : 0;
    if (row?.billing_status === "covered") {
        return {
            status: "covered",
            amountNaira: amount,
            packageEnrolmentId: row.package_enrolment_id ?? undefined,
            message: "Covered by a prepaid care package — no bill was raised.",
        };
    }
    return {
        status: "billed",
        amountNaira: amount,
        message: amount > 0 ? `Billed ₦${amount.toLocaleString("en-NG")} to the front desk.` : "Bill raised — awaiting a price from the front desk.",
    };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** Attach requester/reporter names so dashboards show people, not ids. */
async function enrich(rows: RadiologyRequest[]): Promise<RadiologyRequest[]> {
    if (!rows.length) return rows;
    const sb = await createClient();
    const staffIds = [...new Set(rows.flatMap((r) => [r.requested_by, r.completed_by]).filter(Boolean))];
    if (!staffIds.length) return rows.map((r) => ({ ...r, billing: billingFromRow(r) }));

    const { data: staff } = await sb.from("staffs").select("id, name, role").in("id", staffIds as string[]);
    const map = Object.fromEntries((staff ?? []).map((s: any) => [s.id, s]));

    return rows.map((r) => ({
        ...r,
        requested_by_name: map[r.requested_by ?? ""]?.name ?? null,
        completed_by_name: map[r.completed_by ?? ""]?.name ?? null,
        billing: billingFromRow(r),
    }));
}

export async function listPendingRadiologyRequests() {
    await requireStaff();
    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .select(SELECT)
        .like("test_type", `${PREFIX}%`)
        .eq("status", "pending")
        .order("created_at", { ascending: true });
    if (error) throw error;
    return enrich((data as unknown as RadiologyRequest[]) ?? []);
}

export async function listCompletedRadiologyRequests() {
    await requireStaff();
    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .select(SELECT)
        .like("test_type", `${PREFIX}%`)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
    if (error) throw error;
    return enrich((data as unknown as RadiologyRequest[]) ?? []);
}

export async function listRadiologyRequestsByPatient(patientId: string) {
    await requireStaff();
    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .select(SELECT)
        .like("test_type", `${PREFIX}%`)
        .eq("visit_id", patientId)
        .order("created_at", { ascending: false });
    if (error) throw error;
    return enrich((data as unknown as RadiologyRequest[]) ?? []);
}

export async function getRadiologyRequestById(id: string) {
    await requireStaff();
    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .select(SELECT)
        .eq("id", id)
        .single();
    if (error) throw error;
    const [row] = await enrich([data as unknown as RadiologyRequest]);
    return row;
}

/**
 * Coverage preview for the order form: "this scan is covered by the antenatal
 * package, no bill will be raised" — decided BEFORE the request exists.
 * `createRadiologyRequest` re-checks, so this is a preview, never the authority.
 */
export async function getRadiologyCoverage(patientId: string, scanName: string) {
    await requireStaff();
    const resolved = await resolveScan(scanName);
    return getPackageCoverage({
        patientId,
        itemKind: "radiology_scan",
        itemName: resolved?.scan.name ?? scanName,
        valueNaira: resolved?.price ?? 0,
    });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface CreateRadiologyRequestInput {
    patientId: string;
    requestedBy?: string;
    /** Scan code, name or alias — resolved against the catalog. */
    testType: string;
    priority?: "routine" | "urgent" | "stat";
    notes?: string;
    /** Override the catalog price (NGN). Ignored when the scan is covered. */
    price?: number;
    /**
     * Bill the scan even though a package could cover it. Off by default:
     * charging a patient for something their prepaid package includes is the
     * exact double-billing this module exists to prevent.
     */
    billAnyway?: boolean;
}

/** Roles allowed to order a scan: the clinicians who request imaging. */
const ORDER_ROLES = [UserRole.Doctor, UserRole.FrontDesk, UserRole.Radiologist];

/**
 * Insert the order, degrading gracefully on a database that has not received
 * the 20261001 migration. PostgREST rejects the WHOLE insert when a payload key
 * has no matching column (PGRST204), so the new columns are offered first and
 * dropped on retry — an unmigrated deployment still creates the request.
 */
async function insertRadiologyRequest(sb: any, payload: Record<string, any>) {
    const { billing_status, package_enrolment_id, price, ...base } = payload;

    const candidates: Record<string, any>[] = [
        { ...base, price, billing_status, package_enrolment_id },
        { ...base, price, billing_status },
        { ...base, price },
        base,
    ];

    let lastError: any = null;
    for (const candidate of candidates) {
        const { data, error } = await sb
            .from("lab_requests")
            .insert([candidate])
            .select(SELECT)
            .single();
        if (!error) {
            const dropped = Object.keys(payload).filter((k) => !(k in candidate));
            return { data, dropped };
        }
        lastError = error;
        // Only retry when the complaint is an unknown column; anything else
        // (RLS, FK, validation) must surface as-is.
        if (error.code !== "PGRST204" && !/column|schema cache/i.test(error.message ?? "")) break;
        const stillPresent = Object.keys(payload).filter((k) => !(k in candidate));
        console.warn(
            `[radiology] lab_requests insert rejected (${error.code ?? "?"}: ${error.message}). ` +
            (stillPresent.length
                ? `Retrying without: ${stillPresent.join(", ")}.`
                : "Retrying with the minimal payload.")
        );
    }
    throw lastError;
}

export async function createRadiologyRequest(input: CreateRadiologyRequestInput): Promise<RadiologyRequest> {
    const actor = await requireStaff(ORDER_ROLES);

    if (!input.patientId) throw new Error("A patient is required to request a scan.");

    // 1. Resolve the service. An unknown scan is refused, not guessed: a request
    //    nobody can price is a scan nobody bills.
    const scans = await listRadiologyScans();
    const resolved = findScan(input.testType, scans);
    if (!resolved) {
        throw new Error(
            `"${input.testType}" is not a scan this unit performs. Available: ${catalogNames(scans)}. ` +
            `Ask an administrator to add it to the radiology catalog with its price.`
        );
    }

    const price =
        typeof input.price === "number" && input.price >= 0 ? input.price : resolved.price;
    const sb = await createClient();

    // 2. Coverage. Decided here (not in the UI) so the money rule cannot be
    //    bypassed by a crafted client call.
    const coverage = input.billAnyway
        ? null
        : await getPackageCoverage({
              patientId: input.patientId,
              itemKind: "radiology_scan",
              itemName: resolved.name,
              valueNaira: price,
          });

    const covered = !!coverage?.covered;

    // 3. Reserve the allowance BEFORE the order row exists, so two simultaneous
    //    requests cannot both see the same last scan and both cover themselves.
    const reservation = covered
        ? await reservePackageUsage({
              coverage: coverage!,
              patientId: input.patientId,
              notes: `${resolved.name} — covered by ${coverage!.packageName ?? "care package"}`,
          })
        : null;

    // 4. Create the order.
    let data: any;
    try {
        const inserted = await insertRadiologyRequest(sb, {
            visit_id: input.patientId,
            requested_by: input.requestedBy || actor.userId,
            test_type: `${PREFIX} ${resolved.name}`,
            priority: input.priority ?? "routine",
            notes: input.notes?.trim() || null,
            status: "pending",
            price,
            billing_status: covered ? "covered" : "billed",
            package_enrolment_id: covered ? coverage!.enrolmentId ?? null : null,
        });
        data = inserted.data;
        if (inserted.dropped.length) {
            console.warn("[radiology] order created without columns:", inserted.dropped.join(", "));
        }
    } catch (error: any) {
        if (reservation?.id) await releasePackageUsage(reservation.id);
        console.error("[radiology] createRequest:", error);
        throw new Error(formatFriendlyDbError(error, "Failed to create the radiology request."));
    }

    if (reservation?.id) await linkPackageUsage(reservation.id, data.id);

    // 5. Bill it — unless a package already paid for it.
    let billing: RadiologyBilling;
    if (covered) {
        billing = {
            status: "covered",
            amountNaira: price,
            packageName: coverage!.packageName,
            packageEnrolmentId: coverage!.enrolmentId,
            remainingScans: coverage!.remainingQuantity ?? null,
            message:
                `Covered by ${coverage!.packageName ?? "the care package"} — no bill raised.` +
                (coverage!.remainingQuantity === null
                    ? ""
                    : ` ${coverage!.remainingQuantity} included scan(s) left.`),
        };
        await logAction("RADIOLOGY_COVERED_BY_PACKAGE", "lab_requests", data.id, {
            patient_id: input.patientId,
            scan: resolved.name,
            value_kobo: Math.round(price * 100),
            package_enrolment_id: coverage!.enrolmentId ?? null,
            package_name: coverage!.packageName ?? null,
        });
    } else {
        // A ₦0 bill is still raised on purpose: an unpriced scan needs a bill
        // for the front desk to correct, exactly like the lab's ₦0 test bills.
        try {
            const payment = await createPayment({
                patient_id: input.patientId,
                amount: price,
                description: `Radiology: ${resolved.name}`,
                category: "radiology",
                status: "pending",
                processed_by: actor.userId,
                notes: input.notes?.trim() ? `Clinical indication: ${input.notes.trim()}` : undefined,
                lab_request_id: data.id,
            });
            billing = {
                status: "billed",
                amountNaira: price,
                paymentId: payment?.id,
                message: price > 0
                    ? `Billed ₦${price.toLocaleString("en-NG")} — it is now in the patient's billing.`
                    : "Bill raised at ₦0 — the front desk needs to set the price.",
            };
        } catch (payErr: any) {
            // The order stands even if billing failed; the desk can add the bill
            // manually, and the audit trail shows the request was made.
            console.error("[radiology] auto-bill failed:", payErr);
            billing = {
                status: "billed",
                amountNaira: price,
                message: "The scan was requested, but the bill could not be raised automatically — add it in Billing.",
            };
        }
    }

    // 6. Route the patient to the radiology queue. Admitted and discharged
    //    patients keep their status — the request still lands in the queue.
    try {
        const { data: patient } = await sb
            .from("patients")
            .select("status")
            .eq("id", input.patientId)
            .maybeSingle();

        const KEEP = new Set(["admitted", "discharged", "awaiting-front-desk", "awaiting-payment"]);
        if (patient && !KEEP.has(String(patient.status).toLowerCase())) {
            await sb.from("patients").update({ status: "sent-to-radiology" }).eq("id", input.patientId);
        }
    } catch (err) {
        console.error("[radiology] patient status update error:", err);
    }

    // 7. Tell the unit.
    await createNotification({
        role: "Radiologist",
        title: "New Radiology Request",
        message:
            `${resolved.name} requested${input.priority === "stat" ? " (STAT)" : input.priority === "urgent" ? " (urgent)" : ""}.` +
            (covered ? ` Covered by ${coverage!.packageName ?? "a care package"}.` : ` ₦${price.toLocaleString("en-NG")} billed.`),
        type: input.priority === "stat" ? "alert" : "info",
        link: "/radiology",
    });

    await logAction("RADIOLOGY_REQUESTED", "lab_requests", data.id, {
        patient_id: input.patientId,
        scan: resolved.name,
        scan_code: resolved.code,
        price,
        billing_status: covered ? "covered" : "billed",
        priority: input.priority ?? "routine",
        requested_by: actor.userId,
    });

    const [row] = await enrich([data as RadiologyRequest]);
    return { ...row, billing };
}

/**
 * Safe Server Action boundary for the browser. Next.js redacts a THROWN Server
 * Action error in production ("An error occurred in the Server Components
 * render…"), so expected failures are returned as data and the client mutation
 * turns them into a local Error — the same contract as `createLabRequest`.
 */
export type CreateRadiologyRequestResult =
    | { ok: true; request: RadiologyRequest; billing: RadiologyBilling }
    | { ok: false; message: string };

export async function createRadiologyRequestWithResult(
    input: CreateRadiologyRequestInput
): Promise<CreateRadiologyRequestResult> {
    try {
        const request = await createRadiologyRequest(input);
        return { ok: true, request, billing: request.billing ?? billingFromRow(request) };
    } catch (error) {
        const message = error instanceof Error ? error.message : "";
        // The "not a scan we perform" refusal is actionable — pass it through.
        if (message.includes("is not a scan this unit performs") || message.startsWith("FORBIDDEN:") || message.startsWith("UNAUTHORIZED:")) {
            return { ok: false, message };
        }
        console.error("[radiology] create request failed:", error);
        return {
            ok: false,
            message: message || "Unable to send the radiology request. Please try again.",
        };
    }
}

// ─── Reporting ────────────────────────────────────────────────────────────────

export interface SubmitRadiologyReportInput {
    status: "completed";
    /** Free-text observations (the reporting template is a single text field). */
    result: string;
    completed_by: string;
    completed_at: string;
}

/**
 * File the observations for a scan.
 *
 * Radiologist, Doctor and Front Desk may all file: in practice the scan is
 * often performed and written up by whoever is at the machine, and the desk
 * transcribes reports that arrive on paper. Whoever files it OWNS it — the
 * 24-hour amendment window then limits edits to that person
 * (lib/records/registry.ts, radiology_report).
 */
export async function submitRadiologyReport(
    id: string,
    report: SubmitRadiologyReportInput
) {
    const actor = await requireStaff([UserRole.Radiologist, UserRole.Doctor, UserRole.FrontDesk]);

    if (!report.result?.trim()) {
        throw new Error("Enter the observations before filing the report.");
    }

    // Filing a report for the first time is never blocked; OVERWRITING one is
    // an amendment and must happen within 24 hours, by the person who filed it.
    // After that the report is frozen and corrections go in as an append-only
    // note (see lib/records/amendment-policy.ts).
    const ctx = await assertRecordAmendable("radiology_report", id, report as Record<string, any>, {
        roles: false,
        actor,
    });

    const sb = await createClient();
    const { data, error } = await sb
        .from("lab_requests")
        .update({ ...report, ...(ctx?.patch ?? {}) })
        .eq("id", id)
        .select(SELECT)
        .single();
    if (error) {
        if (/amendment window/i.test(error.message)) {
            throw new Error("LOCKED:window_expired This report is past its 24-hour amendment window. Attach a correction note instead.");
        }
        console.error("[radiology] submitReport:", error);
        throw error;
    }

    const [result] = await enrich([data as unknown as RadiologyRequest]);

    // A pre-consultation scan returns to the doctor queue. If the clinician is
    // already consulting or the encounter has been handed to Front Desk, filing
    // the report must not pull the patient backward in the workflow.
    if (report.status === "completed" && result.visit_id) {
        const { data: patient, error: patientError } = await sb
            .from("patients")
            .select("status")
            .eq("id", result.visit_id)
            .maybeSingle();
        if (patientError) {
            console.error("[radiology] patient status read after report:", patientError);
        } else {
            const currentStatus = String(patient?.status ?? "").toLowerCase();
            if (currentStatus === "sent-to-radiology") {
                const { error: routeError } = await sb
                    .from("patients")
                    .update({ status: "awaiting-consultation" })
                    .eq("id", result.visit_id)
                    .eq("status", "sent-to-radiology");
                if (routeError) {
                    console.error("[radiology] return-to-doctor routing failed:", routeError);
                }
            }
        }
    }

    await logAction("RADIOLOGY_REPORT_FILED", "lab_requests", id, {
        filed_by: actor.userId,
        amendment: !ctx?.firstFiling,
    });

    return result;
}
