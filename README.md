# Nile Valley Hospital EMR

Electronic Medical Record (EMR) for Nile Valley Hospital — patient registration through discharge, with role-based workspaces for clinical and support staff.

Built with **Next.js 16** (App Router), **React 19**, **Supabase**, and **Zustand** for client-side workflow state.

---

## Features

### Core platform

- **Role-based access** — Doctors, Nurses, Lab Technicians, Pharmacists, Radiologists, Front Desk, and Admins each get dedicated routes and dashboards (`proxy.ts` enforces auth and role prefixes).
- **Patient lifecycle** — Registration → consultation → nursing/lab/pharmacy → awaiting payment → discharged, with realtime queue updates.
- **Consultation suite** — Symptoms, diagnosis, prescriptions, and lab requests.
- **Billing** — Front-desk payment flow; status moves to `discharged` after payment.

### Recent modules (in active development)

| Area | Client state (`store/`) | Server layer (`lib/services/`) |
| :--- | :--- | :--- |
| **Discharge notes** | `discharge-store.ts` — form + UI for final diagnosis, follow-up, discharge type | `discharge.service.ts` — CRUD against `discharge_notes` |
| **Nurse charts** | `nurse-chart-store.ts` — drug chart + fluid balance forms | `nurse-charts.service.ts` — `nurse_drug_chart`, `drug_administration_records`, `fluid_balance` |
| **Appointments** | `appoointment-store.ts` | `appointment.service.ts` |
| **Admin** | — | Staff dashboard, `AdminStaffPage`, `staff.service.ts` |
| **Lab** | `lab-store.ts` | `lab.service.ts` — requests and test catalog |
| **Pharmacy** | `pharmacy-store.ts` | `pharmacy.service.ts` |
| **Bulk patient upload** | `bulk-upload-store.ts` | — |

Other services: `patient`, `consultation`, `nursing`, `payment`, `radiology`, `audit`, `ai-service`.

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
| Legacy / hybrid | Some flows still reference Appwrite env vars (`NEXT_PUBLIC_DATABASE_ID`, collection IDs) |

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

# Optional — Appwrite / legacy collections where still used
NEXT_PUBLIC_DATABASE_ID=
NEXT_PUBLIC_PATIENT_COLLECTION_ID=
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
