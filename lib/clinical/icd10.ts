/**
 * Quick-pick ICD-10 codes for common diagnoses in a Nigerian hospital.
 * (Full ICD-10/GEM tooling is out of scope; this supports structured
 * diagnosis coding in consultations and on death certificates.)
 */
export interface Icd10Entry {
    code: string;
    description: string;
    category: string;
}

export const COMMON_ICD10: Icd10Entry[] = [
    // Infections
    { code: "B54", description: "Malaria, unspecified", category: "Infections" },
    { code: "B50.9", description: "Plasmodium falciparum malaria", category: "Infections" },
    { code: "A01.0", description: "Typhoid fever", category: "Infections" },
    { code: "A09", description: "Infectious gastroenteritis", category: "Infections" },
    { code: "A15.0", description: "Pulmonary tuberculosis, confirmed", category: "Infections" },
    { code: "B20", description: "HIV disease", category: "Infections" },
    { code: "A41.9", description: "Sepsis, unspecified", category: "Infections" },
    { code: "J18.9", description: "Pneumonia, unspecified", category: "Respiratory" },
    { code: "J45.9", description: "Asthma, unspecified", category: "Respiratory" },
    { code: "J44.9", description: "COPD, unspecified", category: "Respiratory" },
    { code: "J15.9", description: "Bacterial pneumonia", category: "Respiratory" },
    { code: "I10", description: "Essential hypertension", category: "Cardiovascular" },
    { code: "I50.9", description: "Heart failure, unspecified", category: "Cardiovascular" },
    { code: "I25.1", description: "Ischaemic heart disease", category: "Cardiovascular" },
    { code: "I63.9", description: "Cerebral infarction (stroke)", category: "Cardiovascular" },
    { code: "I64", description: "Stroke, not specified", category: "Cardiovascular" },
    { code: "I48.9", description: "Atrial fibrillation", category: "Cardiovascular" },
    { code: "E11.9", description: "Type 2 diabetes mellitus", category: "Endocrine" },
    { code: "E10.9", description: "Type 1 diabetes mellitus", category: "Endocrine" },
    { code: "E66.9", description: "Obesity, unspecified", category: "Endocrine" },
    { code: "D64.9", description: "Anaemia, unspecified", category: "Haematology" },
    { code: "D57.1", description: "Sickle-cell disease without crisis", category: "Haematology" },
    { code: "D57.0", description: "Sickle-cell anaemia with crisis", category: "Haematology" },
    { code: "K29.7", description: "Gastritis, unspecified", category: "Gastrointestinal" },
    { code: "K25.9", description: "Gastric ulcer, unspecified", category: "Gastrointestinal" },
    { code: "K35.8", description: "Acute appendicitis", category: "Gastrointestinal" },
    { code: "K80.2", description: "Cholelithiasis", category: "Gastrointestinal" },
    { code: "K92.2", description: "Gastrointestinal haemorrhage", category: "Gastrointestinal" },
    { code: "N39.0", description: "Urinary tract infection, site unspecified", category: "Renal" },
    { code: "N18.9", description: "Chronic kidney disease, unspecified", category: "Renal" },
    { code: "N20.0", description: "Calculus of kidney", category: "Renal" },
    { code: "O80", description: "Spontaneous vertex delivery", category: "Obstetrics" },
    { code: "O14.9", description: "Pre-eclampsia, unspecified", category: "Obstetrics" },
    { code: "O42.9", description: "Premature rupture of membranes", category: "Obstetrics" },
    { code: "O26.9", description: "Pregnancy-related condition, unspecified", category: "Obstetrics" },
    { code: "P07.3", description: "Preterm newborn", category: "Neonatal" },
    { code: "P22.9", description: "Respiratory distress of newborn", category: "Neonatal" },
    { code: "A39.0", description: "Meningococcal meningitis", category: "Infections" },
    { code: "G40.9", description: "Epilepsy, unspecified", category: "Neurology" },
    { code: "F32.9", description: "Major depressive disorder, unspecified", category: "Mental health" },
    { code: "F20.9", description: "Schizophrenia, unspecified", category: "Mental health" },
    { code: "S06.9", description: "Intracranial injury, unspecified", category: "Trauma" },
    { code: "S72.9", description: "Fracture of femur, unspecified", category: "Trauma" },
    { code: "T14.9", description: "Injury, unspecified", category: "Trauma" },
    { code: "R50.9", description: "Fever, unspecified", category: "Symptoms" },
    { code: "R10.4", description: "Abdominal pain, other and unspecified", category: "Symptoms" },
    { code: "R51", description: "Headache", category: "Symptoms" },
    { code: "R05", description: "Cough", category: "Symptoms" },
    { code: "R42", description: "Dizziness and giddiness", category: "Symptoms" },
    { code: "Z34.9", description: "Supervision of normal pregnancy", category: "Z codes" },
    { code: "Z00.0", description: "General adult medical examination", category: "Z codes" },
];

export function findIcd10(codeOrDescription: string): Icd10Entry | undefined {
    return COMMON_ICD10.find(
        (e) => e.code === codeOrDescription || e.description === codeOrDescription
    );
}
