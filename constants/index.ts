export const GenderOptions = ["Male", "Female"];
export const CovidVaccinationOptions = ['Yes', "No"];
import { StaffRole } from "@/actions/staff/types";
import { Patient, PatientStatus } from "@/context/patients/types";


export const PatientFormDefaultValues: Patient = {
  // System fields
  $id: '',
  $createdAt: '',
  $updatedAt: '',

  // Step 1: Personal Information
  name: "",
  religion: "",
  email: "",
  phone: "",
  birth_date: new Date(Date.now()),
  gender: "Male",
  occupation: "",
  address: "",

  // Step 2: Emergency Contact
  emergencyContactName: "",
  emergencyContactNumber: "",
  emergencyContactRelationship: "",
  emergencyContactEmail: "",
  emergencyContactAddress: "",

  // Step 3: General Medical History
  allergies: "",
  // currentMedication: "",
  significantMedicationHistory: "",
  longTermMedication: "",
  covidVaccinationOptions: "No",
  bloodGroup: "",
  genoType: "",

  // Step 4: Medical Insurance Detail
  policyNumber: "",
  hmo: false,
  hmoName: "",
  company: false,
  companyName: "",
  privateClient: false,

  // Other required fields
  status: "active" as PatientStatus, // adjust depending on your PatientStatus enum
  userId: "",

  // Optional fields
  notes: "",
  symptoms: "",
  diagnosis: "",
  prescriptions: "",
  recommendations: "",
};

export const IdentificationTypes = [
  "Birth Certificate",
  "Driver's License",
  "Medical Insurance Card/Policy",
  "Military ID Card",
  "National Identity Card",
  "Passport",
  "Resident Alien Card (Green Card)",
  "Social Security Card",
  "State ID Card",
  "Student ID Card",
  "Voter ID Card",
];

export const Doctors = [
  {
    image: "/assets/images/dr-green.png",
    name: "John Green",
  },
  {
    image: "/assets/images/dr-cameron.png",
    name: "Leila Cameron",
  },
  {
    image: "/assets/images/dr-livingston.png",
    name: "David Livingston",
  },
  {
    image: "/assets/images/dr-peter.png",
    name: "Evan Peter",
  },
  {
    image: "/assets/images/dr-powell.png",
    name: "Jane Powell",
  },
  {
    image: "/assets/images/dr-remirez.png",
    name: "Alex Ramirez",
  },
  {
    image: "/assets/images/dr-lee.png",
    name: "Jasmine Lee",
  },
  {
    image: "/assets/images/dr-cruz.png",
    name: "Alyana Cruz",
  },
  {
    image: "/assets/images/dr-sharma.png",
    name: "Hardik Sharma",
  },
];

export const StatusIcon = {
  scheduled: "/assets/icons/check.svg",
  pending: "/assets/icons/pending.svg",
  cancelled: "/assets/icons/cancelled.svg",
};


export const ROLE_ROUTES: Record<StaffRole, string> = {
  doctor: "/doctor/dashboard",
  labtech: "/lab-tech/dashboard",
  nurse: "/nurse/dashboard",
  pharmacist: "/pharmacist/dashboard",
  frontdesk: "/front-desk/dashboard",
  user: "/staff",

};
