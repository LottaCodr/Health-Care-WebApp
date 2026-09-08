# Nile Valley Hospital EMR

Electronic Medical Record (EMR) for Nile Valley Hospital — patient registration through discharge, with role-based workspaces for clinical and support staff.

Built with **Next.js 16** (App Router), **React 19**, **Supabase**, and **Zustand** for client-side workflow state.

---

## Features

### Core platform

- **Role-based access** — Doctors, Nurses, Lab Technicians, Pharmacists, Radiologists, Front Desk, and Admins each get dedicated routes and dashboards (`proxy.ts` enforces auth and role prefixes).
- **Patient lifecycle** — Registration → consultation → nursing/lab/pharmacy → awaiting payment → discharged, with realtime queue updates.
- **Consultation suite** — Symptoms, diagnosis, prescriptions, and lab requests.
- **24-hour amendment window** — clinicians edit *their own* records for 24 hours after filing (typos through to prescriptions), then the entry freezes and corrections become append-only notes. Enforced in the UI, in every `lib/services` write path, and in Postgres — see `docs/RECORD_AMENDMENT_WINDOW.md`.
- **Billing** — Front-desk payment flow; status moves to `discharged` after payment.
  - **Payment types** — Full payment, part payment, and deposit (advance payment held as patient credit and applied to bills automatically).
  - **Discounts** — Percentage and/or flat-amount discounts at settlement, on a single bill or across all accumulated bills.
  - **Settle all** — One button pays every accumulated bill for a patient (or the whole checkout queue), while individual bills can still be settled one at a time.
  - **Auto-identified payer** — HMO / Company / Private client is detected from the patient's registration and drives the settlement method (insurer/employer vs cash/card/transfer) and claim-reference capture.
- **Front-desk lab requests** — Front desk can order lab tests for a patient and route them to the lab (status → `sent-to-lab`, pending invoice auto-created).
- **Doctor quick routing** — Doctors can route a patient to Lab, Radiology, Pharmacist, Front Desk (admission/billing) or Nurse *without* creating a consultation — or on top of an existing one — via the Quick Route panel.

### Recent modules (in active development)

| Area | Client state (`store/`) | Server layer (`lib/services/`) |
| :--- | :--- | :--- |
| **Discharge notes** | `discharge-store.ts` — form + UI for final diagnosis, follow-up, discharge type | `discharge.service.ts` — CRUD against `discharge_notes` |
| **Nurse charts** | `nurse-chart-store.ts` — drug chart + fluid balance forms | `nurse-charts.service.ts` — `nurse_drug_chart`, `drug_administration_records`, `fluid_balance` |
| **Appointments** | `appoointment-store.ts` | `appointment.service.ts` |
| **Admin** | — | Staff dashboard, `AdminStaffPage`, `staff.service.ts` |
| **Lab** | `lab-store.ts` | `lab.service.ts` — requests and test catalog |
| **Hematology analyzer** | `lib/clinical/hematology-reference-ranges.ts` — age/sex-partitioned CBC reference sets (Newborn / Children M/F / Adult M/F), H/L flag engine, NLR/PLR derivation, analyzer printout result format | `HematologyAnalyzerForm.tsx` (entry), `HematologyAnalyzerReport.tsx` (printout viewer + print), FHIR CBC-panel export in `interop.service.ts` — see `docs/HEMATOLOGY_ANALYZER_REFERENCE_RANGES.md` |
| **Pharmacy** | `pharmacy-store.ts` | `pharmacy.service.ts` |
| **Bulk patient upload** | `bulk-upload-store.ts` | — |
| **Record amendments (24h window)** | `components/records/*` — lock chip, amendment dialog, correction-note panel (mounted per department) | `lib/records/amendment-policy.ts` (the rule), `lib/records/registry.ts` (which columns are content, per table), `lib/services/record-lock.ts` (guard), `amendment.service.ts` (`amendRecord`, `addRecordAddendum`, `listRecordAddenda`) |

Other services: `patient`, `consultation`, `nursing`, `payment`, `radiology`, `audit`, `ai-service`, `patient-routing` (doctor quick routing without a consultation).

### Completeness modules (2026-08-14)

- **Clinical:** structured allergies + offline drug-safety engine, immunizations, vitals/lab trends (recharts), WHO growth charts, surgery/OT module with theatre schedule, referrals with printable letters, lab specimen tracking with barcode labels, ward & bed board, drug batches & expiry alerts, medication reconciliation, MAR witness/e-signature, break-glass emergency access, death/birth certificates with mortality register.
- **Compliance & ops:** consent management (versioned), MFA/TOTP (Supabase Auth), audit review + CSV export, data retention & backup policy (`DATA_RETENTION_POLICY.md`), FHIR R4 / HL7 v2 / CSV exports, ICD-10/LOINC/SNOMED coding fields, SMS/email messaging (Termii/SendGrid/console), patient portal (`/portal`), offline mutation queue, admin reports & analytics, multi-facility support.
- **Migration:** apply `supabase/migrations/20260814_emr_modules_schema.sql` (schema + RLS) with `supabase db push` — see `SECURITY_REPORT.md` for the full status table and what still needs external configuration (MFA enablement, messaging keys, service-role key for portal account creation).

### Billing schema

### Applying the amendment window

Run `supabase/migrations/20260908_record_amendment_window.sql` (`supabase db push`) to get:

- `trg_amendment_window` on `consultations`, `lab_requests`, `nursing_actions`, `prescriptions`, `drug_dispensing`, `discharge_notes`, `nurse_drug_chart`, `fluid_balance` — refuses content writes outside 24h even when PostgREST is hit directly with the anon key;
- `amended_at` / `amendment_count` on those tables (trigger-maintained, never client-writable);
- `record_addenda`, the append-only correction notes (no update/delete policy at all);
- `prescriptions.created_by`, so the person who *wrote* a drug line is distinguishable from the pharmacist who dispenses it.

