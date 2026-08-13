"use server";

import { createClient } from "@/utils/supabase/server";
import { createNotification } from "./notification.service";
import { createLabRequest } from "./lab.service";
import { createRadiologyRequest } from "./radiology.service";
import { createPrescription } from "./pharmacy.service";
import { createAdmission } from "./admission.service";
import { updateConsultation } from "./consultation.service";
import type { AdmissionType, AdmissionUrgency } from "@/types/admission.types";

export type RouteDestination = "lab" | "radiology" | "pharmacist" | "front-desk" | "nurse";

export interface RouteLabTest {
    testType: string;
    priority?: "routine" | "urgent" | "stat";
}

export interface RoutePrescription {
    drugName: string;
    dosage?: string;
    duration?: string;
    notes?: string;
    price?: number;
}

export interface RouteAdmissionDetails {
    admissionType: AdmissionType;
    urgency?: AdmissionUrgency;
    wardName?: string;
    indication?: string;
    notes?: string;
}

export interface RoutePatientInput {
    patientId: string;
    /** Staff id of the doctor (or admin) performing the routing. */
    routedBy: string;
    destination: RouteDestination;
    /**
     * When routing from an already existing consultation, pass its id so its
     * referral fields stay coherent with the patient's new location.
     */
    consultationId?: string;
    labTests?: RouteLabTest[];
    labNotes?: string;
    radiologyTests?: RouteLabTest[];
    radiologyNotes?: string;
    prescription?: RoutePrescription;
    /** For front-desk destination: admission (creates an admission record) or billing. */
    frontDeskAction?: "admission" | "billing";
    admission?: RouteAdmissionDetails;
    note?: string;
}

export interface RoutePatientResult {
    patientId: string;
    destination: RouteDestination;
    patientStatus: string;
    labRequestsCreated: number;
    radiologyRequestsCreated: number;
    prescriptionCreated: boolean;
    admissionCreated: boolean;
    consultationUpdated: boolean;
}

const DESTINATION_STATUS: Record<RouteDestination, string> = {
    lab: "sent-to-lab",
    radiology: "sent-to-radiology",
    pharmacist: "sent-to-pharmacy",
    "front-desk": "awaiting-payment", // overridden to "admitted" for admissions
    nurse: "sent-to-nurse",
};

const DESTINATION_NOTIFICATION_ROLE: Record<RouteDestination, string> = {
    lab: "LabTechnician",
    radiology: "Radiologist",
    pharmacist: "Pharmacist",
    "front-desk": "FrontDesk",
    nurse: "Nurse",
};

const DESTINATION_LABEL: Record<RouteDestination, string> = {
    lab: "Laboratory",
    radiology: "Radiology",
    pharmacist: "Pharmacy",
    "front-desk": "Front Desk",
    nurse: "Nursing",
};

/**
 * Route a patient to another department WITHOUT creating a consultation.
 * Doctors use this to send a patient straight to the lab, pharmacy,
 * radiology, nursing or front desk (admission/billing), either before any
 * consultation exists or on top of an already existing one.
 */
