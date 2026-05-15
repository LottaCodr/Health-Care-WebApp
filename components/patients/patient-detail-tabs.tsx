"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Activity,
  Pill,
  Stethoscope,
  FlaskConical,
  AlertCircle,
  CheckCircle2,
  Radio
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/auth-provider";
import { useConsultationStore } from "@/store/consultation-store";
import { usePatientStore } from "@/store/patient-store";
import { PatientStatus } from "@/context/patients/types";

import { getAllStaffs } from "@/actions/staff/get.staff";
import { Staff } from "@/actions/staff/types";
import { Patient } from "@/types/models";
import { calculateAge } from "@/utils/export";

import VitalsRecordDisplay from "./VitalRecordingDisplay";

function TabChunkSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-24 bg-gray-50 rounded-2xl border border-gray-100" />
      <div className="h-40 bg-gray-50 rounded-2xl border border-gray-100" />
    </div>
  );
}

const ConsultationForm = dynamic(() => import("./consultation-form"), {
  loading: () => <TabChunkSkeleton />,
});
const ConsultationHistoryTable = dynamic(() => import("./consultation-history"), {
  loading: () => <TabChunkSkeleton />,
});
const PrescriptionDetails = dynamic(() => import("./prescription-details"), {
  loading: () => <TabChunkSkeleton />,
});
const PrescriptionHistory = dynamic(() => import("./prescription-history"), {
  loading: () => <TabChunkSkeleton />,
});
const VitalsCheckinAdvancedComponent = dynamic(
  () => import("../nurse/VitalsSuite"),
  { loading: () => <TabChunkSkeleton /> }
);
const LabTab = dynamic(() => import("../lab-tech/components/lab-tab"), {
  loading: () => <TabChunkSkeleton />,
});
const RadiologyTab = dynamic(
  () => import("../radiology/RadiologyTab").then((m) => m.RadiologyTab),
  { loading: () => <TabChunkSkeleton /> }
);

// ──────────────────────────────────────────────────────────────────────────────
// Tab configuration
// ──────────────────────────────────────────────────────────────────────────────

