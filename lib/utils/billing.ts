/**
 * Shared, pure billing helpers used by both the server payment service and
 * the front-desk billing UI.
 *
 * Payment types (standard hospital billing trio):
 *  - "full"    — the entire outstanding balance is settled in one collection.
 *  - "partial" — only part of the balance is collected now; the remainder
 *                stays outstanding and the bill keeps its "partial" status.
 *  - "deposit" — money collected *in advance* (admission / procedure booking).
 *                It is held as credit on the patient's account and applied
 *                against bills as they accrue.
 *
 * Payers are auto-identified from the patient's registration:
 *  - HMO patient      → bills are settled against the HMO (claims), not cash.
 *  - Company patient  → bills are settled against the company (corporate account).
 *  - Private client   → self-pay via cash / card / transfer at the front desk.
 */

export type PaymentType = "full" | "partial" | "deposit";
export type PayerType = "private" | "hmo" | "company";

export const PAYMENT_TYPES: PaymentType[] = ["full", "partial", "deposit"];

export const PAYMENT_TYPE_CONFIG: Record<
    PaymentType,
    { label: string; short: string; desc: string }
> = {
    full: {
        label: "Full Payment",
        short: "Full",
        desc: "Settle the entire outstanding balance in one payment.",
    },
    partial: {
        label: "Part Payment",
        short: "Part",
        desc: "Collect part of the balance now; the remainder stays outstanding.",
    },
    deposit: {
        label: "Deposit (Advance)",
        short: "Deposit",
        desc: "Collect money in advance — held as credit and applied to this and future bills.",
    },
};

export const PAYER_CONFIG: Record<
    PayerType,
    { label: string; desc: string; autoMethod: string }
> = {
    private: {
        label: "Private Client",
        desc: "Self-pay — cash, card or transfer at the front desk.",
        autoMethod: "cash",
    },
    hmo: {
        label: "HMO",
        desc: "Covered by health insurance — settled against the HMO, not cash.",
        autoMethod: "hmo",
    },
    company: {
        label: "Company",
        desc: "Covered by the employer — settled against the company account.",
        autoMethod: "company",
    },
};

export interface ResolvedPayer {
    type: PayerType;
    label: string;
    reference: string; // HMO name / company name ("" for private)
    policyNumber?: string;
}

/**
 * Auto-identify how a patient pays, from the flags captured at registration:
 * `hmo`, `company`, `private_client` (+ names / policy number).
 * HMO takes precedence, then company, then private (matching the registration
 * rules in RegistrationSuite).
 */
export function resolvePayerFromPatient(patient?: Record<string, any> | null): ResolvedPayer {
    if (!patient) return { type: "private", label: PAYER_CONFIG.private.label, reference: "" };

    const hmo = patient.hmo === true || patient.hmo === "true" || patient.hmo === 1;
    const company = patient.company === true || patient.company === "true" || patient.company === 1;
    const isPrivate = patient.private_client === true || patient.private_client === "true" || patient.private_client === 1;

    if (hmo) {
        return {
            type: "hmo",
            label: PAYER_CONFIG.hmo.label,
            reference: String(patient.hmo_name ?? "").trim(),
            policyNumber: patient.policy_number ? String(patient.policy_number) : undefined,
        };
    }
    if (company) {
        return {
            type: "company",
            label: PAYER_CONFIG.company.label,
            reference: String(patient.company_name ?? "").trim(),
        };
    }
    return {
        type: "private",
        label: isPrivate ? PAYER_CONFIG.private.label : PAYER_CONFIG.private.label,
        reference: "",
    };
}

export interface DiscountComputation {
    /** Total discount in kobo (percent + flat, clamped). */
    discountKobo: number;
    /** Clamped percentage actually applied (0–100). */
    percent: number;
    /** Clamped flat amount actually applied (NGN). */
    flatKobo: number;
}

/**
 * Compute a discount from an optional percentage and/or flat amount.
 * Both can be combined; the result is clamped so the bill can never go
 * below what the patient has already paid toward it.
 */
export function computeDiscountKobo(input: {
    totalKobo: number;
    paidKobo?: number;
    discountPercent?: number | null;
    discountAmount?: number | null; // NGN
}): DiscountComputation {
    const total = Math.max(0, Math.round(input.totalKobo ?? 0));
    const paid = Math.max(0, Math.round(input.paidKobo ?? 0));

    const rawPercent = Number.isFinite(input.discountPercent as any)
        ? Math.max(0, Math.min(100, Number(input.discountPercent)))
        : 0;
    const rawFlat = Number.isFinite(input.discountAmount as any) && Number(input.discountAmount) > 0
        ? Math.round(Number(input.discountAmount) * 100)
        : 0;

    let discountKobo = Math.round((rawPercent / 100) * total) + rawFlat;
    // A discount may never push the bill below what has already been collected.
    discountKobo = Math.min(discountKobo, Math.max(0, total - paid));

    return {
        discountKobo,
        percent: rawPercent,
        flatKobo: rawFlat,
    };
}

/** Format kobo as ₦ with 2dp, Nigerian locale. */
export function formatKobo(kobo: number): string {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2,
    }).format((kobo ?? 0) / 100);
}
