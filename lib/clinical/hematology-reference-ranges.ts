/**
 * Hematology Analyzer — Reference Ranges by Category
 * ==================================================
 *
 * Age/sex-partitioned reference intervals for the hospital's 5-part
 * hematology analyzer (a Mindray BC-5130-style instrument — 25 reportable
 * parameters: WBC, Lym/Mid/Gran differential, RBC indices, platelet indices
 * incl. P-LCR / P-LCC, plus the NLR & PLR research parameters).
 *
 * The five partitions (Newborn, Children M/F, Adult M/F) and every range
 * below were transcribed from the analyzer's factory printouts (2026-07/08)
 * and are the authoritative values the lab uses. They are implemented here
 * as data, so a range change is a one-line edit, not a code change.
 *
 * Implementation notes (see docs/HEMATOLOGY_ANALYZER_REFERENCE_RANGES.md):
 *  - CLSI EP28-A3c: partition reference intervals by age and sex; verify
 *    transferred intervals against ≥20 healthy subjects per partition before
 *    relying on them locally.
 *  - Neonatal physiology (high HGB/HCT at birth falling over weeks 1–2,
 *    physiologic anemia at 2–3 months, lymphocyte/neutrophil crossover
 *    around day 5–7 and again at ~4–6 years) is why newborn and child
 *    partitions must never be compared against adult intervals.
 *  - Flags are computed with inclusive bounds (value < low → "L",
 *    value > high → "H"), which reproduces every flag on the five printouts.
 */

// ─── Categories ──────────────────────────────────────────────────────────────

export type HematologyCategory =
    | "newborn"
    | "child_male"
    | "child_female"
    | "adult_male"
    | "adult_female";

export interface HematologyCategoryDef {
    id: HematologyCategory;
    /** Label as printed on the analyzer report. */
    label: string;
    /** Human-readable population description. */
    population: string;
    /** Sex required for this partition (null = same for both sexes). */
    sex: "Male" | "Female" | null;
}

export const HEMATOLOGY_CATEGORIES: HematologyCategoryDef[] = [
    { id: "newborn",      label: "Newborn",          population: "0–28 days",           sex: null },
    { id: "child_male",   label: "Children (Male)",  population: "28 days – 17 years",  sex: "Male" },
    { id: "child_female", label: "Children (Female)",population: "28 days – 17 years",  sex: "Female" },
    { id: "adult_male",   label: "Adult Male",       population: "≥ 18 years",          sex: "Male" },
    { id: "adult_female", label: "Adult Female",     population: "≥ 18 years",          sex: "Female" },
];

export function categoryDef(id: HematologyCategory): HematologyCategoryDef {
    return HEMATOLOGY_CATEGORIES.find((c) => c.id === id) ?? HEMATOLOGY_CATEGORIES[3];
}

/** Fallback when age/gender are unknown — the tech must confirm manually. */
export const DEFAULT_HEMATOLOGY_CATEGORY: HematologyCategory = "adult_male";

const DAYS_28_IN_YEARS = 28 / 365.25;
const CHILD_CUTOFF_YEARS = 18;

export interface ResolvedCategory {
    category: HematologyCategory | null;
    /** Why this category was chosen (for the “Reference set” note). */
    note?: string;
}

/**
 * Resolve the reference-range partition from a patient's age (in years) and
 * gender, mirroring the analyzer printout categories:
 *   < 28 days        → Newborn
 *   28 days – 17 yrs → Children (partition by sex; ranges are sex-independent)
 *   ≥ 18 yrs         → Adult Male / Adult Female (RBC, HGB, HCT differ by sex)
 *
 * Returns `null` when the patient's age is unknown (caller should fall back
 * to DEFAULT_HEMATOLOGY_CATEGORY and let the tech pick manually).
 */
