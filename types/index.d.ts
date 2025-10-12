/* eslint-disable no-unused-vars */

export type SearchParamProps = {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

declare type Gender = "Male" | "Female";
declare type Status = "pending" | "scheduled" | "cancelled";

declare interface CreateUserParams {
  name: string;
  email: string;
  phone: string;
}
declare interface User extends CreateUserParams {
  $id: string;
}

declare type CovidVaccinationOptions = "Yes" | "No";

declare interface RegisterUserParams extends CreateUserParams {
  // Step 1: Personal Information
  name: string;
  religion: string;
  email: string;
  phone: string;
  birthDate: Date;
  gender: Gender;
  occupation: string;
  address: string;

  // Step 2: Emergency Contact
  emergencyContactName: string;
  emergencyContactNumber: string;
  emergencyContactRelationship: string;
  emergencyContactEmail: string;
  emergencyContactAddress: string;

  // Step 3: General Medical History
  allergies: string;
  // currentMedication?: string;
  significantMedicationHistory: string;
  longTermMedication: string;
  covidVaccinationOptions: CovidVaccinationOptions;
  bloodGroup: string;
  genoType: string;

  // Step 4: Medical Insurance Detail
  policyNumber: string;
  hmo: boolean;
  hmoName: string;
  company: boolean;
  companyName: string;
  privateClient: boolean;

  // System-level
  status?: PatientStatus;
  userId: string; // Creator (front desk staff)
  notes?: string;

  // Optional consultation fields
  symptoms?: string;
  diagnosis?: string;
  prescriptions?: string;
  recommendations?: string;
}



export type PatientRecord = {
  id: string;
  name: string;
  gender: "Male" | "Female" | string;
  age: number;
  phone: string;
  address: string;
  medicalNote?: string;
  dateRegistered: string;
};
