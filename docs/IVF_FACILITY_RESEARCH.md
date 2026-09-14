# IVF clinic inside the Nile Valley EMR

**Research and product decision brief — 14 September 2026**

## Executive decision

Nile Valley should add IVF as a **specialist clinic workspace inside the hospital EMR**, not as a second patient system and not as a collection of free-text forms.

The existing `facilities` feature is the right administrative entry point, but its meaning needs to be made explicit:

- **Hospital / site** — the physical or legal operating location, for example `Nile Valley Hospital`.
- **Specialist clinic / service line** — a child operational unit, for example `IVF & Reproductive Medicine`, `Dermatology`, `Nephrology`, or `Urology`.
- **Laboratory** — an operational unit with its own equipment, specimens, quality controls and permissions.

This hierarchy lets one patient remain a patient of Nile Valley while holding a specialty episode in IVF. It avoids the common failure mode of creating a duplicate “IVF patient” and fragmenting the longitudinal record. The first implementation therefore reuses the add-facility flow but adds `facility_type`, `parent_facility_id`, `specialty_code` and a structured IVF domain beneath it.

> **Important language decision:** the database can reuse the existing `facilities` table for compatibility, but the UI should say **facility / clinic** and the data model should distinguish a physical facility from a specialist clinic. A clinic in the same building is not a new hospital, and a future multi-site IVF network should not require duplicate people.

## What was researched

The research was weighted toward professional guidance and primary sources rather than vendor marketing:

1. ESHRE good-practice recommendations for IVF laboratories, including the 2026 update available for stakeholder review.
2. Association of Reproductive and Clinical Scientists 2024 good-practice guidance for clinical embryology laboratories.
3. ASRM committee guidance for reproductive-tissue cryostorage.
4. WHO sixth edition laboratory manual for human semen examination and processing.
5. HFEA consent directions and code-of-practice material as a mature example of consent, storage and withdrawal controls. HFEA is not Nigerian law; it is a useful safety benchmark only.
6. ISO 15189 medical-laboratory quality and competence requirements and ISO 20387 biobanking concepts for traceability, sample integrity and storage location control.
7. Nigeria-specific published ART literature and the 2024 Nigerian IVF market study. These show a growing service with uneven quality-system maturity and a regulatory environment that requires local legal and professional review before go-live.
8. NIST, ONC SAFER and AHRQ guidance on safe EHR usability, patient identification, workflow integration, result follow-up and documentation burden.
9. Current fertility-EMR patterns from IDEAS, eIVF and other specialist platforms. These were used only to identify common workflow expectations, not as clinical authority.

## Domain findings that change the product design

### 1. IVF is an episode-and-cycle workflow, not a diagnosis tab

A general hospital chart is organized around visits, diagnoses, orders and results. IVF care is organized around a **couple / treatment participants → treatment cycle → timed clinical and laboratory events → reproductive material → outcome**.

The system must make a cycle a first-class object with:

- the primary patient and linked partner or donor participant(s);
- treatment type: IVF, ICSI, FET, IUI, oocyte cryopreservation or sperm cryopreservation;
- cycle number and cycle status;
- stimulation monitoring, trigger and retrieval timing;
- insemination/fertilization and embryo culture milestones;
- transfer, cryopreservation, PGT and outcome;
- consents, documents, costs and tasks linked to the same cycle.

The primary patient still has one Nile Valley hospital number and one longitudinal record. The IVF workspace is a specialty view over that record.

### 2. Gametes and embryos are material with custody, not merely lab results

Sperm, oocytes, embryos and biopsy tubes need an identity that survives movement between dishes, tubes, devices, tanks and clinics. They need more than a result field:

- a stable material identifier;
- at least two patient identifiers on operational labels and screens;
- parentage / provenance links (which cycle, retrieval, sample or embryo);
- every movement as a timestamped event;
- operator and independent witness;
- current status and current location;
- consent scope and end date;
- final disposition, including transfer, thaw, use, discard or external transport.

A cryobank row is therefore an inventory record plus a history of movements. Editing a current location in place would destroy the audit trail. The product should append a movement event and derive the current location.

