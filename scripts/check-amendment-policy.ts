/**
 * Amendment-window policy checks.
 *
 * The repo has no test runner, and this is the one piece of the 24-hour rule
 * that is worth pinning down mechanically: the boundary. Everything else (RLS,
 * Postgres triggers, React) needs an environment; this needs Node.
 *
 * Run with:  npm run check:amendments
 */

import {
    AMENDMENT_WINDOW_HOURS,
    evaluateAmendmentWindow,
    formatCountdown,
    pickAnchor,
    pickAuthor,
    toEpochMs,
} from "../lib/records/amendment-policy.ts";
import {
    AMENDMENT_REGISTRY,
    getRecordDef,
    hasNoContent,
    isFirstFilling,
    isAmendableRecordType,
    normalizeForCompare,
    pickContentChanges,
} from "../lib/records/registry.ts";

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

const H = 3_600_000;
const T0 = Date.UTC(2026, 8, 8, 9, 0, 0); // 2026-09-08 09:00 UTC
const HOUR = H;

console.log("\nAmendment window — the 24-hour rule");

// ── Boundary ─────────────────────────────────────────────────────────────────
{
    const inside = evaluateAmendmentWindow({ anchor: T0, authorId: "dr-1", actorId: "dr-1", now: T0 + 23 * HOUR });
    check("author can edit at hour 23", inside.editable && inside.blockedOn === "ok", JSON.stringify(inside));

    const boundary = evaluateAmendmentWindow({ anchor: T0, authorId: "dr-1", actorId: "dr-1", now: T0 + AMENDMENT_WINDOW_HOURS * HOUR });
    check("window is closed the instant it hits 24h", !boundary.editable && boundary.blockedOn === "window_expired", JSON.stringify(boundary));

    const late = evaluateAmendmentWindow({ anchor: T0, authorId: "dr-1", actorId: "dr-1", now: T0 + 30 * HOUR });
    check("day-old record is locked", !late.editable && late.blockedOn === "window_expired");
}

// ── Ownership ────────────────────────────────────────────────────────────────
{
    const other = evaluateAmendmentWindow({ anchor: T0, authorId: "dr-1", actorId: "dr-2", now: T0 + HOUR });
    check("a colleague cannot edit inside the window either", !other.editable && other.blockedOn === "not_author");

    const unowned = evaluateAmendmentWindow({ anchor: T0 + 40 * HOUR, authorId: null, actorId: "dr-2", now: T0 + HOUR });
    check("legacy row with no author is editable (and gets claimed)", unowned.editable && unowned.unowned === true);
}

// ── First filing ─────────────────────────────────────────────────────────────
{
    const firstFiling = evaluateAmendmentWindow({
        anchor: T0 - 7 * 24 * HOUR, authorId: "lab-1", actorId: "lab-1", now: T0, firstFiling: true,
    });
    check("filing a result on a week-old request is not blocked", firstFiling.editable);
}

// ── No extension after an amendment ─────────────────────────────────────────
{
    const before = evaluateAmendmentWindow({ anchor: T0, authorId: "dr-1", actorId: "dr-1", now: T0 + 23.5 * HOUR });
    const after = evaluateAmendmentWindow({ anchor: T0, authorId: "dr-1", actorId: "dr-1", now: T0 + 24.5 * HOUR });
    check(
        "amending at 23h30 does not buy a fresh 24h",
        before.editable && !after.editable && after.deadline === before.deadline,
        `${before.deadline} vs ${after.deadline}`
    );
}

// ── Degradation, not false locks ────────────────────────────────────────────
{
    const noTimestamp = evaluateAmendmentWindow({ anchor: null, authorId: "dr-1", actorId: "dr-1", now: T0 });
    check("a row with no timestamp is editable, and flagged", noTimestamp.editable && noTimestamp.blockedOn === "no_timestamp");

    check("a date-only string is not mistaken for epoch 0", toEpochMs("not-a-date") === null);
    check("ISO strings parse", toEpochMs(new Date(T0).toISOString()) === T0);
    check("Date objects parse", toEpochMs(new Date(T0)) === T0);
}

