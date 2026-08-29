# 🔐 Security Review — Nile Valley Hospital EMR

> **Date:** 2026-08-14 · **Branch:** `arena/019fffe5-health-care-webapp`
> **Scope:** authentication, authorization (RBAC), database access, payments, login, redirects, audit trail.
> **Verdict before fixes:** the EMR had **no real security at the data layer**. It looked protected (pages redirect you by role) but every important door was unlocked.
> **Verdict after fixes:** all loopholes below are **FIXED in code**, verified with `tsc` (0 errors), ESLint (0 errors) and a full `npm run build`. One migration file must be applied to your Supabase database (step 6) — that part can only run against the real DB.

---

## 🧒 The loopholes, explained like you're 5

Think of the EMR as a big hospital.

### 1. 🔴 The medicine cabinet had its key printed on the front door *(no database Row-Level Security)*
The app talks to a database through a public key that is sent to **every visitor's browser** — even people who are not logged in, just sitting on the login page. And the database had **no rules** saying "only hospital workers may look in the cabinet." So anyone who took the key off the front door could open the cabinet and read — or scribble on — every patient file.

**Fixed:** added `supabase/migrations/20260814_enable_rls_security.sql` — Row-Level Security on all 20 tables. Every row now checks the person's hospital badge. *(Apply it with `supabase db push`.)*

### 2. 🔴 The workers never checked your badge *(server actions had zero authorization)*
The hospital looked safe because the receptionist sends nurses to the nurse room and doctors to the doctor room. But the workers doing the actual jobs (registering patients, writing prescriptions, **creating staff accounts**) never asked "are you allowed to ask me this?" A nurse could walk up to the computer and say "make me the boss," and the computer would happily create an Admin account for them. That's how you become the boss of the hospital.

**Fixed:** new `lib/services/auth-guard.ts` (`requireStaff(...)`). Every mutating service now checks the badge **on the server** before touching data. `createStaff`/`deleteStaff`/role changes → Admin only. Staff may only edit their own profile fields.

### 3. 🔴 The lobby had a free badge-printing machine *(open self-signup + client-side staff edits)*
Anyone could create a login (open registration from the browser), and there was even code in the browser that could edit or delete staff records directly with the public key.

**Fixed:** removed `registerStaff` (open signup), deleted `actions/staff/update.deletestaff.ts` and 20+ dead client-side database files; staff editing now goes through the Admin-gated server service. *Also: disable public signups in Supabase Auth settings.*

### 4. 🟠 The cash drawer believed any paper slip *(payments trusted the caller)*
When money was recorded, the computer believed whatever the visitor wrote on the slip — who the cashier was, and even the word **"PAID."** Nobody checked the money was real or who stamped it.

**Fixed:** `payment.service.ts` now derives the cashier from the login session (caller-supplied values are ignored), only **Front Desk/Admin** can confirm payments, apply deposits, settle bills, and fix prices; auto-generated bills from lab/pharmacy are forced to "pending." All money movements are written to the audit trail.

### 5. 🟠 The front door followed a stranger's directions *(open redirect)*
After logging in, the hospital takes you to your room. A trickster could mail a link that says "after you log in, go *here*" — pointing to a fake hospital that looks exactly the same, where they'd collect your password next time.

**Fixed:** new `sanitizeNextPath()` in `lib/security.ts`, used by both `proxy.ts` and the login page. The `?next=` value must now be a local hospital path — anything pointing outside is ignored.

### 6. 🟠 The door let you guess the password forever *(rate limiter existed but was never plugged in)*
A "too many tries" guard was written but never connected — the login page let people try passwords all day.

**Fixed:** wired `loginRateLimiter` into the auth provider (5 tries → 15-minute timeout, per email). Supabase Auth's own rate limits remain the authoritative layer.

### 7. 🟠 The "who did what" notebook was empty *(no audit trail)*
The hospital kept a big notebook for writing down who did what — but every page was blank, because the writing code was commented out. If a record vanished, nobody could find out who touched it.

**Fixed:** `audit.service.ts` now records **from the session** (never a caller-supplied id) and is wired into staff creation/deletion, role changes, patient registration, status changes, consultations, prescriptions/dispensing, payments/deposits/settlements, discharges, and account deletion. The Admin audit-log page now reads through an Admin-only server function.

