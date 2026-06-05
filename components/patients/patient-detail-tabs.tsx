"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Activity, Pill, Stethoscope, FlaskConical, AlertCircle, CheckCircle2,
  Radio, Syringe, Droplets, ClipboardCheck, CreditCard, Calendar, FolderOpen,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useAuth }              from "@/context/auth-provider";
import { useConsultationStore } from "@/store/consultation-store";
import { usePatientStore }      from "@/store/patient-store";
import { useDischargeStore }    from "@/store/discharge-store";
import { Patient, PatientStatus } from "@/types/models";
import { getAllStaffs }         from "@/actions/staff/get.staff";
import { Staff }                from "@/actions/staff/types";
import { calculateAge }         from "@/utils/export";
import { useConfirmPayment }    from "@/hooks/emr/use-payment";

import VitalsRecordDisplay from "./VitalRecordingDisplay";

function TabChunkSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-24 bg-gray-50 rounded-2xl border border-gray-100" />
      <div className="h-40 bg-gray-50 rounded-2xl border border-gray-100" />
    </div>
  );
}

const ConsultationForm           = dynamic(() => import("./consultation-form"),            { loading: () => <TabChunkSkeleton /> });
const ConsultationHistoryTable   = dynamic(() => import("./consultation-history"),         { loading: () => <TabChunkSkeleton /> });
const PrescriptionDetails        = dynamic(() => import("./prescription-details"),         { loading: () => <TabChunkSkeleton /> });
const PrescriptionHistory        = dynamic(() => import("./prescription-history"),         { loading: () => <TabChunkSkeleton /> });
const VitalsCheckinAdvancedComponent = dynamic(() => import("../nurse/VitalsSuite"),       { loading: () => <TabChunkSkeleton /> });
const LabTab                     = dynamic(() => import("../lab-tech/components/lab-tab"), { loading: () => <TabChunkSkeleton /> });
const RadiologyTab               = dynamic(() => import("../radiology/RadiologyTab").then(m => m.RadiologyTab), { loading: () => <TabChunkSkeleton /> });
const DrugChart                  = dynamic(() => import("../nurse/DrugChart"),             { loading: () => <TabChunkSkeleton /> });
const FluidBalanceChart          = dynamic(() => import("../nurse/FluidBalanceChart"),     { loading: () => <TabChunkSkeleton /> });
const DischargeNoteForm          = dynamic(() => import("../doctor/DischargeNoteForm"),    { loading: () => <TabChunkSkeleton /> });
const PaymentHistory             = dynamic(() => import("./payment-history"),              { loading: () => <TabChunkSkeleton /> });
const AppointmentComponent       = dynamic(() => import("../front-desk/AppointmentComponent"), { loading: () => <TabChunkSkeleton /> });
const PatientDocumentsTab        = dynamic(() => import("./patient-documents-tab"),                      { loading: () => <TabChunkSkeleton /> });

// ─── Types ────────────────────────────────────────────────────────────────────

type TabDef = {
  value:     string;
  label:     string;
  icon:      React.ElementType;
  accent:    string;
  activeBar: string;
};

const BASE_TABS: TabDef[] = [
  { value: "vitals",        label: "Vitals",        icon: Activity,      accent: "text-blue-600",   activeBar: "bg-blue-500"   },
  { value: "consultations", label: "Consultations", icon: Stethoscope,   accent: "text-red-600",    activeBar: "bg-red-500"    },
  { value: "prescriptions", label: "Prescriptions", icon: Pill,          accent: "text-violet-600", activeBar: "bg-violet-500" },
  { value: "lab",           label: "Lab Results",   icon: FlaskConical,  accent: "text-indigo-600", activeBar: "bg-indigo-500" },
  { value: "radiology",     label: "Radiology",     icon: Radio,         accent: "text-cyan-600",   activeBar: "bg-cyan-500"   },
];

const NURSE_CHART_STATUSES = new Set([
  PatientStatus.SentToNurse, PatientStatus.UnderObservation, PatientStatus.Admitted,
  "sent-to-nurse", "under-observation", "admitted",
]);

