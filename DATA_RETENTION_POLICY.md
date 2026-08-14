# Data Retention & Backup Policy — Nile Valley Hospital EMR

> Status: **DRAFT for approval** — align with the hospital's legal counsel and any
> applicable national guidance before treating this as final.

## 1. Purpose
Define how long patient and operational data is kept, when it is archived or
deleted, and how it is backed up — so the hospital can meet record-keeping
obligations without holding PHI forever.

## 2. Retention periods

| Data class | Retention | Notes |
|---|---|---|
| Patient demographics & registration | **10 years** after last encounter (minimum) | Extend for minors: until age of majority + retention period |
| Clinical records (consultations, vitals, nursing, charts) | **10 years** after last encounter | Retain longer if the case involves surgery, implants, or litigation holds |
| Lab results & radiology reports | **10 years** | Store source images/films per radiology retention rules |
| Prescriptions & dispensing | **10 years** | Controlled-drug registers may require longer local retention |
| Billing / payments | **7 years** (financial records) | Align with tax authority requirements |
| Audit trail (`audit_logs`) | **Indefinite** (read-only archive) | Never delete; archive to cold storage after 2 years |
| Death/birth certificates | **Indefinite** | Statutory records |
| Appointment & scheduling data | **2 years** | Operational value only |
| Notifications / toasts | **90 days** | Operational value only |
| Consent records | **10 years** after last relevant encounter, **or** as long as the records they authorise | Version history must be preserved |
| Account deletion requests | Staff accounts: **30 days** grace, then delete auth user + profile row | Patient portal accounts: follow patient-record retention for clinical data; the auth account may be removed on request |

## 3. Deletion & archival procedure
1. **Archival** (recommended): export the patient's record via the built-in
   **FHIR R4 export** (Export tab) plus billing CSV, store in hospital cold
   storage, then mark the patient `discharged` + `inactive` instead of deleting.
2. **Deletion** (only where legally required, e.g. right-to-be-forgotten):
   - Use the Admin UI or service-role client to delete from clinical tables in
     dependency order (children first: prescriptions → consultations → … → patient).
   - Audit trail entries are **never** deleted; the patient id is pseudonymised
     (`user_id`/`entity_id` replaced with `REDACTED-<hash>`) to preserve the trail.
3. All deletions/archivals are recorded in `audit_logs` with the admin's identity.

## 4. Backups
- **Database:** Supabase daily physical backups (platform), Point-in-Time
  Recovery (**PITR enabled in project settings**) — target RPO ≤ 15 min, RTO ≤ 4 h.
- **Storage (documents/images):** object storage versioning/bucket replication.
- **App configuration:** `.env` values and Supabase migrations are in Git
  (migrations are the schema source of truth).
- **Test restores:** restore to a staging project **quarterly** and verify the
  login + patient search + billing flows work.

## 5. Enforcement in the EMR
- All clinical/financial writes are captured in the immutable audit trail
  (session-derived actor, Admin-only read, CSV export for compliance review).
- Break-glass emergency access is high-visibility audited (15-minute grants,
  reasons required).
- Exports (FHIR/HL7/CSV) are audit-logged per export event.
- Hard-deletes are restricted to Admin via RLS (`delete` policies) — the
  recommended workflow is archival, not deletion.

## 6. Ownership
- **Data owner:** Hospital Medical Records Committee.
- **System administrator:** performs archivals; reviews break-glass + audit
  exports monthly.
