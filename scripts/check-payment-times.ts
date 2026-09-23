/**
 * Payment-history time accuracy checks.
 *
 * The repo has no test runner; like check-amendment-policy.ts this pins down
 * the rules that keep billing times truthful, mechanically:
 *
 *   1. Every time shown comes from a database stamp — settled bills show the
 *      SETTLEMENT time (processed_date / paid_at), open bills show the
 *      bill-raised time (created_at). A settled bill must never display its
 *      created_at as if it were the payment time.
 *   2. Nothing is fabricated on the client: a row missing its created_at maps
 *      to null, never to "now".
 *   3. Postgres timestamps are never re-zoned by the browser: offset-less
 *      values (naive `timestamp` columns) are read as UTC, because that is
 *      what the application writes (toISOString()).
 *
 * Run with:  npm run check:payment-times
 */

import { parseDbTimestamp, pickBillDisplayTimestamp } from "../lib/utils/payment-time.ts";
import { mapPaymentsForHistory } from "../lib/utils/map-payment-history.ts";

let failures = 0;
let checks = 0;

function check(name: string, condition: boolean, detail = "") {
    checks++;
    if (condition) {
        console.log(`  ✓ ${name}`);
    } else {
        failures++;
        console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
    }
}

// Wall-clock rendering at the hospital (Africa/Lagos, UTC+1) — same zone the
// front desk reads on screen.
function hospitalClock(d: Date | null): string {
    if (!d) return "—";
    return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Africa/Lagos",
    }).format(d);
}

// The user's incident, reconstructed: bill raised 8:41 AM WAT (07:41 UTC),
// settled "some minutes to 11" — 10:52 AM WAT (09:52 UTC).
const RAISED_UTC  = "2026-09-23T07:41:00.000Z";   // 8:41 AM Abuja
const SETTLED_UTC = "2026-09-23T09:52:14.123Z";   // 10:52 AM Abuja

console.log("\nPayment times — the accuracy rule\n");

// ── 1. Parsing Postgres timestamps ───────────────────────────────────────────
{
    console.log("parseDbTimestamp — never re-zoned by the browser");

    const withOffset = parseDbTimestamp("2026-09-23T09:52:14.123456+00:00");
    check("timestamptz (+00:00) keeps its instant", withOffset?.getTime() === Date.parse(SETTLED_UTC),
        `got ${withOffset?.toISOString()}`);

    const pgText = parseDbTimestamp("2026-09-23 09:52:14.123456+00");
    check("Postgres text style (' +00') keeps its instant", pgText?.getTime() === Date.parse(SETTLED_UTC),
        `got ${pgText?.toISOString()}`);

    const naive = parseDbTimestamp("2026-09-23T09:52:14.123456");
    check("offset-less value is read as UTC (never browser-local)",
        naive?.getTime() === Date.parse(SETTLED_UTC),
        `got ${naive?.toISOString()}`);

    const zulu = parseDbTimestamp(SETTLED_UTC);
    check("Zulu values pass through", zulu?.getTime() === Date.parse(SETTLED_UTC));

    const noColon = parseDbTimestamp("2026-09-23T09:52:14.123+0000");
    check("'+0000' offsets parse", noColon?.getTime() === Date.parse(SETTLED_UTC),
        `got ${noColon?.toISOString()}`);

    check("missing/blank/garbage → null",
        parseDbTimestamp(null) === null &&
        parseDbTimestamp("") === null &&
        parseDbTimestamp("not a date") === null);

    check("hospital clock renders the settled instant as 10:52 AM",
        hospitalClock(withOffset) === "10:52 AM", `got ${hospitalClock(withOffset)}`);
}