Until it is applied the app layer still refuses out-of-window edits, the amendment
counters simply stay absent, and correction notes report
`NOT_CONFIGURED` instead of failing silently. Verify the rule with
`npm run check:amendments` (66 assertions on the boundary; no test runner needed).

### Billing schema

The billing workflow uses extra columns on `payments` (`payment_type`, `discount_kobo`, `discount_percent`, `discount_amount_kobo`, `payer`, `payer_reference`, `payer_code`, `applied_kobo`). The app degrades gracefully when they are missing, but run the idempotent migration in `supabase/migrations/20260813_billing_payment_types_discount_payer_deposit.sql` to fully track payment types, discounts, payer identity and deposit-credit accounting.

---

## Technology stack

| Layer | Technology |
| :--- | :--- |
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/) |
| Data | [Supabase](https://supabase.com/) (Postgres + SSR auth helpers) |
| Server actions / services | `"use server"` modules in `lib/services/` |
| Client state | [Zustand](https://zustand.docs.pmnd.dev/) (`store/`) |
| Data fetching (UI) | [TanStack Query](https://tanstack.com/query) |
| Auth (route guard) | Supabase session via `proxy.ts` |
| Legacy / hybrid | None — `next-auth`, `appwrite`/`node-appwrite`, and `@clerk/nextjs` have been removed; Supabase is the only backend. |

---

## Project structure

```
app/                    # App Router pages per role (doctor, nurse, front-desk, …)
components/             # Role-specific and shared UI
lib/services/           # Supabase-backed server modules
store/                  # Zustand stores for forms and UI state
hooks/                  # React Query + EMR hooks
actions/                # Legacy/server actions (being migrated to services)
proxy.ts                # Auth + RBAC proxy (Next.js 16)
utils/supabase/         # Browser and server Supabase clients
```

---

## Getting started

### Prerequisites

- Node.js 18+
- npm
- Supabase project (URL + anon key)

### Installation

```bash
git clone <your-repo-url>
cd nilevalleyhospital
npm install
```

### Environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run analyze` | Bundle analysis build |

---

## Security and routing

`proxy.ts` replaces the older middleware pattern in Next.js 16. It:

- Refreshes the Supabase session on each request
- Redirects unauthenticated users to `/login`
- Restricts each role to its route prefix (e.g. `/doctor`, `/nurse`, `/front-desk`)
- Only exempts `/api/auth/*` from authentication; adds baseline security headers

Page redirects are **not** the security boundary — see `SECURITY_REPORT.md`.
The real enforcement lives in:

1. **`lib/services/auth-guard.ts`** — every server-side service action checks the
   caller's staff role (`requireStaff(...)`) before touching data.
2. **Supabase Row-Level Security** — apply `supabase/migrations/20260814_enable_rls_security.sql`
   with `supabase db push` so the public anon key can never read/write patient data.
3. **`lib/services/audit.service.ts`** — session-derived audit trail for clinical
   and financial actions (Admin-only read via `listAuditLogs`).
4. **`lib/security.ts#sanitizeNextPath`** — open-redirect protection for `?next=`.

Reminders for production: disable public signups in Supabase Auth, keep the
service-role key server-only, and add storage-bucket policies for
`patient-documents`.

---

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) and describe **what changed**, not unrelated UI you did not touch.

| Prefix | When to use |
| :--- | :--- |
| `feat:` | New feature, service, store, or page |
| `fix:` | Bug fix |
| `refactor:` | Code change without behavior change |
| `chore:` | Tooling, deps, config |
| `docs:` | README or documentation only |

**Examples aligned with this repo:**

```
feat(services): add Supabase discharge notes service
feat(services): add nurse drug chart and fluid balance service
feat(store): add Zustand discharge form state
feat(store): add nurse chart store for drug and fluid balance
feat(services): add appointment CRUD service
feat(store): add bulk patient upload store
fix(patients): correct awaiting-payment status badge spacing
```

### Recent commits that need clearer messages

If your history still uses generic “status badge” messages for unrelated files, these are the **intended** subjects for the work on `dev`:

| Commit (short) | Files actually changed | Suggested message |
| :--- | :--- | :--- |
| `0163061` | `store/bulk-upload-store.ts`, minor `table.tsx` | `feat(store): add bulk patient upload store` |
| `155ff06` | `lib/services/appointment.service.ts` | `feat(services): add Supabase appointment service` |
| `dfd1b06` | `lib/services/discharge.service.ts` | `feat(services): add Supabase discharge notes service` |
| `788300e` | `lib/services/nurse-charts.service.ts` | `feat(services): add nurse drug chart and fluid balance service` |

To rewrite the last four commits locally (only if not shared, or after team agreement):

```powershell
git reset --soft HEAD~4
git add store/bulk-upload-store.ts components/patients/table.tsx
git commit -m "feat(store): add bulk patient upload store"
git add lib/services/appointment.service.ts
git commit -m "feat(services): add Supabase appointment service"
git add lib/services/discharge.service.ts
git commit -m "feat(services): add Supabase discharge notes service"
git add lib/services/nurse-charts.service.ts
git commit -m "feat(services): add nurse drug chart and fluid balance service"
```

If those commits are already on `origin/dev`, you must `git push --force-with-lease` after rewriting — coordinate with anyone else on the branch.

---

## License

Private — All rights reserved. Nile Valley Hospital EMR.
