/**
 * Radiology scan catalog — the single client-safe source of truth for which
 * scans the unit performs, what they cost, and how their reports read.
 *
 * WHY THIS FILE EXISTS
 *   Radiology rides on `lab_requests` (a `[RADIOLOGY]`-prefixed `test_type`),
 *   but it had no catalog of its own: the Quick Route panel offered whatever
 *   `lab_test_catalog` rows happened to contain the word "scan" — usually none —
 *   so there was nothing to request and nothing to bill. The two services the
 *   unit actually performs now live here, and the database copy
 *   (`radiology_scan_catalog`, migration 20261001) is the price of record:
 *   `lib/services/radiology.service.ts#listRadiologyScans` reads the table and
 *   falls back to this list when the table is missing or empty, so a database
 *   that has not received the migration still shows a working order form.
 *
 * Deliberately free of server imports (`"use server"`, Supabase) so client
 * components, the request dialog and the check script can all import it.
 */

export interface RadiologyScan {
    /** Stable catalog code, e.g. "TVS". */
    code: string;
    /** Display name — this is what is stored in `lab_requests.test_type`. */
    name: string;
    /** Short label for chips and tight layouts. */
    shortName: string;
    description: string;
    modality: string;
    /** Price in NGN. */
    price: number;
    /** Alternate spellings that must resolve to this scan. */
    aliases: string[];
}

/** Every scan is ₦23,000 today; the constant keeps that in one place. */
export const RADIOLOGY_SCAN_PRICE = 23_000;

export const RADIOLOGY_SCAN_CATALOG: RadiologyScan[] = [
    {
        code: "PELVIC",
        name: "Pelvic Scan",
        shortName: "Pelvic",
        description:
            "Transabdominal pelvic ultrasound — uterus, ovaries, adnexa and pelvic collection.",
        modality: "Ultrasound",
        price: RADIOLOGY_SCAN_PRICE,
        aliases: [
            "pelvic ultrasound",
            "pelvis scan",
            "abdominal pelvic scan",
            "pelvic uss",
            "pelvic scan (transabdominal)",
            "pelvis",
        ],
    },
    {
        code: "TVS",
        name: "Transvaginal Scan (TVS)",
        shortName: "TVS",
        description:
            "Transvaginal ultrasound — early pregnancy, viability, endometrium and adnexa.",
        modality: "Ultrasound",
        price: RADIOLOGY_SCAN_PRICE,
        aliases: [
            "transvaginal scan",
            "trans vaginal scan",
            "tvs",
            "transvaginal ultrasound",
            "vaginal scan",
            "tv scan",
            "trans-vaginal scan",
        ],
    },
];

/** Rows a database catalog row can carry (matches `radiology_scan_catalog`). */
export interface RadiologyScanRow {
    id?: string | null;
    code?: string | null;
    scan_name?: string | null;
    short_name?: string | null;
    description?: string | null;
    modality?: string | null;
    price?: number | null;
    aliases?: string | null;
    sort_order?: number | null;
    is_active?: boolean | null;
}

/** `lab_requests.test_type` prefix that marks a row as a radiology order. */
export const RADIOLOGY_PREFIX = "[RADIOLOGY]";

