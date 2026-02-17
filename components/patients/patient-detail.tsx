"use client";

import { useEffect, useRef, useCallback, useState, ReactNode } from "react";
import { usePatientContext } from "@/context/patients/patient-context";
import { useConsultationContext } from "@/context/consultation/consultation";
import PatientDetailsSkeleton from "./skeleton";
import { Patient, PatientStatus } from "@/context/patients/types";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-provider";

import { FaUserMd } from "react-icons/fa";
import {
  MdEmail,
  MdPhone,
  MdLocationOn,
  MdWork,
  MdMedicalServices,
  MdHistory,
  MdAssignment,
  MdWarning,
  MdCheckCircle,
  MdNote,
} from "react-icons/md";
import { BsGenderAmbiguous } from "react-icons/bs";
import PatientDetailTabs from "./patient-detail-tabs";

// For fast load, avoid any unnecessary suspense or data fetching in initial render.
// Only show patient profile immediately, then load tabs after.

interface Props {
  patient: Patient;
}

type Field =
  | {
      label: string;
      icon: ReactNode;
      value: any;
      render?: (val: any) => ReactNode;
    }
  | {
      label: string;
      icon: ReactNode;
      value: any;
    };

export default function PatientDetailsComponent({ patient }: Props) {
  const { state: patientState, dispatch: patientDispatch } = usePatientContext();
  const { state: consultationState, dispatch: consultationDispatch } = useConsultationContext();
  const { user } = useAuth();

  const [showCopied, setShowCopied] = useState(false);

  // Setup effect as fast as possible; only set patient state (avoid any unnecessary async)
  useEffect(() => {
    if (patient) {
      patientDispatch({ type: "SET_PATIENT", payload: [patient] });
      patientDispatch({ type: "UPDATE_NOTES", payload: patient.notes || "" });
      patientDispatch({ type: "SET_STATUS", payload: (patient.status as PatientStatus) || "no-status" });
      consultationDispatch({ type: "RESET_FORM" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient]);

  // Copy patient ID to clipboard
  const handleCopyId = useCallback(async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 1500);
    } catch {
      toast({
        variant: "destructive",
        title: "Copy Failed",
        description: "Could not copy patient ID.",
      });
    }
  }, []);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    }
  }, []);

  // Skeleton loads only during a true loading (very fast!)
  if (consultationState.loading) return <PatientDetailsSkeleton />;

  if (!patientState.patient || !patientState.patient.length)
    return (
      <ErrorMessage message="Patient not found." actionLabel="Back" onAction={handleBack} />
    );

  const currentPatient = patientState.patient[0];

  return (
    <main className="max-w-full px-2 md:px-6 py-10 space-y-10">
      <div className="w-full">
        <PatientProfile
          patient={currentPatient}
          status={patientState.status}
          onCopyId={() =>
            handleCopyId(currentPatient.id || (currentPatient as any).$id || "")
          }
          showCopied={showCopied}
        />
      </div>
      {/* Load PatientDetailTabs only client-side, no suspense, for fastest perceived load */}
      <PatientDetailTabs patient={patient} />
    </main>
  );
}

