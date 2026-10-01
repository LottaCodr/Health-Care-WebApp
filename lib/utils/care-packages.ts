/**
 * Prepaid care packages — the pure, testable half.
 *
 * A patient buys a package once (the antenatal package at registration). The
 * services the package includes are then consumed from that purchase instead of
 * being billed again: the order is recorded as `billing_status = 'covered'`,
 * no row is written to `payments`, and the consumption lands in the
 * append-only `package_usage` ledger with the value the service WOULD have
 * carried.
 *
 * That split is the whole point. `payments` is what the front desk settles and
 * what the outstanding total is computed from, so a covered scan must never
 * appear there — but the hospital still needs to see the value it gave away
 * under a package, which is what `package_usage.value_kobo` is for.
 *
 * Everything here is pure (no Supabase, no React) so
 * `scripts/check-radiology-billing.cjs` can assert the allowance rules against
 * the shipped logic rather than a copy of it.
 */

export type PackageItemKind =
    | "radiology_scan"
    | "lab_test"
    | "pharmacy"
    | "consultation"
    | "procedure"
    | "other";

export interface CarePackageItem {
    id?: string | null;
    package_id?: string | null;
    item_kind: PackageItemKind | string;
    /** `null` = ANY item of this kind is covered. */
    item_name?: string | null;
    /** `null` = unlimited while the enrolment is active. */
    included_quantity?: number | null;
    price_included?: number | null;
    notes?: string | null;
}

export interface CarePackage {
    id: string;
    code: string;
    name: string;
    description?: string | null;
    department?: string | null;
    /** Package price in NGN; `null` = entered at the desk on enrolment. */
    price?: number | null;
    validity_days?: number | null;
    is_active?: boolean;
    items?: CarePackageItem[];
}

export interface PackageEnrolment {
    id: string;
    patient_id: string;
    package_id: string;
    enrolled_by?: string | null;
    enrolled_at?: string | null;
    starts_on?: string | null;
    expires_on?: string | null;
    status?: string | null;
    amount_paid?: number | null;
    receipt_no?: string | null;
    notes?: string | null;
    /** Joined package (optional — some callers fetch it separately). */
    care_packages?: CarePackage | null;
    package?: CarePackage | null;
}

export interface PackageUsageRow {
    id?: string;
    enrolment_id: string;
    item_kind?: string;
    item_name: string;
    quantity?: number | null;
    value_kobo?: number | null;
}

export type CoverageReason =
    | "covered"
    | "no_enrolment"
    | "not_active"
    | "not_started"
    | "expired"
    | "not_included"
    | "allowance_exhausted";

export interface PackageCoverage {
    covered: boolean;
    reason: CoverageReason;
    itemKind: PackageItemKind | string;
    itemName: string;
    /** Set when a matching active enrolment exists. */
    enrolmentId?: string;
    packageId?: string;
    packageName?: string;
    packageCode?: string;
    /** `null` = unlimited. */
    includedQuantity?: number | null;
    usedQuantity?: number;
    /** `null` = unlimited. */
    remainingQuantity?: number | null;
    expiresOn?: string | null;
    /** Naira value of the service being covered (0 when unknown). */
    valueNaira?: number;
}

// ─── Name matching ────────────────────────────────────────────────────────────