export function resolveHematologyCategory(
    ageYears: number | null | undefined,
    gender?: string | null,
): ResolvedCategory {
    if (ageYears === null || ageYears === undefined || Number.isNaN(ageYears)) {
        return { category: null, note: "Age unknown — reference set must be confirmed manually." };
    }

    const genderText = String(gender ?? "").trim();
    const sexKnown = /^(male|female)$/i.test(genderText);
    const sex = genderText.toLowerCase() === "female" ? "Female" : "Male";

    if (ageYears < DAYS_28_IN_YEARS) {
        return { category: "newborn", note: `Auto-detected (${formatAgeLabel(ageYears)}, ${sex})` };
    }

    if (ageYears < CHILD_CUTOFF_YEARS) {
        return {
            category: sex === "Female" ? "child_female" : "child_male",
            note: sexKnown
                ? `Auto-detected (${formatAgeLabel(ageYears)}, ${sex})`
                : `Auto-detected (${formatAgeLabel(ageYears)}) — gender unknown; child ranges are identical for both sexes.`,
        };
    }

    if (!sexKnown) {
        return {
            category: "adult_male",
            note: `Auto-detected (${formatAgeLabel(ageYears)}) — gender unknown; HGB/RBC/HCT differ by sex, verify reference set.`,
        };
    }

    return {
        category: sex === "Female" ? "adult_female" : "adult_male",
        note: `Auto-detected (${formatAgeLabel(ageYears)}, ${sex})`,
    };
}

/** "9 Days" / "9 Years" — matches the analyzer printout header format. */
export function formatAgeLabel(ageYears: number): string {
    const days = Math.round(ageYears * 365.25);
    if (days < 28) return `${Math.max(days, 0)} Days`;
    const years = Math.floor(ageYears * 10) / 10;
    return `${Math.round(years)} Years`;
}

// ─── Parameters & ranges ─────────────────────────────────────────────────────

export interface AnalyzerRange {
    low: number | null;
    high: number | null;
}

export interface HematologyParameter {
    /** Stable key used to store the value in form data (also the form input key). */
    key: string;
    /** Label exactly as printed on the analyzer report. */
    label: string;
    unit: string;
    /** True for NLR / PLR — computed from other parameters, never entered. */
    derived?: boolean;
    /** Formula shown to the tech for derived parameters. */
    formula?: string;
    /** Best-known LOINC code (P-LCC/P-LCR/NLR/PLR have no standard LOINC — see docs). */
    loinc?: string;
    /** Display reference range per category (en dash, as printed). */
    ranges?: Partial<Record<HematologyCategory, string>>;
}

/**
 * All 25 report rows in printout order. Range values are the exact strings
 * transcribed from the analyzer's factory printouts. Where the printout has
 * no range for a parameter in a category (e.g. MPV on newborns), the entry is
 * omitted — the report renders a blank Ref. Range cell, as on the printout.
 */
