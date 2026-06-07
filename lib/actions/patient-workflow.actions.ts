"use server";

import { createPatient, updatePatientStatus } from "@/lib/services/patient.service";
import { createAppointment } from "@/lib/services/appointment.service";
import { PatientStatus } from "@/types/models";
import type { ReturnPatientProps } from "@/components/patients/return-patient"; 
import type { UploadType } from "@/store/bulk-upload-store";
import { DownloadOptions } from "@/components/patients/patient-record-download";

export async function processReturnVisit(input: Props) {
    const statusByType: Record<Props["returnType"], PatientStatus> = { 
        outpatient: PatientStatus.AwaitingConsultation,
        inpatient: PatientStatus.Admitted,
        emergency: PatientStatus.AwaitingConsultation,
    };

    await updatePatientStatus(input.patientId, statusByType[input.returnType]);

    if (input.appointmentDate && input.appointmentTime && input.reason) {
        await createAppointment({
            patientId: input.patientId,
            scheduledBy: input.registeredBy,
            doctorId: input.referredDoctor || undefined,
            appointmentDate: input.appointmentDate,
            appointmentTime: input.appointmentTime,
            reason: input.reason,
            priority: input.priority,
            notes: input.notes,
        });
    }

    return { success: true };
}

// export async function generatePatientRecord(
//     input: { patientId: string } & DownloadOptions
// ): Promise<{ type: "pdf"; base64: string; filename: string } | { type: "print"; html: string }>
//  {
//     // your PDF/print logic here
//     return { type: "pdf", base64: "", filename: "" };
//     return { type: "print", html: "" };
//     return { success: true };
// }

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
