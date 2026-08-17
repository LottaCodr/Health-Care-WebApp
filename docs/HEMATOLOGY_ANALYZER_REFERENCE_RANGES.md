# Hematology Analyzer Reports — Reference Ranges by Category

**Research & implementation guide** for the lab-tech module of Nile Valley
Hospital EMR. This document explains *why* the analyzer report needs
age/sex-partitioned reference ranges, what the science says, how the
industry standardizes it (CLSI / HL7 / FHIR / LOINC / UCUM), and how it is
implemented in this repository.

---

## 1. What the template actually is

The five transcribed printouts come from a **5-part differential hematology
analyzer with a 3-part printout configuration** (Lym / Mid / Gran). The
parameter set — WBC, Lym#, Mid#, Gran#, Lym%, Mid%, Gran%, RBC, HGB, HCT,
MCV, MCH, MCHC, RDW-CV, RDW-SD, PLT, MPV, PDW, PCT, **P-LCR, P-LCC**, plus
the derived **NLR** and **PLR** — matches the **Mindray BC-5130** brochure
exactly:

> 25 reportable parameters: WBC, Lym%, Mon%, Neu%, Bas%, Eos%, Lym#, Mon#,
> Neu#, Eos#, Bas#, RBC, HGB, HCT, MCV, MCH, MCHC, RDW-CV, RDW-SD, PLT,
> MPV, PDW, PCT, **P-LCR, P-LCC** … research parameters including … **NLR, PLR**
> — Mindray BC-5130 Technical Specifications

The Mid# / Mid% columns collapse Mon%+Eos%+Bas% into the "middle cells"
bucket, the convention used by Mindray's 3-part instruments. P-LCC
(platelet large cell count) and P-LCR (platelet large cell ratio) are
Sysmex-origin platelet indices that Mindray adopted.

**Key takeaway:** the printed reference ranges are *the analyzer
manufacturer's defaults*. CLSI guidance is clear that manufacturer ranges
are a starting point, not a destination (see §3).

## 2. Why ranges must be partitioned by age and sex

### 2.1 Newborns are not small adults

A neonatal CBC differs qualitatively from an adult one:

| Parameter | Newborn (printout) | Adult male (printout) | Why |
| --- | --- | --- | --- |
| HGB | 17.0–20.0 g/dL | 12.0–16.0 g/dL | High at birth (intra-uterine hypoxia → erythropoietin surge), falls over the first weeks |
| WBC | 4.0–20.0 ×10⁹/L | 4.0–10.0 ×10⁹/L | Birth stress leucocytosis; lymphocytes dominate after ~day 5–7 |
| MCV | 95–125 fL | 80–100 fL | Large fetal red cells with high HbF content |
| Gran% | 50–70% | 50–70% (same) | Neutrophils predominate at birth |

