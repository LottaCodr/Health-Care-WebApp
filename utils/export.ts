import { Appointment } from '@/types/appointments';

export function exportToCSV(appointments: Appointment[]): void {
    // Implement CSV export logic here
    console.log('Exporting to CSV', appointments);
}

export function exportToPDF(appointments: Appointment[]): void {
    // Implement PDF export logic here
    console.log('Exporting to PDF', appointments);
}