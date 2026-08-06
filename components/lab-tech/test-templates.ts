/**
 * Lab Test Templates
 * ==================
 * Defines structured form templates for every test the lab handles.
 * Each template describes the fields the lab tech must fill in, their
 * units, reference ranges, and optional interpretation tables.
 *
 * Matching: the `match` array contains lowercase substrings that are
 * tested against the lowercased `test_type` from the lab request.  The
 * first template whose match succeeds is used.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type FieldType = "numeric" | "text" | "select" | "qualitative";

export interface TemplateField {
    /** Display label */
    label: string;
    /** Key used to store the value in form data */
    key: string;
    /** Input type */
    type: FieldType;
    /** Unit (shown next to input) */
    unit?: string;
    /** Default / expected reference range (shown as helper text) */
    refRange?: string;
    /** For select / qualitative fields */
    options?: string[];
    /** Placeholder text */
    placeholder?: string;
    /** Whether this field is required */
    required?: boolean;
}

export interface InterpretationRow {
    range: string;
    remark: string;
    color?: "green" | "yellow" | "red" | "blue" | "gray";
}

export interface InterpretationTable {
    title?: string;
    rows: InterpretationRow[];
}

export interface TestTemplate {
    /** Human-readable template name */
    name: string;
    /** Department / section header */
    category: string;
    /** Substrings (lowercase) to match against test_type */
    match: string[];
    /** Form fields */
    fields: TemplateField[];
    /** Interpretation tables (can be multiple per test) */
    interpretations?: InterpretationTable[];
    /** Free-text note displayed below the fields */
    note?: string;
    /** Comment / educational text */
    comment?: string;
}

// ─── Templates ──────────────────────────────────────────────────────────────

