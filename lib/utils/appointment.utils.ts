export function resolvePatientName(appt: any): string {
    return appt.patients?.name ?? appt.patient_name_override ?? "External Patient";
}