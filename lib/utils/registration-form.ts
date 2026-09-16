/**
 * Registration form logic — the pure, testable half of
 * `components/front-desk/components/register-patient/RegistrationSuite.tsx`.
 *
 * It lives here (rather than inside the component) for two reasons:
 *   1. `scripts/repro-registration-hmo.cjs` exercises these exact functions
 *      against the real zod schema, so a change to the step rules or to the
 *      payload mapping is verified against the shipped code, not a copy.
 *   2. The step rules and the payload mapping are the two places that have
 *      taken registration down at the front desk — they deserve to be
 *      independently checkable.
 *
 * ⚠️ Every key produced by `buildPatientPayload` MUST be a real column of the
 * `patients` table. PostgREST rejects the WHOLE insert when a payload key has
 * no matching column (PGRST204) — a null value does not protect it. See the
 * notes in `lib/services/patient.service.ts#createPatient`.
 */

// ─── Age / paediatric detection ───────────────────────────────────────────────

export function calcAge(
    dob?: string | Date | null
): { years: number; display: string; isChild: boolean } | null {
    if (!dob) return null;
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    let months = now.getMonth() - d.getMonth();
    if (months < 0) {
        years--;
        months += 12;
    }
    if (now.getDate() < d.getDate()) months--;
    const isChild = years < 13;
    const display =
        years === 0
            ? `${months} month${months !== 1 ? "s" : ""} old`
            : years < 2
              ? `${years}yr ${months}mo`
              : `${years} years old`;
    return { years, display, isChild };
}

// ─── Payment type ─────────────────────────────────────────────────────────────

export type PaymentType = "hmo" | "company" | "private" | null;

export interface PaymentFlagValues {
    hmo?: boolean;
    company?: boolean;
    privateClient?: boolean;
}

export function getPaymentType(values: PaymentFlagValues): PaymentType {
    if (values.privateClient) return "private";
    if (values.hmo) return "hmo";
    if (values.company) return "company";
    return null;
}

// ─── Per-step validation ──────────────────────────────────────────────────────

// Only name, date of birth, gender, and phone are strictly required on the
// first steps. Everything else is optional and stored as null when blank.
export const STEP_FIELDS: string[][] = [
    ["name", "birthDate", "gender", "phone"],
    ["emergencyContactEmail"],
    [],
];

/** Index of the Insurance step (0-based) in the registration wizard. */
export const INSURANCE_STEP = 3;

/**
 * Fields the Insurance step has to validate for the selected payment type.
 *
 * Self-pay needs nothing extra. HMO and company cover need their provider name
 * **and** the policy number — `PatientFormValidation`'s `superRefine` requires
 * both (`lib/validation.ts`), so the step has to trigger both. Validating only
 * the name meant a missing policy number was never reported on the step where
 * the desk could still fix it.
 */
export function getInsuranceFields(values: PaymentFlagValues): string[] {
    const type = getPaymentType(values);
    if (type === "hmo") return ["hmoName", "policyNumber"];
    if (type === "company") return ["companyName", "policyNumber"];
    return []; // private or unselected — nothing extra required
}

export function getStepFields(step: number, values: PaymentFlagValues): string[] {
    if (step === INSURANCE_STEP) return getInsuranceFields(values);
    return STEP_FIELDS[step] ?? [];
}

// ─── Payload mapping ──────────────────────────────────────────────────────────

export interface RegistrationPayloadInput {
    /** Raw react-hook-form values (camelCase). */
    values: Record<string, any>;
    /** True when the date of birth makes this a paediatric registration. */
    isChild: boolean;
    childClass?: string | null;
    parentInfo?: string | null;
    referralInfo?: string | null;
}

const clean = (val?: string | null) =>
    typeof val === "string" && val.trim().length > 0 ? val.trim() : null;

/**
 * camelCase form values → snake_case `patients` columns; empty fields become
 * null. Deliberately emits ONLY real columns:
 *
 *   • no `user_id` — `patients` has no such column; the registrar is captured
 *     in `audit_logs` by `createPatient`. Sending it made PostgREST reject
 *     every registration (the 2026-09 outage).
 *   • paediatric keys appear only when they hold a value — PostgREST rejects
 *     null-valued unknown keys just like populated ones, so a database that
 *     has not received `20260911_patient_paediatric_fields.sql` must not see
 *     them at all.
 */
export function buildPatientPayload(input: RegistrationPayloadInput): Record<string, any> {
    const v = input.values ?? {};

    return {
        // Personal (name / DOB / gender / phone are the meaningful ones)
        name: typeof v.name === "string" ? v.name.trim() : v.name,
        email: clean(v.email),
        phone: typeof v.phone === "string" ? v.phone.trim() : v.phone,
        birth_date: v.birthDate,
        gender: v.gender,
        address: clean(v.address),
        occupation: clean(v.occupation),
        religion: clean(v.religion),
        // Front-desk registrations go straight to the nurse for vitals. This
        // is fixed on purpose — the form's own `status` default ("registered")
        // would silently skip the nurse queue.
        status: "sent-to-nurse",

        // Emergency contact (optional)
        emergency_contact_name: clean(v.emergencyContactName),
        emergency_contact_number: clean(v.emergencyContactNumber),
        emergency_contact_relationship: clean(v.emergencyContactRelationship),
        emergency_contact_email: clean(v.emergencyContactEmail),
        emergency_contact_address: clean(v.emergencyContactAddress),

        // Medical (optional)
        allergies: clean(v.allergies),
        significant_medication_history: clean(v.significantMedicationHistory),
        long_term_medication: clean(v.longTermMedication),
        covid_vaccination_options: clean(v.covidVaccinationOptions),
        blood_group: clean(v.bloodGroup),
        geno_type: clean(v.genoType),

        // Insurance — the provider name only travels with the flag that owns
        // it, so switching payment type can never leave a stale insurer behind.
        policy_number: clean(v.policyNumber),
        hmo: Boolean(v.hmo),
        hmo_name: v.hmo ? clean(v.hmoName) : null,
        company: Boolean(v.company),
        company_name: v.company ? clean(v.companyName) : null,
        private_client: !v.hmo && !v.company ? true : Boolean(v.privateClient),

        // Paediatric (only for children, and only the keys that hold a value)
        ...(input.isChild
            ? {
                  ...(clean(input.childClass) ? { child_class: clean(input.childClass) } : {}),
                  ...(clean(input.parentInfo) ? { parent_info: clean(input.parentInfo) } : {}),
                  ...(clean(input.referralInfo) ? { referral_info: clean(input.referralInfo) } : {}),
              }
            : {}),
    };
}