### 3. The paper template should be a workflow, not a one-page digital replica

The supplied IVF laboratory form is a valuable field inventory, but copying it into one long scrolling page would recreate the paper form’s weaknesses: high cognitive load, repeated fields, poor timing context and weak validation.

The form should be split by the work actually performed:

1. **Registration and cycle setup** — patient, partner/donor, indication, treatment and consent readiness.
2. **Monitoring** — cycle day, follicles, endometrium, hormones, medication and plan.
3. **Andrology** — collection, source, macroscopic examination, WHO semen analysis, preparation, post-preparation and cryopreservation.
4. **Oocyte retrieval** — trigger, timing, source, follicles, retrieval yield, media/lots, complications.
5. **Embryology** — insemination/ICSI, day 1 PN check, cleavage, blastocyst/Gardner grading, biopsy and PGT.
6. **Transfer** — fresh/frozen, day, embryos selected, catheter, clinician, witness and retained embryo check.
7. **Cryobank** — material, device, tank/canister/goblet/slot, consent end date, movement and disposition.
8. **Outcome** — beta-hCG, clinical pregnancy, fetal heartbeat, pregnancy outcome and live birth follow-up.

The print/export view can assemble these sections back into a Nile Valley IVF laboratory report that matches the clinic’s approved paper format. The data-entry view should not be forced to look like that report.

### 4. WHO semen-analysis fields must preserve method and timing

WHO’s sixth edition is the baseline for the andrology form. It specifically supports capturing collection method, abstinence, time from collection to examination, macroscopic characteristics, concentration, total sperm number, motility categories, morphology, vitality where indicated and processing details. The app should not silently apply “normal” values or diagnose from reference limits. Reference ranges, method, instrument and local laboratory SOP should be versioned and displayed with the result.

Calculated values such as total sperm count and motile sperm count should show their formula/source and permit a qualified user to correct them with an audit trail. `0`, `not observed`, `not performed` and `unknown` are not interchangeable.

### 5. Consent is a gate, not a document attachment

Storage and use consent can differ. Embryos can involve two gamete providers. Donor use, PGT, disclosure, research, transport and disposition may each have different permissions. The workflow must show:

- who consented;
- what was consented to;
- the approved version and signature method;
- witness and date/time;
- effective/expiry date;
- withdrawal or variation;
- the exact material affected.

A missing or expired consent should block an irreversible laboratory action with a clear reason. It should not be an after-the-fact warning buried in a timeline. Digital consent should be versioned, printable and retained with the signed document; paper fallback and downtime procedures must exist.

Nigerian legal and professional requirements must be confirmed by Nile Valley’s medical director and counsel. HFEA material is a benchmark for the control model, not a substitute for Nigerian law or the clinic’s approved forms.

### 6. Witnessing must be an active safety step

A checkbox saying “witnessed” is insufficient. The UI should record the operator, witness, exact verification step, time, method (manual or validated electronic), identifiers checked and result. Critical points include:

- first receipt and identification of semen or surgical sperm;
- oocyte retrieval receipt;
- insemination / ICSI;
- each transfer between containers when material identity could change;
- biopsy and genetic-lab tube handoff;
- cryopreservation and tank placement;
- thaw/warming;
- embryo selection and transfer;
- disposal or external transport.

The primary action should remain halted until the witness is selected and explicitly confirms the identifiers. A mismatch should create a protocol-deviation record, stop the workflow and escalate to the laboratory director. The system should support a paper/manual downtime path and reconcile it afterward.

### 7. Cryostorage is a safety-critical operational system

The data model must represent more than “three vials frozen”:

- material type and unique device identifier;
- tank, canister, goblet and position;
- storage method and date/time;
- consented storage end date;
- tank status, LN2 checks, alarms and incidents;
- access and movement history;
- backup tank / emergency plan;
- inventory reconciliation and discrepancy workflow.

ASRM guidance highlights continuous or scheduled LN2 monitoring, 24-hour alarm response, trained personnel, adequate supply, ventilation and restricted access. The EMR cannot replace physical safety systems, but it should expose equipment checks, alarms, incidents, current inventory and unresolved discrepancies in one cryobank workspace.

