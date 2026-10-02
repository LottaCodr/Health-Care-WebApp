/**
 * Patient lookup / search / admin list — repro against the REAL server action.
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
const found = await svc.lookupPatient(TRIAGED.id);
assert.ok(found.ok && found.data?.id === TRIAGED.id, "an existing patient must be returned");
assert.equal(found.data?.name, TRIAGED.name);
console.log(`✓ lookupPatient() returns the row for an existing id (${found.data?.hospital_number})`);

// ── 2. The nurse's queue still finds them ────────────────────────────────────
const queue = await svc.listPatientsByStatus("sent-to-nurse" as any);
assert.equal(queue.length, 1);
assert.equal(queue[0].id, TRIAGED.id);
console.log(`✓ listPatientsByStatus("sent-to-nurse") returns ${queue.length} patient`);

// ── 3. A genuinely missing id ────────────────────────────────────────────────
// `data: null` is reserved for THIS case, so "Patient not found." stays truthful.
const missing = await svc.lookupPatient("00000000-0000-4000-8000-000000000999");
assert.deepEqual(missing, { ok: true, data: null });
const junk = await svc.lookupPatient("undefined");
assert.deepEqual(junk, { ok: true, data: null });
console.log("✓ a truly unknown id resolves to ok/null — and only that does");

// ── 4. A FAILED READ must NOT masquerade as a missing patient ────────────────
// …and must be RETURNED, not thrown. This is a Server Action: Next.js replaces
// the message of anything it throws with "An error occurred in the Server
// Components render. The specific message is omitted in production builds…"
// before it reaches the browser — which is exactly what every department saw
// under "This record could not be opened". A returned message survives.
mock.rejectTable("patients");
const refused = await svc.lookupPatient(TRIAGED.id);
mock.allowTable("patients");
assert.equal(refused.ok, false, "a refused read must be a failure, not ok/null");
assert.match(String((refused as any).message), /row-level security|permission denied/i);
assert.equal((refused as any).code, "42501");
console.log(`✓ a refused read is RETURNED with its reason → "${(refused as any).message.slice(0, 60)}…"`);

// ── 5. The staff-profile lookup failing is its own, readable failure ─────────
// It used to collapse into "UNAUTHORIZED: You must be signed in…" — telling a
// signed-in nurse to sign in again when the database merely hiccuped.
mock.rejectTable("staffs");
const noStaff = await svc.lookupPatient(TRIAGED.id);
mock.allowTable("staffs");
assert.equal(noStaff.ok, false);
assert.match(String((noStaff as any).message), /could not verify your staff account|staff/i);
assert.doesNotMatch(String((noStaff as any).message), /must be signed in/i);
console.log(`✓ a failed staff-profile read says so → "${(noStaff as any).message.slice(0, 70)}…"`);

// ── 6. Search: a failed search is a failure, not "no patients match" ─────────
const hit = await svc.searchPatients(TRIAGED.name.split(" ")[0]);
assert.ok(hit.ok && hit.data.some((p: any) => p.id === TRIAGED.id), "search must find an existing patient");
const punctuated = await svc.searchPatients("Doe, John (jr)");
assert.ok(punctuated.ok, "commas/parentheses typed in the box must not break the filter");
mock.rejectTable("patients");
const failedSearch = await svc.searchPatients("Patient");
mock.allowTable("patients");
assert.equal(failedSearch.ok, false, "a refused search must not come back as an empty list");
console.log("✓ searchPatients() reports a failed read instead of an empty list");

// ── 7. Admin's recent-records list does the same ─────────────────────────────
const recent = await svc.getAllPatients(0, 500);
assert.ok(recent.ok && recent.data.length === patients.length);
mock.rejectTable("patients");
const failedRecent = await svc.getAllPatients(0, 500);
mock.allowTable("patients");
assert.equal(failedRecent.ok, false);
console.log("✓ getAllPatients() reports a failed read instead of an empty registry");

// …and the patient is demonstrably still there the moment the read works.
const again = await svc.lookupPatient(TRIAGED.id);
assert.ok(again.ok && again.data?.id === TRIAGED.id);
console.log(`✓ the very next read of the same id succeeds (${again.ok && again.data?.hospital_number})`);

await mock.stop();
console.log("\nPatient lookup checks passed.");
