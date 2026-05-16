import { z } from "zod";
import { PatientStatus } from "@/types/models";

export const UserFormValidation = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .refine((phone) => /^\+\d{10,15}$/.test(phone), "Invalid phone number"),
});


export const PatientFormValidation = z.object({
  // Step 1: Personal Information
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(500, "Name must be at most 500 characters"),
  religion: z.string().min(2, "Religion must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .refine((phone) => /^\+\d{10,15}$/.test(phone), "Invalid phone number"),
  birthDate: z.coerce.date(),
  gender: z.enum(["Male", "Female"]),
  occupation: z
    .string()
    .min(2, "Occupation must be at least 2 characters")
    .max(500, "Occupation must be at most 500 characters"),
  address: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(500, "Address must be at most 500 characters"),

  // Step 2: Emergency Contact
  emergencyContactName: z
    .string()
    .min(2, "Contact name must be at least 2 characters")
    .max(50, "Contact name must be at most 50 characters"),
  emergencyContactNumber: z
    .string()
    .refine(
      (emergencyContactNumber) => /^\+\d{10,15}$/.test(emergencyContactNumber),
      "Invalid phone number"
    ),
  emergencyContactRelationship: z
    .string()
    .min(2, "Relationship must be at least 2 characters"),
  emergencyContactEmail: z.string().email("Invalid emergency contact email"),
  emergencyContactAddress: z
    .string()
    .min(5, "Address must be at least 5 characters"),

  // Step 3: General Medical History
  allergies: z.string(),
  // currentMedication: z.string().optional(),
  significantMedicationHistory: z.string(),
  longTermMedication: z.string(),
  covidVaccinationOptions: z.enum(["Vaccinated", "Not Vaccinated", "Partial"]),
  bloodGroup: z.string().min(1, "Blood group is required"),
  genoType: z.string().min(1, "Geno type is required"),

  // Step 4: Medical Insurance Detail
  policyNumber: z
    .string()
    .min(2, "Policy number must be at least 2 characters")
    .max(50, "Policy number must be at most 50 characters"),
  hmo: z.boolean(),
  hmoName: z.string().min(2, "HMO name must be at least 2 characters"),
  company: z.boolean(),
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters"),
  privateClient: z.boolean(),

  // Additional fields in Patient interface
  status: z.nativeEnum(PatientStatus).optional(),
  userId: z.string().optional(),
  notes: z.string().optional(),
  symptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  prescriptions: z.string().optional(),
  recommendations: z.string().optional(),
});


export const CreateAppointmentSchema = z.object({
  primaryPhysician: z.string().min(2, "Select at least one doctor"),
  schedule: z.coerce.date(),
  reason: z
    .string()
    .min(2, "Reason must be at least 2 characters")
    .max(500, "Reason must be at most 500 characters"),
  note: z.string().optional(),
  cancellationReason: z.string().optional(),
});

export const ScheduleAppointmentSchema = z.object({
  primaryPhysician: z.string().min(2, "Select at least one doctor"),
  schedule: z.coerce.date(),
  reason: z.string().optional(),
  note: z.string().optional(),
  cancellationReason: z.string().optional(),
});

export const CancelAppointmentSchema = z.object({
  primaryPhysician: z.string().min(2, "Select at least one doctor"),
  schedule: z.coerce.date(),
  reason: z.string().optional(),
  note: z.string().optional(),
  cancellationReason: z
    .string()
    .min(2, "Reason must be at least 2 characters")
    .max(500, "Reason must be at most 500 characters"),
});

export function getAppointmentSchema(type: string) {
  switch (type) {
    case "create":
      return CreateAppointmentSchema;
    case "cancel":
      return CancelAppointmentSchema;
    default:
      return ScheduleAppointmentSchema;
  }
}
