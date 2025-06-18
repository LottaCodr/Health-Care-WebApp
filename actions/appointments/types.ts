import { Models } from "appwrite";
import { Patient } from "../patients/types";

export interface Appointment {
    id: string;
    patientId: string;
    doctor: string;
    patientName: string;
    doctorId: string;
    doctorName: string;
    date: string;
    time: string;
    status: AppointmentStatus;
    createdAt: string;
    updatedAt?: string;
    notes?: string;
    patient: Patient;
    durationMinutes?: number;
    reason?: string;
}

export type AppointmentStatus = 'upcoming' | 'completed' | 'cancelled' | 'rescheduled' | 'scheduled' | 'no-show';

export type AppointmentForm = Omit<Appointment, '$id' | '$collectionId' | '$databaseId' | '$createdAt' | '$updatedAt' | '$permissions'>;


export const normalizeAppointment = (doc: Models.Document): Appointment => ({
    id: doc.$id,
    patientId: doc.patientId,
    doctor: doc.doctor,
    patientName: doc.patientName,
    doctorId: doc.doctorId,
    patient: doc.patient,
    doctorName: doc.doctorName,
    date: doc.date,
    time: doc.time,
    status: doc.status,
    createdAt: doc.createdAt ?? doc.$createdAt,
    updatedAt: doc.updatedAt ?? doc.$updatedAt,
    notes: doc.notes,
    reason: doc.reason,
    durationMinutes: doc.durationMinutes,
});