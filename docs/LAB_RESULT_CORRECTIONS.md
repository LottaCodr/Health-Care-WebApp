# Laboratory result corrections and test identity

## Correcting a filed result

In **Lab → Reports**, open the completed result and use **Amend**. The same control is available on the lab request and patient lab tab. Only the scientist who filed the result can amend its result text in the 24 hours after `completed_at`; select a reason and check the original structured rows before saving. The original and replacement are recorded in the amendment audit. The original filing time is not reset. A submitted result cannot be sent again through the result-entry form. After 24 hours, or if another scientist filed it, use **Corrections → add a signed correction note**; the original result remains intact. Never edit the ordering doctor's note from the lab result dialog.

Apply the amendment migrations in `docs/RECORD_AMENDMENT_WINDOW.md` if the controls show a deployment warning. Staff may not correct an order/test identity or a patient's demographic record by changing the *result text* alone: coordinate with the ordering clinician/registration team and check downstream billing.

## Urinalysis request with a spelling error

Common variants of Urinalysis now find the structured urinalysis form. If the actual order uses another spelling and no template matches, the scientist can explicitly select **Urinalysis** in **Confirm result template and specimen** and enter the result. This selects a *reporting form*, not a new order: the original order name and linked bill stay unchanged. Ask the ordering clinician/catalog owner to correct the wrong label separately after confirming the request and specimen; do not rename historical requests automatically. The exact problematic live request cannot be altered without its patient/request ID and verified intended test.

## H. pylori is two tests

- **H. pylori antibody (blood)**: serology, blood specimen.
- **H. pylori antigen (stool)**: antigen assay, stool specimen.

Each has its own structured result form and result field. Unqualified or contradictory H. pylori orders do **not** default to either form; confirm the specimen and select the actual test when filing a pre-existing ambiguous order. New ambiguous orders are rejected. In **Lab → Test Catalog**, configure these two entries separately with their **own verified prices**, sample types and active flags. No migration copies a generic assay's price, silently converts one assay to another, or changes historical orders/bills. Review any existing generic H. pylori catalog entry manually and deactivate it once the replacements are configured. A price of zero is not silently assigned to either active assay.

## Patient age

The displayed age is completed calendar years from the recorded `birth_date`, evaluated in the hospital's Africa/Lagos timezone. Completed reports show age **at result**, not the patient's age today; neonatal/paediatric analyzer reference sets use more precise elapsed days while respecting the calendar birthday for adult thresholds. Lab request and report screens also display the recorded DOB for verification. If the source DOB is wrong, correct it through the authorised demographics workflow after verifying the patient's identity and real DOB; this change does not guess or edit anyone's DOB.

Run `npm run check:lab-identity`, `npm run check:amendments`, and `npm run check:lab-submit` to check the pure matching/age rules and existing amendment and billing harnesses.
