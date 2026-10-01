# Radiology requests, scan billing and prepaid care packages

*Implemented 2026-10-01 · migration `20261001_radiology_scans_and_care_packages.sql` · verified by `npm run check:radiology`*

## The problem, as reported

1. **The radiology doctor could not find anywhere to request a scan.** Radiology
   rides on `lab_requests` (a `[RADIOLOGY]`-prefixed `test_type`), but there was
   no order entry for it. The only code path that created a radiology request was
   the Quick Route panel, which built its "imaging" list by filtering
   `lab_test_catalog` for rows containing the words *scan*, *ultrasound*, *x-ray*
   — usually none. So the picker was empty and nothing could be sent.
2. **Scans were never billed.** `createRadiologyRequest` inserted the request and
   stopped: no `payments` row, no patient routing, no notification. Compare
   `createLabRequest`, which raises the bill and routes the patient.
3. **Antenatal patients must not be billed for their scans.** Most antenatal
   patients are registered on a prepaid package whose price already includes
   their scans. Billing each scan on top would charge them twice for something
   the hospital has already been paid for.
4. **The result is free text.** The unit wanted one observations field, and both
   the doctor and the front desk needed to be able to fill it in — the report was
   previously restricted to the Radiologist role and split across
   findings / impression / recommendation fields.

The two services performed today are **Pelvic Scan** and **Transvaginal Scan
(TVS)**, at **₦23,000** each.

## Research: how this is modelled elsewhere

