# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Next.js dev server
- `npm run build` — production build (note: `typescript.ignoreBuildErrors` is **true** in `next.config.mjs`, so type errors do NOT fail the build — run `tsc --noEmit` manually to surface them)
- `npm run start` — serve the production build
- `npm run lint` — ESLint (eslint-config-next, ESLint 9)
- `npm run analyze` — build with `@next/bundle-analyzer` (`ANALYZE=true`)

There is no test runner configured.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind + shadcn/ui (Radix), Supabase (auth + Postgres + Realtime), TanStack Query, Zustand. Path alias `@/*` maps to the repo root.

> Several dependencies are vestigial and **not** the active path: `next-auth`, `appwrite`/`node-appwrite`, and `app/api/auth/[...nextauth]`. Auth is **Supabase Auth**. Type comments referencing "Appwrite collections" are stale. Server actions in `actions/login.ts` and `actions/patient.actions.ts` are commented out — real data access happens client-side (see below).

## Architecture

### Role-based hospital EMR
The app models a patient's journey through hospital departments. Seven staff roles each get their own route segment, dashboard, sidebar, and realtime subscriptions:

`FrontDesk` (`/front-desk`), `Doctor` (`/doctor`), `Nurse` (`/nurse`), `LabTechnician` (`/lab-tech`), `Pharmacist` (`/pharmacist`), `Radiologist` (`/radiology`), `Admin` (`/admin`).

The role → dashboard mapping lives in `lib/role-dashboard.ts`. `UserRole` and `PatientStatus` enums in `types/models.ts` are the canonical source — `PatientStatus` (`registered`, `awaiting-consultation`, `sent-to-nurse`, `sent-to-lab`, `sent-to-pharmacy`, `sent-to-radiology`, `awaiting-payment`, `admitted`, `discharged`, …) is the state machine that routes a patient between roles.

### Auth & route protection
- **`proxy.ts`** (Next 16's replacement for `middleware.ts`) is the RBAC gate. It builds a Supabase SSR client, calls `supabase.auth.getUser()`, reads the user's `role` from the `staffs` table, normalizes it, and redirects: unauthenticated → `/login?next=`, wrong-role-prefix → that user's own dashboard. **Do not remove the `getUser()` call** — it refreshes the SSR session.
- Role strings are messy in the DB, so **`normalizeRole()` is duplicated** in `proxy.ts` and `context/auth-provider.tsx` (substring match: `"doc"`→`Doctor`, etc.). Keep them in sync.
- **`context/auth-provider.tsx`** is the client-side auth source of truth: `useAuth()` exposes `user`, `login`, `logout`. On login it fetches the staff profile via `fetchStaffProfile` and refuses to authenticate a user with no staff row/role. `logout()` clears TanStack Query cache **and resets every Zustand store**.
- `lib/auth-utils.ts` holds Zod schemas, an in-memory `RateLimiter`, and password helpers (largely standalone utilities).

### Data layer (client-side, not server actions)
Despite the `actions/` directory name, these are **client-side functions** that call the **browser** Supabase client (`@/utils/supabase/client`, default export `supabase`). They are not `"use server"`. Pattern: each domain has `actions/<domain>/` with fetch/mutation functions, and components call them through TanStack Query hooks.

- `utils/supabase/client.ts` — browser client (used by actions/components/realtime)
- `utils/supabase/server.ts` — SSR client (`createClient()`, used by `proxy.ts` and `lib/auth-utils`/`hooks/use-auth.ts`)
- TanStack Query is configured in `context/provider.tsx` (`staleTime` 30s, `refetchOnWindowFocus` false, 1 retry). Query keys are plain string arrays like `["patients"]`, `["lab-requests"]`, `["prescriptions"]`.

### Realtime
`hooks/use-realtime.ts` subscribes to Supabase Postgres changes and **invalidates the matching TanStack Query keys** to trigger refetches, plus fires `sonner` toasts. `useRoleRealtime(role)` is the master hook (wired in the role layouts via `PremiumLayout`); per-role hooks (`useDoctorRealtime`, etc.) exist too. The `role` → table/queryKey map inside these hooks must stay aligned with the query keys used by the actions.

### Convention quirks to know
- **DB is snake_case, TS interfaces carry both.** Models in `types/models.ts` deliberately declare camelCase *and* snake_case variants of fields (e.g. `patient_id?` / `patientId`). When querying Supabase use snake_case columns (`.eq("patient_id", id)`); when reading mapped objects, expect snake_case from the DB.
- **Radiology rides on the `lab_requests` table.** Radiology requests are lab requests whose `test_type` is prefixed with `"[RADIOLOGY]"`. Lab-tech vs radiologist filtering keys off that prefix — preserve it when creating/filtering requests.
- State is split across many domain Zustand stores in `store/` (`frontdesk-store`, `lab-store`, `vitals-store`, `consultation-store`, `pharmacy-store`, `patient-store`, `discharge-store`, …) plus a unified `store/store.ts` (user/cache/loading/error/notification/UI). `logout()` in the auth provider resets these by name — add new stores there if they hold session data.

### Layout & components
- `app/(protected)/<role>/layout.tsx` each wrap children in `components/layout/PremiumLayout.tsx` (sidebar + nav + realtime). Nav config is in `components/layout/config.ts`.
- `components/` is organized by role (`doctor/`, `nurse/`, `front-desk/`, `lab-tech/`, `pharmacist/`, `radiology/`, `admin/`) plus shared `ui/` (shadcn), `forms/`, `emr/` (barrel-exported EMR cards), and `patients/`.
- Route groups: `app/(public)` (login, unauthorized), `app/(protected)` (all role areas), `app/(auth)`.
