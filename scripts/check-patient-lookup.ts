/**
 * Nurse triage "Patient not found" — repro against the REAL server action.
 *
 * Run with:  npm run check:patient-lookup
 *
 * Boots a mock Supabase (GoTrue + PostgREST) and calls the app's own
 * `lib/services/patient.service.ts` through it, so what is exercised here is
 * the production code path a nurse's browser triggers — not a copy of it.
 */
import assert from "node:assert/strict";
import { createMockSupabase, makePatients } from "./dev-harness/mock-supabase.mjs";

const NURSE_ID = "11111111-2222-4333-8444-555555555555";

const patients = makePatients(5, {
    statusOf: (i: number) => (i === 0 ? "sent-to-nurse" : "registered"),
});
const TRIAGED = patients[0];

const mock = createMockSupabase({
    staff: [{ id: NURSE_ID, email: "nurse@hospital.test", role: "Nurse" }],
    patients,
});
const port = await mock.start();
process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${port}`;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key";

const svc = await import("../lib/services/patient.service.ts");

// ── 1. The happy path: the patient IS in the database ────────────────────────
const found = await svc.getPatientById(TRIAGED.id);
assert.equal(found?.id, TRIAGED.id, "an existing patient must be returned");
assert.equal(found?.name, TRIAGED.name);
console.log(`✓ getPatientById() returns the row for an existing id (${found?.hospital_number})`);

// ── 2. The nurse's queue still finds them ────────────────────────────────────
const queue = await svc.listPatientsByStatus("sent-to-nurse" as any);
assert.equal(queue.length, 1);
assert.equal(queue[0].id, TRIAGED.id);
console.log(`✓ listPatientsByStatus("sent-to-nurse") returns ${queue.length} patient`);

// ── 3. A genuinely missing id ────────────────────────────────────────────────
// `null` is reserved for THIS case, so "Patient not found." stays truthful.
const missing = await svc.getPatientById("00000000-0000-4000-8000-000000000999");
assert.equal(missing, null);
console.log("✓ a truly unknown id resolves to null — and only that does");

// ── 4. A FAILED READ must NOT masquerade as a missing patient ────────────────
// The nurses' bug: the read is refused (RLS/policy drift, a revoked grant, a
// PostgREST 500…) while the patient sits in the database, and the triage page
// used to render "Patient not found." because the action returned the same
// `null` as case 3. It now throws with a readable reason instead, so the page
// can say "this record could not be opened" and offer a retry.
mock.rejectTable("patients");
const refused = await svc.getPatientById(TRIAGED.id).then(
    () => null,
    (err: Error) => err
);
mock.allowTable("patients");
assert.ok(refused instanceof Error, "a refused read must surface as an error, not a null");
assert.match(String(refused.message), /row-level security|permission denied/i);
console.log(`✓ a refused read throws instead of returning null → "${refused.message.slice(0, 60)}…"`);

// …and the patient is demonstrably still there the moment the read works.
const again = await svc.getPatientById(TRIAGED.id);
assert.equal(again?.id, TRIAGED.id);
console.log(`✓ the very next read of the same id succeeds (${again?.hospital_number})`);

await mock.stop();
console.log("\nPatient lookup checks passed.");
