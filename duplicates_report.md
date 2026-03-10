# Duplicates Audit Report - Nile Valley Hospital

This report identifies redundant files, duplicate logic, and overlapping directory structures discovered during the project audit.

## 1. Documentation Overload
The root directory contains a large number of overlapping documentation files, many of which appear to be variations of the same content or stage-specific reports that are no longer current.

**Redundant Files:**
- `README.md` vs `README_COMPLETE.md` vs `README_START_HERE.md`
- `START_HERE.md` vs `GET_STARTED.md` vs `YOU_ARE_READY.md`
- `API_REFERENCE.md` vs `API_REFERENCE_COMPLETE.md`
- `ARCHITECTURE.md` vs `ARCHITECTURE_DIAGRAMS.md`
- `DOCUMENTATION_INDEX.md` vs `DOCUMENTATION_INDEX_COMPLETE.md`
- multiple `IMPLEMENTATION_*.md` files (Summary, Report, Complete, Checklist).

> [!TIP]
> Consolidate these into a single `/docs` directory or a single `README.md` with a clean index.

## 2. Middleware Duplication
There are two middleware files in the root directory.

- `middleware.ts` (5.7 KB) - Appears to be the active one.
- `nmiddleware.ts` (2.5 KB) - Likely a backup or an older version.

> [!IMPORTANT]
> Delete `nmiddleware.ts` if `middleware.ts` is confirmed to be stable.

## 3. Route Structure Overlap
The `app` directory has some potential confusion between roles and protected groups.

- `app/doctor/` vs `app/(protected)/doctor/`
- `app/nurse/` vs `app/(protected)/nurse/`
- `app/pharmacy/` vs `app/(protected)/pharmacist/` (Note the naming inconsistency: `pharmacy` vs `pharmacist`)

> [!WARNING]
> This split can lead to confusion about which route is "active" or "primary". Most modern Next.js patterns prefer keeping role-based routes inside the `(protected)` group to share layout and protection logic.

## 4. Hook Variants
The `hooks` directory contains multiple EMR hooks that might share logic:
- `use-emr.ts` (29.7 KB)
- `use-emr-improved.ts` (9.5 KB)

> [!NOTE]
> `use-emr-improved.ts` likely contains a subset or a refactored version of `use-emr.ts`.

## 5. Duplicate Components
Several components have similar names or purposes:
- `StatusBadge.tsx` vs `status-badge.tsx` (Case sensitivity issues on some OSs).
- Root components vs sub-folders (e.g., `PatientRegistrationForm.tsx` in `components/` vs items in `components/patients/`).

---
**Recommendation:** Perform a "Spring Cleaning" phase to delete unused `.md` files, consolidate middleware, and unify the route structure under `(protected)`.
