# Expert Audit — Nile Valley Hospital EMR (`Health-Care-WebApp`)

> **Status: REMEDIATED (all P0–P3 items below addressed on branch `arena/019fa8ad-health-care-webapp`).**
> After fixes: `tsc --noEmit` → **0 errors**, `npx eslint .` → **0 errors** (only pre-existing `react-hooks/exhaustive-deps` style warnings remain). `npm run build` compiles all routes and passes type-checking; the only build failure in this sandbox is an **environmental** one — it cannot fetch `Plus Jakarta Sans` from Google Fonts (no egress to `fonts.googleapis.com`). In any environment with internet, the build is green.
>
> See the commit history / `git diff` for the concrete changes.
>

**Scope:** Full static review of the repository (source only; `node_modules` reinstalled to run `tsc`).
**Method:** `tsc --noEmit` (TypeScript errors are currently **hidden** by `next.config.mjs → typescript.ignoreBuildErrors: true`), targeted source reading of the most error‑dense files, dependency graph inspection, and architecture cross‑checks against `CLAUDE.md` / `README.md`.

> ⚠️ **Headline:** `npm run build` is green, but that is misleading. `ignoreBuildErrors` masks **53 TypeScript errors across 22 files**. Several pages reference modules/exports that do not exist and will **throw at import/runtime**; several others compile but have logic bugs that silently corrupt behavior. The app is not production‑safe as-is.

---

## 0. Severity legend
- 🔴 **P0 – Page-breaking**: missing module/export → route crashes on load.
- 🟠 **P1 – Runtime logic bug**: compiles, but behaves wrong / crashes on a code path.
- 🟡 **P2 – Correctness/consistency**: drift, dead code, docs, deps.
- 🔵 **P3 – Tooling/hygiene**: lint, config, bloat.

---

## 1. 🔴 P0 — Compile/lint errors that break pages (currently masked)

| # | File | Problem |
|---|------|---------|
| 1 | `components/settings/components/security-settings.tsx` (28, 339) | Imports `authService` from `@/lib/auth-utils`, but `authService` is **fully commented out** in `lib/auth-utils.ts` (lines ~256‑320). Also references `session` (line 339) which is **never declared** → ReferenceError at runtime. The entire Security Settings page is dead. |
| 2 | `components/admin/security-audit.tsx` (20) | Imports `@/lib/auth-service` — **that file does not exist** (only `lib/auth-utils.ts`). Admin security‑audit page won't load. |
| 3 | `actions/lab-tech/get.labtech.task.ts`, `actions/nursing-action/get.nurse.task.ts`, `actions/pharmacy/get.prescription.ts` | Import `@/lib/appwrite.config` (missing) and use `appwrite`'s `databases/ID/Query`. Vestigial Appwrite code that doesn't compile. `get.prescription.ts` is imported by `actions/pharmacy/hook/useQueryPrescriptions.ts`, so that hook chain breaks too. |
| 4 | `actions/lab-tech/types.ts`, `actions/nursing-action/types.ts`, `actions/lab-tech/get.labtech.task.ts`, `actions/nursing-action/get.nurse.task.ts`, `components/nurse/component/patient-record/recent-patients.tsx` | Import `Patient` from `@/context/patients/types`, which **imports but does not re‑export** `Patient`. Fix: re‑export `Patient`/`PatientStatus` from `context/patients/types`, or point these imports at `@/types/models`. |
| 5 | `utils/export.ts` (1) | Imports `Appointment` from `@/actions/appointments/types`, but that file is **100% commented out** (empty module). Whole file is also dead (all bodies commented). |
| 6 | `actions/nursing-action/nurse.ts` (3) | Imports `parseStringify` from `@/app/lib/utils` — wrong path; `app/lib/utils.ts` exists but is **empty** ("not a module"). Should be `@/lib/utils`. Also `getAssignedPatient`/`submitVitalsRecording` have code paths that return nothing though the return type excludes `undefined`. |
| 7 | `components/nurse/component/patient-record/recent-patients.tsx` (14) | Imports `getAllPatients` from `@/actions/front-desk/get.patients` — that file "is not a module" (no matching export). |

---

## 2. 🟠 P1 — Runtime logic bugs (compile, but wrong at runtime)