export async function routePatientWithoutConsultation(
    input: RoutePatientInput
): Promise<RoutePatientResult> {
    if (!input.patientId) throw new Error("patientId is required.");
    if (!input.routedBy) throw new Error("routedBy (staff id) is required.");

    const supabase = await createClient();

    // ── Validation per destination ────────────────────────────────────────────
    if (input.destination === "lab" && (!input.labTests || input.labTests.length === 0)) {
        throw new Error("Select at least one lab test to route the patient to the lab.");
    }
    if (input.destination === "radiology" && (!input.radiologyTests || input.radiologyTests.length === 0)) {
        throw new Error("Select at least one radiology investigation to route the patient to radiology.");
    }
    if (input.destination === "pharmacist" && !input.prescription?.drugName?.trim()) {
        throw new Error("Enter the drug to prescribe before routing the patient to the pharmacist.");
    }
    if (input.destination === "front-desk" && input.frontDeskAction === "admission") {
        if (!input.admission?.admissionType) {
            throw new Error("Select an admission type to route the patient for admission.");
        }
        if (!input.admission?.indication?.trim()) {
            throw new Error("A clinical indication for admission is required.");
        }
    }

    // ── 1. Department-specific orders ─────────────────────────────────────────
    let labRequestsCreated = 0;
    let radiologyRequestsCreated = 0;
    let prescriptionCreated = false;
    let admissionCreated = false;

    if (input.destination === "lab" && input.labTests?.length) {
        for (const test of input.labTests) {
            if (!test.testType?.trim()) continue;
            await createLabRequest({
                patientId: input.patientId,
                requestedBy: input.routedBy,
                testType: test.testType.trim(),
                priority: test.priority ?? "routine",
                notes: input.labNotes?.trim() || input.note?.trim() || undefined,
                status: "pending",
            });
            labRequestsCreated++;
        }
    }

    if (input.destination === "radiology" && input.radiologyTests?.length) {
        for (const test of input.radiologyTests) {
            if (!test.testType?.trim()) continue;
            await createRadiologyRequest({
                patientId: input.patientId,
                requestedBy: input.routedBy,
                testType: test.testType.trim(),
                priority: test.priority ?? "routine",
                notes: input.radiologyNotes?.trim() || input.note?.trim() || undefined,
            });
            radiologyRequestsCreated++;
        }
    }

    if (input.destination === "pharmacist" && input.prescription?.drugName?.trim()) {
        await createPrescription({
            patientId: input.patientId,
            pharmacistId: undefined,
            drugName: input.prescription.drugName.trim(),
            dosage: input.prescription.dosage?.trim() || "As directed",
            duration: input.prescription.duration?.trim() || undefined,
            price: typeof input.prescription.price === "number" && input.prescription.price > 0
                ? input.prescription.price
                : 0,
            notes: input.prescription.notes?.trim() || input.note?.trim() || undefined,
            dispensed: false,
        });
        prescriptionCreated = true;
    }

    let finalStatus = DESTINATION_STATUS[input.destination];

    if (input.destination === "front-desk" && input.frontDeskAction === "admission" && input.admission) {
        await createAdmission({
            patient_id: input.patientId,
            admission_type: input.admission.admissionType,
            urgency: input.admission.urgency ?? "routine",
            ward_name: input.admission.wardName || undefined,
            indication: input.admission.indication || undefined,
            notes: input.admission.notes?.trim() || input.note?.trim() || undefined,
            assigned_by: input.routedBy,
        });
        admissionCreated = true;
        finalStatus = "admitted";
    }

    // ── 2. Patient status — the single state machine value that queues use ───
    const { error: statusError } = await supabase
        .from("patients")
        .update({ status: finalStatus, updated_at: new Date().toISOString() })
        .eq("id", input.patientId);

    if (statusError) {
        console.error("[routing] patient status update error:", statusError);
        throw new Error("Orders were created, but the patient status could not be updated.");
    }

    // ── 3. Keep an existing consultation's referral fields coherent ───────────
    let consultationUpdated = false;
    if (input.consultationId) {
        try {
            await updateConsultation(input.consultationId, {
                referred_to: input.destination,
                status: finalStatus,
            } as any);
            consultationUpdated = true;
        } catch (err) {
            console.warn("[routing] could not update linked consultation:", err);
        }
    }

    // ── 4. Notify the destination department ──────────────────────────────────
    await createNotification({
        role: DESTINATION_NOTIFICATION_ROLE[input.destination],
        title: `Patient routed to ${DESTINATION_LABEL[input.destination]}`,
        message:
            `A patient was routed to ${DESTINATION_LABEL[input.destination]}` +
            (input.destination === "lab" && labRequestsCreated ? ` with ${labRequestsCreated} lab test request(s).` : "") +
            (input.destination === "radiology" && radiologyRequestsCreated ? ` with ${radiologyRequestsCreated} imaging request(s).` : "") +
            (input.destination === "pharmacist" && prescriptionCreated ? " with a prescription to dispense." : "") +
            (input.destination === "front-desk" && admissionCreated ? " for admission (see admissions queue)." : "") +
            (input.destination === "front-desk" && !admissionCreated ? " for billing/checkout." : "") +
            (input.destination === "nurse" ? " for nursing care." : ""),
        type: "info",
    });

    return {
        patientId: input.patientId,
        destination: input.destination,
        patientStatus: finalStatus,
        labRequestsCreated,
        radiologyRequestsCreated,
        prescriptionCreated,
        admissionCreated,
        consultationUpdated,
    };
}
