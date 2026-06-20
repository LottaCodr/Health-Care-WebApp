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

export const PatientFormValidation = z
  .object({
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
    significantMedicationHistory: z.string(),
    longTermMedication: z.string(),
    covidVaccinationOptions: z.enum(["Vaccinated", "Not Vaccinated", "Partial"]),
    bloodGroup: z.string().min(1, "Blood group is required"),
    genoType: z.string().min(1, "Geno type is required"),

    // ── Step 4: Medical Insurance Detail ──────────────────────────────────────
    // hmoName / companyName / policyNumber are intentionally NOT required here
    // unconditionally — whether they're required depends on which payment
    // type (hmo / company / privateClient) is selected. That conditional
    // logic lives in the .superRefine() below, where we have access to all
    // three booleans at once. A bare z.string().min(2) on these fields was
    // the root cause of self-pay patients being unable to register — those
    // fields were validated even when not applicable to private/self-pay.
    policyNumber: z.string().optional(),
    hmo: z.boolean(),
    hmoName: z.string().optional(),
    company: z.boolean(),
    companyName: z.string().optional(),
    privateClient: z.boolean(),

    // Additional fields in Patient interface
    status: z.nativeEnum(PatientStatus).optional(),
    userId: z.string().optional(),
    notes: z.string().optional(),
    symptoms: z.string().optional(),
    diagnosis: z.string().optional(),
    prescriptions: z.string().optional(),
    recommendations: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const selectedCount = [data.hmo, data.company, data.privateClient].filter(Boolean).length;

    // Exactly one payment type must be selected — none selected blocks
    // submission with a clear message; more than one selected (shouldn't
    // happen via the UI, but defends against direct API calls) also blocks.
    if (selectedCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["privateClient"],
        message: "Select a payment type — HMO, Company Insurance, or Private (Self-Pay).",
      });
      return;
    }
    if (selectedCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["privateClient"],
        message: "Only one payment type can be selected at a time.",
      });
      return;
    }

    // HMO selected → hmoName and policyNumber become required
    if (data.hmo) {
      if (!data.hmoName || data.hmoName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hmoName"],
          message: "HMO provider name must be at least 2 characters",
        });
      }
      if (!data.policyNumber || data.policyNumber.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["policyNumber"],
          message: "Policy number is required for HMO coverage",
        });
      }
    }

    // Company insurance selected → companyName and policyNumber become required
    if (data.company) {
      if (!data.companyName || data.companyName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["companyName"],
          message: "Company name must be at least 2 characters",
        });
      }
      if (!data.policyNumber || data.policyNumber.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["policyNumber"],
          message: "Policy number is required for company insurance",
        });
      }
    }

    // privateClient (self-pay) requires NOTHING further — this is the
    // exact case that was previously blocked.
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