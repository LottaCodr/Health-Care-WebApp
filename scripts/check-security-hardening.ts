/**
 * Security hardening regression checks against real helpers and server actions.
 *
 * Run with:  npm run check:security
 */
import assert from "node:assert/strict";
import { createMockSupabase } from "./dev-harness/mock-supabase.mjs";
import { escapeHtml, sanitizeNextPath } from "../lib/security.ts";
import { csvCell, toCsv } from "../lib/utils/csv.ts";

// ── 1. Pure helpers: escapeHtml, sanitizeNextPath, CSV formula neutralization ──
assert.equal(
    escapeHtml('<script>alert("xss")</script>`&\''),
    "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&#96;&amp;&#39;"
);
assert.equal(sanitizeNextPath("https://evil.example"), null);
assert.equal(sanitizeNextPath("//evil.example"), null);
assert.equal(sanitizeNextPath("\\evil.example"), null);
assert.equal(sanitizeNextPath("javascript:alert(1)"), null);
assert.equal(sanitizeNextPath("/doctor/dashboard?tab=1"), "/doctor/dashboard?tab=1");

assert.equal(csvCell("=CMD|' /C calc'!A0"), "'=CMD|' /C calc'!A0");
assert.equal(csvCell("+1+1"), "'+1+1");
assert.equal(csvCell("@SUM(1,2)"), "\"'@SUM(1,2)\"");
assert.equal(csvCell("-cmd"), "'-cmd");
assert.equal(csvCell(-42.5), "-42.5");
assert.match(toCsv(["a", "b"], [{ a: "=1+1", b: "ok, \"quoted\"" }]), /^a,b\n'=1\+1,"ok, ""quoted"""$/);
console.log("✓ escapeHtml, sanitizeNextPath, and CSV formula neutralization pass");

// ── 2. Server action auth & deactivated-staff checks ─────────────────────────
const ACTIVE_FRONTDESK = "11111111-1111-4111-8111-111111111111";
const INACTIVE_ADMIN = "22222222-2222-4222-8222-222222222222";
const PORTAL_USER = "33333333-3333-4333-8333-333333333333";

const mock = createMockSupabase({
    staff: [
        {
            id: ACTIVE_FRONTDESK,
            email: "frontdesk@hospital.test",
            name: "Front Desk",
            role: "FrontDesk",
            is_active: true,
        },
        {
            id: INACTIVE_ADMIN,
            email: "former.admin@hospital.test",
            name: "Former Admin",
            role: "Admin",
            is_active: false,
        },
        {
            id: PORTAL_USER,
            email: "patient@hospital.test",
            name: "Portal Patient",
            role: "Patient",
            is_active: true,
        },
    ],
    patients: [],
});

const port = await mock.start();
process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${port}`;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key";

const { requireStaff } = await import("../lib/services/auth-guard.ts");
const { generatePatientRecord } = await import("../lib/actions/generate-patient-record.tsx");
const { bulkUploadRows } = await import("../lib/actions/patient-workflow.actions.ts");
const apptSvc = await import("../lib/services/appointment.service.ts");
const docSvc = await import("../lib/services/patient-documents.service.ts");
const staffSvc = await import("../lib/services/staff.service.ts");

// Deactivated staff must be rejected by requireStaff and every protected server action.
mock.setActiveStaff(INACTIVE_ADMIN);
await assert.rejects(() => requireStaff(), /staff|sign in/i);
await assert.rejects(
    () =>
        generatePatientRecord({
            patientId: "patient-1",
            sections: ["demographics"],
            dateFrom: "",
            dateTo: "",
            format: "print",
            includeStamp: false,
        }),
    /staff|sign in/i
);
await assert.rejects(() => bulkUploadRows("patients", []), /staff|sign in/i);
await assert.rejects(() => apptSvc.listAppointmentsByDate("2026-11-23"), /staff|sign in/i);
await assert.rejects(() => apptSvc.listAppointmentsByPatient("patient-1"), /staff|sign in/i);
await assert.rejects(() => apptSvc.listUpcomingAppointments(), /staff|sign in/i);
console.log("✓ Deactivated staff are rejected by requireStaff and protected actions");

// Non-staff role (e.g. unrecognized/patient role) must also be rejected.
mock.setActiveStaff(PORTAL_USER);
await assert.rejects(() => requireStaff(), /role|staff|sign in/i);
console.log("✓ Non-staff role is rejected by requireStaff");

// Active FrontDesk checks: upload validation + updateOwnProfile field stripping
mock.setActiveStaff(ACTIVE_FRONTDESK);
await assert.rejects(
    () =>
        docSvc.uploadPatientDocument({
            patientId: "../../etc/passwd",
            fileBase64: Buffer.from("hello").toString("base64"),
            fileName: "test.pdf",
            mimeType: "application/pdf",
            fileSize: 5,
            documentType: "other" as any,
        }),
    /invalid patient/i
);
await assert.rejects(
    () =>
        docSvc.uploadPatientDocument({
            patientId: "patient-1",
            fileBase64: Buffer.from("<script>alert(1)</script>").toString("base64"),
            fileName: "evil.html",
            mimeType: "text/html",
            fileSize: 25,
            documentType: "other" as any,
        }),
    /unsupported file type/i
);

const updatedSelf = await staffSvc.updateOwnProfile({
    name: "Front Desk Updated",
    phone_number: "+2348000000001",
    email: "spoofed@evil.test",
    role: "Admin",
    is_active: false,
} as any);
assert.equal(updatedSelf.name, "Front Desk Updated");
assert.equal(updatedSelf.email, "frontdesk@hospital.test");
assert.equal(updatedSelf.role, "FrontDesk");
console.log("✓ Patient document validation & self-profile privilege protection pass");

await mock.stop();
console.log("\nALL SECURITY HARDENING CHECKS PASSED.");