// -- Improved visual hierarchy for PatientProfile --
function PatientProfile({
  patient,
  status,
  onCopyId,
  showCopied,
}: {
  patient: Patient;
  status: string;
  onCopyId: () => void;
  showCopied: boolean;
}) {
  // Define field groupings for better visual structure
  const fieldGroups: {
    title: string;
    icon: ReactNode;
    fields: Field[];
  }[] = [
    {
      title: "Basic Information",
      icon: <FaUserMd className="text-primary" />,
      fields: [
        {
          label: "Patient ID",
          icon: <MdAssignment className="text-blue-400" />,
          value: ((patient as any).userId || (patient as any).id || ""),
          render: (val: string) => (
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs">{val}</span>
              <button
                className="ml-1 px-1 py-0.5 rounded bg-gray-100 hover:bg-blue-100 text-xs text-blue-700"
                onClick={onCopyId}
                title="Copy Patient ID"
                type="button"
              >
                {showCopied ? "Copied!" : "Copy"}
              </button>
            </span>
          ),
        },
        {
          label: "Name",
          icon: <FaUserMd className="text-blue-700" />,
          value: patient.name,
        },
        {
          label: "Gender",
          icon: <BsGenderAmbiguous className="text-pink-500" />,
          value: patient.gender,
        },
        {
          label: "Birth Date",
          icon: <MdAssignment className="text-blue-700" />,
          value: patient.birth_date ? new Date(patient.birth_date).toLocaleDateString() : "Not provided",
        },
        {
          label: "Religion",
          icon: <MdAssignment className="text-blue-700" />,
          value: patient.religion,
        },
        {
          label: "Occupation",
          icon: <MdWork className="text-gray-600" />,
          value: patient.occupation,
        },
        {
          label: "Address",
          icon: <MdLocationOn className="text-green-600" />,
          value: patient.address,
        },
        {
          label: "Email",
          icon: <MdEmail className="text-blue-500" />,
          value: patient.email,
        },
        {
          label: "Phone",
          icon: <MdPhone className="text-red-500" />,
          value: patient.phone,
        },
      ]
    },
    {
      title: "Emergency Contact",
      icon: <MdWarning className="text-orange-500" />,
      fields: [
        {
          label: "Emergency Contact Name",
          icon: <FaUserMd className="text-blue-700" />,
          value: (patient as any).emergencyContactName,
        },
        {
          label: "Emergency Contact Number",
          icon: <MdPhone className="text-red-500" />,
          value: (patient as any).emergencyContactNumber,
        },
        {
          label: "Emergency Contact Relationship",
          icon: <MdAssignment className="text-blue-700" />,
          value: (patient as any).emergencyContactRelationship,
        },
        {
          label: "Emergency Contact Email",
          icon: <MdEmail className="text-blue-500" />,
          value: (patient as any).emergencyContactEmail,
        },
        {
          label: "Emergency Contact Address",
          icon: <MdLocationOn className="text-green-600" />,
          value: (patient as any).emergencyContactAddress,
        },
      ]
    },
    {
      title: "Medical Details",
      icon: <MdMedicalServices className="text-red-600" />,
      fields: [
        {
          label: "Allergies",
          icon: <MdMedicalServices className="text-red-600" />,
          value: patient.allergies,
        },
        {
          label: "Current Medication",
          icon: <FaUserMd className="text-blue-700" />,
          value: (patient as any).currentMedication,
        },
        {
          label: "Significant Medication History",
          icon: <MdHistory className="text-gray-500" />,
          value: (patient as any).significantMedicationHistory,
        },
        {
          label: "Long Term Medication",
          icon: <FaUserMd className="text-blue-700" />,
          value: (patient as any).longTermMedication,
        },
        {
          label: "Covid Vaccination",
          icon: <MdCheckCircle className="text-green-600" />,
          value: (patient as any).covidVaccinationOptions,
        },
        {
          label: "Blood Group",
          icon: <MdAssignment className="text-blue-700" />,
          value: (patient as any).bloodGroup,
        },
        {
          label: "Geno Type",
          icon: <MdAssignment className="text-blue-700" />,
          value: (patient as any).genoType,
        },
      ]
    },
    {
      title: "Insurance / Billing",
      icon: <MdAssignment className="text-purple-600" />,
      fields: [
        {
          label: "Policy Number",
          icon: <MdAssignment className="text-blue-700" />,
          value: (patient as any).policyNumber,
        },
        {
          label: "HMO",
          icon: <MdAssignment className="text-blue-700" />,
          value: (patient as any).hmo ? "Yes" : "No",
        },
        {
          label: "HMO Name",
          icon: <MdAssignment className="text-blue-700" />,
          value: (patient as any).hmoName,
        },
        {
          label: "Company",
          icon: <MdAssignment className="text-blue-700" />,
          value: (patient as any).company ? "Yes" : "No",
        },
        {
          label: "Company Name",
          icon: <MdAssignment className="text-blue-700" />,
          value: (patient as any).companyName,
        },
        {
          label: "Private Client",
          icon: <MdAssignment className="text-blue-700" />,
          value: (patient as any).privateClient ? "Yes" : "No",
        },
      ]
    },
    {
      title: "Status",
      icon: <MdAssignment className="text-gray-800" />,
      fields: [
        {
          label: "Current Status",
          icon: <MdAssignment className="text-blue-700" />,
          value: status,
        },
      ]
    },
  ];

  return (
    <section aria-labelledby="patient-profile">
      <div className="shadow-lg rounded-2xl border bg-white dark:bg-background overflow-hidden">
        {/* Profile Card Header */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-blue-100 dark:from-muted dark:to-muted/40">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-200 p-3 flex items-center justify-center">
              <FaUserMd className="text-blue-700 text-3xl" />
            </div>
            <div>
              <h2
                id="patient-profile"
                className="text-2xl md:text-3xl font-extrabold text-blue-900 dark:text-white flex flex-wrap items-center gap-2"
              >
                Patient Profile
              </h2>
              <span className="block text-sm text-blue-800/80 dark:text-muted-foreground">{patient.name}</span>
            </div>
          </div>
          {/* Optionally display status prominently */}
          <div className="mt-2 md:mt-0 md:ml-auto">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 font-semibold border text-sm">
              <MdAssignment className="inline text-blue-600" />
              {status}
            </span>
          </div>
        </div>
        <div className="px-4 py-6 space-y-8">
          {fieldGroups.map((group) => (
            <div key={group.title}>
              <div className="flex items-center gap-2 mb-4">
                <div className="text-lg md:text-xl font-bold flex items-center text-gray-700 dark:text-white">
                  {group.icon}
                  <span className="ml-2">{group.title}</span>
                </div>
                {/* a divider */}
                <div className="flex-1 border-t border-dashed border-blue-200 ml-3" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {group.fields.map((field) => {
                  // TypeScript safe access for .render property
                  const hasRender = typeof (field as any).render === "function";
                  return (
                    <InfoItem
                      key={field.label}
                      label={field.label}
                      icon={field.icon}
                      value={hasRender
                        ? (field as any).render(field.value)
                        : (field.value ?? "Not provided")}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Improved info item for better hierarchy and readability
function InfoItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 bg-white dark:bg-muted/40 border rounded-xl px-3 py-3 shadow-sm min-h-[64px]">
      <span className="mt-1 text-lg">{icon}</span>
      <div>
        <span className="block font-semibold text-gray-900 dark:text-white text-sm mb-0.5">
          {label}
        </span>
        <span className="text-base text-gray-800 dark:text-gray-200 break-words">
          {value || <span className="italic text-gray-400 dark:text-gray-500">Not provided</span>}
        </span>
      </div>
    </div>
  );
}

function ErrorMessage({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col bg-white items-center justify-center pt-20">
      <MdWarning className="text-4xl text-red-500 mb-2" />
      <p className="text-center text-red-600 text-lg font-medium">{message}</p>
      {actionLabel && onAction && (
        <button
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// End fast-load rewrite