### 2.1 `components/front-desk/QueueSuite.tsx`
- **`.loading` → `.isLoading`** (TanStack Query v5). `registeredPatients.loading` / `awaitingConsultationPatients.loading` are always `undefined` → loading skeletons **never render**, and `!…loading` is always `true`, so `EmptyState` shows even while data is loading. (tsc errors at lines 38, 51, 70.)
- **`new Date(p.registrationDate)`** — `Patient` has no `registrationDate` (the model uses `created_at`). `p.registrationDate` is `undefined` → `new Date(undefined)` → "Invalid Date". Use `created_at`. (line 44.)
- **`updatePatientStatusMutation.mutate(patientId, PatientStatus.AwaitingConsultation)`** — `useUpdatePatientStatus` takes **one object** `{ id, status }`. Passing two args sends `patientId` as the variable and **drops the status** (→ `undefined` status update). Should be `.mutate({ id: patientId, status: PatientStatus.AwaitingConsultation })`. (line 24.)

### 2.2 `components/lab-tech/LabSuite.tsx`
- **Rules‑of‑Hooks violation + wrong call:** `useUpdateLabRequest(requestId, { … })` is a **hook** (takes 0 args) invoked *inside* `handleSubmit` with arguments. It must be called at top level (`const m = useUpdateLabRequest()`) and then `m.mutate({ id: requestId, … })`. (line 33.)
- **`useLabRequestsByPatient(requestId)` returns `LabRequest[]`**, but `request` is used as a single object: `request?.patientId`, `request.testType`, `request.testDescription` are all `undefined`. Use `request[0]` or a single‑request hook. (lines 40, 68, 70.)
- **`updatePatientStatusMutation({ … })`** — forgot `.mutate()` (mutation result isn't callable). (line 42.)

### 2.3 `components/settings/components/security-settings.tsx`
- `session ? new Date(session.createdAt) : 'Unknown'` — `session` is never defined in the component scope → runtime ReferenceError on the Session Management card. (line 339.)

### 2.4 `components/doctor/index.tsx`
- Reads `c.patient_name` (247) and `c.patientName` (263) on `Consultation`, which has **neither** field (only `patient_id`). Patient names always fall back to `Consultation #<id>`; the real name never shows. Need a joined field or a `patient_name` mapping.

### 2.5 `components/patients/prescription-history.tsx` (57) & `lib/services/pharmacy.service.ts` (96)
- Set `dispensed` on a `Prescription`, which has **no `dispensed` field** (status is `"Active" | "Dispensed" | "Completed"`). Likely meant `status: "Dispensed"`, or the field needs adding to the model.

### 2.6 `components/emr/PaymentCard.tsx` (60)
- `new Date(<string | undefined>)` — `undefined` not allowed. Guard the value before `new Date(...)`.

### 2.7 `hooks/emr/use-radiology.ts` (73, 75, 123, 132)
- Accessing `request.id` / `request.visit_id` where the inferred type is a union that includes an error type (`GenericStringError`). Narrow the Supabase response before reading properties.

### 2.8 `components/settings/components/account-settings.tsx` (54) & `components/settings/index.tsx` (97)
- Call `updateStaff(id, { email, phone_number, full_name })`, but `updateStaff`'s second param is `Partial<StaffRole>` where `StaffRole = "doctor" | "nurse" | … | "user"` (i.e., just `role`). Name/email/phone cannot be persisted through `updateStaff`; a staff‑profile service is needed (or the signature must accept the real fields).

### 2.9 `actions/nursing-action/nurse.ts`
- `getAssignedPatient` returns `[]` on error but the typed return is `Promise<NursingAction[] | null>`; the `catch` branch returns nothing → "function lacks ending return statement". Also queries `visits` with no filter (`select("*")`) — almost certainly not the intended "assigned patient" lookup.

---

## 3. 🟡 P2 — Auth / RBAC drift

### 3.1 `normalizeRole()` is out of sync (explicitly warned in `CLAUDE.md`)
- `auth-provider.tsx` normalizeRole is **missing** the `radio → Radiologist` and `admin → Admin` cases that `proxy.ts` has. A Radiologist or Admin logging in client‑side gets their **raw DB role string**, so any `user.role === "Radiologist"` / `"Admin"` check and the `ROLE_DASHBOARD_MAP[role]` lookup misbehave. Keep the two in sync (ideally extract one shared helper).

### 3.2 Duplicate Supabase browser clients
- `utils/supabase/client.ts` (default export `supabase`) **and** `utils/supabase/supabase.client.ts` (named `createClient()`) both create a browser client. Consolidate to one.
- `utils/supabase/middleware.ts` is the old Supabase helper and appears redundant now that `proxy.ts` owns SSR session refresh — verify and remove if unused.

---

## 4. 🟡 P2 — Architecture / dead code / dependency debt

- **Two overlapping data layers.** `lib/services/*` (marked `"use server"` and consumed by `hooks/emr/*` via `import * as …`) is the active service layer, yet `actions/*` (client‑side Supabase) is also used (e.g. `auth-provider` → `actions/staff/staff`, nurse/lab/pharmacy actions). `CLAUDE.md` claims `actions/` is *the* data layer and `lib/services` is unused — that is **incorrect**; both are live and partially duplicate each other. Pick one canonical layer and delete the other to stop drift.
- **Vestigial dependencies still installed/imported:**
  - `next-auth` — `app/api/auth/[...nextauth]/route.ts` still wires NextAuth, but `CLAUDE.md` states auth is **Supabase Auth**. The route is dead and should be removed (along with `@types/next-auth`).
  - `appwrite` / `node-appwrite` — used only by the broken Appwrite action files (§1 #3, `actions/appointments/appointment.action.ts`). Remove the deps + files, or finish the Supabase migration.
  - `@clerk/nextjs` — **not imported anywhere** in source. Pure bloat.
- **Unused chart libraries:** `react-chartjs-2` and `recharts` are installed but **never imported**. `react-chartjs-2` also lacks its `chart.js` peer (not in deps), so it would crash if ever used.
- **Date-library sprawl:** `moment`, `date-fns`, `react-datepicker`, `react-day-picker`, and `react-date-range` all present. Consolidate to one (prefer `date-fns` + `react-day-picker`, drop `moment`).
- **Docs inconsistency:** `CLAUDE.md` and `README.md` disagree on the data layer (`actions/` vs `lib/services/`). Fix both to match reality.

---

## 5. 🔵 P3 — Tooling / config

- **ESLint is effectively broken.** The repo ships only `.eslintrc.json` (legacy), but ESLint **9** (per `package.json`) requires a flat `eslint.config.js`. `npm run lint` (`next lint`) is also deprecated in Next 16. `CLAUDE.md` claims `npm run lint` works — it does not. Add `eslint.config.mjs` (flat) or downgrade ESLint, and migrate the config.
- **`ignoreBuildErrors: true`** should be removed (or set false) **after** the P0/P1 types are fixed, so type regressions fail CI instead of shipping broken pages.

---

## 6. Recommended fix order

1. **P0 (unblock pages):** fix #1 `authService`/`session` in security-settings; #2 add/repair `lib/auth-service`; #4 re‑export `Patient` from `context/patients/types`; #3/#5/#6/#7 remove or migrate the dead Appwrite/`app/lib/utils`/empty‑module references.
2. **P1 (correctness):** QueueSuite (`.isLoading`, `created_at`, `mutate({id,status})`); LabSuite (hook misuse + array handling + `.mutate()`); security‑settings `session`; doctor `patient_name`; pharmacy `dispensed`; PaymentCard date guard; use‑radiology narrowing; settings `updateStaff` shape; nurse return paths.
3. **P2 (consolidate):** unify data layer, sync `normalizeRole`, dedupe Supabase clients, drop vestigial deps (`@clerk/nextjs`, `next-auth`, `appwrite`, unused chart/date libs), reconcile docs.
4. **P3:** add ESLint flat config; flip `ignoreBuildErrors` to `false`.

**Estimated blast radius:** P0 is ~8 files; P1 is ~10 files. Most fixes are small and mechanical; the data‑layer consolidation (P2) is the only item needing a deliberate design decision.

---

## 7. Suggested next step
I can implement the P0 + P1 fixes (the page‑breaking and runtime‑logic bugs) directly on this branch, leaving the larger P2 consolidation for your call. Want me to proceed with those fixes?
