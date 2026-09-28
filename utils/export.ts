import { patientAgeOn } from "@/lib/clinical/patient-age";

// export function exportToCSV(appointments: any[]): void {
//     // Implement CSV export logic here
//     console.log('Exporting to CSV', appointments);
// }

// export function exportToPDF(appointments: Appointment[]): void {
//     // Implement PDF export logic here
//     console.log('Exporting to PDF', appointments);
// }

export function formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export function formatTime(time: string, format: "12h" | "24h" = "12h"): string {
    const [hour, minute] = time.split(":");
    const date = new Date();
    date.setHours(Number(hour));
    date.setMinutes(Number(minute));

    return date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: format === "12h",
    });
}

export function getInitials(name?: string | null): string {
    // Blank on purpose: a patient imported from paper may have no name yet.
    if (!name) return "";
    return name.split(" ").map((n) => n[0]).join("");
}

/** Completed years on today's UTC calendar date. Invalid/future DOBs are unknown. */
export function calculateAge(birthDate: string): number {
    return patientAgeOn(birthDate) ?? Number.NaN;
}
