/**
 * Round-trip checks for restoring the lab result-entry templates during an
 * amendment. Run with: npm run check:lab-amendments
 */

import {
    buildResultString,
    findTemplate,
    parseTemplateResult,
    TEST_TEMPLATES,
} from "../components/lab-tech/test-templates.ts";
import {
    buildHematologyResultString,
    parseHematologyResultForForm,
} from "../lib/clinical/hematology-reference-ranges.ts";

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

console.log("\nLab result amendment templates");

// The order label is ambiguous, but the filed template name identifies the
// actual specimen-specific form and must be restored rather than guessed.
{
    const template = TEST_TEMPLATES.find((item) => item.name === "H. pylori antibody (blood)")!;
    const filed = `${buildResultString(template, { hpylori_antibody: "Negative" })}\n\nAdditional Notes:\nRepeat confirmed on a second run.`;
    const restored = parseTemplateResult("H. pylori", filed);
    check("restores the template recorded in an ambiguous order", restored.template?.name === template.name);
    check("prefills the filed structured value", restored.values.hpylori_antibody === "Negative");
    check("restores additional observations", restored.extraNotes === "Repeat confirmed on a second run.");
}

// FBC results filed before the analyzer form shipped used the generic
// four-column layout and should reopen in the matching legacy template.
{
    const fbc = findTemplate("Full Blood Count (FBC)")!;
    const filed = buildResultString(fbc, { wbc: "7.4", hgb: "13.1" });
    const restored = parseTemplateResult("Full Blood Count (FBC)", filed);
    check("restores legacy generic FBC reports", restored.structured && restored.template?.name === fbc.name);
    check("prefills legacy FBC field values", restored.values.wbc === "7.4" && restored.values.hgb === "13.1");
}

// The analyzer report has its own format and must recover the original
// reference partition, mode, sample/time, entered values and notes.
{
    const filed = buildHematologyResultString({
        category: "adult_female",
        categoryNote: "Selected manually",
        mode: "Capillary",
        sampleId: "sample-12345678",
        testTime: "2026-09-30T13:45:00.000Z",
        values: { wbc: "6.8", lym: "2.1", gran: "3.4", plt: "254" },
        extraNotes: "Smear reviewed.\nNo clumping seen.",
    });
    const restored = parseHematologyResultForForm(filed);
    check("restores analyzer range selection and run details",
        restored?.category === "adult_female"
        && restored.mode === "Capillary"
        && restored.sampleId === "sample-12345678"
        && restored.testTime === "2026-09-30T13:45:00.000Z");
    check("prefills analyzer values and preserves notes",
        restored?.values.wbc === "6.8"
        && restored.values.plt === "254"
        && restored.extraNotes === "Smear reviewed.\nNo clumping seen.");
}

{
    const original = "Culture grew E. coli. Sensitivity pending.";
    const restored = parseTemplateResult("Culture", original);
    check("leaves unstructured free-text reports intact", !restored.structured && restored.extraNotes === original);

    const template = TEST_TEMPLATES.find((item) => item.name === "H. pylori antibody (blood)")!;
    const filed = buildResultString(template, { hpylori_antibody: "Negative" });
    const withUnknownRow = filed.replace("\nNote:", "\nUnexpected legacy row\tPreserve me\t—\t\nNote:");
    const legacy = parseTemplateResult("H. pylori", withUnknownRow);
    check("keeps unrecognised legacy rows instead of dropping them", !legacy.structured && legacy.extraNotes === withUnknownRow);
}

console.log(`\n${checks - failures}/${checks} checks passed\n`);
if (failures) {
    console.error(`${failures} lab amendment template check(s) failed.`);
    process.exit(1);
}
