"use server";

import { createPatient, updatePatientStatus } from "@/lib/services/patient.service";
import { createAppointment } from "@/lib/services/appointment.service";
import { PatientStatus } from "@/types/models";
import type { UploadType } from "@/lib/actions/bulk-upload";
import {
    generatePatientRecord,
    type RecordSection,
    type GenerateRecordInput,
    type GenerateRecordResult,
} from "@/lib/actions/generate-patient-record";

export {
    generatePatientRecord,
    type RecordSection,
    type GenerateRecordInput,
    type GenerateRecordResult,
};

export async function bulkUploadRows(
    type: UploadType,
    rows: Record<string, string>[]
): Promise<{ total: number; success: number; failed: number }> {
    if (type !== "patients") {
        return { total: rows.length, success: 0, failed: rows.length };
    }

    const clean = (v?: string) => (v && v.trim().length > 0 ? v.trim() : null);

    let success = 0;
    let failed = 0;

    for (const row of rows) {
        try {
            await createPatient({
                name: row.name?.trim() || "Unknown",
                birth_date: clean(row.date_of_birth) || new Date().toISOString().split("T")[0],
                gender: (row.gender?.trim() || "Male") as any,
                phone: row.phone?.trim() || "",
                address: clean(row.address),
                blood_group: clean(row.blood_group),
                geno_type: clean(row.genotype || row.geno_type),
                emergency_contact_name: clean(row.next_of_kin_name || row.emergency_contact_name),
                emergency_contact_number: clean(row.next_of_kin_phone || row.emergency_contact_number),
                status: PatientStatus.Registered,
            } as any);
            success++;
        } catch {
            failed++;
        }
    }

    return { total: rows.length, success, failed };
}