export const TEST_TEMPLATES: TestTemplate[] = [

    // ════════════════════════════════════════════════════════════════════════
    //  HAEMATOLOGY
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Full Blood Count (FBC)",
        category: "HEMATOLOGY",
        match: ["full blood count", "fbc", "complete blood count", "cbc"],
        fields: [
            { label: "WBC", key: "wbc", type: "numeric", unit: "10^9/L", refRange: "4.00–10.00" },
            { label: "Lym#", key: "lym", type: "numeric", unit: "10^9/L", refRange: "0.80–4.00" },
            { label: "Mid#", key: "mid", type: "numeric", unit: "10^9/L", refRange: "0.10–1.80" },
            { label: "Gran#", key: "gran", type: "numeric", unit: "10^9/L", refRange: "2.00–7.80" },
            { label: "Lym%", key: "lym_pct", type: "numeric", unit: "%", refRange: "20.0–40.0" },
            { label: "Mid%", key: "mid_pct", type: "numeric", unit: "%", refRange: "1.0–15.0" },
            { label: "Gran%", key: "gran_pct", type: "numeric", unit: "%", refRange: "50.0–70.0" },
            { label: "RBC", key: "rbc", type: "numeric", unit: "10^9/L", refRange: "3.50–5.50" },
            { label: "HGB", key: "hgb", type: "numeric", unit: "g/L", refRange: "11.0–16.0" },
            { label: "HCT", key: "hct", type: "numeric", unit: "%", refRange: "37.0–54.0" },
            { label: "MCV", key: "mcv", type: "numeric", unit: "fL", refRange: "80.0–100.0" },
            { label: "MCH", key: "mch", type: "numeric", unit: "pg", refRange: "27.0–34.0" },
            { label: "MCHC", key: "mchc", type: "numeric", unit: "g/L", refRange: "320–360" },
            { label: "RDW-CV", key: "rdw_cv", type: "numeric", unit: "%", refRange: "11.0–16.0" },
            { label: "RDW-SD", key: "rdw_sd", type: "numeric", unit: "fL", refRange: "35.0–56.0" },
            { label: "PLT", key: "plt", type: "numeric", unit: "10^9/L", refRange: "100–300" },
            { label: "MPV", key: "mpv", type: "numeric", unit: "fL", refRange: "7.0–11.0" },
            { label: "PDW-CV", key: "pdw_cv", type: "numeric", unit: "%", refRange: "15.0–17.0" },
            { label: "PDW-SD", key: "pdw_sd", type: "numeric", unit: "fL", refRange: "9.0–17.0" },
            { label: "PCT", key: "pct", type: "numeric", unit: "%", refRange: "0.108–0.282" },
            { label: "P-LCC", key: "plcc", type: "numeric", unit: "10^9/L", refRange: "30–90" },
            { label: "P-LCR", key: "plcr", type: "numeric", unit: "%", refRange: "11.0–45.0" },
        ],
    },

    {
        name: "Genotype",
        category: "HEMATOLOGY",
        match: ["genotype", "genotyping", "haemoglobin genotype", "hemoglobin genotype"],
        fields: [
            {
                label: "Genotype", key: "genotype", type: "select",
                options: ["AA", "AS", "SS", "AC", "SC", "CC"],
                required: true,
            },
        ],
    },

    {
        name: "Blood Group",
        category: "HEMATOLOGY",
        match: ["blood group", "blood typing", "abo", "rh factor"],
        fields: [
            {
                label: "ABO Group", key: "abo_group", type: "select",
                options: ["A", "B", "AB", "O"],
                required: true,
            },
            {
                label: "Rh Factor", key: "rh_factor", type: "select",
                options: ["Rh D Positive", "Rh D Negative"],
                required: true,
            },
        ],
    },

    {
        name: "Clotting Profile",
        category: "HEMATOLOGY",
        match: ["clotting profile", "coagulation", "pt/inr", "aptt"],
        fields: [
            { label: "Clotting Time", key: "ct", type: "text", unit: "mins", refRange: "8–15 mins" },
            { label: "Bleeding Time", key: "bt", type: "text", unit: "mins", refRange: "2–7 mins" },
            { label: "APTT", key: "aptt", type: "text", unit: "secs", refRange: "21–38 secs" },
            { label: "PT", key: "pt", type: "text", unit: "secs", refRange: "10–15 secs" },
            { label: "INR", key: "inr", type: "numeric", refRange: "0.8–1.5" },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  CHEMISTRY – Diabetes / Glucose
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "HbA1c (Glycated Hemoglobin)",
        category: "CHEMISTRY",
        match: ["hba1c", "glycated hemoglobin", "glycosylated"],
        fields: [
            { label: "HbA1c", key: "hba1c", type: "numeric", unit: "%", refRange: "4–6.5", required: true },
        ],
        interpretations: [
            {
                rows: [
                    { range: "< 5.7%", remark: "Normal glucose control", color: "green" },
                    { range: "5.7 – 6.4%", remark: "Prediabetes", color: "yellow" },
                    { range: "≥ 6.5%", remark: "Diabetes mellitus (diagnostic if confirmed)", color: "red" },
                    { range: "< 7.0%", remark: "Good control (most non-pregnant adults)", color: "green" },
                    { range: "7.0 – 8.0%", remark: "Fair control", color: "yellow" },
                    { range: "> 8.0%", remark: "Poor control – high risk of complications", color: "red" },
                ],
            },
        ],
        note: "HbA1c reflects average blood glucose over the past 2–3 months. It may be unreliable in anemia, hemoglobinopathies, recent blood transfusion, or pregnancy.",
    },

    {
        name: "Fasting Blood Sugar (FBS)",
        category: "CHEMISTRY",
        match: ["fasting blood sugar", "fbs", "fasting glucose", "fasting blood glucose"],
        fields: [
            { label: "FBS", key: "fbs", type: "numeric", unit: "mmol/L", refRange: "3.3–6.5", required: true },
        ],
        interpretations: [
            {
                rows: [
                    { range: "3.9–5.5 mmol/L (70–99 mg/dL)", remark: "Normal", color: "green" },
                    { range: "5.6–6.9 mmol/L (100–125 mg/dL)", remark: "Prediabetes (Impaired fasting glucose)", color: "yellow" },
                    { range: "≥ 7.0 mmol/L (≥ 126 mg/dL)", remark: "Diabetes mellitus (confirm on repeat testing)", color: "red" },
                ],
            },
        ],
        note: "Carried out after at least 8 hours of fasting.",
    },

    {
        name: "Random Blood Sugar (RBS)",
        category: "CHEMISTRY",
        match: ["random blood sugar", "rbs", "random glucose"],
        fields: [
            { label: "RBS", key: "rbs", type: "numeric", unit: "mmol/L", refRange: "3.3–7.5", required: true },
        ],
        interpretations: [
            {
                rows: [
                    { range: "< 7.8 mmol/L (< 140 mg/dL)", remark: "Normal", color: "green" },
                    { range: "7.8–11.0 mmol/L (140–199 mg/dL)", remark: "Impaired glucose tolerance / suspicious", color: "yellow" },
                    { range: "≥ 11.1 mmol/L (≥ 200 mg/dL)", remark: "Diabetes mellitus (if symptomatic)", color: "red" },
                ],
            },
        ],
        note: "Taken at any time of the day. Classic diabetic symptoms: polyuria, polydipsia, weight loss, fatigue.",
    },

    // ════════════════════════════════════════════════════════════════════════
    //  CHEMISTRY – Renal Function
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Renal Function Tests (Electrolytes, Urea & Creatinine)",
        category: "CHEMISTRY",
        match: ["renal function", "electrolytes", "urea", "creatinine", "e/u/c", "kidney function"],
        fields: [
            { label: "Sodium", key: "sodium", type: "numeric", unit: "mmol/L", refRange: "135–148" },
            { label: "Potassium", key: "potassium", type: "numeric", unit: "mmol/L", refRange: "3.5–5.3" },
            { label: "Chloride", key: "chloride", type: "numeric", unit: "mmol/L", refRange: "98–107" },
            { label: "Bicarbonate", key: "bicarbonate", type: "numeric", unit: "mmol/L", refRange: "22–29" },
            { label: "Urea", key: "urea", type: "numeric", unit: "mg/dL", refRange: "15–70" },
            { label: "Creatinine", key: "creatinine", type: "numeric", unit: "mg/dL", refRange: "0.7–1.5" },
            { label: "Estimated GFR (eGFR)", key: "egfr", type: "numeric", unit: "mL/min/1.73m²", refRange: "≥ 90" },
        ],
        interpretations: [
            {
                title: "eGFR Interpretation",
                rows: [
                    { range: "≥ 90 mL/min/1.73m²", remark: "Normal kidney function", color: "green" },
                    { range: "60–89 mL/min/1.73m²", remark: "Mild reduction (Stage 2 CKD if persistent)", color: "yellow" },
                    { range: "45–59 mL/min/1.73m²", remark: "Moderate CKD (Stage 3a)", color: "yellow" },
                    { range: "30–44 mL/min/1.73m²", remark: "Moderate severe CKD (Stage 3b)", color: "red" },
                    { range: "15–29 mL/min/1.73m²", remark: "Severe CKD (Stage 4)", color: "red" },
                    { range: "< 15 mL/min/1.73m²", remark: "Kidney failure (Stage 5/ESRD)", color: "red" },
                ],
            },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  CHEMISTRY – Lipids
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Fasting Lipid Profile",
        category: "CHEMISTRY",
        match: ["lipid profile", "cholesterol", "triglyceride", "lipid panel", "lipids"],
        fields: [
            { label: "Total Cholesterol", key: "total_chol", type: "numeric", unit: "mg/dL", refRange: "0–200" },
            { label: "Triglycerides", key: "triglycerides", type: "numeric", unit: "mg/dL", refRange: "35–160" },
            { label: "HDL Cholesterol", key: "hdl", type: "numeric", unit: "mg/dL", refRange: "> 60" },
            { label: "LDL Cholesterol", key: "ldl", type: "numeric", unit: "mg/dL", refRange: "0–100" },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  CHEMISTRY – Liver Function
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Liver Function Test (LFT)",
        category: "CHEMISTRY",
        match: ["liver function", "lft", "hepatic function"],
        fields: [
            { label: "Total Bilirubin", key: "total_bilirubin", type: "numeric", unit: "mg/dL", refRange: "0.2–8" },
            { label: "Direct Bilirubin", key: "direct_bilirubin", type: "numeric", unit: "mg/dL", refRange: "0–0.4" },
            { label: "Total Protein", key: "total_protein", type: "numeric", unit: "g/dL", refRange: "3.4–8.7" },
            { label: "Albumin", key: "albumin", type: "numeric", unit: "g/dL", refRange: "3.4–5.5" },
            { label: "AST", key: "ast", type: "numeric", unit: "U/L", refRange: "0–37" },
            { label: "ALT", key: "alt", type: "numeric", unit: "U/L", refRange: "0–41" },
            { label: "ALP", key: "alp", type: "numeric", unit: "U/L", refRange: "53–128" },
            { label: "GGT", key: "ggt", type: "numeric", unit: "U/L", refRange: "7–50" },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  CHEMISTRY – Bilirubin (neonatal)
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Bilirubin (Total & Direct)",
        category: "CHEMISTRY",
        match: ["bilirubin"],
        fields: [
            { label: "Total Bilirubin", key: "total_bilirubin", type: "numeric", unit: "mg/dL", refRange: "See interpretation", required: true },
            { label: "Direct Bilirubin", key: "direct_bilirubin", type: "numeric", unit: "mg/dL", refRange: "0–0.3" },
        ],
        interpretations: [
            {
                title: "Total Bilirubin – Neonatal",
                rows: [
                    { range: "24 hours", remark: "2.0 – 6.0 mg/dL" },
                    { range: "48 hours", remark: "6.0 – 10.0 mg/dL" },
                    { range: "3–5 days", remark: "4.0 – 8.0 mg/dL" },
                ],
            },
            {
                title: "Total Bilirubin – Premature (3–5 days)",
                rows: [
                    { range: "Premature", remark: "10–14 mg/dL" },
                ],
            },
        ],
        note: "Direct bilirubin normal: 0–0.3 mg/dL.",
    },

    // ════════════════════════════════════════════════════════════════════════
    //  CHEMISTRY – Uric Acid
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Serum Uric Acid",
        category: "CHEMISTRY",
        match: ["uric acid", "serum urate"],
        fields: [
            { label: "Uric Acid", key: "uric_acid", type: "numeric", unit: "mg/dL", refRange: "2–7.2", required: true },
        ],
        interpretations: [
            {
                title: "Normal Ranges by Group",
                rows: [
                    { range: "Adult men", remark: "3.5–7.2 mg/dL" },
                    { range: "Adult women", remark: "2.6–6.0 mg/dL" },
                    { range: "Children", remark: "2.0–5.5 mg/dL" },
                ],
            },
        ],
        note: "High uric acid (hyperuricemia): Gout, chronic kidney disease, dehydration, hypertension, obesity, high-purine diet. Low uric acid (hypouricemia): pregnancy, SIADH, severe liver disease.",
    },

    // ════════════════════════════════════════════════════════════════════════
    //  CHEMISTRY – Calcium
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Calcium – Serum",
        category: "CHEMISTRY",
        match: ["calcium"],
        fields: [
            { label: "Calcium", key: "calcium", type: "numeric", unit: "mg/dL", refRange: "8.4–11", required: true },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  CHEMISTRY – Magnesium
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Magnesium – Serum",
        category: "CHEMISTRY",
        match: ["magnesium"],
        fields: [
            { label: "Magnesium", key: "magnesium", type: "numeric", unit: "mg/dL", refRange: "1.5–2.6", required: true },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  CHEMISTRY – D-Dimer
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "D-Dimer",
        category: "CHEMISTRY",
        match: ["d-dimer", "d.dimer", "ddimer"],
        fields: [
            { label: "D-Dimer", key: "d_dimer", type: "numeric", unit: "mg/L", refRange: "0–0.5", required: true },
        ],
        note: "Normal D-dimer: < 0.5 mg/L in adults under 50. Elevated values may indicate possible clot formation (DVT, PE, DIC). Interpretation must consider symptoms and risk factors.",
    },

    // ════════════════════════════════════════════════════════════════════════
    //  CHEMISTRY – H. Pylori
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Helicobacter Pylori (Antigen)",
        category: "CHEMISTRY",
        match: ["h-pylori", "helicobacter", "h. pylori", "hpylori"],
        fields: [
            {
                label: "H. Pylori Antigen", key: "hpylori", type: "select",
                options: ["Positive", "Negative"],
                required: true,
            },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  CHEMISTRY – Fecal Occult Blood
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Fecal Occult Blood (FOB)",
        category: "CHEMISTRY",
        match: ["fecal occult", "fob", "occult blood", "stool occult"],
        fields: [
            {
                label: "FOB Result", key: "fob", type: "select",
                options: ["Negative", "Positive"],
                required: true,
            },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  ENDOCRINOLOGY – Thyroid Function
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Thyroid Function Test (TFT)",
        category: "ENDOCRINOLOGY",
        match: ["thyroid function", "tft", "thyroid panel", "tsh", "t3", "t4"],
        fields: [
            { label: "T3", key: "t3", type: "numeric", unit: "nmol/L", refRange: "1.3–3.1" },
            { label: "T4", key: "t4", type: "numeric", unit: "nmol/L", refRange: "66–181" },
            { label: "TSH", key: "tsh", type: "numeric", unit: "mIU/L", refRange: "0.3–4.2" },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  ENDOCRINOLOGY – Hormonal Profile (combined)
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Hormonal Profile",
        category: "ENDOCRINOLOGY",
        match: ["hormonal profile", "hormone panel"],
        fields: [
            { label: "FSH", key: "fsh", type: "numeric", unit: "mIU/mL", refRange: "See phases" },
            { label: "LH", key: "lh", type: "numeric", unit: "mIU/mL", refRange: "See phases" },
            { label: "Estradiol (E2)", key: "e2", type: "numeric", unit: "pg/mL", refRange: "See phases" },
            { label: "Prolactin", key: "prolactin", type: "numeric", unit: "ng/mL", refRange: "4.60–25.07" },
            { label: "Testosterone", key: "testosterone", type: "numeric", unit: "ng/mL", refRange: "0.15–0.70" },
        ],
        interpretations: [
            {
                title: "FSH Reference (Adult Female)",
                rows: [
                    { range: "Follicular Phase", remark: "4.0–9.0 IU/L" },
                    { range: "Ovulatory Phase", remark: "5.0–23.0 IU/L" },
                    { range: "Luteal Phase", remark: "2.0–5.0 IU/L" },
                    { range: "Postmenopausal", remark: "17.0–114.0 IU/L" },
                ],
            },
            {
                title: "LH Reference",
                rows: [
                    { range: "Follicular Phase", remark: "2.4–12.6 mIU/mL" },
                    { range: "Ovulatory Peak", remark: "14.0–95.6 mIU/mL" },
                    { range: "Luteal Phase", remark: "1.0–11.4 mIU/mL" },
                    { range: "Postmenopausal", remark: "7.7–58.5 mIU/mL" },
                ],
            },
            {
                title: "Estradiol (E2) Reference",
                rows: [
                    { range: "Follicular", remark: "12.4–233.0 pg/mL" },
                    { range: "Periovulatory", remark: "41.0–398.0 pg/mL" },
                    { range: "Luteal", remark: "22.3–341.0 pg/mL" },
                    { range: "Post-Menopausal", remark: "< 5.0–138 pg/mL" },
                ],
            },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  ENDOCRINOLOGY – Prolactin (standalone)
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Prolactin",
        category: "ENDOCRINOLOGY",
        match: ["prolactin"],
        fields: [
            { label: "Prolactin", key: "prolactin", type: "numeric", unit: "ng/mL", refRange: "4.79–23.3", required: true },
        ],
        interpretations: [
            {
                title: "Reference Ranges",
                rows: [
                    { range: "Adult Male", remark: "2–18 ng/mL" },
                    { range: "Adult Female (Non-Pregnant)", remark: "4–23 ng/mL" },
                    { range: "Pregnant Female", remark: "34–386 ng/mL" },
                    { range: "Post-Menopausal Female", remark: "2–20 ng/mL" },
                ],
            },
            {
                title: "Interpretation",
                rows: [
                    { range: "Below range", remark: "Hypopituitarism, dopamine agonist therapy, Sheehan's syndrome", color: "yellow" },
                    { range: "25–50 ng/mL", remark: "Mild elevation – stress, hypothyroidism, PCOS, medication", color: "yellow" },
                    { range: "50–100 ng/mL", remark: "Moderate – prolactinoma (micro), CKD, chest wall trauma", color: "red" },
                    { range: "> 100 ng/mL", remark: "Marked – pituitary adenoma, severe hypothyroidism, pregnancy", color: "red" },
                ],
            },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  ENDOCRINOLOGY – Progesterone
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Progesterone",
        category: "CHEMISTRY",
        match: ["progesterone"],
        fields: [
            { label: "Progesterone", key: "progesterone", type: "numeric", unit: "ng/mL", refRange: "See phases", required: true },
        ],
        interpretations: [
            {
                title: "Reference by Phase",
                rows: [
                    { range: "Follicular", remark: "< 1.4–1.9 ng/mL" },
                    { range: "Ovulatory", remark: "< 1.4–12.0 ng/mL" },
                    { range: "Luteal", remark: "1.7–22.7 ng/mL" },
                    { range: "Post-Menopausal", remark: "< 1.4 ng/mL" },
                ],
            },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  IMMUNOSEROLOGY – AMH
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "AMH (Anti-Müllerian Hormone)",
        category: "IMMUNOSEROLOGY",
        match: ["amh", "anti-mullerian", "anti-müllerian", "antimullerian"],
        fields: [
            { label: "AMH", key: "amh", type: "numeric", unit: "ng/mL", refRange: "See interpretation", required: true },
        ],
        interpretations: [
            {
                rows: [
                    { range: "< 0.50 ng/mL", remark: "Predictive of poor response", color: "red" },
                    { range: "0.50 – < 1.0 ng/mL", remark: "Suggestive of limited ovarian reserve", color: "yellow" },
                    { range: "1.00 – 3.50 ng/mL", remark: "Predictive of optimal response", color: "green" },
                    { range: "> 3.50 ng/mL", remark: "Predictive of OHSS / PCOS", color: "red" },
                ],
            },
        ],
        note: "AMH starts declining years prior to rise in FSH, thus is a much more sensitive marker of ovarian reserve.",
        comment: "AMH is produced by granulosa cells of small growing follicles. It is superior to episodically released gonadotropins as a marker of ovarian reserve. Higher AMH → better response to ovarian stimulation. Elevated in PCOS and granulosa cell tumors.",
    },

    // ════════════════════════════════════════════════════════════════════════
    //  IMMUNOSEROLOGY – Ferritin
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Ferritin – Serum",
        category: "IMMUNOSEROLOGY",
        match: ["ferritin"],
        fields: [
            { label: "Ferritin", key: "ferritin", type: "numeric", unit: "ng/mL", refRange: "See interpretation", required: true },
        ],
        interpretations: [
            {
                title: "Women",
                rows: [
                    { range: "< 5 ng/mL", remark: "Severe Deficiency", color: "red" },
                    { range: "5–10 ng/mL", remark: "Moderate Deficiency", color: "red" },
                    { range: "10–29 ng/mL", remark: "Low iron stores", color: "yellow" },
                    { range: "30–150 ng/mL", remark: "Normal", color: "green" },
                    { range: "> 150 ng/mL", remark: "Iron overload / chronic inflammation / liver disease", color: "red" },
                ],
            },
            {
                title: "Men",
                rows: [
                    { range: "< 10 ng/mL", remark: "Severe Deficiency", color: "red" },
                    { range: "10–14 ng/mL", remark: "Moderate Deficiency", color: "red" },
                    { range: "15–29 ng/mL", remark: "Low iron stores", color: "yellow" },
                    { range: "30–400 ng/mL", remark: "Normal", color: "green" },
                    { range: "> 400 ng/mL", remark: "Iron overload / chronic inflammation / liver disease", color: "red" },
                ],
            },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  IMMUNOSEROLOGY – Insulin
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Insulin – Serum",
        category: "IMMUNOSEROLOGY",
        match: ["insulin"],
        fields: [
            { label: "Insulin", key: "insulin", type: "numeric", unit: "µU/mL", refRange: "2.5–25", required: true },
        ],
        interpretations: [
            {
                rows: [
                    { range: "< 2.5 µU/mL", remark: "Low – may indicate T1DM, pancreatic damage", color: "red" },
                    { range: "2.5–25 µU/mL", remark: "Normal insulin production", color: "green" },
                    { range: "> 25 µU/mL", remark: "High – insulin resistance, prediabetes, T2DM, PCOS, obesity", color: "red" },
                ],
            },
        ],
        note: "Insulin results are interpreted alongside blood glucose levels.",
    },

    // ════════════════════════════════════════════════════════════════════════
    //  CHEMISTRY – HOMA-IR
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "HOMA-IR",
        category: "CHEMISTRY",
        match: ["homa-ir", "homa", "insulin resistance"],
        fields: [
            { label: "Fasting Blood Sugar (FBS)", key: "fbs", type: "numeric", unit: "mmol/L", refRange: "3.3–6.5" },
            { label: "Fasting Insulin", key: "fasting_insulin", type: "numeric", unit: "µU/mL", refRange: "2.5–25" },
            { label: "HOMA-IR (calculated)", key: "homa_ir", type: "numeric", refRange: "< 1.0–2.9", required: true },
        ],
        interpretations: [
            {
                rows: [
                    { range: "< 1.0", remark: "Excellent insulin sensitivity", color: "green" },
                    { range: "1.0–1.9", remark: "Normal insulin sensitivity", color: "green" },
                    { range: "2.0–2.9", remark: "Early Insulin Resistance", color: "yellow" },
                    { range: "≥ 3.0", remark: "High risk of Type 2 Diabetes", color: "red" },
                ],
            },
        ],
        note: "HOMA-IR = (Fasting Insulin × Fasting Glucose) / 22.5. High values indicate insulin resistance.",
    },

    // ════════════════════════════════════════════════════════════════════════
    //  TUMOUR MARKERS
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "CA-125 (Ovarian Cancer Antigen)",
        category: "CHEMISTRY",
        match: ["ca-125", "ca 125", "ca125", "ovarian cancer antigen"],
        fields: [
            { label: "CA-125", key: "ca125", type: "numeric", unit: "U/mL", refRange: "0–35", required: true },
        ],
        note: "Normal: < 35 U/mL. Elevated in ovarian cancer, endometriosis, fibroids, menstruation. Values > 200 U/mL in high-risk individuals are strongly suggestive.",
    },

    {
        name: "CA-19.9 (Pancreatic Cancer Antigen)",
        category: "CHEMISTRY",
        match: ["ca-19.9", "ca 19.9", "ca199", "ca 19-9", "pancreatic cancer antigen"],
        fields: [
            { label: "CA-19.9", key: "ca199", type: "numeric", unit: "U/mL", refRange: "< 37.00", required: true },
        ],
        note: "Not recommended for general population screening. Persistently elevated levels usually indicate progressive disease. Used for monitoring pancreatic cancer.",
    },

    {
        name: "CA-15-3 (Breast Cancer Antigen)",
        category: "CHEMISTRY",
        match: ["ca-15-3", "ca 15-3", "ca153", "breast cancer antigen"],
        fields: [
            { label: "CA-15-3", key: "ca153", type: "numeric", unit: "U/mL", refRange: "0–25", required: true },
        ],
        note: "Normal: < 25 U/mL. Primarily used to monitor treatment response and detect recurrence in breast cancer patients.",
    },

    {
        name: "CEA (Carcinoembryonic Antigen)",
        category: "CHEMISTRY",
        match: ["cea", "carcinoembryonic"],
        fields: [
            { label: "CEA", key: "cea", type: "numeric", unit: "ng/mL", refRange: "0–5", required: true },
        ],
        note: "Normal: < 3 ng/mL (non-smokers), < 5 ng/mL (smokers). Used to monitor colorectal, pancreatic, gastric, and breast cancers. Trends over time are more important than single values.",
    },

    {
        name: "Alpha-Feto Protein (AFP)",
        category: "CHEMISTRY",
        match: ["alpha-feto", "afp", "alpha fetoprotein", "alphafetoprotein"],
        fields: [
            { label: "AFP", key: "afp", type: "numeric", unit: "ng/mL", refRange: "0–20", required: true },
        ],
        note: "Normal: < 20 ng/mL. Values > 400 ng/mL may suggest hepatocellular carcinoma or germ cell tumors. Moderately elevated (20–100) may require further investigation.",
    },

    {
        name: "PSA (Prostate Specific Antigen)",
        category: "CHEMISTRY",
        match: ["psa", "prostate specific antigen", "prostatic specific antigen"],
        fields: [
            { label: "PSA", key: "psa", type: "numeric", unit: "ng/mL", refRange: "0–4", required: true },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  CARDIAC MARKERS
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "NT-proBNP",
        category: "CHEMISTRY",
        match: ["nt-probnp", "probnp", "bnp", "natriuretic peptide"],
        fields: [
            { label: "NT-proBNP", key: "nt_probnp", type: "numeric", unit: "pg/mL", refRange: "0–300", required: true },
        ],
        interpretations: [
            {
                rows: [
                    { range: "0–300 pg/mL", remark: "Normal – heart failure unlikely", color: "green" },
                    { range: "> 300 pg/mL", remark: "Elevated – suggestive of increased cardiac stress", color: "red" },
                    { range: "Markedly elevated", remark: "Strongly associated with heart failure", color: "red" },
                ],
            },
        ],
    },

    {
        name: "Cardiac Troponin I (cTnI)",
        category: "CHEMISTRY",
        match: ["troponin", "ctni", "cardiac troponin"],
        fields: [
            { label: "Troponin I", key: "troponin_i", type: "numeric", unit: "ng/mL", refRange: "≤ 0.015", required: true },
        ],
        interpretations: [
            {
                rows: [
                    { range: "≤ 0.01 ng/mL", remark: "Normal – no evidence of myocardial injury", color: "green" },
                    { range: "> 0.01 ng/mL", remark: "Elevated – suggestive of myocardial injury", color: "red" },
                    { range: "Rising/falling", remark: "May indicate acute MI with ECG changes", color: "red" },
                ],
            },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  VITAMINS
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Vitamin D 25-Hydroxy",
        category: "CHEMISTRY",
        match: ["vitamin d", "25-hydroxy", "25-oh", "vit d"],
        fields: [
            { label: "Vitamin D (25-OH)", key: "vit_d", type: "numeric", unit: "ng/mL", refRange: "30–100", required: true },
        ],
        interpretations: [
            {
                rows: [
                    { range: "< 10 ng/mL", remark: "Deficient – high risk of bone disease", color: "red" },
                    { range: "10–29 ng/mL", remark: "Insufficient", color: "yellow" },
                    { range: "30–100 ng/mL", remark: "Sufficient – optimal for health", color: "green" },
                    { range: "> 100 ng/mL", remark: "Potential intoxication – toxicity risk", color: "red" },
                ],
            },
        ],
    },

    {
        name: "Vitamin B12",
        category: "CHEMISTRY",
        match: ["vitamin b12", "b12", "cobalamin"],
        fields: [
            { label: "Vitamin B12", key: "vit_b12", type: "numeric", unit: "pg/mL", refRange: "197–771", required: true },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  SEROLOGY
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "C-Reactive Protein (CRP)",
        category: "SEROLOGY",
        match: ["c-reactive protein", "crp", "c reactive protein"],
        fields: [
            { label: "CRP", key: "crp", type: "numeric", unit: "mg/L", refRange: "0–10", required: true },
        ],
        interpretations: [
            {
                rows: [
                    { range: "< 1.0 mg/L", remark: "Low / Normal – no significant inflammation", color: "green" },
                    { range: "1.0–3.0 mg/L", remark: "Mild elevation", color: "yellow" },
                    { range: "3.1–10 mg/L", remark: "Moderately elevated – active inflammation", color: "yellow" },
                    { range: "> 10 mg/L", remark: "High – significant acute inflammation", color: "red" },
                    { range: "> 100 mg/L", remark: "Markedly high – severe infection / sepsis", color: "red" },
                ],
            },
        ],
    },

    {
        name: "VDRL / HIV / HBsAg / HCV Panel",
        category: "SEROLOGY",
        match: ["vdrl", "hiv", "hbsag", "hcv", "serology panel"],
        fields: [
            { label: "VDRL", key: "vdrl", type: "select", options: ["Negative", "Positive"] },
            { label: "HCV", key: "hcv", type: "select", options: ["Negative", "Positive"] },
            { label: "HIV", key: "hiv", type: "select", options: ["Negative", "Positive"] },
            { label: "HBsAg", key: "hbsag", type: "select", options: ["Negative", "Positive"] },
        ],
    },

    {
        name: "Hepatitis B 5-in-1 Panel",
        category: "SEROLOGY",
        match: ["hepatitis b 5", "hepatitis b panel", "hbv panel", "hepatitis panel"],
        fields: [
            { label: "HBsAg", key: "hbsag", type: "select", options: ["Positive", "Negative"], required: true },
            { label: "HBsAb (Anti-HBs)", key: "hbsab", type: "select", options: ["Positive", "Negative"] },
            { label: "HBeAg", key: "hbeag", type: "select", options: ["Positive", "Negative"] },
            { label: "HBeAb (Anti-HBe)", key: "hbeab", type: "select", options: ["Positive", "Negative"] },
            { label: "HBcAb (Anti-HBc)", key: "hbcab", type: "select", options: ["Positive", "Negative"] },
        ],
    },

    {
        name: "Chlamydia & Gonorrhea Antigen",
        category: "SEROLOGY",
        match: ["chlamydia", "gonorrhea", "gc/chlamydia"],
        fields: [
            { label: "Chlamydia", key: "chlamydia", type: "select", options: ["Negative", "Positive"], required: true },
            { label: "Gonorrhea", key: "gonorrhea", type: "select", options: ["Negative", "Positive"], required: true },
        ],
    },

    {
        name: "TORCH Panel",
        category: "SEROLOGY",
        match: ["torch"],
        fields: [
            { label: "Toxoplasmosis IgM", key: "toxo_igm", type: "select", options: ["Negative", "Positive"] },
            { label: "Rubella IgM", key: "rubella_igm", type: "select", options: ["Negative", "Positive"] },
            { label: "Cytomegalovirus IgM", key: "cmv_igm", type: "select", options: ["Negative", "Positive"] },
            { label: "Herpes Simplex Virus 1 IgM", key: "hsv1_igm", type: "select", options: ["Negative", "Positive"] },
            { label: "Herpes Simplex Virus 2 IgM", key: "hsv2_igm", type: "select", options: ["Negative", "Positive"] },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  PARASITOLOGY
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Malaria Parasite",
        category: "PARASITOLOGY",
        match: ["malaria parasite", "malaria", "mp", "blood film for malaria"],
        fields: [
            {
                label: "Malaria Parasite", key: "malaria", type: "select",
                options: ["Not seen", "Seen (P. falciparum)", "Seen (P. vivax)", "Seen (P. malariae)", "Seen (P. ovale)", "Seen (Mixed)"],
                required: true,
            },
        ],
    },

    {
        name: "Typhoid IgM/IgG",
        category: "PARASITOLOGY",
        match: ["typhoid", "widal"],
        fields: [
            { label: "Typhoid IgM", key: "typhoid_igm", type: "select", options: ["Negative", "Positive"], required: true },
            { label: "Typhoid IgG", key: "typhoid_igg", type: "select", options: ["Negative", "Positive"] },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  URINALYSIS
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Urinalysis",
        category: "URINALYSIS",
        match: ["urinalysis", "urine analysis", "urine r/m", "urine routine"],
        fields: [
            { label: "Colour", key: "colour", type: "select", options: ["Amber", "Yellow", "Pale Yellow", "Dark Yellow", "Red", "Brown", "Orange"] },
            { label: "Appearance", key: "appearance", type: "select", options: ["Clear", "Slightly Turbid", "Turbid", "Cloudy"] },
            { label: "Blood", key: "blood", type: "select", options: ["Negative", "Trace", "1+", "2+", "3+"] },
            { label: "Bilirubin", key: "bilirubin", type: "select", options: ["Negative", "Trace", "1+", "2+", "3+"] },
            { label: "Urobilinogen", key: "urobilinogen", type: "select", options: ["Normal", "Increased"] },
            { label: "Ketones", key: "ketones", type: "select", options: ["Negative", "Trace", "1+", "2+", "3+"] },
            { label: "Glucose", key: "glucose", type: "select", options: ["Negative", "Trace", "1+", "2+", "3+", "4+"] },
            { label: "Protein", key: "protein", type: "select", options: ["Negative", "Trace", "1+", "2+", "3+"] },
            { label: "Nitrite", key: "nitrite", type: "select", options: ["Negative", "Positive"] },
            { label: "Leucocytes", key: "leucocytes", type: "select", options: ["Negative", "Trace", "1+", "2+", "3+"] },
            { label: "pH", key: "ph", type: "numeric", refRange: "4.5–8.0" },
            { label: "Ascorbic Acid", key: "ascorbic_acid", type: "select", options: ["Negative", "Positive"] },
            { label: "Specific Gravity", key: "sg", type: "numeric", refRange: "1.005–1.030" },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  MICROBIOLOGY – MCS (Culture & Sensitivity)
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Urine MCS",
        category: "MICROBIOLOGY AND PARASITOLOGY",
        match: ["urine mcs", "urine culture", "urine c&s"],
        fields: [
            { label: "Appearance", key: "appearance", type: "text", placeholder: "e.g. Amber & slightly turbid" },
            { label: "Pus Cells", key: "pus_cells", type: "text", unit: "/hpf", placeholder: "e.g. 1-3" },
            { label: "Red Blood Cells", key: "rbc", type: "text", placeholder: "e.g. Nil" },
            { label: "Epithelial Cells", key: "epithelial", type: "text", unit: "/hpf", placeholder: "e.g. 0-1" },
            { label: "Others", key: "others", type: "text", placeholder: "e.g. Nil" },
            { label: "Culture Result", key: "culture", type: "text", placeholder: "e.g. Yielded no significant growth after 24h incubation at 37°C" },
            { label: "Sensitivity (if growth)", key: "sensitivity", type: "text", placeholder: "e.g. Ciprofloxacin-S, Gentamicin-S, Amoxil-R" },
        ],
    },

    {
        name: "Stool MCS",
        category: "MICROBIOLOGY AND PARASITOLOGY",
        match: ["stool mcs", "stool culture", "faeces mcs"],
        fields: [
            // Macroscopy
            { label: "Colour", key: "colour", type: "text", placeholder: "e.g. Yellow" },
            { label: "Appearance", key: "appearance", type: "text", placeholder: "e.g. Semi formed stool" },
            { label: "Blood", key: "blood", type: "select", options: ["Present", "Absent"] },
            { label: "Mucus", key: "mucus", type: "select", options: ["Present", "Absent"] },
            { label: "Pus", key: "pus", type: "select", options: ["Present", "Absent"] },
            // Microscopy
            { label: "Pus Cells", key: "pus_cells", type: "text", placeholder: "e.g. 1-2" },
            { label: "Red Blood Cells", key: "rbc", type: "text", placeholder: "e.g. Nil" },
            { label: "Yeast Cells", key: "yeast", type: "text", placeholder: "e.g. Nil" },
            { label: "Bacteria", key: "bacteria", type: "text", placeholder: "e.g. ++, +, Nil" },
            { label: "Parasite", key: "parasite", type: "text", placeholder: "e.g. No ova, cyst or larva seen" },
            { label: "Culture Result", key: "culture", type: "text", placeholder: "e.g. Yielded moderate growth of E. coli" },
            { label: "Sensitivity", key: "sensitivity", type: "text", placeholder: "e.g. Ciprofloxacin-S3+, Augmentin-R" },
        ],
    },

    {
        name: "High Vaginal Swab (HVS) MCS",
        category: "MICROBIOLOGY AND PARASITOLOGY",
        match: ["hvs", "high vaginal swab", "vaginal swab"],
        fields: [
            { label: "Pus Cells", key: "pus_cells", type: "text", unit: "/hpf", placeholder: "e.g. 0-1" },
            { label: "Epithelial Cells", key: "epithelial", type: "text", unit: "/hpf", placeholder: "e.g. 1-2" },
            { label: "Yeast Cells", key: "yeast", type: "text", placeholder: "e.g. Nil" },
            { label: "Others", key: "others", type: "text", placeholder: "e.g. Nil" },
            { label: "Culture Result", key: "culture", type: "text", placeholder: "e.g. Yielded no microbial growth after 24h" },
            { label: "Sensitivity (if growth)", key: "sensitivity", type: "text", placeholder: "e.g. Fluconazole-S, Metronidazole-S" },
        ],
    },

    {
        name: "ECS MCS (Endocervical Swab)",
        category: "MICROBIOLOGY AND PARASITOLOGY",
        match: ["ecs", "endocervical swab", "endocervical"],
        fields: [
            { label: "Pus Cells", key: "pus_cells", type: "text", unit: "/hpf", placeholder: "e.g. 1-2" },
            { label: "Red Blood Cells", key: "rbc", type: "text", placeholder: "e.g. Nil" },
            { label: "Epithelial Cells", key: "epithelial", type: "text", unit: "/hpf", placeholder: "e.g. 2-4" },
            { label: "Yeast Cells", key: "yeast", type: "text", placeholder: "e.g. Nil" },
            { label: "Bacteria", key: "bacteria", type: "text", placeholder: "e.g. Nil" },
            { label: "Others", key: "others", type: "text", placeholder: "e.g. Nil" },
            { label: "Culture Result", key: "culture", type: "text" },
            { label: "Sensitivity", key: "sensitivity", type: "text" },
        ],
    },

    {
        name: "Wound Swab MCS",
        category: "MICROBIOLOGY AND PARASITOLOGY",
        match: ["wound swab", "wound mcs", "wound culture"],
        fields: [
            { label: "Pus Cells", key: "pus_cells", type: "text", unit: "/hpf", placeholder: "e.g. Numerous" },
            { label: "Bacteria Cells", key: "bacteria", type: "text", placeholder: "e.g. ++" },
            { label: "Epithelial Cells", key: "epithelial", type: "text", unit: "/hpf" },
            { label: "Yeast Cells", key: "yeast", type: "text", placeholder: "e.g. Nil" },
            { label: "Others", key: "others", type: "text" },
            { label: "Culture Result", key: "culture", type: "text" },
            { label: "Sensitivity", key: "sensitivity", type: "text" },
        ],
    },

    {
        name: "Ear Swab MCS",
        category: "MICROBIOLOGY AND PARASITOLOGY",
        match: ["ear swab", "ear mcs", "ear culture"],
        fields: [
            { label: "Pus Cells", key: "pus_cells", type: "text", unit: "/hpf" },
            { label: "Red Blood Cells", key: "rbc", type: "text", placeholder: "e.g. Nil" },
            { label: "Epithelial Cells", key: "epithelial", type: "text", unit: "/hpf" },
            { label: "Yeast Cells", key: "yeast", type: "text", placeholder: "e.g. Nil" },
            { label: "Others", key: "others", type: "text" },
            { label: "Culture Result", key: "culture", type: "text" },
            { label: "Sensitivity", key: "sensitivity", type: "text" },
        ],
    },

    // ════════════════════════════════════════════════════════════════════════
    //  SEMEN ANALYSIS
    // ════════════════════════════════════════════════════════════════════════

    {
        name: "Semen Analysis",
        category: "MICROBIOLOGY AND PARASITOLOGY",
        match: ["semen analysis", "semen", "sperm", "seminal fluid"],
        fields: [
            // Macroscopic
            { label: "Appearance", key: "appearance", type: "select", options: ["Opaque", "Opalescent", "Clear"] },
            { label: "Viscosity", key: "viscosity", type: "select", options: ["Normo-viscous", "Hypo-viscous", "Hyper-viscous"] },
            { label: "Liquefaction Time", key: "liquefaction", type: "text", unit: "minutes", refRange: "≤ 30 minutes" },
            { label: "pH", key: "ph", type: "numeric", refRange: "≥ 7.2" },
            { label: "Volume", key: "volume", type: "numeric", unit: "mL", refRange: "≥ 1.5 mL" },
            { label: "Colour", key: "colour", type: "select", options: ["Creamy white", "Grayish white", "Yellowish", "Other"] },
            { label: "Fructose", key: "fructose", type: "select", options: ["Positive", "Negative"] },
            // Microscopic
            { label: "Total Sperm Count", key: "total_count", type: "numeric", unit: "million", refRange: "≥ 39 million" },
            { label: "Sperm Count", key: "sperm_count", type: "numeric", unit: "million/mL", refRange: "≥ 15 million/mL" },
            { label: "Normal Morphology", key: "normal_morph", type: "numeric", unit: "%", refRange: "≥ 4%" },
            { label: "Abnormal Morphology", key: "abnormal_morph", type: "numeric", unit: "%" },
            { label: "Rapid Motility", key: "rapid", type: "numeric", unit: "%" },
            { label: "Slow Motility", key: "slow", type: "numeric", unit: "%" },
            { label: "Non-Progressive Motility", key: "non_progressive", type: "numeric", unit: "%" },
            { label: "Pus Cells", key: "pus_cells", type: "text", unit: "/hpf" },
        ],
    },
];

// ─── Template Lookup ────────────────────────────────────────────────────────

/**
 * Find the best matching template for a given test_type string.
 * Returns `null` if no template matches (caller should fall back to free-text).
 */
export function findTemplate(testType: string | undefined | null): TestTemplate | null {
    if (!testType) return null;
    const lower = testType.toLowerCase();

    for (const tpl of TEST_TEMPLATES) {
        for (const pattern of tpl.match) {
            if (lower.includes(pattern)) return tpl;
        }
    }
    return null;
}

/**
 * Build a structured result string from template form data.
 */
export function buildResultString(
    template: TestTemplate,
    values: Record<string, string>,
): string {
    const lines: string[] = [];
    lines.push(`${template.category}`);
    lines.push(`${template.name}`);
    lines.push("");
    lines.push("TEST NAME\tRESULT\tREFERENCE RANGE\tUNIT");
    lines.push("─".repeat(70));

    for (const field of template.fields) {
        const val = values[field.key] ?? "";
        if (val) {
            const ref = field.refRange ?? "—";
            const unit = field.unit ?? "";
            lines.push(`${field.label}\t${val}\t${ref}\t${unit}`);
        }
    }

    if (template.note) {
        lines.push("");
        lines.push(`Note: ${template.note}`);
    }

    return lines.join("\n");
}
