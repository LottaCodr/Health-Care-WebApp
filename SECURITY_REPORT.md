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

### ⚠️ One step needs the real database
Run `supabase db push` (or execute `supabase/migrations/20260814_enable_rls_security.sql`) against your Supabase project, then also, in the Supabase dashboard:
1. **Authentication → Sign In / Up:** turn **off** "Allow new users to sign up".
2. **Authentication → Rate Limits:** keep/raise login rate limits.
3. **Storage:** add policies on the `patient-documents` bucket (authenticated staff only).
4. Confirm the service-role key is **not** in any `NEXT_PUBLIC_*` variable.

---

## 🏥 What's MISSING in this EMR (vs. a complete hospital EMR)

**Already good:** registration → triage → consultation → nurse/lab/pharmacy/radiology workflow, vitals & drug charts, fluid balance, admissions & ward assignment, discharge notes, appointments, readmissions, billing with HMO/company/private payers, discounts, deposits and bulk settlement, lab & drug catalogs, patient documents, per-patient timeline, AI clinical support.

**Missing / gaps (clinical):**
1. **Structured allergies** — allergies are free-text; there is no first-class allergy list with severity/reaction, and no offline drug–allergy interaction engine (today only the AI checks, and only if asked).
2. **Immunization records** — no vaccination module.
3. **Vitals/labs trending** — data is recorded but there are no longitudinal charts (fever curves, BP trends, lab value graphs).
4. **Growth charts / pediatric tools** — absent.
5. **Surgery/OT module** — no theatre scheduling, op notes, or anaesthesia records.
6. **Imaging viewer** — radiology is text reports only; no PACS/DICOM attachment or viewer.
7. **Referrals & external e-prescribing** — no referral letters to other hospitals, no e-prescription channel.
8. **Specimen tracking** — lab requests exist, but no barcode/sample chain-of-custody.
9. **Ward/bed board** — bed assignment exists, but no visual occupancy board.
10. **Drug expiry & batch tracking** — inventory has stock levels but no expiry dates/lot numbers.
11. **Medication reconciliation** — no formal admission/discharge med-reconciliation workflow; MAR entries lack a witness/e-signature step.
12. **Emergency/break-glass access** — no controlled "emergency access" path that gets audited extra loudly.
13. **Death/birth certificates & mortality reporting** — absent.

**Missing / gaps (non-clinical & compliance):**
14. **Audit trail UI for role-based review** — the audit log is Admin-only read; there is no export/search-by-patient view for compliance officers.
15. **Consent management** — no signed-consent records or versioning of consent forms (documents tab is generic uploads).
16. **Two-factor authentication (2FA/MFA)** — not configured.
17. **Data retention & backup policy** — not documented; Supabase PITR/backups not configured in repo docs.
18. **Interoperability** — no FHIR/HL7 export, no lab-machine integration, no MOH/regulatory reporting formats.
19. **Coding standards** — ICD-10 appears only via AI suggestions; no SNOMED/LOINC mapping for lab tests.
20. **SMS/email notifications** — notifications are in-app only; no gateway for patient reminders or critical lab alerts.
21. **Patient portal** — patients cannot view their own records or appointments (optional, but standard in modern EMRs).
22. **Offline mode** — the app is fully online-only; nothing queues when the network drops.
23. **Reporting/analytics suite** — dashboards exist, but no scheduled reports (daily census, revenue, lab TAT) or export.
24. **Multi-facility support** — the schema has no facility/location dimension.

*Items 1–4 and 14 would be my recommended next priorities for a hospital of this workflow scope; 15–18 matter most for regulatory/audit readiness.*
