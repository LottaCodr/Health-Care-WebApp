"use server";

import { createClient } from "@/utils/supabase/server";
import { requireStaff, getCurrentStaff } from "./auth-guard";
import { getCurrentPortalPatient } from "./portal.service";
import { logAction } from "./audit.service";
import {
    parseLabResult,
    getParameter,
    resolveHematologyCategory,
    rangeFor,
    parseRangeDisplay,
    toUcum,
} from "@/lib/clinical/hematology-reference-ranges";

/**
 * Interoperability exports: FHIR R4 (JSON bundle) and HL7 v2 (ADT).
 * Staff may export any patient; portal patients may export their own record.
 */

async function canReadPatient(patientId: string): Promise<boolean> {
    const staff = await getCurrentStaff();
    if (staff) return true;
    const portalPatient = await getCurrentPortalPatient();
    return portalPatient?.id === patientId;
}

// ═══════════════════════════════════ FHIR R4 ══════════════════════════════════

export async function buildFhirBundle(patientId: string): Promise<{ bundle: any; patientName: string }> {
    if (!(await canReadPatient(patientId))) {
        throw new Error("FORBIDDEN: You may only export your own record.");
    }

    const supabase = await createClient();
    const [patientRes, consultations, labRequests, prescriptions, nursingActions, surgeries, allergies, immunizations, dischargeNotes, appointments, admissions, documents] =
        await Promise.all([
            supabase.from("patients").select("*").eq("id", patientId).single(),
            supabase.from("consultations").select("*").eq("patient_id", patientId),
            supabase.from("lab_requests").select("*").eq("visit_id", patientId),
            supabase.from("prescriptions").select("*").eq("patient_id", patientId),
            supabase.from("nursing_actions").select("*").eq("patient_id", patientId),
            supabase.from("surgeries").select("*").eq("patient_id", patientId),
            supabase.from("patient_allergies").select("*").eq("patient_id", patientId),
            supabase.from("immunizations").select("*").eq("patient_id", patientId),
            supabase.from("discharge_notes").select("*").eq("patient_id", patientId),
            supabase.from("appointments").select("*").eq("patient_id", patientId),
            supabase.from("patient_admissions").select("*").eq("patient_id", patientId),
            supabase.from("patient_documents").select("*").eq("patient_id", patientId),
        ]);

    const patient = patientRes.data;
    if (!patient) throw new Error("Patient not found.");
    const ref = `Patient/${patient.id}`;
    const entry = (resource: any) => ({
        fullUrl: `urn:uuid:${resource.resourceType}-${resource.id}`,
        resource,
    });

    const resources: any[] = [
        {
            resourceType: "Patient",
            id: patient.id,
            name: [{ text: patient.name }],
            telecom: [
                { system: "phone", value: patient.phone },
                ...(patient.email ? [{ system: "email", value: patient.email }] : []),
            ],
            gender: (patient.gender ?? "unknown").toLowerCase(),
            birthDate: patient.birth_date ?? undefined,
            address: patient.address ? [{ text: patient.address }] : [],
            bloodGroup: patient.blood_group
                ? { coding: [{ system: "http://hl7.org/fhir/ValueSet/blood-type-r4", code: patient.blood_group }] }
                : undefined,
        },
    ];

    for (const c of consultations.data ?? []) {
        resources.push({
            resourceType: "Encounter",
            id: c.id,
            status: "finished",
            class: { code: "AMB" },
            subject: { reference: ref },
            period: { start: c.created_at ?? undefined },
            reasonCode: c.symptoms ? [{ text: c.symptoms }] : [],
            diagnosis: c.diagnosis
                ? [{ condition: { display: c.diagnosis } }]
                : [],
        });
        if (c.diagnosis) {
            resources.push({
                resourceType: "Condition",
                id: `${c.id}-dx`,
                subject: { reference: ref },
                code: { text: c.diagnosis },
                clinicalStatus: { text: "active" },
                ...(c.icd10_codes?.length
                    ? { code: { coding: c.icd10_codes.map((code: string) => ({ system: "http://hl7.org/fhir/sid/icd-10", code })) } }
                    : {}),
            });
        }
    }

    // Resolve the age/sex partition once for the whole bundle (used for the
    // per-parameter reference ranges on CBC panel exports below).
    const patientAgeYears = patient.birth_date
        ? Math.max(0, (Date.now() - new Date(patient.birth_date).getTime()) / (365.25 * 86400000))
        : null;
    const { category: resolvedCategory } = resolveHematologyCategory(patientAgeYears, patient.gender);

    for (const l of labRequests.data ?? []) {
        const isRadiology = String(l.test_type ?? "").startsWith("[RADIOLOGY]");
        const parsedResult = parseLabResult(l.result);
        const isAnalyzerPanel = !isRadiology && parsedResult?.kind === "hematology-analyzer" && parsedResult.rows.length > 0;

        if (isAnalyzerPanel && parsedResult) {
            // FHIR R4 CBC panel: one Observation whose component[] carries each
            // analyzer parameter with its age/sex-partitioned referenceRange
            // (CLSI EP28-A3c partitioning; see docs/HEMATOLOGY_ANALYZER_REFERENCE_RANGES.md).
            resources.push({
                resourceType: "Observation",
                id: `${l.id}-cbc`,
                status: l.status === "completed" ? "final" : "registered",
                category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }] }],
                code: {
                    coding: [{ system: "http://loinc.org", code: "58410-2", display: "CBC with Differential panel - Blood" }],
                    text: l.test_type,
                },
                subject: { reference: ref },
                effectiveDateTime: l.completed_at ?? l.created_at ?? undefined,
                component: parsedResult.rows
                    .map((row) => {
                        const param = getParameter(row.label);
                        const numeric = Number(String(row.value).replace(/,/g, ""));
                        const unit = toUcum(row.unit);
                        const rangeDisplay = param && resolvedCategory ? rangeFor(param, resolvedCategory) : row.ref;
                        const bounds = parseRangeDisplay(rangeDisplay);

                        const comp: any = {
                            code: param?.loinc
                                ? { coding: [{ system: "http://loinc.org", code: param.loinc }], text: row.label }
                                : { text: row.label },
                        };
                        if (Number.isFinite(numeric) && String(row.value) !== "—") {
                            comp.valueQuantity = { value: numeric, ...(unit ? { unit, system: "http://unitsofmeasure.org", code: unit } : {}) };
                        } else {
                            comp.valueString = row.value;
                        }
                        if (bounds.low !== null || bounds.high !== null) {
                            comp.referenceRange = [{
                                ...(bounds.low !== null ? { low: { value: bounds.low, ...(unit ? { unit, system: "http://unitsofmeasure.org", code: unit } : {}) } } : {}),
                                ...(bounds.high !== null ? { high: { value: bounds.high, ...(unit ? { unit, system: "http://unitsofmeasure.org", code: unit } : {}) } } : {}),
                                text: rangeDisplay,
                            }];
                        }
                        return comp;
                    }),
                note: [
                    { text: parsedResult.referenceSet ?? "" },
                    { text: l.result ?? "" },
                ].filter((n) => n.text?.trim()),
            });
        } else {
            resources.push(
                isRadiology
                    ? {
                          resourceType: "DiagnosticReport",
                          id: l.id,
                          status: l.status === "completed" ? "final" : "registered",
                          subject: { reference: ref },
                          code: { text: String(l.test_type).replace(/^\[RADIOLOGY\]\s*/i, "") },
                          conclusion: l.result ?? undefined,
                      }
                    : {
                          resourceType: "Observation",
                          id: l.id,
                          status: l.status === "completed" ? "final" : "registered",
                          category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }] }],
                          code: { text: l.test_type },
                          subject: { reference: ref },
                          valueString: l.result ?? undefined,
                      }
            );
        }
    }

    for (const p of prescriptions.data ?? []) {
        resources.push({
            resourceType: "MedicationRequest",
            id: p.id,
            status: p.status === "Active" ? "active" : "completed",
            intent: "order",
            subject: { reference: ref },
            medicationCodeableConcept: { text: p.drug_name },
            dosageInstruction: p.dosage ? [{ text: p.dosage }] : [],
        });
    }

    for (const n of nursingActions.data ?? []) {
        resources.push({
            resourceType: "Observation",
            id: n.id,
            status: "final",
            category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "exam" }] }],
            code: { text: n.action_type },
            subject: { reference: ref },
            valueString: n.description,
            effectiveDateTime: n.created_at ?? undefined,
        });
    }

    for (const s of surgeries.data ?? []) {
        resources.push({
            resourceType: "Procedure",
            id: s.id,
            status: s.status === "completed" ? "completed" : s.status === "in-progress" ? "in-progress" : "preparation",
            subject: { reference: ref },
            code: { text: s.procedure_name },
            performedDateTime: s.completed_at ?? s.started_at ?? undefined,
            reasonCode: s.pre_op_diagnosis ? [{ text: s.pre_op_diagnosis }] : [],
            note: s.findings ? [{ text: s.findings }] : [],
        });
    }

    for (const a of allergies.data ?? []) {
        resources.push({
            resourceType: "AllergyIntolerance",
            id: a.id,
            clinicalStatus: { text: a.status },
            verificationStatus: { text: "confirmed" },
            code: { text: a.allergen },
            patient: { reference: ref },
            reaction: a.reaction ? [{ manifestation: [{ text: a.reaction }], severity: a.severity }] : [],
        });
    }

    for (const i of immunizations.data ?? []) {
        resources.push({
            resourceType: "Immunization",
            id: i.id,
            status: "completed",
            patient: { reference: ref },
            vaccineCode: { text: i.vaccine },
            occurrenceDateTime: i.administered_date ?? undefined,
            lotNumber: i.lot_number ?? undefined,
            protocolApplied: [{ doseNumberPositiveInt: i.dose_number }],
        });
    }

    for (const d of dischargeNotes.data ?? []) {
        resources.push({
            resourceType: "DocumentReference",
            id: d.id,
            status: "current",
            subject: { reference: ref },
            type: { text: "Discharge summary" },
            content: [
                {
                    attachment: {
                        contentType: "text/plain",
                        data: Buffer.from(
                            `Final diagnosis: ${d.final_diagnosis ?? ""}\n${d.hospital_course ?? ""}`
                        ).toString("base64"),
                    },
                },
            ],
        });
    }

    for (const appt of appointments.data ?? []) {
        resources.push({
            resourceType: "Appointment",
            id: appt.id,
            status: "booked",
            participant: [{ actor: { reference: ref }, status: "accepted" }],
            start: appt.appointment_date ? `${appt.appointment_date}T${appt.appointment_time ?? "00:00:00"}` : undefined,
            comment: appt.reason ?? undefined,
        });
    }

    for (const adm of admissions.data ?? []) {
        resources.push({
            resourceType: "Encounter",
            id: adm.id,
            status: adm.status === "active" ? "in-progress" : "finished",
            class: { code: "IMP" },
            subject: { reference: ref },
            period: { start: adm.admitted_at ?? undefined, end: adm.discharged_at ?? undefined },
            location: adm.ward_name
                ? [{ location: { display: `${adm.ward_name}${adm.bed_number ? ` / Bed ${adm.bed_number}` : ""}` } }]
                : [],
        });
    }

    for (const doc of documents.data ?? []) {
        resources.push({
            resourceType: "DocumentReference",
            id: doc.id,
            status: "current",
            subject: { reference: ref },
            type: { text: doc.document_type ?? "Document" },
            date: doc.created_at ?? undefined,
            content: [{ attachment: { title: doc.file_name ?? undefined } }],
        });
    }

    const bundle = {
        resourceType: "Bundle",
        type: "collection",
        entry: resources.map(entry),
    };

    await logAction("FHIR_EXPORT", "patients", patientId, { resource_count: resources.length });

    return { bundle, patientName: patient.name };
}

