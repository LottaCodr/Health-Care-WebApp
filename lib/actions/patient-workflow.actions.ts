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

    let success = 0;
    let failed = 0;

    for (const row of rows) {
        try {
            await createPatient({
                name: row.name,
                birth_date: row.date_of_birth,
                gender: row.gender,
                phone: row.phone,
                address: row.address,
                blood_group: row.blood_group,
                genotype: row.genotype,
                next_of_kin_name: row.next_of_kin_name,
                next_of_kin_phone: row.next_of_kin_phone,
                status: PatientStatus.Registered,
            } as any);
            success++;
        } catch {
            failed++;
        }
    }

    return { total: rows.length, success, failed };
}
