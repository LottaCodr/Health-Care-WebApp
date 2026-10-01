"use server";

// ══════════════════════════════════════════════════════════════════════════════
// lib/services/care-packages.service.ts
//
// Prepaid care packages: what a patient bought, what it entitles them to, and
// what has been consumed from it.
//
// THE BILLING RULE this module exists to enforce
//   A service covered by a package is NOT written to `payments`. `payments` is
//   what the front desk settles and what the outstanding total is summed from
//   (`lib/utils/billing.ts`, `components/patients/payment-history.tsx`), so a
//   covered scan there would put a bill in front of a patient who already paid
//   for it inside the package. Instead the consumption is recorded here, in the
//   append-only `package_usage` ledger, carrying the value it would have
//   cost — which keeps the money visible for reporting without billing it.
//
// Every write goes through `requireStaff(...)`; the database repeats the rule
// with RLS (migration 20261001_radiology_scans_and_care_packages.sql).
// ══════════════════════════════════════════════════════════════════════════════

import { createClient } from "@/utils/supabase/server";
import { UserRole } from "@/types/models";
import { requireStaff } from "./auth-guard";
import { logAction } from "./audit.service";
import { formatFriendlyDbError } from "@/lib/utils/friendly-errors";
import {
    decideCoverage,
    type CarePackage,
    type CarePackageItem,
    type PackageCoverage,
    type PackageEnrolment,
    type PackageUsageRow,
} from "@/lib/utils/care-packages";

export type { CarePackage, CarePackageItem, PackageCoverage, PackageEnrolment, PackageUsageRow };

const ITEMS_SELECT = "care_package_items(*)";

// ─── Catalog ──────────────────────────────────────────────────────────────────

function attachItems(pkg: any, items: any[]): CarePackage {
    return {
        ...pkg,
        items: (items ?? []).filter((i) => i.package_id === pkg.id),
    };
}

/** Active packages with their entitlements, for the enrolment UI. */
export async function listCarePackages(): Promise<CarePackage[]> {
    await requireStaff();
    const sb = await createClient();

    const { data, error } = await sb
        .from("care_packages")
        .select("*, care_package_items(*)")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

    if (error) {
        // An unmigrated database has no package tables at all. Callers treat an
        // empty list as "no packages to offer" and simply bill the service.
        console.warn("[care-packages] listCarePackages:", error.message);
        return [];
    }

    return (data ?? []).map((row: any) =>
        attachItems(row, (row.care_package_items ?? []) as any[])
    );
}

/** Every package, active or not (Admin catalog management). */
export async function listAllCarePackages(): Promise<CarePackage[]> {
    await requireStaff([UserRole.Admin]);
    const sb = await createClient();
    const { data, error } = await sb
        .from("care_packages")
        .select("*, care_package_items(*)")
        .order("sort_order", { ascending: true });
    if (error) { console.warn("[care-packages] listAll:", error.message); return []; }
    return (data ?? []).map((row: any) => attachItems(row, row.care_package_items ?? []));
}

// ─── Enrolments ───────────────────────────────────────────────────────────────

/**
 * The patient's enrolments, oldest first.
 *
 * Oldest-first is not cosmetic: `decideCoverage` consumes the first enrolment
 * that can cover a service, so an older package is always used up before a
 * newer one.
 */
export async function listEnrolmentsByPatient(patientId: string): Promise<PackageEnrolment[]> {
    await requireStaff();
    if (!patientId) return [];
    const sb = await createClient();

    const { data, error } = await sb
        .from("patient_package_enrolments")
        .select("*, care_packages(*, care_package_items(*))")
        .eq("patient_id", patientId)
        .order("enrolled_at", { ascending: true });

    if (error) { console.warn("[care-packages] listEnrolments:", error.message); return []; }

    return (data ?? []).map((row: any) => ({
        ...row,
        care_packages: row.care_packages
            ? { ...row.care_packages, items: row.care_packages.care_package_items ?? [] }
            : null,
    })) as PackageEnrolment[];
}

/** Everything consumed from one enrolment (the audit trail behind the count). */
export async function listPackageUsage(
    filter: { enrolmentId?: string; patientId?: string }
): Promise<PackageUsageRow[]> {
    await requireStaff();
    const sb = await createClient();

    let query = sb
        .from("package_usage")
        .select("*")
        .order("created_at", { ascending: true });

    if (filter.enrolmentId) query = query.eq("enrolment_id", filter.enrolmentId);
    if (filter.patientId) query = query.eq("patient_id", filter.patientId);

    const { data, error } = await query;
    if (error) { console.warn("[care-packages] listUsage:", error.message); return []; }
    return (data ?? []) as PackageUsageRow[];
}

export interface EnrolPatientInput {
    patientId: string;
    packageId: string;
    /** NGN the patient prepaid for the package (may be 0 for a free waiver). */
    amountPaid?: number;
    receiptNo?: string;
    /** ISO date; defaults to today. */
    startsOn?: string;
    /** ISO date; when omitted the package's `validity_days` decides. */
    expiresOn?: string | null;
    notes?: string;
    enrolledBy?: string;
}