Published newborn reference data agree with the printout's order of
magnitude: cord-blood CBC studies report HGB 11–17.3 g/dL, RBC
3.1–7.3 ×10¹²/L, WBC 3.1–21.6 ×10⁹/L [2](https://pmc.ncbi.nlm.nih.gov/articles/PMC3464059/);
Children's Minnesota's hematology table puts 7–13-day HGB at 13.5–19.5 g/dL
and MCV at 88–126 fL [3](https://www.childrensmn.org/references/lab/hematology/cbc-reference-value-table.pdf).
The physiological **lymphocyte/neutrophil crossover** (around day 5–7 and
again at ~4–6 years) is exactly why a fixed "adult" WBC differential range
misclassifies most children [4](https://labreadai.com/en/posts/cbc-children-interpretation).

### 2.2 Children and adults differ by sex

Adult males and females have different RBC mass (testosterone-driven
erythropoiesis → higher HGB/HCT/RBC in men), so HGB, RBC, and HCT intervals
must be sex-partitioned — as the printouts do (adult male HGB 12–16 vs
female 11–15 g/dL). Modern analyzer studies confirm small but significant
sex differences for platelet indices too: MPV, P-LCR and PCT differ between
men and women on Sysmex XN-10 (MPV 9.1–13.0 vs 9.2–12.8 fL, P-LCR 17.6–47.0
vs 17.8–47.8%, PCT 0.16–0.35 vs 0.18–0.37%) [5](https://pmc.ncbi.nlm.nih.gov/articles/PMC6517618/).

Children's intervals in the printouts are sex-independent (RBC 3.5–5.2,
HGB 12–16 for both sexes) — consistent with most pediatric references up to
puberty.

## 3. The governing standard: CLSI EP28-A3c

**CLSI EP28-A3c — *Defining, Establishing, and Verifying Reference Intervals
in the Clinical Laboratory*** (formerly C28-A3) is the global standard for
reference intervals [6](https://webstore.ansi.org/preview-pages/CLSI/preview_CLSI+C28-A3.pdf).
Its practical rules for a laboratory like Nile Valley Hospital:

1. **Establish** an interval by sampling ≥ **120 healthy reference
   individuals per partition** (age × sex), non-parametric 2.5th–97.5th
   percentile. Almost no routine lab does this de novo.
2. **Transfer** a manufacturer's or published interval when the analyzer,
   reagents, and population are comparable (method-comparison regression).
3. **Verify** transferred intervals locally with **≥ 20 healthy subjects
   per partition** — collect 20 samples, compare against the interval, and
   apply a binomial check (if > 2 of 20 fall outside, verification fails).
   If one partition verifies, EP28-A3c permits accepting the other
   partitions of the same analyte [7](https://www.degruyterbrill.com/document/doi/10.1515/cclm-2018-0059/html?lang=en).
4. Partition whenever biology demands it (age, sex, pregnancy, neonates,
   children) — for CBC, **sex** and **age** partitions are mandatory.

Pediatric gaps are a known problem: fewer than half of pediatric analytes
have robust published intervals; the **CALIPER** program (Canadian
Laboratory Initiative on Pediatric Reference Intervals) is the largest
multi-analyte pediatric RI study and the model for pediatric partitioning
and transfer [7](https://www.degruyterbrill.com/document/doi/10.1515/cclm-2018-0059/html?lang=en).
IFCC's **C-RIDL** (Committee on Reference Intervals and Decision Limits)
is the international umbrella that publishes and curates harmonized
intervals.

### What this means for this app

- The five partitions (Newborn / Children M / Children F / Adult M / Adult F)
  and the ranges from the printouts are implemented as **data**
  (`lib/clinical/hematology-reference-ranges.ts`), so when the lab finishes
  its local EP28-A3c verification (see §8), only the table needs editing —
  no code change.
- The UI **auto-selects** the partition from the patient's DOB and sex and
  lets the tech override it, so a wrongly-registered patient can still be
  reported against the correct set.

## 4. The five partitions and every range

All values below are transcribed verbatim from the five printouts
(2026-07/08). Blank = the printout prints no reference range for that
parameter in that category (e.g. MPV on newborns).

| Para | Unit | Newborn | Children (M/F) | Adult M | Adult F |
| --- | --- | --- | --- | --- | --- |
| WBC | 10^9/L | 4.00–20.00 | 4.00–12.00 | 4.00–10.00 | 4.00–10.00 |
| Lym# | 10^9/L | 0.40–12.00 | 0.80–7.00 | 0.80–4.00 | 0.80–4.00 |
| Mid# | 10^9/L | 0.10–1.80 | 0.10–1.80 | 0.10–1.80 | 0.10–1.80 |
| Gran# | 10^9/L | 2.00–7.80 | 2.00–7.80 | 2.00–7.80 | 2.00–7.80 |
| Lym% | % | 10.0–60.0 | 20.0–60.0 | 20.0–40.0 | 20.0–40.0 |
| Mid% | % | 1.0–15.0 | 1.0–15.0 | 1.0–15.0 | 1.0–15.0 |
| Gran% | % | 50.0–70.0 | 50.0–70.0 | 50.0–70.0 | 50.0–70.0 |
| NLR | — | derived: Gran# ÷ Lym# (no range) | | | |
| PLR | — | derived: PLT ÷ Lym# (no range) | | | |
| RBC | 10^12/L | 3.50–7.00 | 3.50–5.20 | 4.00–5.50 | 3.50–5.00 |
| HGB | g/dL | 17.0–20.0 | 12.0–16.0 | 12.0–16.0 | 11.0–15.0 |
| HCT | % | 38.0–68.0 | 35.0–49.0 | 40.0–54.0 | 37.0–47.0 |
| MCV | fL | 95.0–125.0 | 80.0–100.0 | 80.0–100.0 | 80.0–100.0 |
| MCH | pg | 30.0–42.0 | 27.0–34.0 | 27.0–34.0 | 27.0–34.0 |
| MCHC | g/L | 300–340 | 310–370 | 320–360 | 320–360 |
| RDW-CV | % | 11.0–16.0 | 11.0–16.0 | 11.0–16.0 | 11.0–16.0 |
| RDW-SD | fL | 35.0–56.0 | 35.0–56.0 | 35.0–56.0 | 35.0–56.0 |
| PLT | 10^9/L | 100–300 | 100–300 | 100–300 | 100–300 |
| MPV | fL | — | 6.5–12.0 | 6.5–12.0 | 6.5–12.0 |
| PDW-CV | % | — | 9.0–16.0 | 15.0–17.0 | 15.0–17.0 |
| PDW-SD | fL | — | 9.0–17.0 | 9.0–17.0 | 9.0–17.0 |
| PCT | % | — | 0.108–0.282 | 0.108–0.282 | 0.108–0.282 |
| P-LCC | 10^9/L | 30–90 | 30–90 | 30–90 | 30–90 |
| P-LCR | % | 11.0–45.0 | 11.0–45.0 | 11.0–45.0 | 11.0–45.0 |

### Flag semantics (verified against all five printouts)

Flags use **inclusive bounds**: `value < low → L`, `value > high → H`,
boundary values are *not* flagged. This reproduces every flag on the
transcribed printouts (e.g. MCV 80.8 vs 80–100 → no flag; HGB 12.0 vs
12–16 → no flag; HGB 14.5 vs 17–20 → L; PLT 319 vs 100–300 → H).

### Derived parameters

- **NLR** (neutrophil-to-lymphocyte ratio) = Gran# ÷ Lym#
  (e.g. 14.37 ÷ 0.59 = **24.36** on the adult male printout)
- **PLR** (platelet-to-lymphocyte ratio) = PLT ÷ Lym#
  (e.g. 302 ÷ 2.63 = **114.83** on the adult female printout)

Both are computed automatically in the form and stored with 2-decimal
precision; they carry no reference range on the printout. NLR/PLR are
emerging prognostic markers (inflammation, sepsis, oncology) but are **not**
diagnostic on their own.

## 5. Partition resolution rules (implemented)

```
age < 28 days           → Newborn
28 days ≤ age < 18 yrs  → Children (Male/Female) — ranges sex-independent
age ≥ 18 yrs            → Adult Male / Adult Female — HGB/RBC/HCT differ
age unknown             → default Adult Male + warning "verify manually"
gender unknown/Other    → resolved by age, warning shown to the tech
```

The 28-day newborn boundary and 18-year adult boundary follow standard
pediatric convention (neonatal period = first 28 days of life).

## 6. Interoperability: how reference ranges are exchanged

### 6.1 HL7 v2 — OBX-7

In HL7 v2 lab messages, each result is an **OBX** segment and the reference
range lives in **OBX-7** (e.g. `OBX|1|NM|6690-2^WBC^LN||9.12|10*9/L|||N|F|||4.00-20.00|||`).
Most analyzers' LIS interfaces emit exactly this. This app's HL7 export is
currently ADT-only (no ORU^R01 lab messages yet) — the analyzer result
format was designed so an ORU export can populate OBX-7 from the same
`ref` column used by the UI.

### 6.2 FHIR R4 — `Observation.referenceRange`

FHIR models partitioned ranges natively:

```
Observation.referenceRange[].low    — SimpleQuantity (UCUM)
Observation.referenceRange[].high   — SimpleQuantity (UCUM)
Observation.referenceRange[].age    — Range of ages this partition applies to
Observation.referenceRange[].type   — CodeableConcept (e.g. "normal")
```

The US Core profile (a CLIA regulatory requirement under 42 CFR
493.1291(d)) says systems "MAY choose to restrict to only supplying the
relevant reference range based on knowledge about the patient (e.g. the
patient's age, gender…)" and that multiple ranges are interpreted as an
OR over target populations [8](https://build.fhir.org/ig/HL7/US-Core/StructureDefinition-us-core-observation-lab-definitions.html).

**Implemented here:** `lib/services/interop.service.ts#buildFhirBundle`
now emits completed CBC results as a proper **CBC-with-differential panel**
(LOINC **58410-2**) whose `component[]` carries each analyzer parameter as
an Observation component with:
- `valueQuantity` in UCUM (`10*9/L`, `g/dL`, `%`, `fL`, `pg`),
- `referenceRange.low/high` resolved from the **patient's actual
  age/sex partition** at export time,
- LOINC codes where they exist (see §6.3).

### 6.3 LOINC / UCUM mapping for the 25 parameters

| Para | LOINC | Notes |
| --- | --- | --- |
| WBC | 6690-2 | |
| Lym# / Lym% | 26474-7 / 736-9 | |
| Mid# (mono+eos+bas) | ~26485-3 / 5905-5 | "Mid" is not a standard LOINC concept — closest is Monocytes; verify locally |
| Gran# / Gran% | ~26505-8 / 26509-0 | closest is Neutrophils |
| RBC / HGB / HCT | 789-8 / 718-7 / 4544-3 | |
| MCV / MCH / MCHC | 787-2 / 785-6 / 786-4 | |
| RDW-CV / RDW-SD | 788-0 / 21000-5 | |
| PLT | 777-3 | |
| MPV | 32678-5 | |
| PDW | 32207-3 | |
| PCT | 32210-7 | platelet crit, volume fraction |
| P-LCC / P-LCR | — | **no standard LOINC** — proprietary analyzer indices; code as text |
| NLR / PLR | — | no standard LOINC; research parameters |

UCUM: `10^9/L` → `10*9/L`, `10^12/L` → `10*12/L`, `g/dL`, `g/L`, `%`, `fL`,
`pg` are already valid UCUM.

## 7. How it is implemented in this repo

| File | Role |
| --- | --- |
| `lib/clinical/hematology-reference-ranges.ts` | **Single source of truth.** Categories, all 25 parameters, per-partition ranges, `resolveHematologyCategory()`, `evaluateFlag()`, `computeDerivedValues()` (NLR/PLR), `buildHematologyResultString()`, shared `parseLabResult()` (handles the new 5-column analyzer format *and* legacy 4-column results), `toUcum()`. Pure TS — safe for server & client. |
| `components/lab-tech/HematologyAnalyzerForm.tsx` | Lab-tech entry form: auto-resolved reference set with manual override, mode (Whole Blood/Capillary/Prediluted), live H/L flags as the tech types, auto-computed NLR/PLR, Sample ID / Test Time header, additional notes. |
| `components/lab-tech/HematologyAnalyzerReport.tsx` | Printout-style viewer for completed reports (Sample ID / Mode / Gender / Age / Test Time header, Para/Flag/Result/Unit/Ref table, mandated footer) + one-click printer-friendly HTML export. |
| `components/lab-tech/test-templates.ts` | FBC template marked `kind: "hematology-analyzer"` so the generic field grid is bypassed; legacy fields retained as fallback. |
| `components/lab-tech/TestTemplateForm.tsx` | Routes analyzer-kind templates to the analyzer form; accepts `patient` + `sampleId` context. |
| `components/lab-tech/LabSuite.tsx`, `lab-result-upload-form.tsx`, `components/lab-tab.tsx` | Pass patient age (precise, in years) + gender + sample id into the form. |
| `components/lab-tech/LabReportPage.tsx`, `components/lab-tab.tsx` | Use the shared parser; render the analyzer printout or a flag-aware table for stored results. |
| `lib/services/interop.service.ts` | FHIR R4 CBC panel export with per-parameter `referenceRange` resolved from the patient's partition. |
| `docs/HEMATOLOGY_ANALYZER_REFERENCE_RANGES.md` | This document. |

**Stored result format** (`lab_requests.result`) — mirrors the printout so
any consumer (reports page, patient tab, FHIR export) can re-render it:

```
HEMATOLOGY ANALYZER
Full Blood Count (FBC)

Reference set: Newborn (0–28 days) · Auto-detected (9 Days, Male)
Sample ID: 2160
Mode: Whole Blood
Test Time: 2026-07-20T18:43:00.000Z

PARAMETER	FLAG	RESULT	UNIT	REF RANGE
────────────────────────────────────────────
WBC		9.12	10^9/L	4.00–20.00
…(25 rows)…
────────────────────────────────────────────

[The test result only accounts for this test sample]

Additional Notes:
…
```

The footer line `[The test result only accounts for this test sample]` is
mandatory on every printed report (it appears on all five source printouts).

## 8. Lab verification checklist (CLSI EP28-A3c)

Before relying on these ranges for clinical decisions, the lab should
complete (or document) an EP28-A3c verification:

- [ ] **Document the source** of each range (manufacturer defaults — this table).
- [ ] Verify the analyzer's linearity/QC pass with current reagent lots.
- [ ] **≥ 20 healthy reference subjects per partition** (healthy staff,
      students, donors — ideally matching the hospital's patient mix:
      age, sex, and local/regional ethnicity; note that Nile Valley
      Hospital's population may differ from the manufacturer's Asian
      reference population).
- [ ] Compare observed values against the transferred intervals; if more
      than 2 of 20 per partition fall outside, re-verify or re-establish.
- [ ] For children, if local verification is infeasible, prefer a
      transferred pediatric reference set (e.g. CALIPER/BC Children's) and
      document the transference.
- [ ] Review platelet indices (MPV/PDW/PCT/P-LCR) — published intervals vary
      by instrument generation; the printout ranges (MPV 6.5–12, PDW-CV
      9–16/15–17) are conservative defaults [5](https://pmc.ncbi.nlm.nih.gov/articles/PMC6517618/).
- [ ] Re-verify after: new analyzer, new reagent lot family, or a change in
      specimen type (capillary vs venous).
- [ ] Record verification results in the audit log (the app's audit service
      is available for this).

When the verified intervals differ from the printout defaults, edit the
`ranges` table in `lib/clinical/hematology-reference-ranges.ts` — the form,
reports, flags, and FHIR export all update automatically.

## 9. Key sources

1. Mindray BC-5130 Technical Specifications (25 reportable parameters incl. P-LCR, P-LCC, NLR, PLR) — https://www.mindray.com
2. Determination of reference ranges for FBC parameters in neonatal cord plasma — PMC3464059 — https://pmc.ncbi.nlm.nih.gov/articles/PMC3464059/
3. Children's Minnesota, Lab Dept: CBC Reference Values by age — https://www.childrensmn.org/references/lab/hematology/cbc-reference-value-table.pdf
4. CBC in Children: Normal Ranges by Age (lymphocyte/neutrophil crossover) — https://labreadai.com/en/posts/cbc-children-interpretation
5. Sex-divided reference intervals for MPV, P-LCR, PCT (Sysmex XN-10, UK population) — PMC6517618 — https://pmc.ncbi.nlm.nih.gov/articles/PMC6517618/
6. CLSI EP28-A3c — Defining, Establishing, and Verifying Reference Intervals in the Clinical Laboratory — https://webstore.ansi.org/preview-pages/CLSI/preview_CLSI+C28-A3.pdf
7. Verification of reference intervals in routine clinical laboratories (transference, CALIPER, C-RIDL) — Clin Chem Lab Med 2018 — https://www.degruyterbrill.com/document/doi/10.1515/cclm-2018-0059/html
8. FHIR R4 Observation.referenceRange / US Core Lab Observation profile (CLIA 42 CFR 493.1291(d)) — https://build.fhir.org/ig/HL7/US-Core/StructureDefinition-us-core-observation-lab-definitions.html
9. Safer Care Victoria — Normal laboratory values for neonates (preterm/term hematology by age) — https://www.safercare.vic.gov.au/best-practice-improvement/clinical-guidance/neonatal/normal-laboratory-values-for-neonates
10. LOINC — https://loinc.org · UCUM — https://ucum.org/ucum.html
