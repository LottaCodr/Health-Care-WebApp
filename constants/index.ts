// ══════════════════════════════════════════════════════════════════════════════
// constants/index.ts
// Aligned to DB snake_case schema. Form fields stay camelCase (RHF standard).
// The mapping from camelCase → snake_case happens at submit time in the service.
// ══════════════════════════════════════════════════════════════════════════════

import { PatientStatus } from "@/types/models";

// ─── Patient form field options ───────────────────────────────────────────────

export const GenderOptions = ["Male", "Female"] as const;
export const CovidVaccinationOptions = ["Vaccinated", "Not Vaccinated", "Partial"] as const;

export const BloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export const GenotypeOptions = ["AA", "AS", "SS", "AC", "SC"] as const;

export const ReligionOptions = [
  "Christianity", "Islam", "Traditional", "Other",
] as const;

export const RelationshipOptions = [
  "Spouse", "Parent", "Child", "Sibling", "Grandparent",
  "Grandchild", "Uncle/Aunt", "Cousin", "Friend", "Guardian", "Other",
] as const;

export const IdentificationTypes = [
  "National Identity Card",
  "International Passport",
  "Driver's License",
  "Voter's Card",
  "Birth Certificate",
  "Military ID Card",
  "Medical Insurance Card/Policy",
  "Student ID Card",
  "Staff ID Card",
] as const;

// ─── Patient form default values ──────────────────────────────────────────────
// Field names here are camelCase to match React Hook Form expectations.
// The RegistrationSuite maps these to snake_case before calling the service.

export const PatientFormDefaultValues = {
  // Step 1 — Personal Information
  name: "",
  email: "",
  phone: "",
  birthDate: "" as any,          // maps to date_of_birth in DB
  gender: "Male" as const,
  religion: "",
  occupation: "",
  address: "",

  // Step 2 — Emergency Contact
  emergencyContactName: "",
  emergencyContactNumber: "",
  emergencyContactRelationship: "",
  emergencyContactEmail: "",
  emergencyContactAddress: "",

  // Step 3 — Medical History
  allergies: "",
  significantMedicationHistory: "",  // maps to significant_medication_history
  longTermMedication: "",  // maps to long_term_medication
  covidVaccinationOptions: "Not Vaccinated" as const,  // maps to covid_vaccination_options
  bloodGroup: "",  // maps to blood_group
  genoType: "",  // maps to geno_type

  // Step 4 — Insurance
  policyNumber: "",       // maps to policy_number
  hmo: false,
  hmoName: "",       // maps to hmo_name
  company: false,
  companyName: "",       // maps to company_name
  privateClient: false,    // maps to private_client

  // System
  status: "registered" as PatientStatus,
};

export type PatientFormValues = typeof PatientFormDefaultValues;

// ─── Role routing ─────────────────────────────────────────────────────────────
// Values must exactly match the `role` column in the staffs table.
// DB stores: Doctor | Nurse | Labtech | Pharmacist | Frontdesk | Radiologist | Admin

export const ROLE_ROUTES: Record<string, string> = {
  Doctor: "/doctor/dashboard",
  Labtech: "/lab-tech/dashboard",
  Nurse: "/nurse/dashboard",
  Pharmacist: "/pharmacist/dashboard",
  Frontdesk: "/front-desk/dashboard",
  Radiologist: "/radiology/dashboard",
  Admin: "/admin/dashboard",
  // Legacy lowercase aliases (keep for backward compat)
  doctor: "/doctor/dashboard",
  labtech: "/lab-tech/dashboard",
  nurse: "/nurse/dashboard",
  pharmacist: "/pharmacist/dashboard",
  frontdesk: "/front-desk/dashboard",
  radiologist: "/radiology/dashboard",
  admin: "/admin/dashboard",
};

// ─── Status icons (for appointment/status display) ────────────────────────────

export const StatusIcon = {
  scheduled: "/assets/icons/check.svg",
  pending: "/assets/icons/pending.svg",
  cancelled: "/assets/icons/cancelled.svg",
} as const;

// ─── Pharmacy constants ────────────────────────────────────────────────────────

export const DrugCategories = [
  "Antibiotics", "Analgesics / Pain Relief", "Antipyretics", "Antimalarials",
  "Antihypertensives", "Antidiabetics", "Antihistamines", "Antifungals",
  "Antivirals", "Cardiovascular", "Gastrointestinal", "Respiratory",
  "Vitamins & Supplements", "Hormones & Endocrine", "Dermatological",
  "Ophthalmological", "Ear / Nose / Throat", "Gynaecology & Obstetric",
  "Paediatric", "Vaccines", "IV Fluids", "Surgical Supplies", "Other",
] as const;

export const DosageForms = [
  "Tablet", "Capsule", "Syrup", "Suspension", "Injection",
  "Cream", "Ointment", "Drops", "Inhaler", "Suppository",
  "Patch", "Lotion", "Gel", "Powder", "Solution",
] as const;

export const DrugUnits = [
  "Tablet", "Capsule", "ml", "mg", "g",
  "Unit", "Vial", "Ampoule", "Sachet", "Pack", "Bottle", "Tube",
] as const;

// ─── Lab test constants ────────────────────────────────────────────────────────

export const LabTestCategories = [
  "Haematology", "Biochemistry", "Serology", "Microbiology",
  "Urinalysis", "Hormones", "Obstetric", "Reproductive",
  "Tumour Markers", "Immunology", "Genetics", "Other",
] as const;

export const SampleTypes = [
  "EDTA Blood", "Plain Blood", "Citrate Blood", "Urine",
  "Stool", "Sputum", "Swab", "CSF", "Tissue Biopsy",
  "Synovial Fluid", "Pleural Fluid", "Semen", "Saliva",
] as const;

export const TurnaroundTimes = [
  "30 minutes", "1 hour", "2 hours", "3 hours",
  "Same day", "24 hours", "48 hours", "3–5 days", "1 week",
] as const;