export type EnrolResult =
    | { ok: true; enrolment: PackageEnrolment }
    | { ok: false; message: string; code?: string };

/**
 * Sell a package to a patient.
 *
 * Returns its failure as a value (never throws an expected one) so the
 * registration form can show the reason at the desk — a Server Action that
 * throws arrives in production as Next.js's redacted digest text (see
 * `createPatient` for the same rule).
 */
export async function enrolPatientInPackage(input: EnrolPatientInput): Promise<EnrolResult> {
    let actor;
    try {
        actor = await requireStaff([UserRole.FrontDesk]);
    } catch (err) {
        return { ok: false, message: (err as Error).message, code: "FORBIDDEN" };
    }

    if (!input.patientId) return { ok: false, message: "A patient is required." };
    if (!input.packageId) return { ok: false, message: "Choose the package to enrol the patient in." };

    const sb = await createClient();

    const { data: pkg, error: pkgError } = await sb
        .from("care_packages")
        .select("*, care_package_items(*)")
        .eq("id", input.packageId)
        .maybeSingle();

    if (pkgError) {
        console.error("[care-packages] enrol package read:", pkgError);
        return { ok: false, message: formatFriendlyDbError(pkgError), code: pkgError.code };
    }
    if (!pkg) return { ok: false, message: "That care package no longer exists." };
    if (pkg.is_active === false) {
        return { ok: false, message: `${pkg.name} is no longer offered.` };
    }

    // One active enrolment per patient per package. A second pregnancy gets a
    // NEW enrolment after the first is completed — the allowance must never be
    // topped up silently on an old purchase.
    const { data: existing } = await sb
        .from("patient_package_enrolments")
        .select("id, status")
        .eq("patient_id", input.patientId)
        .eq("package_id", input.packageId)
        .eq("status", "active")
        .limit(1);

    if (existing?.length) {
        return {
            ok: false,
            message: `The patient already has an active ${pkg.name}. Close it first if this is a new purchase.`,
            code: "ALREADY_ENROLLED",
        };
    }

    const startsOn = input.startsOn?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    let expiresOn = input.expiresOn === null ? null : input.expiresOn?.slice(0, 10) || null;
    if (!expiresOn && typeof pkg.validity_days === "number" && pkg.validity_days > 0) {
        const d = new Date(startsOn);
        d.setUTCDate(d.getUTCDate() + pkg.validity_days);
        expiresOn = d.toISOString().slice(0, 10);
    }

    const payload = {
        patient_id: input.patientId,
        package_id: input.packageId,
        enrolled_by: actor.userId,
        enrolled_at: new Date().toISOString(),
        starts_on: startsOn,
        expires_on: expiresOn,
        status: "active",
        amount_paid:
            typeof input.amountPaid === "number" && input.amountPaid >= 0 ? input.amountPaid : null,
        receipt_no: input.receiptNo?.trim() || null,
        notes: input.notes?.trim() || null,
    };

    const { data, error } = await sb
        .from("patient_package_enrolments")
        .insert([payload])
        .select("*, care_packages(*, care_package_items(*))")
        .single();

    if (error) {
        console.error("[care-packages] enrol insert:", error);
        return { ok: false, message: formatFriendlyDbError(error), code: error.code };
    }

    const enrolment = {
        ...data,
        care_packages: data.care_packages
            ? { ...data.care_packages, items: data.care_packages.care_package_items ?? [] }
            : null,
    } as unknown as PackageEnrolment;

    await logAction("CARE_PACKAGE_ENROLLED", "patient_package_enrolments", enrolment.id, {
        patient_id: input.patientId,
        package_id: input.packageId,
        package_name: pkg.name,
        amount_paid: payload.amount_paid,
        expires_on: expiresOn,
        enrolled_by: actor.userId,
    });

    return { ok: true, enrolment };
}

export interface UpdateEnrolmentInput {
    id: string;
    status?: "active" | "completed" | "cancelled";
    expiresOn?: string | null;
    notes?: string;
}

/** Close, cancel or extend an enrolment (front desk / Admin). */
export async function updateEnrolment(input: UpdateEnrolmentInput): Promise<EnrolResult> {
    let actor;
    try {
        actor = await requireStaff([UserRole.FrontDesk]);
    } catch (err) {
        return { ok: false, message: (err as Error).message, code: "FORBIDDEN" };
    }
    if (!input.id) return { ok: false, message: "id is required." };

    const sb = await createClient();
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    if (input.status) patch.status = input.status;
    if (input.expiresOn !== undefined) patch.expires_on = input.expiresOn?.slice(0, 10) || null;
    if (input.notes !== undefined) patch.notes = input.notes?.trim() || null;

    const { data, error } = await sb
        .from("patient_package_enrolments")
        .update(patch)
        .eq("id", input.id)
        .select("*, care_packages(*, care_package_items(*))")
        .maybeSingle();

    if (error) {
        console.error("[care-packages] update enrolment:", error);
        return { ok: false, message: formatFriendlyDbError(error), code: error.code };
    }
    if (!data) return { ok: false, message: "The enrolment was not found." };

    await logAction("CARE_PACKAGE_UPDATED", "patient_package_enrolments", input.id, {
        status: input.status ?? null,
        expires_on: input.expiresOn ?? null,
        updated_by: actor.userId,
    });

    return {
        ok: true,
        enrolment: {
            ...data,
            care_packages: data.care_packages
                ? { ...data.care_packages, items: data.care_packages.care_package_items ?? [] }
                : null,
        } as unknown as PackageEnrolment,
    };
}

