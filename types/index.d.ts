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

interface RegisterUserParams {
  // Step 1: Personal Information
  name: string;
  religion: string;
  email: string;
  phone: string;
  birth_date: Date;
  gender: Gender;
  occupation: string;
  address: string;

  // Step 2: Emergency Contact
  emergency_contact_name: string;
  emergency_contact_number: string;
  emergency_contact_relationship: string;
  emergency_contact_email: string;
  emergency_contact_address: string;

  // Step 3: General Medical History
  allergies: string;
  // current_medication?: string; // dropped
  significant_medication_history: string;
  long_term_medication: string;
  covid_vaccination_options: CovidVaccinationOptions;
  blood_group: string;
  geno_type: string;

  // Step 4: Medical Insurance Detail
  policy_number: string;
  hmo: boolean;
  hmo_name: string;
  company: boolean;
  company_name: string;
  private_client: boolean;

  // System-level
  status?: PatientStatus;
  user_id: string; // Creator (front desk staff)
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