### 8. PGT must preserve the link between embryo and biopsy result

PGT is not a free-text comment. Store the embryo number, biopsy sample/tube identifier, biopsy date, laboratory, test type (PGT-A, PGT-M, PGT-SR), result, result status, source document and the witness checkpoints. The result must remain linked to the exact embryo and must not be copied onto another embryo by a bulk edit.

### 9. EHR usability is a patient-safety requirement

NIST’s health-IT guidance recommends user profiles, task analysis, use-related risk analysis and iterative formative and summative testing. ONC SAFER emphasizes patient identification, role-based access, test-result follow-up, communication, contingency planning and interfaces. AHRQ’s evidence on documentation burden warns against redundant capture and workflow fragmentation.

For this module that means:

- keep the patient identity strip visible on every cycle and lab screen;
- show the hospital number, full name and date of birth together; never rely on name alone;
- keep the selected cycle and material identifier visible while entering data;
- show current stage, next task and blockers before secondary details;
- use progressive disclosure: common fields first, optional and rare fields behind a named section;
- do not use red for ordinary status; reserve it for a safety stop or critical unresolved issue;
- preserve entered data when an error occurs or a network request fails;
- make save state, author and timestamp obvious;
- allow keyboard-friendly dense lab entry without making the interface touch-hostile;
- do not place more than one editable patient context on the same screen without a clear lock/context bar;
- measure success rate, time-on-task, wrong-patient near misses, incomplete forms, correction rate, unnecessary clicks and staff satisfaction with representative IVF staff.

## Recommended information architecture

### Admin / configuration

- Facilities & clinics
  - Nile Valley Hospital
    - IVF & Reproductive Medicine
    - Dermatology
    - Nephrology
    - Urology
- staff membership and capability per clinic
- templates and controlled vocabularies
- laboratory equipment and consumable lots
- SOP / consent form versions
- audit, protocol deviations and downtime reconciliation

### IVF clinic workspace

- **Today** — worklist of monitoring visits, specimens waiting, retrievals, embryo reviews, transfers, consent blockers and cryobank exceptions.
- **Cycles** — searchable cycle board by stage, clinician, date and attention state.
- **Cycle chart** — one identity header, a stage timeline, monitoring, orders, lab, consents, tasks and outcome.
- **Andrology** — semen receipt, analysis, preparation and sperm cryostorage.
- **Embryology** — retrieval, oocytes, fertilization, day-by-day culture, grading, biopsy and transfer.
- **Cryobank** — inventory, location map, consent horizon, movement history, checks and exceptions.
- **Reports** — cycle throughput, lab quality indicators, outcomes, missing data, consent expiry and incident review.

### General hospital record

The general patient chart should show a compact IVF summary:

- active IVF clinic and active cycle;
- cycle status and next milestone;
- high-level treatment and outcome;
- link into the restricted IVF workspace.

It should not expose detailed donor identity, cryostorage location or genetic results to every general-hospital screen by default. Access should be role- and purpose-appropriate, with break-glass/audit where needed.

## Proposed technical model

### Core entities

- `facilities` — hierarchy and service line configuration.
- `ivf_cycles` — episode container linked to the Nile Valley patient and participants.
- `ivf_cycle_participants` — intended parent, partner, donor and carrier relationships.
- `ivf_monitoring_visits` — timed stimulation monitoring.
- `ivf_semen_samples` — pre/post preparation, source, serology and sperm cryo metadata.
- `ivf_oocyte_retrievals` and `ivf_oocytes` — retrieval event and individual oocytes.
- `ivf_embryos` — individual embryo, development, grading, biopsy, transfer and freeze state.
- `ivf_cryo_inventory` — cryodevice and physical location, derived from witnessed movements.
- `ivf_lab_events` — append-only custody/witness events.
- `ivf_consents` — versioned consent per person, use and material.
- `ivf_outcomes` — pregnancy and birth follow-up.
- `ivf_protocol_deviations` — stop/escalate/resolve safety incidents.

### Transaction and audit rules

