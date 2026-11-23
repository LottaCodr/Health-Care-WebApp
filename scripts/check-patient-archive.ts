/**
 * Patient disable / restore / delete (Admin-only) — verification against the
 * REAL server actions in `lib/services/patient.service.ts`.
 *
 * Run with:  npm run check:patient-archive
 */
import assert from "node:assert/strict";
import { createMockSupabase, makePatients } from "./dev-harness/mock-supabase.mjs";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const NURSE_ID = "22222222-2222-4222-8222-222222222222";
const FRONTDESK_ID = "33333333-3333-4333-8333-333333333333";

const patients = makePatients(4, {
    statusOf: (i: number) => (i === 0 || i === 1 ? "awaiting-consultation" : "registered"),
});

// Make patient[1] look like an accidental duplicate of patient[0] created after shift change
patients[1].name = patients[0].name;
patients[1].phone = patients[0].phone;

// Patient[2] has a linked consultation record so hard delete must be blocked
const consultations = [
    { id: "c-1", patient_id: patients[2].id, complaint: "Fever" },
];
const auditLogs: any[] = [];

const mock = createMockSupabase({
    staff: [
        { id: ADMIN_ID, email: "admin@hospital.test", name: "Chief Admin", role: "Admin" },
        { id: NURSE_ID, email: "nurse@hospital.test", name: "Shift Nurse", role: "Nurse" },
        { id: FRONTDESK_ID, email: "desk@hospital.test", name: "Desk Officer", role: "FrontDesk" },
    ],
    patients,
    tables: {
        audit_logs: auditLogs,
        consultations,
        lab_requests: [],
        prescriptions: [],
        payments: [],
        patient_admissions: [],
        appointments: [],
        nursing_actions: [],
        discharge_notes: [],
        patient_documents: [],
        ivf_cycles: [],
    },
});