/** Package items name services loosely; compare case/punctuation-insensitively. */
export function sameItemName(a?: string | null, b?: string | null): boolean {
    const norm = (v?: string | null) =>
        (v ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const x = norm(a);
    const y = norm(b);
    if (!x || !y) return false;
    return x === y || x.includes(y) || y.includes(x);
}

// ─── Entitlements ─────────────────────────────────────────────────────────────

/**
 * Which package item covers this service?
 *
 * An item with `item_name = null` covers ANY item of its kind ("any ultrasound
 * scan"); a named item covers only that service. When both exist the named one
 * wins, because it is the tighter allowance.
 */
export function findCoveringItem(
    items: CarePackageItem[] = [],
    itemKind: string,
    itemName: string
): CarePackageItem | undefined {
    const candidates = (items ?? []).filter((i) => i.item_kind === itemKind);
    if (!candidates.length) return undefined;

    const named = candidates.find((i) => sameItemName(i.item_name, itemName));
    if (named) return named;

    return candidates.find((i) => !i.item_name || !String(i.item_name).trim());
}

// ─── Validity ─────────────────────────────────────────────────────────────────

function toDayStart(value: string | Date | null | undefined, now: Date): Date | null {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    // Compare by calendar day, so a package expiring "today" is still usable
    // all day (a date column carries no time of day to begin with).
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** True when the enrolment is active on `now` (status + start/expiry dates). */
export function isEnrolmentActive(
    enrolment: PackageEnrolment,
    now: Date | number = new Date()
): boolean {
    const ref = new Date(now);
    const status = String(enrolment?.status ?? "active").toLowerCase();
    if (status !== "active") return false;

    const start = toDayStart(enrolment?.starts_on, ref);
    if (start && start.getTime() > Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate())) {
        return false;
    }

    const end = toDayStart(enrolment?.expires_on, ref);
    if (end && end.getTime() < Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate())) {
        return false;
    }

    return true;
}

/** Why an enrolment is not usable right now, for the UI's explanatory text. */
export function enrolmentBlockReason(
    enrolment: PackageEnrolment,
    now: Date | number = new Date()
): CoverageReason | null {
    const status = String(enrolment?.status ?? "active").toLowerCase();
    if (status === "cancelled" || status === "completed") return "not_active";
    if (status !== "active") return "not_active";

    const ref = new Date(now);
    const today = Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate());
    const start = toDayStart(enrolment?.starts_on, ref);
    if (start && start.getTime() > today) return "not_started";
    const end = toDayStart(enrolment?.expires_on, ref);
    if (end && end.getTime() < today) return "expired";

    return null;
}

export function packageOf(enrolment: PackageEnrolment): CarePackage | null {
    return (enrolment?.care_packages ?? enrolment?.package ?? null) as CarePackage | null;
}

// ─── Allowance arithmetic ─────────────────────────────────────────────────────

/**
 * How many services have been consumed from this enrolment.
 *
 * A wildcard entitlement (`item_name = null` — "any ultrasound scan") is drawn
 * down by ANY service of that kind, so its count is across the whole kind. A
 * named entitlement only counts its own service. `anyItemName` mirrors the item
 * that `findCoveringItem` selected, so the two always agree.
 */
export function countUsed(
    usage: PackageUsageRow[] = [],
    enrolmentId: string,
    itemKind: string,
    itemName: string,
    opts?: { anyItemName?: boolean }
): number {
    return (usage ?? [])
        .filter((u) => u.enrolment_id === enrolmentId)
        .filter((u) => !u.item_kind || u.item_kind === itemKind)
        .filter((u) => opts?.anyItemName || sameItemName(u.item_name, itemName))
        .reduce((sum, u) => sum + (typeof u.quantity === "number" ? u.quantity : 1), 0);
}

/** `null` means unlimited. */
export function computeRemaining(
    included: number | null | undefined,
    used: number
): number | null {
    if (included === null || included === undefined) return null;
    return Math.max(0, Math.round(included) - Math.max(0, Math.round(used || 0)));
}

/** Human summary of the allowance, e.g. "2 of 3 scans left" / "unlimited". */
export function describeAllowance(
    included: number | null | undefined,
    used: number,
    noun = "scan"
): string {
    const remaining = computeRemaining(included, used);
    if (remaining === null) return `Unlimited ${noun}s while the package is active`;
    const total = Math.max(0, Math.round(included ?? 0));
    if (remaining <= 0) return `All ${total} ${noun}s used`;
    return `${remaining} of ${total} ${noun}s left`;
}