- Every create/update is server-authorized by role and clinic membership; UI checks are not the security boundary.
- Every patient-specific query is scoped by clinic membership or an explicit break-glass event.
- Critical laboratory movement is append-only; current status/location is a projection, not a replacement for history.
- No hard delete for gametes, oocytes, embryos, cryodevices, consents, witness events or protocol deviations. A disposition event records why and who approved it.
- Every correction keeps the original value, corrected value, author, time and reason. The existing 24-hour amendment policy should not be assumed sufficient for long-lived IVF material records.
- Database constraints protect enums, participant relationships, unique embryo numbering, unique cryodevice identifiers and consent dates.
- RLS mirrors service authorization and denies cross-clinic reads by default. Admin and documented break-glass access are explicit, audited exceptions.
- Idempotency keys prevent duplicate cycle creation or duplicate lab events after a retry.
- Dates/times use `timestamptz` and preserve the actor’s displayed local timezone; collection, receipt, examination, trigger, retrieval and transfer times must not be silently collapsed to a date.
- Media, reports, signed consents and PGT documents live in private storage with short-lived signed URLs. Database records keep metadata and hashes, not public URLs.

### Interoperability

FHIR is useful as an exchange boundary, not as the sole internal model. Recommended mappings are:

- patient / partner / donor → `Patient` and `RelatedPerson`;
- cycle → `EpisodeOfCare` or specialty `Encounter` with extensions;
- monitoring and semen values → coded `Observation` resources;
- retrieval, insemination, biopsy and transfer → `Procedure`;
- semen/oocyte/embryo/biopsy material → `Specimen` with local extensions for stage, provenance and cryodevice;
- consent → `Consent` plus `DocumentReference`;
- lab orders and PGT → `ServiceRequest` and `DiagnosticReport`;
- cryotank and monitored equipment → `Device` / `DeviceMetric` where appropriate.

The internal schema should keep the fields the lab actually needs even when a standard resource does not provide a clean IVF-specific shape. Export adapters should be versioned and tested against receiving systems.

## Delivery plan

### Slice 1 — safe foundation (implemented in this branch)

- hierarchical facility / clinic configuration;
- IVF facility profile under Nile Valley Hospital;
- cycle registration and cycle board;
- monitoring, andrology, retrieval, embryo and cryobank domain tables;
- role-aware IVF clinic navigation;
- patient identity strip and progress-first workspace;
- auditable service layer and migration with RLS policies;
- research/decision record in this document.

### Slice 2 — laboratory hardening

- patient/partner/donor participant workflow;
- guided semen analysis with WHO method metadata and derived values;
- individual oocyte and embryo entry with witness checkpoints;
- barcode/QR labels using two identifiers plus material number;
- append-only custody event log and protocol-deviation workflow;
- signed consent forms and paper/downtime reconciliation;
- private document storage and PDF reconstruction of the approved Nile Valley form.

### Slice 3 — cryobank and operations

- tank/canister/goblet/slot map;
- tank and LN2 checks, alarms, incident response and emergency transfer;
- consent-expiry work queue;
- inventory reconciliation and discrepancy approval;
- PGT laboratory integration and result matching;
- appointment, billing and consumable-lot integration.

### Slice 4 — quality, reporting and future specialties

- cycle/outcome registry export reviewed by the medical director;
- lab KPI dashboard with denominator definitions;
- usability testing with a doctor, fertility nurse, embryologist/andrologist, front desk and admin;
- dermatology, nephrology and urology modules built on the same specialty-clinic shell, not copied IVF tables;
- specialty-specific schemas, templates and permissions with common patient, appointment, document, audit and billing primitives.

## Quality gates before live IVF data

A demo UI is not a validated IVF system. Before clinical use, Nile Valley should complete:

1. clinical and embryology review of every field, option and calculation against the approved SOP;
2. local legal/ethical review of consent, donor, embryo disposition and retention rules;
3. security review of RLS, storage, audit, break-glass and staff-to-clinic membership;
4. migration rehearsal and backup/restore test;
5. witnessed test cases for every critical movement, mismatch and downtime path;
6. test-result and consent-expiry follow-up tests;
7. formative usability sessions and high-risk task validation with representative staff;
8. dual-running against the current paper form until the medical director signs off;
9. no production use of seeded or fabricated clinical data;
10. a named owner for SOPs, controlled vocabulary, quality indicators and incident review.

