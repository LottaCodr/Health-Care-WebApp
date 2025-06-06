// types/appointment.ts

export type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled' | 'rescheduled' | 'no-show';

export interface Appointment {
    id: string;
    patientId: string;
    doctor: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    date: string; // ISO 8601 date string (e.g. "2025-06-06")
    time: string; // "10:30 AM" or "14:30"
    status: AppointmentStatus;
    createdAt: string; // ISO date
    updatedAt?: string;
    notes?: string;
    durationMinutes?: number; // optional, for calendar slot
    reason?: string;
}