export const HEMATOLOGY_PARAMETERS: HematologyParameter[] = [
    { key: "wbc",      label: "WBC",    unit: "10^9/L", loinc: "6690-2",
      ranges: { newborn: "4.00–20.00", child_male: "4.00–12.00", child_female: "4.00–12.00", adult_male: "4.00–10.00", adult_female: "4.00–10.00" } },
    { key: "lym",      label: "Lym#",   unit: "10^9/L", loinc: "26474-7",
      ranges: { newborn: "0.40–12.00", child_male: "0.80–7.00", child_female: "0.80–7.00", adult_male: "0.80–4.00", adult_female: "0.80–4.00" } },
    { key: "mid",      label: "Mid#",   unit: "10^9/L", loinc: "26485-3",
      ranges: { newborn: "0.10–1.80", child_male: "0.10–1.80", child_female: "0.10–1.80", adult_male: "0.10–1.80", adult_female: "0.10–1.80" } },
    { key: "gran",     label: "Gran#",  unit: "10^9/L", loinc: "26505-8",
      ranges: { newborn: "2.00–7.80", child_male: "2.00–7.80", child_female: "2.00–7.80", adult_male: "2.00–7.80", adult_female: "2.00–7.80" } },
    { key: "lym_pct",  label: "Lym%",   unit: "%", loinc: "736-9",
      ranges: { newborn: "10.0–60.0", child_male: "20.0–60.0", child_female: "20.0–60.0", adult_male: "20.0–40.0", adult_female: "20.0–40.0" } },
    { key: "mid_pct",  label: "Mid%",   unit: "%", loinc: "5905-5",
      ranges: { newborn: "1.0–15.0", child_male: "1.0–15.0", child_female: "1.0–15.0", adult_male: "1.0–15.0", adult_female: "1.0–15.0" } },
    { key: "gran_pct", label: "Gran%",  unit: "%", loinc: "26509-0",
      ranges: { newborn: "50.0–70.0", child_male: "50.0–70.0", child_female: "50.0–70.0", adult_male: "50.0–70.0", adult_female: "50.0–70.0" } },

    // Derived — Neutrophil-to-Lymphocyte ratio (Gran# ÷ Lym#)
    { key: "nlr", label: "NLR", unit: "", derived: true, formula: "Gran# ÷ Lym#" },
    // Derived — Platelet-to-Lymphocyte ratio (PLT ÷ Lym#)
    { key: "plr", label: "PLR", unit: "", derived: true, formula: "PLT ÷ Lym#" },

    { key: "rbc",      label: "RBC",     unit: "10^12/L", loinc: "789-8",
      ranges: { newborn: "3.50–7.00", child_male: "3.50–5.20", child_female: "3.50–5.20", adult_male: "4.00–5.50", adult_female: "3.50–5.00" } },
    { key: "hgb",      label: "HGB",     unit: "g/dL", loinc: "718-7",
      ranges: { newborn: "17.0–20.0", child_male: "12.0–16.0", child_female: "12.0–16.0", adult_male: "12.0–16.0", adult_female: "11.0–15.0" } },
    { key: "hct",      label: "HCT",     unit: "%", loinc: "4544-3",
      ranges: { newborn: "38.0–68.0", child_male: "35.0–49.0", child_female: "35.0–49.0", adult_male: "40.0–54.0", adult_female: "37.0–47.0" } },
    { key: "mcv",      label: "MCV",     unit: "fL", loinc: "787-2",
      ranges: { newborn: "95.0–125.0", child_male: "80.0–100.0", child_female: "80.0–100.0", adult_male: "80.0–100.0", adult_female: "80.0–100.0" } },
    { key: "mch",      label: "MCH",     unit: "pg", loinc: "785-6",
      ranges: { newborn: "30.0–42.0", child_male: "27.0–34.0", child_female: "27.0–34.0", adult_male: "27.0–34.0", adult_female: "27.0–34.0" } },
    { key: "mchc",     label: "MCHC",    unit: "g/L", loinc: "786-4",
      ranges: { newborn: "300–340", child_male: "310–370", child_female: "310–370", adult_male: "320–360", adult_female: "320–360" } },
    { key: "rdw_cv",   label: "RDW-CV",  unit: "%", loinc: "788-0",
      ranges: { newborn: "11.0–16.0", child_male: "11.0–16.0", child_female: "11.0–16.0", adult_male: "11.0–16.0", adult_female: "11.0–16.0" } },
    { key: "rdw_sd",   label: "RDW-SD",  unit: "fL", loinc: "21000-5",
      ranges: { newborn: "35.0–56.0", child_male: "35.0–56.0", child_female: "35.0–56.0", adult_male: "35.0–56.0", adult_female: "35.0–56.0" } },
    { key: "plt",      label: "PLT",     unit: "10^9/L", loinc: "777-3",
      ranges: { newborn: "100–300", child_male: "100–300", child_female: "100–300", adult_male: "100–300", adult_female: "100–300" } },
    { key: "mpv",      label: "MPV",     unit: "fL", loinc: "32678-5",
      ranges: { child_male: "6.5–12.0", child_female: "6.5–12.0", adult_male: "6.5–12.0", adult_female: "6.5–12.0" } },
    { key: "pdw_cv",   label: "PDW-CV",  unit: "%", loinc: "32207-3",
      ranges: { child_male: "9.0–16.0", child_female: "9.0–16.0", adult_male: "15.0–17.0", adult_female: "15.0–17.0" } },
    { key: "pdw_sd",   label: "PDW-SD",  unit: "fL",
      ranges: { child_male: "9.0–17.0", child_female: "9.0–17.0", adult_male: "9.0–17.0", adult_female: "9.0–17.0" } },
    { key: "pct",      label: "PCT",     unit: "%", loinc: "32210-7",
      ranges: { child_male: "0.108–0.282", child_female: "0.108–0.282", adult_male: "0.108–0.282", adult_female: "0.108–0.282" } },
    { key: "plcc",     label: "P-LCC",   unit: "10^9/L",
      ranges: { newborn: "30–90", child_male: "30–90", child_female: "30–90", adult_male: "30–90", adult_female: "30–90" } },
    { key: "plcr",     label: "P-LCR",   unit: "%",
      ranges: { newborn: "11.0–45.0", child_male: "11.0–45.0", child_female: "11.0–45.0", adult_male: "11.0–45.0", adult_female: "11.0–45.0" } },
];