// ─── The decision ─────────────────────────────────────────────────────────────

export interface DecideCoverageInput {
    enrolments: PackageEnrolment[];
    usage: PackageUsageRow[];
    itemKind: PackageItemKind | string;
    itemName: string;
    /** Naira value of the service, for the ledger and the UI. */
    valueNaira?: number;
    now?: Date | number;
}

/**
 * Decide whether a service is paid for by one of the patient's packages.
 *
 * Rules, in order:
 *   1. Only an enrolment that is `active` and inside its validity window can
 *      cover anything (a lapsed antenatal package does not cover a new scan).
 *   2. The package must include the service (any item of the kind, or that
 *      exact item).
 *   3. The allowance must not be exhausted (`included_quantity = null` is
 *      unlimited).
 *   4. The FIRST enrolment that satisfies all three wins — enrolments are
 *      ordered oldest-first so an older package is consumed before a newer one.
 */
export function decideCoverage(input: DecideCoverageInput): PackageCoverage {
    const { enrolments = [], usage = [], itemKind, itemName, valueNaira = 0 } = input;
    const now = input.now ?? new Date();

    const base: PackageCoverage = {
        covered: false,
        reason: enrolments.length ? "not_included" : "no_enrolment",
        itemKind,
        itemName,
        valueNaira,
    };

    let lastReason: CoverageReason = base.reason;

    for (const enrolment of enrolments) {
        const blocked = enrolmentBlockReason(enrolment, now);
        if (blocked) {
            // Keep the most informative reason seen (expiry beats "not active").
            if (lastReason === "not_included" || lastReason === "no_enrolment") lastReason = blocked;
            continue;
        }

        const pkg = packageOf(enrolment);
        const item = findCoveringItem(pkg?.items ?? [], itemKind, itemName);
        if (!item) {
            lastReason = "not_included";
            continue;
        }

        const used = countUsed(usage, enrolment.id, itemKind, itemName, {
            anyItemName: !item.item_name || !String(item.item_name).trim(),
        });
        const remaining = computeRemaining(item.included_quantity, used);

        if (remaining !== null && remaining <= 0) {
            lastReason = "allowance_exhausted";
            // Do not stop here: a second enrolment may still have allowance.
            continue;
        }

        return {
            covered: true,
            reason: "covered",
            itemKind,
            itemName,
            enrolmentId: enrolment.id,
            packageId: pkg?.id ?? enrolment.package_id,
            packageName: pkg?.name,
            packageCode: pkg?.code,
            includedQuantity: item.included_quantity ?? null,
            usedQuantity: used,
            remainingQuantity: remaining === null ? null : remaining - 1,
            expiresOn: enrolment.expires_on ?? null,
            valueNaira,
        };
    }

    return { ...base, reason: lastReason };
}

/** One-line explanation of a coverage verdict, for the order form and bills. */
export function coverageExplanation(coverage: PackageCoverage): string {
    if (coverage.covered) {
        const allowance =
            coverage.includedQuantity === null
                ? "unlimited scans while the package is active"
                : `${coverage.remainingQuantity ?? 0} of ${coverage.includedQuantity} included scans left after this one`;
        return `Covered by ${coverage.packageName ?? "the care package"} — ${allowance}. No bill will be raised.`;
    }
    switch (coverage.reason) {
        case "no_enrolment":
            return "No prepaid care package on this patient's file — the scan will be billed.";
        case "expired":
            return "The care package has expired — the scan will be billed.";
        case "not_started":
            return "The care package has not started yet — the scan will be billed.";
        case "not_active":
            return "The care package is not active — the scan will be billed.";
        case "allowance_exhausted":
            return "The included scans on this package have all been used — the scan will be billed.";
        case "not_included":
            return "This service is not included in the patient's care package — it will be billed.";
        default:
            return "The scan will be billed.";
    }
}
