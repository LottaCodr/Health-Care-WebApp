/** Run with npm run check:lab-identity (no database required). */
import assert from "node:assert/strict";
import { buildResultString, findTemplate, isPyloriOrder } from "../components/lab-tech/test-templates.ts";
import { patientAgeOn, patientAgeYearsPrecise } from "../lib/clinical/patient-age.ts";

const antibody = findTemplate("H.pylori antibody (blood)");
const antigen = findTemplate("H.pylori antigen (stool)");
assert.equal(antibody?.name, "H. pylori antibody (blood)");
assert.equal(antigen?.name, "H. pylori antigen (stool)");
assert.notEqual(antibody?.fields[0]?.key, antigen?.fields[0]?.key);
assert.match(buildResultString(antibody!, { hpylori_antibody: "Positive" }), /H\. pylori antibody \(blood\)/);
assert.match(buildResultString(antigen!, { hpylori_antigen: "Negative" }), /H\. pylori antigen \(stool\)/);
for (const ambiguous of ["H. pylori", "Helicobacter", "H-pylori blood", "H. pylori antibody stool", "H. pylori antigen blood", "H pylori antibody and antigen"]) {
    assert.equal(isPyloriOrder(ambiguous), true, ambiguous);
    assert.equal(findTemplate(ambiguous), null, `${ambiguous} must not default to a different specimen`);
}
assert.equal(findTemplate("H pylori IgG serum")?.name, antibody?.name);
assert.equal(findTemplate("H pylori Ag faecal")?.name, antigen?.name);
assert.equal(findTemplate("H pylori antibody")?.name, antibody?.name);
assert.equal(findTemplate("H pylori antigen")?.name, antigen?.name);
for (const typo of ["Urinalysis", "Urinalisis", "Urinalysys", "Urinealysis", "Urinanalysis"]) {
    assert.equal(findTemplate(typo)?.name, "Urinalysis", typo);
}
assert.notEqual(findTemplate("Urine culture")?.name, "Urinalysis");

for (const order of ["Urine MCS", "Urine M/C/S", "Urine culture"]) {
    const urineMcs = findTemplate(order);
    assert.equal(urineMcs?.name, "Urine MCS", order);
    assert.deepEqual(
        urineMcs!.fields.filter(field => ["colour", "appearance", "yeast"].includes(field.key)).map(field => field.label),
        ["Colour", "Appearance", "Yeast Cells"],
    );
    const result = buildResultString(urineMcs!, {
        colour: "Amber", appearance: "Clear", yeast: "Nil",
    });
    for (const row of ["Colour\tAmber", "Appearance\tClear", "Yeast Cells\tNil"]) {
        assert.ok(result.includes(row), `${order}: missing ${row} in result`);
    }
}

assert.equal(patientAgeOn("2000-09-29", "2026-09-28"), 25);
assert.equal(patientAgeOn("2000-09-29", "2026-09-29"), 26);
assert.equal(patientAgeOn("2000-09-29", "2026-10-01"), 26);
assert.equal(patientAgeOn("2024-02-29", "2025-02-28"), 0);
assert.equal(patientAgeOn("2024-02-29", "2025-03-01"), 1);
assert.equal(patientAgeOn("2026-09-29", "2026-09-28"), null);
assert.equal(patientAgeOn("2026-02-30", "2026-09-28"), null);
assert.equal(patientAgeOn("2000-01-01T00:00:00Z", "2026-01-01"), 26);
assert.equal(patientAgeOn("2000-01-01", new Date("2026-01-01T00:15:00Z")), 26);
assert.equal(patientAgeOn("2000-09-29", "2026-09-28T23:30:00Z"), 26); // Sep 29 in Abuja
assert.equal(patientAgeOn("2000-09-29", "2026-09-28T22:30:00Z"), 25);
assert.equal(patientAgeYearsPrecise("2026-09-01", "2026-09-28")! < 28 / 365.25, true);
assert.equal(patientAgeYearsPrecise("2026-08-31", "2026-09-28")! >= 28 / 365.25, true);
assert.equal(Math.floor(patientAgeYearsPrecise("2008-09-29", "2026-09-28")!), 17);
console.log("Lab identity, specimen and age checks passed.");
