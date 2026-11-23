/**
 * Staff registration + confirmation email onboarding — verification against
 * the REAL server actions in `lib/services/staff.service.ts`.
 *
 * Run with:  npm run check:staff-onboarding
 */
import assert from "node:assert/strict";
import { createMockSupabase } from "./dev-harness/mock-supabase.mjs";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const DOCTOR_ID = "22222222-2222-4222-8222-222222222222";

const auditLogs: any[] = [];

const mock = createMockSupabase({
    staff: [
        { id: ADMIN_ID, email: "admin@hospital.test", name: "Chief Admin", role: "Admin" },
        { id: DOCTOR_ID, email: "doctor@hospital.test", name: "Dr. Musa", role: "Doctor" },
    ],
    patients: [],
    tables: {
        audit_logs: auditLogs,
    },
});

const port = await mock.start();
process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${port}`;
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "mock-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "mock-service-role-key";
process.env.NEXT_PUBLIC_APP_URL = "https://emr.nilevalley.test";

const staffSvc = await import("../lib/services/staff.service.ts");

// ── 1. Non-Admin RBAC enforcement ─────────────────────────────────────────────
mock.setActiveStaff(DOCTOR_ID);
await assert.rejects(
    () =>
        staffSvc.createStaff({
            name: "Unauthorized User",
            email: "unauth@hospital.test",
            phone_number: "+2348000000000",
            role: "Nurse" as any,
            department: "",
            onboardingMode: "invite",
        }),
    /not allowed|admin/i
);
await assert.rejects(
    () => staffSvc.getStaffEmailConfirmationStatuses(),
    /not allowed|admin/i
);
const resendDenied = await staffSvc.resendStaffConfirmation(DOCTOR_ID);
assert.equal(resendDenied.ok, false);
console.log("✓ Non-Admin staff cannot create staff, read confirmation status, or resend invites");

// ── 2. Admin creates staff via Invite mode (default, no password) ─────────────
mock.setActiveStaff(ADMIN_ID);

const invited = await staffSvc.createStaff({
    name: "Nurse Amina",
    email: "amina@hospital.test",
    phone_number: "+2348011112222",
    role: "Nurse" as any,
    department: "Maternity",
    onboardingMode: "invite",
});

assert.equal(invited.onboardingMode, "invite");
assert.equal(invited.confirmationEmailSent, true);
assert.equal(mock.sentAuthEmails.length, 1);
assert.equal(mock.sentAuthEmails[0].kind, "invite");
assert.equal(mock.sentAuthEmails[0].email, "amina@hospital.test");
assert.equal(
    mock.sentAuthEmails[0].redirectTo,
    "https://emr.nilevalley.test/auth/confirm?mode=invite"
);
console.log("✓ Invite mode creates staff profile and sends Supabase invite/confirmation email");

// ── 3. Admin creates staff via Temp Password + Confirmation Email mode ────────
const tempPwStaff = await staffSvc.createStaff({
    name: "Lab Tech Bello",
    email: "bello@hospital.test",
    phone_number: "+2348033334444",
    role: "LabTechnician" as any,
    department: "Haematology",
    onboardingMode: "temp_password",
    password: "TempPass!2026",
});

assert.equal(tempPwStaff.onboardingMode, "temp_password");
assert.equal(tempPwStaff.confirmationEmailSent, true);
assert.equal(mock.sentAuthEmails.length, 2);
assert.equal(mock.sentAuthEmails[1].kind, "resend:signup");
assert.equal(mock.sentAuthEmails[1].email, "bello@hospital.test");
assert.equal(
    mock.sentAuthEmails[1].redirectTo,
    "https://emr.nilevalley.test/auth/confirm?mode=signup"
);

const tempAuthUser = mock.authUsers.find((u: any) => u.id === tempPwStaff.id);
assert.equal(tempAuthUser?.email_confirmed_at, null, "Temp-password user must start unconfirmed");
console.log("✓ Temp-password mode creates unconfirmed user and sends signup confirmation email");

// ── 4. Confirmation status map & Resend Confirmation ──────────────────────────
const statuses = await staffSvc.getStaffEmailConfirmationStatuses();
assert.equal(statuses[invited.id]?.emailConfirmedAt, null);
assert.equal(statuses[invited.id]?.onboardingMode, "invite");
assert.equal(statuses[tempPwStaff.id]?.emailConfirmedAt, null);
assert.equal(statuses[tempPwStaff.id]?.onboardingMode, "temp_password");

const resendInvite = await staffSvc.resendStaffConfirmation(invited.id);
assert.equal(resendInvite.ok, true);
assert.equal(mock.sentAuthEmails[2].kind, "otp");
assert.equal(mock.sentAuthEmails[2].redirectTo, "https://emr.nilevalley.test/auth/confirm?mode=invite");

const resendSignup = await staffSvc.resendStaffConfirmation(tempPwStaff.id);
assert.equal(resendSignup.ok, true);
assert.equal(mock.sentAuthEmails[3].kind, "resend:signup");
console.log("✓ Pending confirmation statuses and Admin resend work for both onboarding modes");

// ── 5. Once confirmed, resend is blocked cleanly ──────────────────────────────
mock.confirmAuthUser(invited.id);
const statusesAfter = await staffSvc.getStaffEmailConfirmationStatuses();
assert.ok(statusesAfter[invited.id]?.emailConfirmedAt, "Confirmed timestamp must reflect verification");

const resendAlready = await staffSvc.resendStaffConfirmation(invited.id);
assert.equal(resendAlready.ok, false);
assert.match(resendAlready.message, /already confirmed/i);
console.log("✓ Confirmed staff are marked verified and cannot be re-sent confirmation links");

// ── 6. Auth rollback if DB profile insert fails ───────────────────────────────
const authCountBefore = mock.authUsers.length;
mock.rejectTable("staffs");
await assert.rejects(() =>
    staffSvc.createStaff({
        name: "Rollback Test",
        email: "rollback@hospital.test",
        phone_number: "",
        role: "Doctor" as any,
        department: "",
        onboardingMode: "invite",
    })
);
mock.allowTable("staffs");
assert.equal(
    mock.authUsers.length,
    authCountBefore,
    "Auth user must be rolled back if staffs table insert fails"
);
console.log("✓ Auth user rolls back cleanly if public.staffs insert fails");

// Audit trail assertions
const actions = auditLogs.map((l) => l.action);
assert.ok(actions.includes("STAFF_CREATED"));
assert.ok(actions.includes("STAFF_CONFIRMATION_RESENT"));
console.log("✓ Audit log records STAFF_CREATED and STAFF_CONFIRMATION_RESENT");

await mock.stop();
console.log("\nAll staff onboarding & confirmation email checks passed.");
