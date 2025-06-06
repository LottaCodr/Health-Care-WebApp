// lib/api.ts

import { Appointment } from "@/types/appointments";


// Dummy fetch function — replace with actual API call
export async function fetchAppointments(): Promise<Appointment[]> {
    // Simulated fetch
    return [
        {
            id: '1',
            patientId: 'p1',
            patientName: 'John Doe',
            doctorId: 'd1',
            doctorName: 'Dr. Smith',
            doctor: 'd1',
            date: new Date().toISOString().split('T')[0],
            time: '10:30 AM',
            status: 'upcoming',
            createdAt: new Date().toISOString(),
            notes: 'Initial consultation',
        },
    ];
}
