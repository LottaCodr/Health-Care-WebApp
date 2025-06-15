import { Models } from "node-appwrite";
import { AppointmentStatus } from "./appointments";

export type Gender = "male" | "female" | "other";

export type Status = "scheduled" | "completed" | "cancelled" | "no_show";

export type StaffRole = "doctor" | "nurse" | "front-desk" | "pharmacist" | "lab-tech" | "user";

export interface Patient extends Models.Document {
  userId: string;
  name: string;
  email: string;
  phone: string;
  birthDate: Date;
  gender: Gender;
  address: string;
  occupation: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  primaryPhysician: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  allergies: string | undefined;
  currentMedication: string | undefined;
  familyMedicalHistory: string | undefined;
  pastMedicalHistory: string | undefined;
  identificationType: string | undefined;
  identificationNumber: string | undefined;
  identificationDocument: FormData | undefined;
  privacyConsent: boolean;
  note?: string;
  staff: (Staff | string)[];

}

export interface Appointment extends Models.Document {
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

export interface Staff extends Models.Document {
  staff_id: string;
  role: StaffRole;
  phone_number: string;
  department: string;
  email: string;
  full_name: string;
  created_at: Date
  patient: Patient[];
  status?: "active" | "inactive"
}