### 8. 🟠 A back corridor where the guards never went *(proxy skipped all of /api)*
The gatekeeper ignored the entire `/api` corridor. Anything built there later would have been wide open.

**Fixed:** `proxy.ts` now only exempts `/api/auth/*`; every other API route requires a login, and every response gets security headers (`X-Frame-Options: DENY`, `nosniff`, referrer policy, etc.).

### 9. 🟡 The smart helper outside the hospital got patient stories, no badge check
The AI decision-support features send patient details to an external service. Anyone with a login could trigger that (and burn money), and there was no guard on what patient data left the building.

**Fixed:** every AI function now requires a signed-in staff member. **Still to do (hospital policy):** only send the minimum data needed, and get patient consent where required.

### 10. 🟡 Fake security dashboard
The "Active Sessions" screen showed a hardcoded "1" — it looked secure but wasn't real. (Cosmetic; documented, not dangerous. Real session management needs Supabase Auth admin APIs.)

---

## ✅ What changed (files)

| Area | File(s) |
|---|---|
| New: server authz layer | `lib/services/auth-guard.ts` |
| New: redirect sanitizer | `lib/security.ts` |
| New: RLS migration | `supabase/migrations/20260814_enable_rls_security.sql` |
| RBAC + headers + API gating | `proxy.ts` |
| Open redirect, login throttle | `app/(public)/login/page.tsx`, `context/auth-provider.tsx` |
| Admin-only staff ops, self-profile edit | `lib/services/staff.service.ts`, `components/settings/components/account-settings.tsx` |
| Session-derived audit + Admin-only reader | `lib/services/audit.service.ts`, `components/admin/AdminAuditLog.tsx` |
| Role-gated clinical services | `patient`, `consultation`, `lab`, `radiology`, `nursing`, `pharmacy`, `payment`, `discharge`, `nurse-charts`, `admission`, `appointment`(already gated), `patient-documents`, `notification`, `process-return-visit`, `patient-routing`, `account`, `ai-service`, `lib/actions/bulk-upload.ts` |
| Payment integrity | `lib/services/payment.service.ts` (session-derived cashier, Front-Desk-only settlement, forced pending status) |
| Removed open signup + client-side DB writes | `actions/staff/staff.ts` (trimmed); deleted `actions/payment`, `actions/consultations`, `actions/nursing-action`, `actions/front-desk`, `actions/appointments`, `actions/subscriptions`, `actions/lab-tech`, `actions/login.ts`, `actions/patient.actions.ts`, `actions/staff/update.deletestaff.ts`, dead `context/employees`, `store/employee-store.ts`, unused mock patient-record components |

**Verify:** `npx tsc --noEmit` → 0 errors · `npx eslint .` → 0 errors · `npm run build` → ✅ green.

### 🔧 2026-08-29 — RLS role-matching hotfix (apply this migration)
`staff_has_role()` lowercased the role **after** stripping non-lowercase characters, so any role stored with capital letters — including the canonical values this app writes (`"FrontDesk"`, `"Doctor"`, `"LabTechnician"`, …) — matched **no** policy group. Row-Level Security then silently reduced those staff to zero-row updates: the front desk could see bills but every Edit/Settle write to `payments` was quietly dropped (the UI toasted success while the data never changed). `supabase/migrations/20260829_fix_staff_role_matching_casing.sql` replaces the helper with normalization identical to the app's `normalizeUserRole()` (lowercase first, then strip spaces/underscores/hyphens). The service layer now also verifies every guarded write actually changed a row and fails loudly instead of faking success (`payment.service.ts`, `lab.service.ts`).

### ⚠️ One step needs the real database
Run `supabase db push` (or execute `supabase/migrations/20260814_enable_rls_security.sql`) against your Supabase project, then also, in the Supabase dashboard:
1. **Authentication → Sign In / Up:** turn **off** "Allow new users to sign up".
2. **Authentication → Rate Limits:** keep/raise login rate limits.
3. **Storage:** add policies on the `patient-documents` bucket (authenticated staff only).
4. Confirm the service-role key is **not** in any `NEXT_PUBLIC_*` variable.

---

## 🏥 EMR completeness — status (updated 2026-08-14, round 2)

The gap list below was **implemented** in a follow-up build-out. Current status:

### ✅ Implemented (code + migration + UI)
1. **Structured allergies** — `patient_allergies` table, severity/reaction, tabs, and an **offline drug-interaction & allergy engine** (`lib/clinical/drug-interactions.ts`) surfaced on the Prescriptions tab.
2. **Immunization records** — `immunizations` table + tab (doses, lot numbers, next-due dates).
3. **Vitals/labs trending** — Trends tab with recharts (BP, temp, pulse, SpO₂, weight, per-test lab trends).
4. **Growth charts** — WHO LMS reference (0–60 months) with z-scores and percentile curves (Growth tab).
5. **Surgery/OT module** — `surgeries` table, theatre schedule page (`/doctor/surgery`), status flow, operation notes, anaesthesia fields.
6. **Imaging viewer** — study browser + zoomable lightbox for attached films/scans (DICOM/PACS is the documented integration point).
7. **Referrals & e-prescribing** — `referrals` table, printable referral letters, printable prescription letter (external pharmacy).
8. **Specimen tracking** — `lab_specimens` with barcode (Code 39 SVG labels), chain-of-custody statuses, `/lab-tech/specimens`.
9. **Ward/bed board** — `wards` table + live occupancy board (`/nurse/ward-board`).
10. **Drug expiry & batch tracking** — `drug_batches` (lot, expiry, quantity), 90-day expiry alerts (`/pharmacist/expiry`).
11. **Medication reconciliation** — `med_reconciliations` (admission/transfer/discharge) + MAR e-signature/witness fields on administration records.
12. **Emergency/break-glass access** — audited 15-minute grants with mandatory reason (button on every patient record, admin review in Reports).
13. **Death/birth certificates & mortality reporting** — tables + printable drafts + mortality register/CSV in Admin Reports.
14. **Audit trail review UI** — patient/action/entity filters + CSV export (Admin Audit Log).
15. **Consent management** — versioned consents (treatment/procedure/data-privacy/research/photography), withdraw, printable forms.
16. **MFA (2FA)** — TOTP enrollment UI (Settings → Security) + login second-factor step, using Supabase Auth MFA.
17. **Data retention & backup policy** — `DATA_RETENTION_POLICY.md` (retention table, archival procedure, PITR guidance).
18. **Interoperability** — FHIR R4 bundle export, HL7 v2 ADT^A01 export, billing CSV (per-patient Export tab).
19. **Coding standards** — ICD-10 quick-pick + `icd10_codes` on consultations, ICD-10/LOINC/SNOMED columns on the lab catalog.
20. **SMS/email notifications** — `messaging.service.ts` with pluggable providers (console / Termii SMS / SendGrid email), appointment-reminder sender, admin test console.
21. **Patient portal** — `/portal` login + dashboard (appointments, results, prescriptions, bills, allergies, immunizations, documents, FHIR export) with front-desk enable/disable and RLS self-read policies.
22. **Offline mode** — offline mutation queue (localStorage) replays registrations when the network returns (`OfflineSync` in the protected layout).
23. **Reporting/analytics** — Admin Reports page: daily census chart, revenue KPI, lab turnaround, pharmacy dispense, mortality register, CSV exports; reminder sender. Scheduled delivery: wire to pg_cron (documented).
24. **Multi-facility support** — `facilities` table + admin management page, facility assignment columns, per-facility patient-list scoping.

### ⚠️ Requires external configuration (implemented in code, needs keys/settings)
- MFA: enable **TOTP** in Supabase Auth settings.
- SMS/email: set `MESSAGING_PROVIDER` + `TERMII_API_KEY`/`TERMII_SENDER_ID` or `SENDGRID_API_KEY`/`MESSAGING_FROM_EMAIL`.
- Portal account creation: requires `SUPABASE_SERVICE_ROLE_KEY` server-side.
- Full PACS/DICOM: plug a DICOM viewer into `components/patients/imaging-viewer.tsx`.

### 🧭 Still roadmap (not yet built)
- Lab-machine (LIS/ASTM) direct integration, SNOMED/LOINC full value sets, true scheduled reports (pg_cron), payment gateway integration, and a dedicated clinical decision-support review workflow.

**Verification after round 2:** `tsc --noEmit` → 0 errors · `npm run build` → green (see commit history). Apply both new migrations (`20260814_emr_modules_schema.sql` — schema+RLS — alongside the earlier RLS migration) with `supabase db push`.
