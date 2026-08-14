/**
 * Offline drug interaction & allergy safety engine.
 *
 * Runs entirely in the browser/server without network calls — a curated,
 * conservative dataset of high-severity interactions relevant to a Nigerian
 * hospital formulary. This is a decision-SUPPORT tool, not a substitute for
 * clinical judgement (and the pharmacist should confirm against the BNF).
 */

export interface InteractionMatch {
    /** The other drug / allergen the candidate collides with. */
    other: string;
    severity: "Mild" | "Moderate" | "Severe";
    description: string;
    recommendation: string;
}

export interface SafetyCheckResult {
    safe: boolean;
    allergies: InteractionMatch[];
    interactions: InteractionMatch[];
}

const INTERACTIONS: Array<{
    a: string;
    b: string;
    severity: InteractionMatch["severity"];
    description: string;
    recommendation: string;
}> = [
    { a: "warfarin", b: "aspirin", severity: "Severe", description: "Greatly increased bleeding risk.", recommendation: "Avoid combination; monitor INR closely if unavoidable." },
    { a: "warfarin", b: "ibuprofen", severity: "Severe", description: "Increased GI bleeding risk and INR elevation.", recommendation: "Prefer paracetamol; monitor INR." },
    { a: "warfarin", b: "diclofenac", severity: "Severe", description: "Increased GI bleeding risk and INR elevation.", recommendation: "Prefer paracetamol; monitor INR." },
    { a: "warfarin", b: "metronidazole", severity: "Severe", description: "Inhibits warfarin metabolism — risk of over-anticoagulation.", recommendation: "Avoid; if essential, reduce warfarin dose and monitor INR." },
    { a: "warfarin", b: "co-trimoxazole", severity: "Severe", description: "Marked INR elevation and bleeding risk.", recommendation: "Avoid combination." },
    { a: "warfarin", b: "ciprofloxacin", severity: "Moderate", description: "May potentiate anticoagulant effect.", recommendation: "Monitor INR after starting antibiotic." },
    { a: "metformin", b: "furosemide", severity: "Moderate", description: "Increased lactic acidosis risk in dehydration.", recommendation: "Monitor renal function and hydration status." },
    { a: "metformin", b: "contrast", severity: "Moderate", description: "Contrast-induced nephropathy may precipitate lactic acidosis.", recommendation: "Withhold metformin 48h around contrast imaging; check creatinine." },
    { a: "digoxin", b: "furosemide", severity: "Moderate", description: "Hypokalaemia potentiates digoxin toxicity.", recommendation: "Monitor potassium and digoxin levels." },
    { a: "digoxin", b: "hydrochlorothiazide", severity: "Moderate", description: "Hypokalaemia potentiates digoxin toxicity.", recommendation: "Monitor potassium and digoxin levels." },
    { a: "amiodarone", b: "digoxin", severity: "Severe", description: "Amiodarone raises digoxin levels ~2x.", recommendation: "Halve digoxin dose and monitor levels." },
    { a: "ace-inhibitor", b: "spironolactone", severity: "Severe", description: "Risk of life-threatening hyperkalaemia.", recommendation: "Monitor potassium closely; avoid in renal impairment." },
    { a: "ace-inhibitor", b: "potassium", severity: "Severe", description: "Risk of hyperkalaemia.", recommendation: "Avoid potassium supplements unless monitored." },
    { a: "ace-inhibitor", b: "ibuprofen", severity: "Moderate", description: "NSAIDs blunt antihypertensive effect and harm the kidney.", recommendation: "Prefer paracetamol; monitor BP and creatinine." },
    { a: "ace-inhibitor", b: "diclofenac", severity: "Moderate", description: "NSAIDs blunt antihypertensive effect and harm the kidney.", recommendation: "Prefer paracetamol; monitor BP and creatinine." },
    { a: "sildenafil", b: "nitrate", severity: "Severe", description: "Profound, possibly fatal hypotension.", recommendation: "Absolute contraindication." },
    { a: "sildenafil", b: "isosorbide", severity: "Severe", description: "Profound, possibly fatal hypotension.", recommendation: "Absolute contraindication." },
    { a: "ciprofloxacin", b: "theophylline", severity: "Severe", description: "Theophylline toxicity (seizures, arrhythmias).", recommendation: "Avoid; monitor theophylline levels if essential." },
    { a: "rifampicin", b: "combined-oral-contraceptive", severity: "Severe", description: "Reduced contraceptive efficacy.", recommendation: "Use additional non-hormonal contraception." },
    { a: "rifampicin", b: "warfarin", severity: "Moderate", description: "Rifampicin induces warfarin metabolism.", recommendation: "Monitor INR and adjust dose." },
    { a: "artemether-lumefantrine", b: "metformin", severity: "Mild", description: "Possible additive hypoglycaemia.", recommendation: "Monitor blood glucose." },
    { a: "gentamicin", b: "furosemide", severity: "Severe", description: "Additive ototoxicity and nephrotoxicity.", recommendation: "Avoid; monitor hearing and creatinine if unavoidable." },
    { a: "gentamicin", b: "vancomycin", severity: "Severe", description: "Additive nephro/ototoxicity.", recommendation: "Monitor renal function and drug levels." },
    { a: "methotrexate", b: "co-trimoxazole", severity: "Severe", description: "Folate antagonism — severe marrow suppression.", recommendation: "Contraindicated." },
    { a: "methotrexate", b: "ibuprofen", severity: "Severe", description: "NSAIDs reduce methotrexate clearance — toxicity.", recommendation: "Avoid NSAIDs with methotrexate." },
    { a: "carbamazepine", b: "combined-oral-contraceptive", severity: "Severe", description: "Reduced contraceptive efficacy.", recommendation: "Use additional non-hormonal contraception." },
    { a: "phenytoin", b: "combined-oral-contraceptive", severity: "Severe", description: "Reduced contraceptive efficacy.", recommendation: "Use additional non-hormonal contraception." },
    { a: "simvastatin", b: "clarithromycin", severity: "Severe", description: "Risk of rhabdomyolysis.", recommendation: "Pause statin during macrolide therapy." },
    { a: "simvastatin", b: "erythromycin", severity: "Severe", description: "Risk of rhabdomyolysis.", recommendation: "Pause statin during macrolide therapy." },
    { a: "atorvastatin", b: "clarithromycin", severity: "Moderate", description: "Increased myopathy risk.", recommendation: "Pause statin during macrolide therapy." },
    { a: "clopidogrel", b: "omeprazole", severity: "Moderate", description: "Omeprazole reduces clopidogrel activation.", recommendation: "Prefer pantoprazole." },
    { a: "tramadol", b: "fluoxetine", severity: "Severe", description: "Serotonin syndrome and seizure risk.", recommendation: "Avoid combination." },
    { a: "tramadol", b: "sertraline", severity: "Severe", description: "Serotonin syndrome and seizure risk.", recommendation: "Avoid combination." },
    { a: "amitriptyline", b: "tramadol", severity: "Severe", description: "Serotonin syndrome and seizure risk.", recommendation: "Avoid combination." },
    { a: "levofloxacin", b: "theophylline", severity: "Moderate", description: "Theophylline toxicity risk.", recommendation: "Monitor theophylline levels." },
    { a: "cimetidine", b: "theophylline", severity: "Moderate", description: "Theophylline toxicity risk.", recommendation: "Monitor theophylline levels." },
];