// ── Anchor / author resolution ───────────────────────────────────────────────
{
    const labRow = { completed_at: new Date(T0).toISOString(), created_at: new Date(T0 - 5 * 24 * HOUR).toISOString() };
    const def = getRecordDef("lab_result");
    check(
        "lab results anchor on completed_at, not the request date",
        toEpochMs(pickAnchor(labRow, def.anchor)) === T0
    );
    check("a result row with no completed_by is unowned", pickAuthor(labRow, def.author) === null);
    check(
        "ownership falls back through the coalesce list",
        pickAuthor({ completed_by: "sci-9" }, def.author) === "sci-9"
        && pickAuthor({ completed_by: null, requested_by: "dr-3" }, def.author) === "dr-3"
    );

    const nursing = getRecordDef("nursing_action");
    check(
        "nursing notes anchor on completion_time",
        toEpochMs(pickAnchor({ completion_time: new Date(T0).toISOString(), created_at: null }, nursing.anchor)) === T0
    );
}

// ── What counts as an amendment ──────────────────────────────────────────────
{
    const consultation = getRecordDef("consultation");
    const stored = { symptoms: "Headache", diagnosis: "Migraine", prescriptions: "Paracetamol", recommendations: "Review", status: "underConsultation" };

    const typo = pickContentChanges(consultation, { symptoms: "Head ache" }, stored);
    check("a spelling fix in the history counts as an amendment", Object.keys(typo).join() === "symptoms");

    const statusOnly = pickContentChanges(consultation, { status: "completed" }, stored);
    check("completing a consultation is not an amendment", Object.keys(statusOnly).length === 0);

    const sparse = pickContentChanges(consultation, { status: "completed", result: undefined }, stored);
    check("undefined keys in a sparse payload are not treated as clears", Object.keys(sparse).length === 0);

    const identical = pickContentChanges(consultation, { diagnosis: "  Migraine  " }, stored);
    check("whitespace-only differences are not edits", Object.keys(identical).length === 0);

    const cleared = pickContentChanges(consultation, { prescriptions: null }, stored);
    check("blanking a treatment plan IS an amendment (it must be logged)", Object.keys(cleared).join() === "prescriptions");

    const firstSave = hasNoContent(consultation, { symptoms: "", diagnosis: null, prescriptions: undefined, recommendations: "" });
    check("an all-blank record is treated as not yet filed", firstSave);

    // First filing is judged per written column, never per row: a lab_requests
    // row always has test_type, and a scientist must still be able to file.
    const lab = getRecordDef("lab_result");
    const filing = pickContentChanges(lab, { result: "WBC 11.2" }, { test_type: "CBC", result: null });
    check("filing a first result is not an amendment", isFirstFilling(filing));
    const rewrite = pickContentChanges(lab, { result: "WBC 12.0" }, { test_type: "CBC", result: "WBC 11.2" });
    check("overwriting a filed result IS an amendment", !isFirstFilling(rewrite) && Object.keys(rewrite).join() === "result");

    const coding = pickContentChanges(consultation, { icd10_codes: ["A50.9"] }, { icd10_codes: [] });
    check("adding an ICD-10 code is an amendment", Object.keys(coding).join() === "icd10_codes");

    check(
        "arrays compare by content, not identity",
        Object.keys(pickContentChanges(consultation, { icd10_codes: ["A50.9"] }, { icd10_codes: ["A50.9"] })).length === 0
    );
}

// ── Countdown formatting ───────────────────────────────────────────────────
{
    check("hours + minutes", formatCountdown(5 * HOUR + 12 * 60_000) === "5h 12m", formatCountdown(5 * HOUR + 12 * 60_000));
    check("whole hours drop the zero minutes", formatCountdown(5 * HOUR) === "5h", formatCountdown(5 * HOUR));
    check("under an hour shows minutes", formatCountdown(48 * 60_000) === "48m");
    check("expired shows 0m", formatCountdown(0) === "0m");
}

// ── Registry integrity (the migration mirrors this list) ────────────────────
{
    const types = Object.keys(AMENDMENT_REGISTRY);
    check("every record type declares the window rule", types.length === 9, `got ${types.length}`);
    for (const type of types) {
        const def = getRecordDef(type as any);
        check(`${type}: fields ⊆ content columns`, def.fields.every(f => def.content.includes(f.column)));
        check(`${type}: has an anchor column`, def.anchor.length > 0);
        check(`${type}: names its table`, !!def.table);
        check(`${type}: has editor roles`, def.editorRoles.length > 0);
    }
    check("unknown types are rejected", !isAmendableRecordType("patients"));
    check("lab and radiology share a table but stay distinct types",
        getRecordDef("lab_result").table === getRecordDef("radiology_report").table
        && getRecordDef("lab_result").content.join() !== getRecordDef("radiology_report").content.join());
}

console.log(`\n${checks - failures}/${checks} checks passed\n`);
if (failures) {
    console.error(`${failures} amendment-policy check(s) failed.`);
    process.exit(1);
}