## Selected sources

- [ESHRE recommendations on Good Practice in the IVF laboratory (2026)](https://academic.oup.com/humrep/article/41/8/1245/8725314) and [stakeholder PDF](https://www.eshre.eu/-/media/sitecore-files/Guidelines/IVF-lab/2026/ESHRE-IVF-labs-update_version-for-stakeholder-review.pdf) — traceability, witnessing, QMS, records, lab workflows and emergency procedures.
- [Association of Reproductive and Clinical Scientists, Good practice in clinical embryology laboratories (2024)](https://www.rbmojournal.com/article/S1472-6483(24)00291-8/fulltext) — identifiers, operators/witnesses, cryopreservation and storage records.
- [ASRM, Cryostorage of reproductive tissues in the IVF laboratory (2020)](https://prod.asrm.org/practice-guidance/practice-committee-documents/cryostorage-of-reproductive-tissues-in-the-in-vitro-fertilization-laboratory-a-committee-opinion-2020/) — tank monitoring, alarms, supply, access, safety and inventory practice.
- [WHO laboratory manual for the examination and processing of human semen, sixth edition (2021)](https://iris.who.int/server/api/core/bitstreams/4038e736-37b3-4064-a39a-60475e0ccecc/content) — collection, timing, examination and processing fields.
- [HFEA General Direction 0007, Consent (version 14, 2024)](https://portal.hfea.gov.uk/media/noyfn1nn/2024-08-14-general-direction-0007-v14.pdf) — versioned consent, electronic/paper fallback, identity safeguards, withdrawal and printable records. This is a benchmark, not Nigerian law.
- [ISO 15189:2022 overview](https://iso-library.com/standard/15189/) — medical-laboratory quality, competence, pre-examination, equipment and result integrity.
- [ISO 20387:2018 text excerpt](https://www.nms.unl.pt/Portals/0/adam/NMS%20Generic%20Content/RhjtOeouiUiHL7bKRcXnIA/Description/ISO_20387_2018_General_requirements_for_biobanking.pdf) — chain of custody, storage location traceability, integrity and contingency planning.
- [WHO/UNFPA/UNICEF and partners: Nigeria ART market study (2024)](https://aaamedicalibrationsltd.com/wp-content/uploads/2025/05/The-IVF-Market-in-Nigeria-2.pdf) — local service landscape and quality-system maturity context. Treat market-study claims as indicative, not a regulatory source.
- [Nigeria ART review in the Journal of Human Reproductive Sciences](https://journals.lww.com/jrge/fulltext/2018/03010/assisted_reproductive_technology_in_nigeria_.2.aspx) — local regulatory and ethical context requiring professional/legal confirmation.
- [ONC SAFER Guides: Using Health IT](https://healthit.gov/clinical-quality-and-safety/safer-guides/using-health-it/) — patient safety, test follow-up, clinician communication, training and workflow integration.
- [NIST GCR 15-996, Technical Basis for User Interface Design of Health IT](https://nvlpubs.nist.gov/nistpubs/gcr/2015/NIST.GCR.15-996.pdf) — user profiles, task analysis, use-related risk, iterative testing and error prevention.
- [AHRQ Electronic Health Records primer](https://psnet.ahrq.gov/primer/electronic-health-records) and [documentation-burden technical brief](https://effectivehealthcare.ahrq.gov/sites/default/files/related_files/documentation-burden-prepub-technical-brief.pdf) — workflow mismatch, display problems, alert fatigue, redundancy and burden measurement.
- [Mellowood IDEAS EMR](https://mellowoodmedical.com/products/ideas-emr/) — industry pattern reference for cycle summaries, lab/andrology, cryostorage and audit trails; not clinical authority.

**Research note:** Sources were reviewed 14 September 2026 UTC. The product team should re-check current local requirements, ESHRE/ASRM/WHO updates and Nile Valley’s approved SOPs at implementation time.