const DISCHARGE_STATUSES = new Set([
  PatientStatus.UnderConsultation, PatientStatus.Admitted, PatientStatus.AwaitingPayment,
  "under-consultation", "admitted", "awaiting-payment",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeRole(role?: string) {
  const r = (role ?? "").toLowerCase();
  if (r.includes("front")) return "FrontDesk";
  if (r.includes("doc"))   return "Doctor";
  if (r.includes("nurse")) return "Nurse";
  if (r.includes("admin")) return "Admin";
  return role ?? "";
}

function normalizeStatus(status?: string) {
  return String(status ?? "").toLowerCase().replace(/_/g, "-").trim();
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────

function AlertBanner({ type, message }: { type: "error" | "success"; message: string }) {
  const isError = type === "error";
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-2xl border text-xs font-medium mb-5 ${
      isError ? "bg-red-50 border-red-100 text-red-700" : "bg-green-50 border-green-100 text-green-700"
    }`}>
      {isError ? <AlertCircle size={14} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={14} className="shrink-0 mt-0.5" />}
      <span>{message}</span>
    </div>
  );
}

function SectionHeader({ icon: Icon, color, bg, title, subtitle }: {
  icon: React.ElementType; color: string; bg: string; title: string; subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon size={17} className={color} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-900 leading-tight">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function NoPatient({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
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

function Panel({ accent, label, children }: { accent: string; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-50">
        <div className={`w-1.5 h-4 rounded-full ${accent}`} />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PatientDetailTabs({ patient }: { patient: Patient }) {
  const [tab, setTab]                   = useState("vitals");
  const [formError, setFormError]       = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const consultationStore = useConsultationStore();
  const patientStore      = usePatientStore();
  const dischargeStore    = useDischargeStore();
  const formRef           = useRef<HTMLDivElement>(null);
  const { user }          = useAuth();
  const confirmPayment    = useConfirmPayment();

  const role            = normalizeRole(user?.role);
  const staffId         = user?.$id ?? user?.id ?? "";
  const status          = normalizeStatus(patient.status ?? patientStore.status);
  const canManageBilling= role === "FrontDesk" || role === "Admin";
  const canViewBilling  = canManageBilling || role === "Doctor";

  const { data: staff = [] } = useQuery({ queryKey: ["staffs"], queryFn: getAllStaffs });

  const availableStaff = useMemo(() =>
    staff.filter((s: Staff) =>
      s.role && consultationStore.referredTo &&
      s.role.toLowerCase() === consultationStore.referredTo
    ),
    [staff, consultationStore.referredTo]
  );

  const age = calculateAge(patient?.birth_date!);

  // ── Role-conditional extra tabs ────────────────────────────────────────────
  const visibleTabs = useMemo(() => {
    const extra: TabDef[] = [];

    const conditionalDefs = [
      {
        // Drug chart — always visible; nurses can write, everyone else read-only
        value: "drug-chart", label: "Drug Chart", icon: Syringe,
        accent: "text-teal-600", activeBar: "bg-teal-500",
        show: true,
      },
      {
        // Fluid balance — always visible; nurses can write, everyone else read-only
        value: "fluid-balance", label: "Fluid Balance", icon: Droplets,
        accent: "text-sky-600", activeBar: "bg-sky-500",
        show: true,
      },
      {
        value: "discharge", label: "Discharge", icon: ClipboardCheck,
        accent: "text-emerald-600", activeBar: "bg-emerald-500",
        show: role === "Doctor" && DISCHARGE_STATUSES.has(status as PatientStatus),
      },
      {
        value: "billing", label: "Billing", icon: CreditCard,
        accent: "text-orange-600", activeBar: "bg-orange-500",
        show: canViewBilling,
      },
      {
        // Appointments — always visible to all roles
        value: "appointments", label: "Appointments", icon: Calendar,
        accent: "text-blue-600", activeBar: "bg-blue-500",
        show: true,
      },
    ] as const;

    for (const d of conditionalDefs) {
      if (d.show) extra.push({ value: d.value, label: d.label, icon: d.icon, accent: d.accent, activeBar: d.activeBar });
    }

    return [...BASE_TABS, ...extra];
  }, [role, status, canViewBilling]);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (patient) {
      patientStore.setPatient([patient]);
      patientStore.updateNotes(patient.notes || "");
      patientStore.setStatus((patient.status as PatientStatus) || "no-status");
      consultationStore.resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient]);

  useEffect(() => {
    if (tab === "discharge" && patient.id) dischargeStore.openForm(patient.id);
  }, [tab, patient.id, dischargeStore]);

  useEffect(() => {
    if (!visibleTabs.some(t => t.value === tab)) setTab("vitals");
  }, [visibleTabs, tab]);

  useEffect(() => {
    if (formError) { const t = setTimeout(() => setFormError(null), 5000); return () => clearTimeout(t); }
  }, [formError]);

  useEffect(() => {
    if (successMessage) { const t = setTimeout(() => setSuccessMessage(null), 4000); return () => clearTimeout(t); }
  }, [successMessage]);

  const billingReadOnly = !canManageBilling;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full space-y-5">
      <TabsList className="flex flex-wrap w-full h-auto bg-white border border-gray-100 rounded-2xl p-1 shadow-sm gap-1">
        {visibleTabs.map(({ value, label, icon: Icon, accent, activeBar }) => {
          const isActive = tab === value;
          return (
            <TabsTrigger key={value} value={value}
              className={`relative flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex-1 min-w-[7rem] ${
                isActive
                  ? `bg-gray-50 border border-gray-100 shadow-sm ${accent}`
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-50/60"
              }`}>
              {isActive && <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${activeBar}`} />}
              <Icon size={14} className="shrink-0" />
              <span className="truncate">{label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* ── Vitals ── */}
      <TabsContent value="vitals" className="mt-0">
        <div className="space-y-5">
          <SectionHeader icon={Activity} color="text-blue-600" bg="bg-blue-50"
            title="Vitals Recording" subtitle="Patient measurements and clinical observations" />
          {!patient.id ? (
            <NoPatient icon={Activity} label="Select a patient to view or record vitals" />
          ) : (
            <div className={`grid gap-5 ${role === "Nurse" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
              <Panel accent="bg-blue-500" label="Latest Record">
                <VitalsRecordDisplay patientId={patient.id} />
              </Panel>
              {role === "Nurse" && (
                <Panel accent="bg-green-500" label="Record New Vitals">
                  <VitalsCheckinAdvancedComponent patientId={patient.id} />
                </Panel>
              )}
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── Consultations ── */}
      <TabsContent value="consultations" className="mt-0">
        <div className="space-y-5">
          <SectionHeader icon={Stethoscope} color="text-red-600" bg="bg-red-50"
            title="Consultations" subtitle="Clinical findings and patient routing" />
          {role === "Doctor" && patient?.id && (
            <Panel accent="bg-red-500" label="New Consultation">
              <div ref={formRef}>
                {formError     && <AlertBanner type="error"   message={formError}     />}
                {successMessage && <AlertBanner type="success" message={successMessage} />}
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

      {/* ── Prescriptions ── */}
      <TabsContent value="prescriptions" className="mt-0">
        <div className="space-y-5">
          <SectionHeader icon={Pill} color="text-violet-600" bg="bg-violet-50"
            title="Prescriptions" subtitle="Medication records and dispensing history" />
          {!patient.id ? (
            <NoPatient icon={Pill} label="Select a patient to view prescriptions" />
          ) : (
            <div className={`grid gap-5 ${role === "Pharmacist" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>
              {role === "Pharmacist" && (
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

      {/* ── Lab ── */}
      <TabsContent value="lab"       className="mt-0"><LabTab      patient={patient} userRole={user?.role} /></TabsContent>
      <TabsContent value="radiology" className="mt-0"><RadiologyTab patient={patient} userRole={user?.role} /></TabsContent>

      {patient.id && (
        <>
          {/* ── Nurse charts ── */}
          <TabsContent value="drug-chart" className="mt-0">
            <DrugChart patientId={patient.id} staffId={staffId} readOnly={role !== "Nurse"} />
          </TabsContent>
          <TabsContent value="fluid-balance" className="mt-0">
            <FluidBalanceChart patientId={patient.id} staffId={staffId} readOnly={role !== "Nurse"} />
          </TabsContent>

          {/* ── Discharge ── */}
          <TabsContent value="discharge" className="mt-0">
            <div className="space-y-4">
              <SectionHeader icon={ClipboardCheck} color="text-emerald-600" bg="bg-emerald-50"
                title="Discharge Summary" subtitle="Complete before sending patient to billing" />
              <DischargeNoteForm staffId={staffId} embedded
                onSuccess={() => setSuccessMessage("Discharge note saved successfully.")} />
            </div>
          </TabsContent>

          {/* ── Billing ── */}
          <TabsContent value="billing" className="mt-0">
            <div className="space-y-4">
              <SectionHeader icon={CreditCard} color="text-orange-600" bg="bg-orange-50"
                title="Payment History"
                subtitle={canManageBilling ? "View and settle invoices for this patient" : "Read-only billing records"} />
              {status === "awaiting-payment" && canManageBilling && (
                <div className="px-4 py-3 rounded-xl bg-orange-50 border border-orange-100 text-xs text-orange-800 font-medium">
                  This patient is awaiting payment. Confirm pending items below or use the{" "}
                  <a href="/front-desk/payment" className="underline font-semibold">checkout queue</a>.
                </div>
              )}
              <PaymentHistory
                patientId={patient.id}
                readOnly={billingReadOnly}
                onSettle={billingReadOnly ? undefined : paymentId => confirmPayment.mutate(paymentId)}
              />
            </div>
          </TabsContent>

          {/* ── Appointments — visible to all roles, patient context ── */}
          <TabsContent value="appointments" className="mt-0">
            <AppointmentComponent
              staffId={staffId}
              patientId={patient.id}
              inPatientContext
            />
          </TabsContent>

          {/* ── Documents — upload: FrontDesk/Admin; view: all roles ── */}
          <TabsContent value="documents" className="mt-0">
            <PatientDocumentsTab
              patientId={patient.id}
              staffId={staffId}
              canUpload={canManageBilling}
            />
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}