const port = await mock.start();
process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${port}`;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key";

const svc = await import("../lib/services/patient.service.ts");

// ── 1. Non-Admin RBAC enforcement ─────────────────────────────────────────────
for (const [label, staffId] of [
    ["Nurse", NURSE_ID],
    ["FrontDesk", FRONTDESK_ID],
] as const) {
    mock.setActiveStaff(staffId);

    const d = await svc.disablePatient({ patientId: patients[1].id, reason: "duplicate-entry" });
    assert.equal(d.ok, false, `${label} must NOT be allowed to disable a patient`);
    assert.equal((d as any).code, "FORBIDDEN");
    assert.match(String((d as any).message), /not allowed|admin/i);

    const r = await svc.restorePatient(patients[1].id);
    assert.equal(r.ok, false, `${label} must NOT be allowed to restore a patient`);
    assert.equal((r as any).code, "FORBIDDEN");
    assert.match(String((r as any).message), /not allowed|admin/i);

    const del = await svc.deletePatient({ patientId: patients[1].id, reason: "duplicate-entry" });
    assert.equal(del.ok, false, `${label} must NOT be allowed to delete a patient`);
    assert.equal((del as any).code, "FORBIDDEN");
    assert.match(String((del as any).message), /not allowed|admin/i);

    const listDis = await svc.listDisabledPatients();
    assert.equal(listDis.ok, false, `${label} must NOT be allowed to list disabled records`);

    const act = await svc.getPatientActivitySummary(patients[1].id);
    assert.equal(act.ok, false, `${label} must NOT be allowed to inspect archive summary`);

    const dups = await svc.findPotentialDuplicatePatients(patients[1].id);
    assert.equal(dups.ok, false, `${label} must NOT be allowed to query duplicate candidates`);

    // Ensure updatePatient strips archive fields for non-Admins
    await svc.updatePatient(patients[1].id, {
        is_active: false,
        disabled_reason: "Bypass attempt",
        notes: "Updated note",
    } as any);
    assert.equal(patients[1].is_active, true, `${label} must not be able to mutate is_active via updatePatient`);
    assert.equal(patients[1].disabled_reason, null);
}
console.log("✓ Non-Admin roles (Nurse, FrontDesk) are strictly blocked from disabling/restoring/deleting");

// ── 2. Switch to Admin and find potential duplicates ──────────────────────────
mock.setActiveStaff(ADMIN_ID);

const dupRes = await svc.findPotentialDuplicatePatients(patients[1].id);
assert.ok(dupRes.ok, "Admin should be able to find potential duplicates");
assert.ok(
    dupRes.data.some((p: any) => p.id === patients[0].id),
    "Primary patient should be returned as a potential duplicate match"
);
assert.ok(
    !dupRes.data.some((p: any) => p.id === patients[1].id),
    "Target patient itself must be excluded from duplicate candidates"
);
console.log("✓ Admin duplicate finder locates matching primary record");

// ── 3. Admin disables duplicate patient[1] ────────────────────────────────────
const disableRes = await svc.disablePatient({
    patientId: patients[1].id,
    reason: "duplicate-entry",
    duplicateOfPatientId: patients[0].id,
    note: "Registered twice across morning/afternoon shift handover",
});
assert.ok(disableRes.ok, "Admin disablePatient should succeed");
assert.equal(patients[1].is_active, false);
assert.equal(patients[1].duplicate_of_patient_id, patients[0].id);
assert.match(String(patients[1].disabled_reason), /Duplicate entry/i);
assert.ok(patients[1].disabled_at);
assert.equal(patients[1].disabled_by, ADMIN_ID);
console.log("✓ Admin disablePatient archives duplicate and links primary patient");

// Disabled patient must vanish from active queues, searches, counts, and pages
const queue = await svc.listPatientsByStatus("awaiting-consultation" as any);
assert.equal(queue.length, 1);
assert.equal(queue[0].id, patients[0].id);

const counts = await svc.getPatientStatusCounts();
assert.equal(counts.total, 3);
assert.equal(counts.byStatus["awaiting-consultation"], 1);

const searchRes = await svc.searchPatients(patients[0].name);
assert.ok(searchRes.ok);
assert.ok(searchRes.data.some((p: any) => p.id === patients[0].id));
assert.ok(!searchRes.data.some((p: any) => p.id === patients[1].id), "Disabled patient must not appear in searchPatients");

const allRes = await svc.getAllPatients(0, 50);
assert.ok(allRes.ok);
assert.equal(allRes.data.length, 3);

const pageRes = await svc.listPatientsPage({ page: 1, pageSize: 20 });
assert.equal(pageRes.total, 3);

const disabledList = await svc.listDisabledPatients();
assert.ok(disabledList.ok);
assert.equal(disabledList.data.length, 1);
assert.equal(disabledList.data[0].id, patients[1].id);
console.log("✓ Disabled patient is excluded from all active queues, counts, searches, and pages");

// Status transition must be blocked for a disabled patient
await assert.rejects(
    () => svc.updatePatientStatus(patients[1].id, "under-consultation" as any),
    /disabled/i
);
console.log("✓ Disabled patient cannot be routed through clinical status transitions");

// Direct lookup by ID still works so Admin can open and restore it
const lookupDisabled = await svc.lookupPatient(patients[1].id);
assert.ok(lookupDisabled.ok && lookupDisabled.data?.id === patients[1].id && lookupDisabled.data.is_active === false);

// ── 4. Admin restores patient[1] ──────────────────────────────────────────────
const restoreRes = await svc.restorePatient(patients[1].id);
assert.ok(restoreRes.ok, "Admin restorePatient should succeed");
assert.equal(patients[1].is_active, true);
assert.equal(patients[1].disabled_at, null);
assert.equal(patients[1].disabled_by, null);
assert.equal(patients[1].disabled_reason, null);
assert.equal(patients[1].duplicate_of_patient_id, null);

const afterRestoreAll = await svc.getAllPatients(0, 50);
assert.ok(afterRestoreAll.ok && afterRestoreAll.data.length === 4);
console.log("✓ Admin restorePatient reactivates the record across queues and registry");

// ── 5. Hard-delete safety: blocked when linked records exist ──────────────────
const summaryWithHistory = await svc.getPatientActivitySummary(patients[2].id);
assert.ok(summaryWithHistory.ok);
assert.equal(summaryWithHistory.data.canHardDelete, false);
assert.equal(summaryWithHistory.data.totalLinkedRecords, 1);
assert.equal(summaryWithHistory.data.counts.consultations, 1);

const blockedDelete = await svc.deletePatient({
    patientId: patients[2].id,
    reason: "duplicate-entry",
});
assert.equal(blockedDelete.ok, false, "Patient with consultation records must NOT be hard-deleted");
assert.match(String((blockedDelete as any).message), /cannot be permanently deleted|disable/i);
assert.ok(patients.some((p) => p.id === patients[2].id), "Patient with clinical history must remain in DB");
console.log("✓ Hard delete refuses to remove patients with linked clinical/billing records");

// ── 6. Hard-delete succeeds for zero-history duplicate ────────────────────────
const summaryClean = await svc.getPatientActivitySummary(patients[1].id);
assert.ok(summaryClean.ok);
assert.equal(summaryClean.data.canHardDelete, true);
assert.equal(summaryClean.data.totalLinkedRecords, 0);

const deleteOk = await svc.deletePatient({
    patientId: patients[1].id,
    reason: "duplicate-entry",
    note: "Zero-history duplicate registered on night shift handover",
});
const deletedId = deleteOk.ok ? deleteOk.data.id : "";
assert.ok(deleteOk.ok, "Admin deletePatient should succeed when patient has zero linked history");
assert.ok(!patients.some((p) => p.id === deletedId), "Deleted duplicate must be removed from DB");

// Verify audit logs captured all three lifecycle actions
const loggedActions = auditLogs.map((l) => l.action);
assert.ok(loggedActions.includes("PATIENT_DISABLED"), "Audit log must contain PATIENT_DISABLED");
assert.ok(loggedActions.includes("PATIENT_RESTORED"), "Audit log must contain PATIENT_RESTORED");
assert.ok(loggedActions.includes("PATIENT_DELETED"), "Audit log must contain PATIENT_DELETED");
console.log("✓ Zero-history duplicate permanently deleted and all actions audit-logged");

await mock.stop();
console.log("\nAll patient archive/delete checks passed.");
