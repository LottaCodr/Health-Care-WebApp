/**
 * Hospital number rules.
 *
 * Every patient is numbered in one shared series:
 *   NVH-00001, NVH-00002, NVH-00003, …
 *
 * The same prefix is used for EMR registrations and bulk imports. The legacy
 * NVHE / unhyphenated formats (NVHE-000001, NVH000001, NVH00001) are accepted
 * when reading uploaded values and are rewritten to the canonical form below.
 */
export const HOSPITAL_NUMBER_PREFIX = "NVH-";
export const HOSPITAL_NUMBER_WIDTH = 5;
export const HOSPITAL_NUMBER_PATTERN = /^(?:NVH(?:E)?[\s-]*)(\d+)$/i;

export function formatHospitalNumber(sequence: number | string): string {
    const n = Math.max(1, Math.trunc(Number(sequence) || 0));
    return `${HOSPITAL_NUMBER_PREFIX}${String(n).padStart(HOSPITAL_NUMBER_WIDTH, "0")}`;
}

/** Returns the numeric suffix, or null when the value is not a hospital number. */
export function hospitalNumberSuffix(value?: string | null): number | null {
    const match = (value ?? "").trim().match(HOSPITAL_NUMBER_PATTERN);
    if (!match) return null;
    const n = Number(match[1]);
    return Number.isFinite(n) && n >= 1 ? n : null;
}

/**
 * Converts any accepted hospital-number input into the canonical format.
 *  - NVHE-000001 → NVH-00001
 *  - NVH00001    → NVH-00001
 *  - NVH-00001   → NVH-00001
 *
 * Returns null when the value cannot be interpreted as a hospital number.
 */
export function normalizeHospitalNumber(value?: string | null): string | null {
    const suffix = hospitalNumberSuffix(value);
    return suffix === null ? null : formatHospitalNumber(suffix);
}