// ── 2. Which stamp a row displays ────────────────────────────────────────────
{
    console.log("\npickBillDisplayTimestamp — settled rows show the settlement time");

    const settled = pickBillDisplayTimestamp({
        status: "paid",
        paid_at: SETTLED_UTC,
        processed_date: SETTLED_UTC,
        created_at: RAISED_UTC,
    });
    check("paid bill → settlement stamp, labelled 'paid'",
        settled?.label === "paid" && settled?.iso === SETTLED_UTC,
        JSON.stringify(settled));

    const partial = pickBillDisplayTimestamp({
        status: "partial",
        paid_at: null,
        processed_date: SETTLED_UTC,
        created_at: RAISED_UTC,
    });
    check("part-paid bill → processed_date (last money received)",
        partial?.label === "paid" && partial?.iso === SETTLED_UTC,
        JSON.stringify(partial));

    const open = pickBillDisplayTimestamp({
        status: "pending",
        paid_at: null,
        processed_date: null,
        created_at: RAISED_UTC,
    });
    check("open bill → bill-raised time, labelled 'billed'",
        open?.label === "billed" && open?.iso === RAISED_UTC,
        JSON.stringify(open));

    const legacyPaid = pickBillDisplayTimestamp({
        status: "paid",
        paid_at: null,
        processed_date: null,
        created_at: RAISED_UTC,
    });
    check("legacy settled row with no stamp NEVER relabels created_at as paid",
        legacyPaid?.label === "billed" && legacyPaid?.iso === RAISED_UTC,
        JSON.stringify(legacyPaid));

    const empty = pickBillDisplayTimestamp({ status: "pending" });
    check("row with no stamps at all → null (rendered '—')", empty === null);
}

// ── 3. The mapper never invents a time ───────────────────────────────────────
{
    console.log("\nmapPaymentsForHistory — database values only, no fabrication");

    const [settledRow, openRow, bareRow] = mapPaymentsForHistory([
        {
            id: "pay-settled",
            patient_id: "pt-1",
            amount: 5000,
            amount_kobo: 500000,
            amount_paid_kobo: 500000,
            status: "paid",
            description: "Lab Test: Malaria Parasite",
            created_at: RAISED_UTC,
            processed_date: SETTLED_UTC,
            paid_at: SETTLED_UTC,
        },
        {
            id: "pay-open",
            patient_id: "pt-1",
            amount: 2500,
            amount_kobo: 250000,
            amount_paid_kobo: 0,
            status: "pending",
            description: "Consultation",
            created_at: RAISED_UTC,
        },
        {
            // Worst case: a row missing every timestamp. The old code replaced
            // created_at with the client's new Date() — that must never happen.
            id: "pay-bare",
            patient_id: "pt-1",
            amount: 100,
            status: "pending",
            description: "Legacy row",
        },
    ] as any);

    check("settled row keeps DB settlement stamp (settled_at)",
        settledRow.settled_at === SETTLED_UTC, `got ${settledRow.settled_at}`);
    check("settled row keeps DB created_at", settledRow.created_at === RAISED_UTC);
    check("open row keeps DB created_at", openRow.created_at === RAISED_UTC);
    check("open row has no settlement stamp", openRow.settled_at === null);

    check("missing created_at maps to null — never client's new Date()",
        bareRow.created_at === null, `got ${bareRow.created_at}`);
    check("missing stamps map to null everywhere",
        bareRow.settled_at === null && bareRow.payment_date === null);

    // End-to-end: what the Time column renders for the incident bill.
    const picked = pickBillDisplayTimestamp({
        status: settledRow.status,
        paid_at: settledRow.payment_date,
        processed_date: settledRow.settled_at,
        created_at: settledRow.created_at,
    });
    check("incident bill renders 'Paid 10:52 AM' — not '8:41 AM'",
        picked?.label === "paid" && hospitalClock(parseDbTimestamp(picked.iso)) === "10:52 AM",
        JSON.stringify(picked));
}

// ── Result ────────────────────────────────────────────────────────────────────
console.log(`\n${checks - failures}/${checks} checks passed.`);
if (failures > 0) {
    process.exit(1);
}