/** Keys of the parameters the tech actually enters (excludes NLR/PLR). */
export const HEMATOLOGY_INPUT_KEYS = HEMATOLOGY_PARAMETERS
    .filter((p) => !p.derived)
    .map((p) => p.key);

/** Look up a parameter definition by key. */
export function getParameter(key: string): HematologyParameter | undefined {
    return HEMATOLOGY_PARAMETERS.find((p) => p.key === key);
}

/** Display reference range for a parameter in a category ("" when none printed). */
export function rangeFor(parameter: HematologyParameter, category: HematologyCategory): string {
    return parameter.ranges?.[category] ?? "";
}

// ─── Flag engine ─────────────────────────────────────────────────────────────

/**
 * Parse a printed range ("4.00–20.00", "≥ 90", "≤ 0.015", "300–340") into
 * numeric bounds. Unknown / empty ranges yield `{ low: null, high: null }`.
 */
export function parseRangeDisplay(display?: string | null): AnalyzerRange {
    const raw = (display ?? "").trim();
    if (!raw || raw === "—" || raw === "-") return { low: null, high: null };

    const num = (s: string): number | null => {
        const v = Number(s.replace(/,/g, "").trim());
        return Number.isFinite(v) ? v : null;
    };

    const ge = raw.match(/^(?:≥|>=|>|≥?)\s*([\d.,]+)\s*$/i);
    const le = raw.match(/^(?:≤|<=|<)\s*([\d.,]+)\s*$/i);
    if (ge) return { low: num(ge[1]), high: null };
    if (le) return { low: null, high: num(le[1]) };

    const pair = raw.split(/[–—-]/);
    if (pair.length === 2) {
        return { low: num(pair[0]), high: num(pair[1]) };
    }
    return { low: null, high: null };
}

/**
 * Evaluate the printout flag for a numeric value against a printed range.
 * Bounds are inclusive: value < low → "L", value > high → "H", else "".
 * Non-numeric values always return "".
 */
export function evaluateFlag(value: string | number | null | undefined, rangeDisplay?: string | null): "" | "L" | "H" {
    if (value === null || value === undefined || value === "") return "";
    const v = typeof value === "number" ? value : Number(String(value).trim());
    if (!Number.isFinite(v)) return "";
    const { low, high } = parseRangeDisplay(rangeDisplay);
    if (low !== null && v < low) return "L";
    if (high !== null && v > high) return "H";
    return "";
}

// ─── Derived parameters (NLR / PLR) ──────────────────────────────────────────