const NORMALIZE = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9+/-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

function matches(pattern: string, drug: string): boolean {
    const n = NORMALIZE(drug);
    if (pattern.includes("-")) return n.includes(pattern) || pattern.includes(n);
    return n === pattern;
}

/**
 * Check a candidate drug name against the patient's allergy list and the
 * formulary interaction table. Works with free-text drug names.
 */
export function checkDrugSafety(
    drugName: string,
    allergies: Array<{ allergen: string; reaction?: string; severity?: string }> = [],
    currentMeds: string[] = []
): SafetyCheckResult {
    const result: SafetyCheckResult = { safe: true, allergies: [], interactions: [] };

    for (const allergy of allergies) {
        const allergen = allergy.allergen?.trim();
        if (!allergen) continue;
        if (
            matches(NORMALIZE(allergen), drugName) ||
            NORMALIZE(drugName).includes(NORMALIZE(allergen)) ||
            NORMALIZE(allergen).includes(NORMALIZE(drugName))
        ) {
            const severity: InteractionMatch["severity"] =
                allergy.severity === "life-threatening" || allergy.severity === "severe"
                    ? "Severe"
                    : allergy.severity === "mild"
                      ? "Mild"
                      : "Moderate";
            result.allergies.push({
                other: allergen,
                severity,
                description: allergy.reaction
                    ? `Documented reaction: ${allergy.reaction}`
                    : "Patient has a documented allergy to this drug.",
                recommendation:
                    severity === "Severe"
                        ? "DO NOT prescribe. Choose an alternative drug class."
                        : "Avoid if possible; use with caution and monitor closely.",
            });
        }
    }

    const d = NORMALIZE(drugName);
    for (const rule of INTERACTIONS) {
        const hitsA = d.includes(rule.a);
        const hitsB = rule.b === "nitrate" || rule.b === "potassium" || rule.b === "contrast" || rule.b === "combined-oral-contraceptive"
            ? currentMeds.some((m) => matches(rule.b, m))
            : currentMeds.some((m) => matches(rule.a, m) && false) || currentMeds.some((m) => matches(rule.b, m));
        if (hitsA && hitsB) {
            result.interactions.push({
                other: currentMeds.find((m) => matches(rule.b, m)) ?? rule.b,
                severity: rule.severity,
                description: rule.description,
                recommendation: rule.recommendation,
            });
        }
    }

    if (result.allergies.length > 0 || result.interactions.length > 0) result.safe = false;
    return result;
}
