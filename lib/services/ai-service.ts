"use server";

/**
 * Nile Valley Hospital — AI Clinical Service
 * All AI features powered by Claude (Anthropic API)
 * Each function is a server action callable from client components
 */

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

async function callClaude(systemPrompt: string, userMessage: string, maxTokens = 1024) {
    const res = await fetch(ANTHROPIC_API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.ANTHROPIC_API_KEY!,   // ← add this
            "anthropic-version": "2023-06-01",                      // ← add this
        },
        body: JSON.stringify({
            model: MODEL,
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: [{ role: "user", content: userMessage }],
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Anthropic API error: ${err}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text ?? "";
}

// ─── 1. AI Clinical Assistant ─────────────────────────────────────────────────
// Analyses symptoms + patient history → differential diagnoses, lab suggestions, ICD-10

export async function getAIClinicalAssistance(input: {
    symptoms: string;
    patientAge?: number;
    patientGender?: string;
    medicalHistory?: string;
    currentMeds?: string;
    allergies?: string;
    existingDiagnosis?: string;
}): Promise<{
    differentials: { diagnosis: string; likelihood: "High" | "Medium" | "Low"; reasoning: string }[];
    suggestedTests: string[];
    redFlags: string[];
    icd10Codes: { code: string; description: string }[];
    clinicalNotes: string;
}> {
    const system = `You are an expert clinical decision support AI for Nile Valley Hospital in Nigeria.
Analyse patient presentations and return ONLY valid JSON matching this exact structure:
{
  "differentials": [{ "diagnosis": string, "likelihood": "High"|"Medium"|"Low", "reasoning": string }],
  "suggestedTests": [string],
  "redFlags": [string],
  "icd10Codes": [{ "code": string, "description": string }],
  "clinicalNotes": string
}
Consider Nigerian disease prevalence (malaria, typhoid, sickle cell, hypertension, diabetes).
Be concise. Max 4 differentials, 5 tests, 3 red flags, 3 ICD codes.
Return ONLY the JSON object, no markdown, no explanation.`;

    const message = `
Patient: ${input.patientGender ?? "Unknown"}, ${input.patientAge ? `${input.patientAge} years` : "age unknown"}
Symptoms: ${input.symptoms}
${input.medicalHistory ? `Medical history: ${input.medicalHistory}` : ""}
${input.currentMeds ? `Current medications: ${input.currentMeds}` : ""}
${input.allergies ? `Allergies: ${input.allergies}` : ""}
${input.existingDiagnosis ? `Working diagnosis: ${input.existingDiagnosis}` : ""}
`.trim();

    const raw = await callClaude(system, message, 1200);

    try {
        return JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
        throw new Error("Failed to parse AI clinical response");
    }
}

// ─── 2. AI Triage Risk Scoring ────────────────────────────────────────────────
// Analyses vitals → risk level + clinical reasoning

export async function getAITriageScore(vitals: {
    bloodPressure?: string;
    temperature?: string;
    pulse?: string;
    respiratoryRate?: string;
    oxygenSaturation?: string;
    weight?: string;
    height?: string;
    bmi?: string;
    patientAge?: number;
    patientGender?: string;
    chiefComplaint?: string;
}): Promise<{
    riskLevel: "Critical" | "High" | "Medium" | "Low";
    score: number;         // 0–100
    reasoning: string;
    abnormals: { vital: string; value: string; concern: string }[];
    actions: string[];
    escalate: boolean;
}> {
    const system = `You are a clinical triage AI for Nile Valley Hospital.
Analyse patient vitals and return ONLY valid JSON:
{
  "riskLevel": "Critical"|"High"|"Medium"|"Low",
  "score": number (0-100, higher = more critical),
  "reasoning": string (1-2 sentences),
  "abnormals": [{ "vital": string, "value": string, "concern": string }],
  "actions": [string],
  "escalate": boolean
}
Use WHO and Nigerian clinical triage guidelines. Be conservative — flag potential emergencies.
Return ONLY the JSON, no markdown.`;

    const message = `
Patient: ${vitals.patientGender ?? "Unknown"}, ${vitals.patientAge ? `${vitals.patientAge} years` : "age unknown"}
${vitals.chiefComplaint ? `Chief complaint: ${vitals.chiefComplaint}` : ""}
Blood Pressure: ${vitals.bloodPressure ?? "—"}
Temperature: ${vitals.temperature ?? "—"}
Pulse: ${vitals.pulse ?? "—"}
Respiratory Rate: ${vitals.respiratoryRate ?? "—"}
O₂ Saturation: ${vitals.oxygenSaturation ?? "—"}
BMI: ${vitals.bmi ?? "—"}
`.trim();

    const raw = await callClaude(system, message, 800);

    try {
        return JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
        throw new Error("Failed to parse AI triage response");
    }
}

// ─── 3. AI Lab Result Interpretation ─────────────────────────────────────────
// Interprets lab results → plain language + clinical significance

export async function getAILabInterpretation(input: {
    testType: string;
    result: string;
    patientAge?: number;
    patientGender?: string;
    medicalHistory?: string;
    currentMeds?: string;
}): Promise<{
    summary: string;
    abnormalValues: { parameter: string; value: string; normalRange: string; flag: "High" | "Low" | "Critical" | "Normal" }[];
    clinicalSignificance: string;
    recommendations: string[];
    urgency: "Routine" | "Soon" | "Urgent" | "Immediate";
}> {
    const system = `You are a clinical laboratory AI for Nile Valley Hospital, Nigeria.
Interpret lab results and return ONLY valid JSON:
{
  "summary": string (plain language, 1-2 sentences),
  "abnormalValues": [{ "parameter": string, "value": string, "normalRange": string, "flag": "High"|"Low"|"Critical"|"Normal" }],
  "clinicalSignificance": string,
  "recommendations": [string],
  "urgency": "Routine"|"Soon"|"Urgent"|"Immediate"
}
Use standard Nigerian laboratory reference ranges. Be clear and non-alarmist unless truly critical.
Return ONLY the JSON, no markdown.`;

    const message = `
Test: ${input.testType}
Patient: ${input.patientGender ?? "Unknown"}, ${input.patientAge ? `${input.patientAge} years` : "age unknown"}
${input.medicalHistory ? `Medical history: ${input.medicalHistory}` : ""}
${input.currentMeds ? `Current medications: ${input.currentMeds}` : ""}

Result:
${input.result}
`.trim();

    const raw = await callClaude(system, message, 1000);

    try {
        return JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
        throw new Error("Failed to parse AI lab interpretation response");
    }
}

// ─── 4. AI Prescription Safety Check ─────────────────────────────────────────
// Checks prescriptions for interactions, allergy conflicts, dosage issues

export async function getAIPrescriptionSafetyCheck(input: {
    drugName: string;
    dosage: string;
    duration?: string;
    patientAge?: number;
    patientWeight?: number;
    patientGender?: string;
    allergies?: string;
    currentMeds?: string;
    medicalHistory?: string;
}): Promise<{
    safe: boolean;
    overallRisk: "Safe" | "Caution" | "Warning" | "Danger";
    interactions: { drug: string; severity: "Mild" | "Moderate" | "Severe"; description: string }[];
    allergyFlags: string[];
    dosageCheck: { appropriate: boolean; concern?: string; suggestion?: string };
    contraindications: string[];
    pharmacistNotes: string;
}> {
    const system = `You are a clinical pharmacology AI for Nile Valley Hospital, Nigeria.
Check prescription safety and return ONLY valid JSON:
{
  "safe": boolean,
  "overallRisk": "Safe"|"Caution"|"Warning"|"Danger",
  "interactions": [{ "drug": string, "severity": "Mild"|"Moderate"|"Severe", "description": string }],
  "allergyFlags": [string],
  "dosageCheck": { "appropriate": boolean, "concern": string|null, "suggestion": string|null },
  "contraindications": [string],
  "pharmacistNotes": string
}
Use British National Formulary (BNF) and WHO essential medicines guidelines.
Consider common Nigerian drug brands and generics.
Return ONLY the JSON, no markdown.`;

    const message = `
Drug: ${input.drugName}
Dosage: ${input.dosage}
${input.duration ? `Duration: ${input.duration}` : ""}
Patient: ${input.patientGender ?? "Unknown"}, ${input.patientAge ? `${input.patientAge} years` : "age unknown"}${input.patientWeight ? `, ${input.patientWeight}kg` : ""}
${input.allergies ? `Known allergies: ${input.allergies}` : "No known allergies"}
${input.currentMeds ? `Current medications: ${input.currentMeds}` : "No current medications"}
${input.medicalHistory ? `Medical history: ${input.medicalHistory}` : ""}
`.trim();

    const raw = await callClaude(system, message, 1000);

    try {
        return JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
        throw new Error("Failed to parse AI prescription safety response");
    }
}

// ─── 5. AI Patient Summary ────────────────────────────────────────────────────
// Generates a comprehensive clinical briefing for any role

export async function getAIPatientSummary(input: {
    patient: {
        name: string;
        age?: number;
        gender?: string;
        bloodGroup?: string;
        genoType?: string;
        allergies?: string;
        medicalHistory?: string;
        currentMeds?: string;
    };
    consultations?: { symptoms: string; diagnosis: string; date: string }[];
    prescriptions?: { drugName: string; dosage: string; date: string; status: string }[];
    labResults?: { testType: string; result: string; date: string; status: string }[];
    vitals?: { bloodPressure?: string; temperature?: string; pulse?: string; date: string };
    viewerRole?: string;
}): Promise<{
    headline: string;
    summary: string;
    keyFindings: string[];
    activeConcerns: string[];
    currentTreatment: string;
    followUpNeeded: boolean;
    followUpActions: string[];
    riskFlags: string[];
}> {
    const system = `You are a clinical AI summariser for Nile Valley Hospital, Nigeria.
Generate a patient clinical briefing and return ONLY valid JSON:
{
  "headline": string (one sentence overview),
  "summary": string (2-3 sentence clinical narrative),
  "keyFindings": [string],
  "activeConcerns": [string],
  "currentTreatment": string,
  "followUpNeeded": boolean,
  "followUpActions": [string],
  "riskFlags": [string]
}
Tailor the summary for a ${input.viewerRole ?? "clinician"}.
Be concise, clinically accurate, and highlight actionable information.
Return ONLY the JSON, no markdown.`;

    const message = `
Patient: ${input.patient.name}, ${input.patient.gender ?? "Unknown"}, ${input.patient.age ? `${input.patient.age} years` : "age unknown"}
Blood Group: ${input.patient.bloodGroup ?? "—"} | Genotype: ${input.patient.genoType ?? "—"}
Allergies: ${input.patient.allergies ?? "None documented"}
Medical History: ${input.patient.medicalHistory ?? "None documented"}

${input.vitals ? `Latest Vitals (${input.vitals.date}):
BP: ${input.vitals.bloodPressure ?? "—"} | Temp: ${input.vitals.temperature ?? "—"} | Pulse: ${input.vitals.pulse ?? "—"}` : ""}

${input.consultations?.length ? `Recent Consultations:
${input.consultations.slice(0, 3).map(c => `• ${c.date}: ${c.symptoms} → ${c.diagnosis}`).join("\n")}` : ""}

${input.prescriptions?.length ? `Active Prescriptions:
${input.prescriptions.filter(p => p.status === "Active").slice(0, 5).map(p => `• ${p.drugName} ${p.dosage}`).join("\n")}` : ""}

${input.labResults?.length ? `Recent Lab Results:
${input.labResults.slice(0, 3).map(l => `• ${l.date}: ${l.testType} — ${l.status}`).join("\n")}` : ""}
`.trim();

    const raw = await callClaude(system, message, 1200);

    try {
        return JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
        throw new Error("Failed to parse AI patient summary response");
    }
}