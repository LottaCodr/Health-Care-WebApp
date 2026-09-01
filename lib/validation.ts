import { z } from "zod";
import { PatientStatus } from "@/types/models";

export const UserFormValidation = z.object({
  name: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be at most 100 characters"),
  email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
  phone: z
    .string()
    .min(7, "Please enter a valid phone number"),
});

export const PatientFormValidation = z
  .object({
    // Step 1: Personal Information (Only name, birthDate, gender, phone are strictly required)
    name: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(500, "Full name is too long"),
    religion: z.string().optional().nullable().or(z.literal("")),
    email: z
      .string()
      .optional()
      .nullable()
      .or(z.literal(""))
      .refine(
        (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        "Please enter a valid email address (e.g. name@example.com)"
      ),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .refine((phone) => phone.trim().length >= 7, "Please enter a valid phone number"),
    birthDate: z.coerce.date({
      required_error: "Date of birth is required",
      invalid_type_error: "Please select a valid date of birth",
    }),
    gender: z.enum(["Male", "Female", "Other", "male", "female", "other"], {
      required_error: "Please select a gender",
    }),
    occupation: z.string().optional().nullable().or(z.literal("")),
    address: z.string().optional().nullable().or(z.literal("")),

    // Step 2: Emergency Contact (all optional)
    emergencyContactName: z.string().optional().nullable().or(z.literal("")),
    emergencyContactNumber: z.string().optional().nullable().or(z.literal("")),
    emergencyContactRelationship: z.string().optional().nullable().or(z.literal("")),
    emergencyContactEmail: z
      .string()
      .optional()
      .nullable()
      .or(z.literal(""))
      .refine(
        (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
        "Please enter a valid emergency contact email"
      ),
    emergencyContactAddress: z.string().optional().nullable().or(z.literal("")),

    // Step 3: General Medical History (all optional)
    allergies: z.string().optional().nullable().or(z.literal("")),
    significantMedicationHistory: z.string().optional().nullable().or(z.literal("")),
    longTermMedication: z.string().optional().nullable().or(z.literal("")),
    covidVaccinationOptions: z.enum(["Vaccinated", "Not Vaccinated", "Partial", ""]).optional().nullable(),
    bloodGroup: z.string().optional().nullable().or(z.literal("")),
    genoType: z.string().optional().nullable().or(z.literal("")),

    // Step 4: Medical Insurance Detail
    policyNumber: z.string().optional().nullable().or(z.literal("")),
    hmo: z.boolean().optional().default(false),
    hmoName: z.string().optional().nullable().or(z.literal("")),
    company: z.boolean().optional().default(false),
    companyName: z.string().optional().nullable().or(z.literal("")),
    privateClient: z.boolean().optional().default(false),

    // Additional fields in Patient interface
    status: z.nativeEnum(PatientStatus).optional(),
    userId: z.string().optional().nullable(),
    notes: z.string().optional().nullable().or(z.literal("")),
    symptoms: z.string().optional().nullable().or(z.literal("")),
    diagnosis: z.string().optional().nullable().or(z.literal("")),
    prescriptions: z.string().optional().nullable().or(z.literal("")),
    recommendations: z.string().optional().nullable().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // HMO selected → hmoName and policyNumber become required
    if (data.hmo) {
      if (!data.hmoName || data.hmoName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["hmoName"],
          message: "Please enter HMO provider name (at least 2 characters)",
        });
      }
      if (!data.policyNumber || data.policyNumber.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["policyNumber"],
          message: "Please enter policy number for HMO coverage",
        });
      }
    }

    // Company insurance selected → companyName and policyNumber become required
    if (data.company) {
      if (!data.companyName || data.companyName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["companyName"],
          message: "Please enter company name (at least 2 characters)",
        });
      }
      if (!data.policyNumber || data.policyNumber.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["policyNumber"],
          message: "Please enter policy number for company insurance",
        });
      }
    }
  });

export const CreateAppointmentSchema = z.object({
  primaryPhysician: z.string().min(2, "Please select at least one doctor"),
  schedule: z.coerce.date({ required_error: "Please choose appointment date & time" }),
  reason: z
    .string()
    .min(2, "Please enter a reason (at least 2 characters)")
    .max(500, "Reason is too long"),
  note: z.string().optional(),
  cancellationReason: z.string().optional(),
});

export const ScheduleAppointmentSchema = z.object({
  primaryPhysician: z.string().min(2, "Please select at least one doctor"),
  schedule: z.coerce.date({ required_error: "Please choose appointment date & time" }),
  reason: z.string().optional(),
  note: z.string().optional(),
  cancellationReason: z.string().optional(),
});

export const CancelAppointmentSchema = z.object({
  primaryPhysician: z.string().min(2, "Please select at least one doctor"),
  schedule: z.coerce.date(),
  reason: z.string().optional(),
  note: z.string().optional(),
  cancellationReason: z
    .string()
    .min(2, "Please provide a reason for cancellation (at least 2 characters)")
    .max(500, "Cancellation reason is too long"),
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