// ─── Coverage ─────────────────────────────────────────────────────────────────

export interface CoverageQuery {
    patientId: string;
    itemKind?: string;
    itemName: string;
    /** Naira value of the service, recorded in the ledger when it is covered. */
    valueNaira?: number;
}

/**
 * Would this service be paid for by one of the patient's packages?
 *
 * Used by the order form BEFORE the request is created (so the doctor sees
 * "covered — no bill" up front) and again inside `createRadiologyRequest`,
 * which is the authority: the UI's answer is only a preview.
 *
 * Degrades to "not covered" when the package tables are missing, which bills
 * the service — the safe direction (the desk can always refund, but an
 * unrecorded free scan is silent revenue loss).
 */
export async function getPackageCoverage(query: CoverageQuery): Promise<PackageCoverage> {
    await requireStaff();

    const itemKind = query.itemKind ?? "radiology_scan";
    const fallback: PackageCoverage = {
        covered: false,
        reason: "no_enrolment",
        itemKind,
        itemName: query.itemName,
        valueNaira: query.valueNaira ?? 0,
    };

    if (!query.patientId) return fallback;

    const [enrolments, usage] = await Promise.all([
        listEnrolmentsByPatient(query.patientId),
        listPackageUsage({ patientId: query.patientId }),
    ]);

    if (!enrolments.length) return fallback;

    return decideCoverage({
        enrolments,
        usage,
        itemKind,
        itemName: query.itemName,
        valueNaira: query.valueNaira ?? 0,
    });
}

/**
 * Reserve one unit of an enrolment's allowance.
 *
 * Called by the ordering service immediately BEFORE the order row is written,
 * so two simultaneous requests cannot both see the same remaining scan and
 * both cover themselves. The caller passes the created order id back through
 * `linkPackageUsage` (or releases the reservation if the insert fails).
 */
export async function reservePackageUsage(input: {
    coverage: PackageCoverage;
    patientId: string;
    recordedBy?: string;
    notes?: string;
}): Promise<{ id: string } | null> {
    const actor = await requireStaff();
    const { coverage } = input;
    if (!coverage.covered || !coverage.enrolmentId) return null;

    const sb = await createClient();
    const { data, error } = await sb
        .from("package_usage")
        .insert([{
            enrolment_id: coverage.enrolmentId,
            patient_id: input.patientId,
            item_kind: coverage.itemKind,
            item_name: coverage.itemName,
            quantity: 1,
            value_kobo: Math.round((coverage.valueNaira ?? 0) * 100),
            recorded_by: actor.userId,
            notes: input.notes?.trim() || null,
        }])
        .select("id")
        .single();

    if (error) {
        // Loud, but non-fatal for the caller: the order must still be created,
        // and it is created as COVERED (the patient is never charged twice).
        console.error("[care-packages] reserveUsage failed:", error);
        return null;
    }
    return { id: data.id as string };
}

/** Stamp the created order onto its usage row (audit trail). */
export async function linkPackageUsage(usageId: string, labRequestId: string): Promise<void> {
    if (!usageId || !labRequestId) return;
    const sb = await createClient();
    const { error } = await sb
        .from("package_usage")
        .update({ lab_request_id: labRequestId })
        .eq("id", usageId);
    if (error) console.warn("[care-packages] linkUsage:", error.message);
}

/**
 * Give the allowance back when the order that reserved it could not be
 * created. Best effort — a stale reservation costs the patient one scan of
 * allowance, which the desk can see and fix; a phantom free scan is worse.
 */
export async function releasePackageUsage(usageId: string): Promise<void> {
    if (!usageId) return;
    const sb = await createClient();
    const { error } = await sb.from("package_usage").delete().eq("id", usageId);
    if (error) console.warn("[care-packages] releaseUsage:", error.message);
}

/** Everything the patient's Care Packages panel needs, in one round trip. */
export interface PatientPackagesSummary {
    enrolments: PackageEnrolment[];
    usage: PackageUsageRow[];
    /** Total value (NGN) of services delivered under packages. */
    coveredValueNaira: number;
}

export async function getPatientPackagesSummary(patientId: string): Promise<PatientPackagesSummary> {
    await requireStaff();
    if (!patientId) return { enrolments: [], usage: [], coveredValueNaira: 0 };

    const [enrolments, usage] = await Promise.all([
        listEnrolmentsByPatient(patientId),
        listPackageUsage({ patientId }),
    ]);

    const coveredValueNaira = usage.reduce(
        (sum, u) => sum + (typeof u.value_kobo === "number" ? u.value_kobo : 0) / 100,
        0
    );

    return { enrolments, usage, coveredValueNaira };
}
