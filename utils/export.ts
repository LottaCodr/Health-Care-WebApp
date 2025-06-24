import { Appointment } from '@/actions/appointments/types';

export function exportToCSV(appointments: Appointment[]): void {
    // Implement CSV export logic here
    console.log('Exporting to CSV', appointments);
}

export function exportToPDF(appointments: Appointment[]): void {
    // Implement PDF export logic here
    console.log('Exporting to PDF', appointments);
}

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