**Prepaid bundles are entitlements, not bills.** Clinic billing systems model a
package as a purchase the patient makes once, after which the included services
are consumed from it. CharmHealth's billing packages are the clearest published
example: *"If you do not charge the Patients while using the services in the
Package, select 'Patients are not charged when they use the services/items of the
package'… the charge will be made as Zero… The 'Billing Package Icon' will be
shown against the line item"* — i.e. the consumption is **recorded** and
**marked**, and the money is **not collected again**.
(<https://www.charmhealth.com/resources/billing/billing-packages.html>)

**Payers treat bundled components as already paid.** In claim processing a
bundled component is denied with CARC CO-97 — *"the benefit for this service is
included in the payment/allowance for another service"* — and CMS will not pay
separately for services *"denied as bundled or included in another service's
basic allowance"*. The principle transfers exactly: once the antenatal package is
paid, its scans have no separate balance.
(<https://www.aafp.org/practice-operations/billing-and-coding/non-covered-services>,
<https://medheave.com/bundling-and-unbundling-in-medical-billing>)

**How many scans does antenatal care actually include?** WHO recommends *one*
ultrasound before 24 weeks for routine ANC
(<https://www.ncbi.nlm.nih.gov/books/NBK579606/>); ACOG's minimum is a
first-trimester dating scan plus an 18–22 week anatomy scan; private antenatal
packages conventionally bundle three to four (dating/viability, anomaly, growth,
and often a final pre-delivery scan). **Three** was chosen as the seeded default
— enough for dating, anomaly and growth — and it is a single editable number, not
a code change (see below).

**Where the value goes.** A covered service still has a cost to the hospital, so
it is recorded in an append-only ledger with the value it *would* have carried.
Reporting can then answer "how much did we deliver under packages this month?"
without that figure ever becoming a debt on a patient's file.

## Design

### Data model

```
radiology_scan_catalog        code, scan_name, price, aliases, is_active
care_packages                 code, name, price, validity_days
care_package_items            package_id, item_kind, item_name, included_quantity
patient_package_enrolments    patient_id, package_id, starts_on, expires_on,
                              status, amount_paid, receipt_no
package_usage  (append-only)  enrolment_id, item_name, value_kobo, lab_request_id

lab_requests  +=              price, billing_status, package_enrolment_id
```

Two conventions worth knowing:

* `care_package_items.item_name IS NULL` means **any** item of that kind ("any
  ultrasound scan"); `included_quantity IS NULL` means **unlimited** while the
  enrolment is active. A named item is the tighter allowance and wins when both
  exist.
* `lab_requests.billing_status` is `billed` | `covered` | `not_billable`. These
  are **workflow** columns and are deliberately absent from the
  `trg_amendment_window` content lists — locking them would stall the billing
  chain for no integrity gain, the same reasoning that keeps `price` and `status`
  out of the 24-hour rule.

### The money rules

`createRadiologyRequest` (`lib/services/radiology.service.ts`) is the single
authority:

1. **Resolve the service.** Free text (code, name, alias, or a prefixed
   `test_type`) is matched against the catalog. An unknown service is **refused**
   with the list of what the unit performs — an unpriced request is a scan nobody
   bills. Admins add new services by inserting a catalog row.
2. **Check coverage.** `getPackageCoverage` finds the first enrolment that is
   `active`, inside its validity window, includes the service, and still has
   allowance left. Enrolments are consumed oldest-first, so an older package is
   used up before a newer one.
3. **Reserve before writing.** The allowance is drawn down *before* the order row
   is inserted, so two simultaneous requests cannot both see the same last scan
   and both cover themselves. If the insert fails the reservation is released.
4. **Bill or cover.**
   * Covered → `billing_status = 'covered'`, a `package_usage` row carrying
     `value_kobo`, and **no `payments` row at all**. That is what keeps it out of
     the patient's Billing tab, out of the outstanding total and out of the
     checkout queue — `payment-history.tsx` sums `pending`/`partial` rows, and
     there is no row to sum.
   * Not covered → a pending `payments` row at the scan's price, category
     `radiology`, linked back through `lab_request_id`. A ₦0 bill is still raised
     on purpose (an unpriced scan needs a bill for the desk to correct), exactly
     as the lab does.
5. **Route and notify.** The patient goes to `sent-to-radiology` (unless already
   admitted/discharged) and the radiology unit is notified.

The `billAnyway` flag is the deliberate override for when a package genuinely
should not apply; using it draws down no allowance and raises the bill.

### Why the scan is *absent* from billing rather than present at ₦0

Both designs are defensible; the CharmHealth model keeps a zero-value line with a
package badge. This codebase was built the other way: `payments` **is** the bill
(the outstanding total, the settle-all engine, the checkout queue and the invoice
PDF all read it), so a ₦0 row would appear as a line item the desk has to reason
about, and `settleAllPatientBills` would process it. Keeping covered services out
of `payments` and recording them in `package_usage` means "already paid for in
the package" is visible on the patient's file and in reporting, and is never a
debt. The value is not lost — `package_usage.value_kobo` holds it.

### Reporting

One free-text field. Radiologist, Doctor and Front Desk may all file it
(`submitRadiologyReport`), because in practice the scan is written up by whoever
is at the machine and paper reports are transcribed at the desk. Whoever files it
**owns** it: the 24-hour amendment window then restricts edits to that person
(`radiology_report` in `lib/records/registry.ts` now lists all three roles), and
after the window corrections go in as append-only notes. Templates for the two
scans pre-fill the field; they are starting points, never a substitute for the
findings.

## Where things live

| Concern | File |
|---|---|
| Scan names, prices, aliases, report templates (client-safe) | `lib/utils/radiology-catalog.ts` |
| Package/allowance arithmetic (pure, tested) | `lib/utils/care-packages.ts` |
| Scan catalog + order + billing + coverage + reporting | `lib/services/radiology.service.ts` |
| Packages, enrolments, coverage, usage ledger | `lib/services/care-packages.service.ts` |
| Schema, seeds, RLS | `supabase/migrations/20261001_radiology_scans_and_care_packages.sql` |
| Order dialog (patient tab + radiology board) | `components/radiology/RequestScanDialog.tsx` |
| Patient tab: order button, coverage strip, report form | `components/radiology/RadiologyTab.tsx` |
| Enrolment + usage panel (Billing tab) | `components/patients/care-packages-panel.tsx` |
| Selling the package at registration | `components/front-desk/components/register-patient/RegistrationSuite.tsx` |
| Hooks / cache keys | `hooks/emr/use-radiology.ts`, `hooks/emr/use-care-packages.ts`, `hooks/query-keys.ts` |
| Verification | `scripts/check-radiology-billing.cjs` (`npm run check:radiology`) |

## Day-to-day changes that need no deploy

* **Reprice a scan** — update `radiology_scan_catalog.price` (Admin). The service
  reads the table first and only falls back to the in-code list when the table is
  missing or empty.
* **Add a scan** — insert a `radiology_scan_catalog` row with its price and
  aliases. It appears in the order dialog and is billable immediately.
* **Change the antenatal allowance** — update
  `care_package_items.included_quantity` for the `ANTENATAL` package. `NULL`
  makes it unlimited while the enrolment is active.
* **Change package validity** — `care_packages.validity_days` (applies to new
  enrolments; existing ones keep their stored `expires_on`).
* **Package price** — left `NULL` on purpose: the desk enters what each patient
  actually prepaid when enrolling.

## Failure modes, and which way they fall

| Situation | Behaviour |
|---|---|
| Package tables not migrated | Coverage resolves to "no enrolment" → the scan is **billed**. Never silently free. |
| `lab_requests` missing the new columns | The insert retries without them (candidate payloads); the order and the bill still land. |
| `package_usage` insert fails | The order still stands and stays **covered** (the patient is never charged twice); the failure is logged loudly. |
| Package enrolment fails during registration | The patient is still registered; the failure becomes a warning on the success screen pointing at the Billing tab. Registration is never blocked by a package. |
| Two requests race for the last scan | The allowance is reserved before the order row is written, so only one is covered. |

## Verification

`npm run check:radiology` loads the **real** service modules against an in-memory
fake Supabase (the same harness style as `scripts/repro-billing.cjs`) and asserts
73 outcomes, including: a scan bills ₦23,000 in the `radiology` category and
shows in the outstanding queue; an antenatal patient's scan raises **zero**
payment rows while writing a ₦23,000 ledger entry; the 4th scan on a 3-scan
package is billed; expired and cancelled packages cover nothing; an unknown
service is refused; Doctor and Front Desk may file a report while a Nurse may
not; a filed report cannot be overwritten by someone else; and an unmigrated
database still creates and bills the order.

Also run: `npx tsc --noEmit`, `npm run check:amendments`, `npm run check:lab-submit`.