/** Compute NLR = Gran# ÷ Lym# and PLR = PLT ÷ Lym# (2 dp, "—" when undefinable). */
export function computeDerivedValues(values: Record<string, string>): { nlr: string; plr: string } {
    const num = (k: string): number | null => {
        const raw = values[k]?.trim();
        if (!raw) return null;
        const v = Number(raw);
        return Number.isFinite(v) ? v : null;
    };

    const round2 = (v: number): string =>
        (Math.round(v * 100) / 100).toFixed(2);

    const gran = num("gran");
    const lym = num("lym");
    const plt = num("plt");

    const nlr = gran !== null && lym !== null && lym !== 0 ? round2(gran / lym) : "—";
    const plr = plt !== null && lym !== null && lym !== 0 ? round2(plt / lym) : "—";
    return { nlr, plr };
}

// ─── Result-string format (stored in lab_requests.result) ────────────────────

export const ANALYZER_RESULT_FOOTER = "[The test result only accounts for this test sample]";

export interface BuildAnalyzerResultOptions {
    category: HematologyCategory;
    /** How the category was picked — shown in the “Reference set” note. */
    categoryNote?: string;
    mode: string;
    sampleId?: string | null;
    testTime?: string | null;
    values: Record<string, string>;
    extraNotes?: string;
}

/**
 * Build the printable report body stored on the lab request. Layout matches
 * the analyzer printout: para / flag / result / unit / ref-range columns,
 * derived NLR & PLR rows, and the mandatory footer line.
 */
export function buildHematologyResultString(opts: BuildAnalyzerResultOptions): string {
    const def = categoryDef(opts.category);
    const derived = computeDerivedValues(opts.values);
    const lines: string[] = [];

    lines.push("HEMATOLOGY ANALYZER");
    lines.push("Full Blood Count (FBC)");
    lines.push("");
    lines.push(`Reference set: ${def.label} (${def.population})${opts.categoryNote ? ` · ${opts.categoryNote}` : ""}`);
    if (opts.sampleId) lines.push(`Sample ID: ${opts.sampleId}`);
    lines.push(`Mode: ${opts.mode}`);
    if (opts.testTime) lines.push(`Test Time: ${opts.testTime}`);
    lines.push("");
    lines.push("PARAMETER\tFLAG\tRESULT\tUNIT\tREF RANGE");
    lines.push("─".repeat(60));

    for (const p of HEMATOLOGY_PARAMETERS) {
        const raw = p.derived ? derived[p.key as "nlr" | "plr"] : (opts.values[p.key]?.trim() ?? "");
        const value = raw === "" ? "—" : raw;
        const flag = p.derived ? "" : evaluateFlag(value, rangeFor(p, opts.category));
        const ref = rangeFor(p, opts.category);
        lines.push(`${p.label}\t${flag}\t${value}\t${p.unit}\t${ref}`);
    }

    lines.push("─".repeat(60));
    lines.push("");
    lines.push(ANALYZER_RESULT_FOOTER);

    if (opts.extraNotes?.trim()) {
        lines.push("");
        lines.push("Additional Notes:");
        lines.push(opts.extraNotes.trim());
    }

    return lines.join("\n");
}

/**
 * Map the analyzer's printed unit strings to UCUM (needed for FHIR
 * Quantity.unit / coded quantities). Unknown units fall back to undefined.
 */
export function toUcum(unit?: string | null): string | undefined {
    if (!unit) return undefined;
    switch (unit.trim()) {
        case "10^9/L": return "10*9/L";
        case "10^12/L": return "10*12/L";
        case "g/dL": return "g/dL";
        case "g/L": return "g/L";
        case "%": return "%";
        case "fL": return "fL";
        case "pg": return "pg";
        default: return undefined;
    }
}

// ─── Shared structured-result parser ─────────────────────────────────────────

export interface ParsedResultRow {
    label: string;
    flag: string;
    value: string;
    unit: string;
    ref: string;
}

export interface ParsedLabResult {
    /** "hematology-analyzer" = new 5-column printout format; "generic-structured" = legacy 4-column; "free" = plain text. */
    kind: "hematology-analyzer" | "generic-structured" | "free";
    category?: string;
    name?: string;
    referenceSet?: string;
    sampleId?: string;
    mode?: string;
    rows: ParsedResultRow[];
    note?: string | null;
}