// ════════════════════════════════════ HL7 v2 ═════════════════════════════════

function hl7Escape(v: string): string {
    return String(v ?? "")
        .replace(/\\/g, "\\E\\")
        .replace(/\|/g, "\\F\\")
        .replace(/\^/g, "\\S\\")
        .replace(/&/g, "\\T\\")
        .replace(/\r?\n/g, "\\X0D\\");
}

function hl7Field(...parts: string[]): string {
    return parts.map(hl7Escape).join("^");
}

export async function buildHl7Adt(patientId: string): Promise<{ message: string; patientName: string }> {
    if (!(await canReadPatient(patientId))) {
        throw new Error("FORBIDDEN: You may only export your own record.");
    }
    const supabase = await createClient();
    const [patientRes, admissionRes] = await Promise.all([
        supabase.from("patients").select("*").eq("id", patientId).single(),
        supabase.from("patient_admissions").select("*").eq("patient_id", patientId).order("admitted_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const p = patientRes.data;
    if (!p) throw new Error("Patient not found.");
    const admission = admissionRes.data;

    const now = new Date();
    const stamp = (d: Date) =>
        d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "");

    const msh =
        `MSH|^~\\&|NILEVALLEY_EMR|NVH|||${stamp(now)}||ADT^A01|${stamp(now)}|P|2.5|||AL|NE|NG||8859/1`;
    const evn = `EVN|A01|${stamp(now)}`;
    const pid =
        `PID|1||${p.id}||${hl7Field(p.name)}||${p.birth_date ?? ""}|${p.gender === "Male" ? "M" : p.gender === "Female" ? "F" : "U"}` +
        `||${p.address ?? ""}||${p.phone ?? ""}|||${p.blood_group ?? ""}|`;
    const pv1 =
        `PV1|1|I|${admission?.ward_name ?? "OPD"}^${admission?.bed_number ?? ""}||||||||||||||` +
        `${admission?.id ?? ""}`;

    const message = [msh, evn, pid, pv1].join("\r");
    await logAction("HL7_EXPORT", "patients", patientId, { message_type: "ADT_A01" });
    return { message, patientName: p.name };
}
