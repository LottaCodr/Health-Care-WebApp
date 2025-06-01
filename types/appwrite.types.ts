import { Models } from "node-appwrite";

export type Gender = "male" | "female" | "other";

export type Status = "scheduled" | "completed" | "cancelled" | "no_show";

export type StaffRole = "doctor" | "nurse" | "front-desk" | "pharmacist" | "lab-tech"; 

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
}

export interface Appointment extends Models.Document {
  patient: Patient;
  schedule: Date;
  status: Status;
  primaryPhysician: string;
  reason: string;
  note: string;
  userId: string;
  cancellationReason: string |  null;
}

export interface Staff extends Models.Document {
  staff_id: string;
  role: StaffRole;
  phone_number: number;
  department: string;
  email: string;
  full_name: string;
  created_at: Date
}




declare module "next-auth" {
  interface Session {
    user: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      id?: string;
    };
  }

  interface User {
    id?: string;
    role?: string;
  }
}
