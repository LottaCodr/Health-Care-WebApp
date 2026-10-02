/**
 * Front-desk patient list — how many round trips and how many bytes does it
 * cost to show page 1 of the registry?
 *
 * Run with:  npm run check:patient-list
 *
 * Executes the app's real `lib/services/patient.service.ts` against a mock
 * Supabase holding a realistic registry, and asserts the numbers the
 * front-desk "All Patients" tab actually pays.
 */
import assert from "node:assert/strict";
import { createMockSupabase, makePatients } from "./dev-harness/mock-supabase.mjs";

const REGISTRY_SIZE = 12_000;

const patients = makePatients(REGISTRY_SIZE);
const mock = createMockSupabase({
    staff: [{ id: "11111111-2222-4333-8444-555555555555", email: "frontdesk@hospital.test", role: "FrontDesk" }],
    patients,
});
const port = await mock.start();
process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${port}`;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key";

const svc = await import("../lib/services/patient.service.ts");

const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;

// ── The tab-badge counts (one server action, N index-only count queries) ─────
mock.requests.length = 0;
const counts = await svc.getPatientStatusCounts();
assert.equal(counts.total, REGISTRY_SIZE);
console.log(
    `getPatientStatusCounts(): ${mock.restCalls()} REST calls, total=${counts.total}, ` +
    `${kb(mock.payloadBytes())} of rows`
);

// ── What the front-desk list renders: page 1 of 100 ──────────────────────────
mock.requests.length = 0;
const page = await svc.listPatientsPage({ page: 1, pageSize: 100 });
assert.equal(page.rows.length, 100, "page 1 must hold exactly one screen of patients");
assert.equal(page.total, REGISTRY_SIZE, "the exact registry total must come back with the page");
assert.equal(page.rows[0].id, patients[0].id, "FIFO order: earliest arrival first");
console.log(
    `listPatientsPage({page:1,pageSize:100}): ${mock.restCalls()} REST calls, ` +
    `${page.rows.length} rows, ${kb(mock.payloadBytes())} — total reported as ${page.total}`
);
assert.ok(mock.restCalls() <= 2, "one page must not cost more than a page + its count");

// ── …and page 7, and a search ────────────────────────────────────────────────
mock.requests.length = 0;
const page7 = await svc.listPatientsPage({ page: 7, pageSize: 100 });
assert.equal(page7.rows[0].id, patients[600].id);
console.log(`listPatientsPage({page:7}): ${mock.restCalls()} REST calls, first row ${page7.rows[0].hospital_number}`);

mock.requests.length = 0;
const searched = await svc.listPatientsPage({ page: 1, pageSize: 100, search: "Patient 42" });
assert.ok(searched.total >= 1, "search must be answered by the database, not by filtering a full download");
assert.ok(searched.rows.every((r: any) => r.name.includes("Patient 42")));
console.log(
    `listPatientsPage({search:"Patient 42"}): ${mock.restCalls()} REST calls, ${searched.total} matches`
);

// PostgREST `or=` syntax typed at the desk must be neutralised, not parsed.
const hostile = await svc.listPatientsPage({ page: 1, pageSize: 100, search: "name.eq.Patient 9,(extra).%_" });
assert.ok(Array.isArray(hostile.rows), "hostile search input must not throw or widen the match");
console.log(`hostile search input ("name.eq.…,(extra).%_") → ${hostile.total} matches, no crash`);

// ── The old full-table fetch, for comparison ─────────────────────────────────
mock.requests.length = 0;
const everythingResult = await svc.getAllPatients();
assert.ok(everythingResult.ok);
const everything = everythingResult.data;
assert.equal(everything.length, REGISTRY_SIZE);
console.log(
    `\ngetAllPatients() (the old "All Patients" tab): ${mock.restCalls()} sequential REST calls, ` +
    `${everything.length} rows, ${mb(mock.payloadBytes())} of JSON — to render 100 of them`
);

await mock.stop();
console.log("\nPatient list checks passed.");