/** Normalize a scan name for comparison: case-folded, punctuation-insensitive. */
export function normalizeScanName(name?: string | null): string {
    return (name ?? "")
        .replace(/^\[RADIOLOGY\]\s*/i, "")
        .toLowerCase()
        .replace(/[()]/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function parseAliases(raw?: string | null): string[] {
    return (raw ?? "")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
}

/** Database row → the shape the UI uses. Null prices fall back to the default. */
export function scanFromRow(row: RadiologyScanRow): RadiologyScan {
    const name = (row.scan_name ?? "").trim();
    return {
        code: (row.code ?? "").trim().toUpperCase(),
        name,
        shortName: (row.short_name ?? "").trim() || name,
        description: (row.description ?? "").trim(),
        modality: (row.modality ?? "Ultrasound").trim() || "Ultrasound",
        price: typeof row.price === "number" && row.price >= 0 ? row.price : RADIOLOGY_SCAN_PRICE,
        aliases: parseAliases(row.aliases),
    };
}

/** Merge database rows over the in-code catalog, keyed by normalized name. */
export function mergeScanCatalog(
    dbRows: RadiologyScanRow[] = []
): RadiologyScan[] {
    const byName = new Map<string, RadiologyScan>();

    for (const scan of RADIOLOGY_SCAN_CATALOG) {
        byName.set(normalizeScanName(scan.name), scan);
    }

    for (const row of dbRows ?? []) {
        if (row.is_active === false) continue;
        const scan = scanFromRow(row);
        const key = normalizeScanName(scan.name);
        if (!key) continue;
        const existing = byName.get(key);
        byName.set(key, existing ? { ...existing, ...scan, aliases: [...existing.aliases, ...scan.aliases] } : scan);
    }

    return [...byName.values()]
        .filter((s) => s.name.length > 0)
        .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Resolve free text (a code, a name, an alias, or a `[RADIOLOGY]`-prefixed
 * `test_type`) to a catalog scan. Returns `undefined` for anything unknown —
 * callers must NOT invent a price for an unrecognized service.
 */
export function findScan(
    input: string | null | undefined,
    catalog: RadiologyScan[] = RADIOLOGY_SCAN_CATALOG
): RadiologyScan | undefined {
    const key = normalizeScanName(input);
    if (!key) return undefined;

    const exact = catalog.find(
        (s) => normalizeScanName(s.name) === key || s.code.toLowerCase() === key
    );
    if (exact) return exact;

    // Alias match, then "the alias is contained in the request" as a last
    // resort ("Pelvic Scan (transabdominal)" → Pelvic Scan).
    const alias = catalog.find((s) =>
        s.aliases.some((a) => normalizeScanName(a) === key)
    );
    if (alias) return alias;

    return catalog.find((s) => {
        const name = normalizeScanName(s.name);
        return key.includes(name) || name.includes(key);
    });
}

/** True when the text names a service in the catalog. */
export function isKnownScan(
    input: string | null | undefined,
    catalog: RadiologyScan[] = RADIOLOGY_SCAN_CATALOG
): boolean {
    return !!findScan(input, catalog);
}

/**
 * The price to bill for a scan, or `null` when the service is not in the
 * catalog (the caller then refuses to guess — see `createRadiologyRequest`).
 */
export function resolveScanPrice(
    input: string | null | undefined,
    catalog: RadiologyScan[] = RADIOLOGY_SCAN_CATALOG
): number | null {
    const scan = findScan(input, catalog);
    return scan ? scan.price : null;
}

/** Format NGN the way the rest of the app does. */
export function formatNaira(amount: number): string {
    return `₦${Math.round(amount ?? 0).toLocaleString("en-NG")}`;
}

// ─── Report templates ─────────────────────────────────────────────────────────
// The result is a single free-text field (the reporting clinician types the
// observations). These snippets only pre-fill that field — they are starting
// points, never a substitute for the findings.

export interface ReportTemplate {
    id: string;
    label: string;
    /** Which scan(s) the template is written for; "" = any. */
    scanCode?: string;
    text: string;
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
    {
        id: "pelvic-normal",
        label: "Pelvic — normal",
        scanCode: "PELVIC",
        text: `PELVIC ULTRASOUND (TRANSABDOMINAL)

Uterus: Normal in size and echotexture. No focal lesion seen.
Endometrium: Central, regular, not thickened.
Ovaries: Both ovaries normal in size and echopattern. No adnexal mass.
Pouch of Douglas: Free, no collection.

IMPRESSION: Normal pelvic ultrasound.`,
    },
    {
        id: "pelvic-pregnancy",
        label: "Pelvic — obstetric",
        scanCode: "PELVIC",
        text: `OBSTETRIC ULTRASOUND (TRANSABDOMINAL)

Uterus: Enlarged, containing a single live intrauterine gestation.
Fetus: Cephalic presentation. Fetal heart activity present.
Biometry: BPD __ mm, FL __ mm — corresponds to __ weeks gestation.
Placenta: Fundal / anterior, grade __.
Liquor: Adequate.

IMPRESSION: Single live intrauterine pregnancy of __ weeks.`,
    },
    {
        id: "tvs-early",
        label: "TVS — early pregnancy",
        scanCode: "TVS",
        text: `TRANSVAGINAL ULTRASOUND

Uterus: Anteverted, normal in size.
Gestational sac: Single intrauterine gestational sac seen, mean sac diameter __ mm.
Yolk sac: Present. Fetal pole: Present, CRL __ mm, corresponding to __ weeks.
Cardiac activity: Present / absent.
Ovaries: Both unremarkable. No free fluid.

IMPRESSION: Early intrauterine pregnancy of __ weeks by CRL.`,
    },
    {
        id: "tvs-non-obstetric",
        label: "TVS — gynaecological",
        scanCode: "TVS",
        text: `TRANSVAGINAL ULTRASOUND

Uterus: Normal in size and echotexture.
Endometrium: __ mm, regular.
Ovaries: Right __ , Left __ . No cyst or solid mass identified.
Pouch of Douglas: No free fluid.

IMPRESSION: Normal transvaginal ultrasound.`,
    },
    {
        id: "blank",
        label: "Blank observations",
        text: `OBSERVATIONS:


IMPRESSION:
`,
    },
];

/** Templates that fit the scan being reported, generic ones last. */
export function templatesForScan(scanName?: string | null): ReportTemplate[] {
    const scan = findScan(scanName);
    const code = scan?.code;
    return [
        ...REPORT_TEMPLATES.filter((t) => t.scanCode && t.scanCode === code),
        ...REPORT_TEMPLATES.filter((t) => !t.scanCode),
    ];
}