const TAB_CONFIG = [
  {
    value: "vitals",
    label: "Vitals",
    icon: Activity,
    accent: "text-blue-600",
    activeBar: "bg-blue-500",
  },
  {
    value: "consultations",
    label: "Consultations",
    icon: Stethoscope,
    accent: "text-red-600",
    activeBar: "bg-red-500",
  },
  {
    value: "prescriptions",
    label: "Prescriptions",
    icon: Pill,
    accent: "text-violet-600",
    activeBar: "bg-violet-500",
  },
  {
    value: "lab",
    label: "Lab Results",
    icon: FlaskConical,
    accent: "text-indigo-600",
    activeBar: "bg-indigo-500",
  },
  {
    value: "radiology",
    label: "Radiology",
    icon: Radio,
    accent: "text-cyan-600",
    activeBar: "bg-cyan-500",
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Helper components
// ──────────────────────────────────────────────────────────────────────────────

function AlertBanner({
  type,
  message,
}: {
  type: "error" | "success";
  message: string;
}) {
  const isError = type === "error";
  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-2xl border text-xs font-medium mb-5 ${
        isError
          ? "bg-red-50 border-red-100 text-red-700"
          : "bg-green-50 border-green-100 text-green-700"
      }`}
    >
      {isError ? (
        <AlertCircle size={14} className="shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
      )}
      <span>{message}</span>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  color,
  bg,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  color: string;
  bg: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}
      >
        <Icon size={17} className={color} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-900 leading-tight">
          {title}
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function NoPatient({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
      <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
        <Icon size={20} className="text-gray-300" />
      </div>
      <p className="text-sm font-semibold text-gray-500">No patient selected</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function Panel({
  accent,
  label,
  children,
}: {
  accent: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
        <div className={`w-1.5 h-4 rounded-full ${accent}`} />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          {label}
        </p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────

export default function PatientDetailTabs({
  patient,
}: {
  patient: Patient;
}) {
  const [tab, setTab] = useState("vitals");
  const consultationStore = useConsultationStore();
  const patientStore = usePatientStore();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Fetch all staff
  const { data: staff = [] } = useQuery({
    queryKey: ["staffs"],
    queryFn: getAllStaffs,
  });

  // Staff available for referral
  const availableStaff = useMemo(
    () =>
      staff.filter(
        (s: Staff) =>
          s.role &&
          consultationStore.referredTo &&
          s.role.toLowerCase() === consultationStore.referredTo
      ),
    [staff, consultationStore.referredTo]
  );

  // Patient age calculation
  const age = calculateAge(patient?.date_of_birth!);

  // Set up context and patient state when patient changes
  useEffect(() => {
    if (patient) {
      patientStore.setPatient([patient]);
      patientStore.updateNotes(patient.notes || "");
      patientStore.setStatus((patient.status as PatientStatus) || "no-status");
      consultationStore.resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient]);

  // Dismiss error after delay
  useEffect(() => {
    if (formError) {
      const t = setTimeout(() => setFormError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [formError]);

  // Dismiss success message after delay
  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full space-y-5">
      {/* Tabs Bar */}
      <TabsList className="grid grid-cols-5 w-full bg-white border border-gray-100 rounded-2xl p-1 shadow-sm gap-1">
        {TAB_CONFIG.map(
          ({ value, label, icon: Icon, accent, activeBar }) => {
            const isActive = tab === value;
            return (
              <TabsTrigger
                key={value}
                value={value}
                className={`relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200
                  ${
                    isActive
                      ? `bg-gray-50 border border-gray-100 shadow-sm ${accent}`
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-50/60"
                  }`}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <span
                    className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${activeBar}`}
                  />
                )}
                <Icon size={14} className="shrink-0" />
                <span className="hidden sm:inline truncate">{label}</span>
              </TabsTrigger>
            );
          }
        )}
      </TabsList>

      {/* Vitals Tab */}
      <TabsContent value="vitals" className="mt-0">
        <div className="space-y-5">
          <SectionHeader
            icon={Activity}
            color="text-blue-600"
            bg="bg-blue-50"
            title="Vitals Recording"
            subtitle="Patient measurements and clinical observations"
          />

          {!patient.id ? (
            <NoPatient
              icon={Activity}
              label="Select a patient to view or record vitals"
            />
          ) : (
            <div
              className={`grid gap-5 ${
                user?.role === "Nurse"
                  ? "grid-cols-1 xl:grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
              <Panel accent="bg-blue-500" label="Latest Record">
                <VitalsRecordDisplay patientId={patient.id} />
              </Panel>
              {user?.role === "Nurse" && (
                <Panel accent="bg-green-500" label="Record New Vitals">
                  <VitalsCheckinAdvancedComponent patientId={patient.id} />
                </Panel>
              )}
            </div>
          )}
        </div>
      </TabsContent>

      {/* Consultations Tab */}
      <TabsContent value="consultations" className="mt-0">
        <div className="space-y-5">
          <SectionHeader
            icon={Stethoscope}
            color="text-red-600"
            bg="bg-red-50"
            title="Consultations"
            subtitle="Clinical findings and patient routing"
          />

          {user?.role === "Doctor" && patient?.id && (
            <Panel accent="bg-red-500" label="New Consultation">
              <div ref={formRef}>
                {formError && (
                  <AlertBanner type="error" message={formError} />
                )}
                {successMessage && (
                  <AlertBanner type="success" message={successMessage} />
                )}
                <ConsultationForm
                  patientId={patient.id}
                  availableStaff={availableStaff}
                  patientAge={age}
                  patientMedicalHistory={patient?.significant_medication_history!}
                  patientGender={patient?.gender}
                />
              </div>
            </Panel>
          )}

          <Panel accent="bg-gray-300" label="Consultation History">
            <ConsultationHistoryTable patientId={patient?.id!} />
          </Panel>
        </div>
      </TabsContent>

      {/* Prescriptions Tab */}
      <TabsContent value="prescriptions" className="mt-0">
        <div className="space-y-5">
          <SectionHeader
            icon={Pill}
            color="text-violet-600"
            bg="bg-violet-50"
            title="Prescriptions"
            subtitle="Medication records and dispensing history"
          />

          {!patient.id ? (
            <NoPatient
              icon={Pill}
              label="Select a patient to view prescriptions"
            />
          ) : (
            <div
              className={`grid gap-5 ${
                user?.role === "Pharmacist"
                  ? "grid-cols-1 xl:grid-cols-2"
                  : "grid-cols-1"
              }`}
            >
              {user?.role === "Pharmacist" && (
                <Panel accent="bg-violet-500" label="New Prescription">
                  <PrescriptionDetails patientId={patient.id} patient={patient} />
                </Panel>
              )}
              <Panel accent="bg-blue-500" label="Prescription History">
                <PrescriptionHistory patientId={patient.id} />
              </Panel>
            </div>
          )}
        </div>
      </TabsContent>

      {/* Lab Results Tab */}
      <TabsContent value="lab" className="mt-0">
        <LabTab patient={patient} userRole={user?.role} />
      </TabsContent>

      {/* Radiology Tab */}
      <TabsContent value="radiology" className="mt-0">
            <RadiologyTab patient={patient} userRole={user?.role} />
        </TabsContent>
    </Tabs>
  );
}