/**
 * Parse a stored lab result. Understands both the legacy 4-column format
 * (TEST NAME / RESULT / REFERENCE RANGE / UNIT, built by buildResultString)
 * and the analyzer 5-column format (PARAMETER / FLAG / RESULT / UNIT / REF
 * RANGE, built by buildHematologyResultString), so older results keep
 * rendering after the analyzer template ships.
 */
export function parseLabResult(result?: string | null): ParsedLabResult | null {
    if (!result || !result.trim()) return null;
    const lines = result.split("\n");
    const trimmed = lines.map((l) => l.trim());

    const analyzerHeader = lines.findIndex((l) => l.includes("PARAMETER") && l.includes("RESULT") && l.includes("FLAG"));
    const legacyHeader = lines.findIndex((l) => l.includes("TEST NAME") && l.includes("RESULT"));

    if (analyzerHeader === -1 && legacyHeader === -1) {
        return { kind: "free", rows: [], note: result };
    }

    const isAnalyzer = analyzerHeader !== -1;
    const headerIdx = isAnalyzer ? analyzerHeader : legacyHeader;

    const pick = (prefix: string): string | undefined => {
        const line = trimmed.find((l) => l.startsWith(prefix));
        return line ? line.slice(prefix.length).trim() : undefined;
    };

    const referenceSet = pick("Reference set:");
    const sampleId = pick("Sample ID:");
    const mode = pick("Mode:");

    const rows: ParsedResultRow[] = [];
    let note: string | null = null;

    for (let i = headerIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        const t = line.trim();
        if (!t) continue;
        if (t.startsWith("─")) continue;
        if (t.startsWith("Note:")) { note = t.replace(/^Note:\s*/, ""); break; }
        if (t.startsWith("Additional Notes")) { note = lines.slice(i).join("\n").replace(/^Additional Notes:?\s*/, ""); break; }
        if (t === ANALYZER_RESULT_FOOTER) break;

        const parts = line.split("\t").map((s) => s.trim());
        if (isAnalyzer && parts.length >= 5) {
            rows.push({ label: parts[0], flag: parts[1], value: parts[2], unit: parts[3], ref: parts[4] });
        } else if (!isAnalyzer && parts.length >= 4) {
            rows.push({ label: parts[0], flag: "", value: parts[1], unit: parts[3], ref: parts[2] });
        } else if (parts.length >= 2) {
            rows.push({ label: parts[0], flag: "", value: parts[1], unit: "", ref: parts[2] ?? "" });
        }
    }

    return {
        kind: isAnalyzer ? "hematology-analyzer" : "generic-structured",
        category: trimmed[0] || undefined,
        name: trimmed[1] || undefined,
        referenceSet,
        sampleId,
        mode,
        rows,
        note,
    };
}

// ─── Test-type matching ──────────────────────────────────────────────────────

const ANALYZER_TEST_PATTERNS = [
    "hematology analyzer", "full blood count", "fbc", "complete blood count", "cbc",
    "5-part", "five-part", "differential count", "hemogram", "blood count",
];

/** True when a requested test_type should use the analyzer template. */
export function isHematologyAnalyzerTest(testType?: string | null): boolean {
    if (!testType) return false;
    const lower = testType.toLowerCase();
    return ANALYZER_TEST_PATTERNS.some((p) => lower.includes(p));
}

/**
 * Recompute the flag for a stored row when the stored flag is missing (e.g.
 * legacy FBC results entered before the analyzer template shipped).
 */
export function ensureFlag(row: ParsedResultRow, category?: HematologyCategory): string {
    if (row.flag) return row.flag;
    const param = getParameter(row.label);
    const range = param && category ? rangeFor(param, category) : row.ref;
    return evaluateFlag(row.value, range || row.ref);
}
