"use client";

import dynamic from "next/dynamic";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Activity, Pill, Stethoscope, FlaskConical, AlertCircle, CheckCircle2,
  Radio, Syringe, Droplets, ClipboardCheck, CreditCard, Calendar, FolderOpen,
  ShieldAlert, TrendingUp, Ruler, Scissors, Send, ListChecks,
  FileSignature, FileHeart, ImageIcon, FileDown, MonitorSmartphone,
  Search, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/context/auth-provider";
import { useConsultationStore } from "@/store/consultation-store";
import { usePatientStore } from "@/store/patient-store";
import { useDischargeStore } from "@/store/discharge-store";
import { Patient, PatientStatus } from "@/types/models";
import { getAllStaffs } from "@/actions/staff/get.staff";
import { Staff } from "@/actions/staff/types";
import { calculateAge } from "@/utils/export";
import { normalizeUserRole } from "@/lib/roles";
import { hasActualAllergy } from "@/lib/utils";
import { useAllergies } from "@/hooks/emr/use-clinical-modules";

import VitalsRecordDisplay from "./VitalRecordingDisplay";

function TabChunkSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-24 bg-gray-50 rounded-2xl border border-gray-100" />
      <div className="h-40 bg-gray-50 rounded-2xl border border-gray-100" />
    </div>
  );
}

const ConsultationForm = dynamic(() => import("./consultation-form"), { loading: () => <TabChunkSkeleton /> });
const ConsultationHistoryTable = dynamic(() => import("./consultation-history"), { loading: () => <TabChunkSkeleton /> });
const PrescriptionDetails = dynamic(() => import("./prescription-details"), { loading: () => <TabChunkSkeleton /> });
const PrescriptionHistory = dynamic(() => import("./prescription-history"), { loading: () => <TabChunkSkeleton /> });
const VitalsCheckinAdvancedComponent = dynamic(() => import("../nurse/VitalsSuite"), { loading: () => <TabChunkSkeleton /> });
const LabTab = dynamic(() => import("../lab-tech/components/lab-tab"), { loading: () => <TabChunkSkeleton /> });
const RadiologyTab = dynamic(() => import("../radiology/RadiologyTab").then(m => m.RadiologyTab), { loading: () => <TabChunkSkeleton /> });
const DrugChart = dynamic(() => import("../nurse/DrugChart"), { loading: () => <TabChunkSkeleton /> });
const FluidBalanceChart = dynamic(() => import("../nurse/FluidBalanceChart"), { loading: () => <TabChunkSkeleton /> });
const DischargeNoteForm = dynamic(() => import("../doctor/DischargeNoteForm"), { loading: () => <TabChunkSkeleton /> });
const PaymentHistory = dynamic(() => import("./payment-history"), { loading: () => <TabChunkSkeleton /> });
const AppointmentComponent = dynamic(() => import("../front-desk/AppointmentComponent"), { loading: () => <TabChunkSkeleton /> });
const PatientDocumentsTab = dynamic(() => import("./patient-documents-tab"), { loading: () => <TabChunkSkeleton /> });
const QuickRoutePanel = dynamic(() => import("../doctor/QuickRoutePanel"), { loading: () => <TabChunkSkeleton /> });
const AllergiesTab = dynamic(() => import("./allergies-tab"), { loading: () => <TabChunkSkeleton /> });
const ImmunizationsTab = dynamic(() => import("./immunizations-tab"), { loading: () => <TabChunkSkeleton /> });
const TrendsTab = dynamic(() => import("./trends-tab"), { loading: () => <TabChunkSkeleton /> });
const GrowthTab = dynamic(() => import("./growth-tab"), { loading: () => <TabChunkSkeleton /> });
const SurgeryTab = dynamic(() => import("./surgery-tab"), { loading: () => <TabChunkSkeleton /> });
const ReferralsTab = dynamic(() => import("./referrals-tab"), { loading: () => <TabChunkSkeleton /> });
const ReconciliationTab = dynamic(() => import("./reconciliation-tab"), { loading: () => <TabChunkSkeleton /> });
const ConsentTab = dynamic(() => import("./consent-tab"), { loading: () => <TabChunkSkeleton /> });
const CertificatesTab = dynamic(() => import("./certificates-tab"), { loading: () => <TabChunkSkeleton /> });
const ExportTab = dynamic(() => import("./export-tab"), { loading: () => <TabChunkSkeleton /> });
const ImagingViewer = dynamic(() => import("./imaging-viewer"), { loading: () => <TabChunkSkeleton /> });
const PortalAccess = dynamic(() => import("./portal-access"), { loading: () => <TabChunkSkeleton /> });
const DrugSafetyCheck = dynamic(() => import("./drug-safety-check"), { loading: () => <TabChunkSkeleton /> });
const BreakGlass = dynamic(() => import("./break-glass"), { loading: () => <TabChunkSkeleton /> });

// ─── Types ────────────────────────────────────────────────────────────────────

type TabGroup = "nursing" | "doctor" | "billing" | "general";

type TabDef = {
  value: string;
  label: string;
  icon: React.ElementType;
  accent: string;
  activeBar: string;
  group: TabGroup;
  /** Extra search terms so staff can find a section by synonyms ("bp" → Vitals). */
  keywords?: string[];
};

const GROUP_LABELS: Record<TabGroup, string> = {
  nursing: "Nursing",
  doctor: "Doctor",
  billing: "Billing",
  general: "General",
};

// The role's own sections come first in the strip so the most-used tabs are
// immediately visible; all other groups keep their default order.
const DEFAULT_GROUP_ORDER: TabGroup[] = ["nursing", "doctor", "billing", "general"];
const ROLE_FIRST_GROUP: Partial<Record<string, TabGroup>> = {
  Doctor: "doctor",
  Nurse: "nursing",
  FrontDesk: "billing",
};

const BASE_TABS: TabDef[] = [
  { value: "vitals", label: "Vitals", icon: Activity, accent: "text-blue-600", activeBar: "bg-blue-500", group: "nursing", keywords: ["bp", "blood pressure", "pulse", "temperature", "spo2", "observations"] },
  { value: "consultations", label: "Consultations", icon: Stethoscope, accent: "text-red-600", activeBar: "bg-red-500", group: "doctor", keywords: ["notes", "assessment", "diagnosis", "complaint"] },
  { value: "prescriptions", label: "Prescriptions", icon: Pill, accent: "text-violet-600", activeBar: "bg-violet-500", group: "general", keywords: ["medication", "drugs", "rx", "pharmacy"] },
  { value: "lab", label: "Lab Results", icon: FlaskConical, accent: "text-indigo-600", activeBar: "bg-indigo-500", group: "general", keywords: ["tests", "blood", "pathology", "investigations"] },
  { value: "radiology", label: "Radiology", icon: Radio, accent: "text-cyan-600", activeBar: "bg-cyan-500", group: "general", keywords: ["x-ray", "ultrasound", "scan", "imaging"] },
];

// TEMPORARY: sections hidden from the patient-details tab strip (feature flags,
// not deletions — the panels and dynamic imports stay in place). To restore a
// section, remove its value from this set.
const TEMP_HIDDEN_TABS = new Set<string>([
  "allergies",
  "imaging",
  "exports",
  "certificates",
  "referrals",
  "reconciliation",
  "growth",
  "immunizations",
  "consent",
]);

const DISCHARGE_STATUSES = new Set([
  PatientStatus.UnderConsultation, PatientStatus.Admitted, PatientStatus.AwaitingPayment,
  "under-consultation", "admitted", "awaiting-payment",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    <div className="flex min-w-0 items-start gap-3 sm:items-center">
      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon size={17} className={color} />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-gray-900 leading-tight">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function NoPatient({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 sm:py-16 bg-white rounded-2xl border border-gray-100">
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
      <div className="flex items-center gap-2.5 px-4 py-3.5 sm:px-5 border-b border-gray-50">
        <div className={`w-1.5 h-4 rounded-full ${accent}`} />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      </div>
      <div className="p-3 sm:p-5">{children}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PatientDetailTabs({ patient }: { patient: Patient }) {
  const [tab, setTab] = useState("vitals");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Navigation UX state
  const [query, setQuery] = useState("");
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const consultationStore = useConsultationStore();
  const patientStore = usePatientStore();
  const dischargeStore = useDischargeStore();
  const formRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef<Partial<Record<TabGroup, HTMLDivElement | null>>>({});
  const lastPatientRef = useRef<string | null>(null);
  const { user } = useAuth();

  const role = normalizeUserRole(user?.role);
  const staffId = user?.$id ?? user?.id ?? "";
  const status = normalizeStatus(patient.status ?? patientStore.status);
  const canManageBilling = role === "FrontDesk" || role === "Admin";
  const canViewBilling = canManageBilling || role === "Doctor";
  // New clinical modules: who may author each record type.
  const canEditClinical = role === "Doctor" || role === "Nurse";
  const canEditFrontDesk = role === "FrontDesk" || role === "Admin";

  const { data: staff = [] } = useQuery({ queryKey: ["staffs"], queryFn: getAllStaffs });

  // Structured allergies — powers the alert badge on the Allergies tab chip.
  const { data: allergies = [] } = useAllergies(patient?.id ?? "");
  const activeAllergyCount = useMemo(
    () => allergies.filter((a) => a.status !== "resolved").length,
    [allergies]
  );
  const hasLegacyAllergy = hasActualAllergy((patient as any)?.allergies);

  const availableStaff = useMemo(() =>
    staff.filter((s: Staff) =>
      s.role && consultationStore.referredTo &&
      s.role.toLowerCase() === consultationStore.referredTo.toLowerCase()
    ),
    [staff, consultationStore.referredTo]
  );

  // A patient imported from paper may have no date of birth (nothing in a
  // bulk import is required). Report the age as unknown rather than NaN.
  const age = patient?.birth_date ? calculateAge(patient.birth_date) : undefined;

  // ── Role-conditional extra tabs ────────────────────────────────────────────
  const visibleTabs = useMemo(() => {
    const extra: TabDef[] = [];

    const conditionalDefs = [
      {
        // Drug chart — Nursing group; nurses can write, everyone else read-only
        value: "drug-chart", label: "Drug Chart", icon: Syringe,
        accent: "text-teal-600", activeBar: "bg-teal-500",
        group: "nursing" as TabGroup, keywords: ["mar", "administration", "doses"],
        show: true,
      },
      {
        // Fluid balance — Nursing group; nurses can write, everyone else read-only
        value: "fluid-balance", label: "Fluid Balance", icon: Droplets,
        accent: "text-sky-600", activeBar: "bg-sky-500",
        group: "nursing" as TabGroup, keywords: ["intake", "output", "iv fluids", "i/o"],
        show: true,
      },
      {
        // Discharge — Doctor group; only doctors see this tab at all
        value: "discharge", label: "Discharge", icon: ClipboardCheck,
        accent: "text-emerald-600", activeBar: "bg-emerald-500",
        group: "doctor" as TabGroup, keywords: ["summary", "release"],
        show: role === "Doctor" && DISCHARGE_STATUSES.has(status as PatientStatus),
      },
      {
        // Billing — its own group; visible to FrontDesk/Admin (who settle
        // payments) and Doctor (who needs visibility into payment status
        // before discharge). Not shown to Nurse / Lab / Radiology / Pharmacist.
        value: "billing", label: "Billing", icon: CreditCard,
        accent: "text-orange-600", activeBar: "bg-orange-500",
        group: "billing" as TabGroup, keywords: ["payments", "invoice", "charges", "hmo"],
        show: canViewBilling,
      },
      {
        // Appointments — General group, always visible to all roles
        value: "appointments", label: "Appointments", icon: Calendar,
        accent: "text-blue-600", activeBar: "bg-blue-500",
        group: "general" as TabGroup, keywords: ["booking", "schedule", "visits"],
        show: true,
      },
      {
        // Documents — General group; upload: FrontDesk/Admin; view: all roles
        value: "documents", label: "Documents", icon: FolderOpen,
        accent: "text-amber-600", activeBar: "bg-amber-500",
        group: "general" as TabGroup, keywords: ["files", "uploads", "attachments"],
        show: true,
      },
      {
        // Structured allergies — power the offline prescription safety check
        value: "allergies", label: "Allergies", icon: ShieldAlert,
        accent: "text-red-600", activeBar: "bg-red-500",
        group: "general" as TabGroup, keywords: ["allergy", "adr", "reactions", "sensitivity"],
        show: true,
      },
      {
        value: "immunizations", label: "Immunizations", icon: Syringe,
        accent: "text-teal-600", activeBar: "bg-teal-500",
        group: "nursing" as TabGroup, keywords: ["vaccines", "vaccination", "shots"],
        show: true,
      },
      {
        value: "trends", label: "Trends", icon: TrendingUp,
        accent: "text-emerald-600", activeBar: "bg-emerald-500",
        group: "nursing" as TabGroup, keywords: ["charts", "graphs", "longitudinal"],
        show: true,
      },
      {
        value: "growth", label: "Growth", icon: Ruler,
        accent: "text-pink-600", activeBar: "bg-pink-500",
        group: "nursing" as TabGroup, keywords: ["weight", "height", "bmi", "who", "percentile"],
        show: true,
      },
      {
        value: "surgery", label: "Surgery", icon: Scissors,
        accent: "text-rose-600", activeBar: "bg-rose-500",
        group: "doctor" as TabGroup, keywords: ["operation", "theatre", "ot", "procedure"],
        show: true,
      },
      {
        value: "referrals", label: "Referrals", icon: Send,
        accent: "text-indigo-600", activeBar: "bg-indigo-500",
        group: "doctor" as TabGroup, keywords: ["letters", "specialist", "external"],
        show: true,
      },
      {
        value: "reconciliation", label: "Med Rec", icon: ListChecks,
        accent: "text-violet-600", activeBar: "bg-violet-500",
        group: "nursing" as TabGroup, keywords: ["medication reconciliation", "meds", "admission"],
        show: true,
      },
      {
        value: "consent", label: "Consent", icon: FileSignature,
        accent: "text-emerald-600", activeBar: "bg-emerald-500",
        group: "billing" as TabGroup, keywords: ["forms", "authorization"],
        show: true,
      },
      {
        value: "certificates", label: "Certificates", icon: FileHeart,
        accent: "text-gray-600", activeBar: "bg-gray-500",
        group: "doctor" as TabGroup, keywords: ["birth", "death"],
        show: true,
      },
      {
        value: "imaging", label: "Imaging", icon: ImageIcon,
        accent: "text-cyan-600", activeBar: "bg-cyan-500",
        group: "general" as TabGroup, keywords: ["films", "scans", "viewer"],
        show: true,
      },
      {
        value: "exports", label: "Export", icon: FileDown,
        accent: "text-slate-600", activeBar: "bg-slate-500",
        group: "general" as TabGroup, keywords: ["fhir", "hl7", "csv", "download"],
        show: true,
      },
      {
        // Portal management — Front Desk / Admin only
        value: "portal", label: "Portal", icon: MonitorSmartphone,
        accent: "text-sky-600", activeBar: "bg-sky-500",
        group: "billing" as TabGroup, keywords: ["patient login", "self-service", "access"],
        show: role === "FrontDesk" || role === "Admin",
      },
    ] as const;

    for (const d of conditionalDefs) {
      if (d.show) extra.push({ value: d.value, label: d.label, icon: d.icon, accent: d.accent, activeBar: d.activeBar, group: d.group, keywords: d.keywords ? [...d.keywords] : undefined });
    }

    // Temporarily hide selected sections (see TEMP_HIDDEN_TABS above).
    return [...BASE_TABS, ...extra].filter((t) => !TEMP_HIDDEN_TABS.has(t.value));
  }, [role, status, canViewBilling]);

  // Group tabs by department for the segmented TabsList layout below.
  // Empty groups (e.g. "Doctor" for a non-doctor role with no visible
  // doctor-only tabs) are simply omitted — no empty section renders.
  // The active role's own group is promoted to the front of the strip.
  const groupedTabs = useMemo(() => {
    const roleFirst = ROLE_FIRST_GROUP[role];
    const order = roleFirst
      ? [roleFirst, ...DEFAULT_GROUP_ORDER.filter((g) => g !== roleFirst)]
      : DEFAULT_GROUP_ORDER;
    return order
      .map(group => ({ group, tabs: visibleTabs.filter(t => t.group === group) }))
      .filter(g => g.tabs.length > 0);
  }, [visibleTabs, role]);

  // Search filter applied on top of role visibility.
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groupedTabs;
    return groupedTabs
      .map(g => ({
        ...g,
        tabs: g.tabs.filter(t =>
          `${t.label} ${t.keywords?.join(" ") ?? ""}`.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.tabs.length > 0);
  }, [groupedTabs, query]);

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

  // FIX: Extract openForm as a stable reference before using it as a dependency.
  // Passing the entire `dischargeStore` object caused an infinite render loop
  // because Zustand returns a new object reference on every store update,
  // which triggered the effect continuously. The action functions themselves
  // (like openForm) are stable and safe to use as dependencies.
  const openDischargeForm = dischargeStore.openForm;
  useEffect(() => {
    if (tab === "discharge" && patient.id) openDischargeForm(patient.id);
  }, [tab, patient.id, openDischargeForm]);

  // Deep-link: /front-desk/patient/[id]?tab=lab (or billing, consultations…)
  // opens that section directly — used by dashboard quick actions.
  // Also restores the last section the staff member was viewing for this
  // patient (per-patient memory, session only).
  useEffect(() => {
    if (typeof window === "undefined" || !patient.id) return;
    if (lastPatientRef.current === patient.id) return;
    lastPatientRef.current = patient.id;

    const params = new URLSearchParams(window.location.search);
    const requested = params.get("tab");
    if (requested && visibleTabs.some((t) => t.value === requested)) {
      setTab(requested);
      return;
    }
    try {
      const saved = sessionStorage.getItem(`emr:last-tab:${patient.id}`);
      if (saved && visibleTabs.some((t) => t.value === saved)) setTab(saved);
    } catch { /* storage unavailable */ }
  }, [patient.id, visibleTabs]);

  // Remember the section per patient (session only — no PHI persisted).
  useEffect(() => {
    if (!patient.id) return;
    try { sessionStorage.setItem(`emr:last-tab:${patient.id}`, tab); } catch { /* ignore */ }
  }, [patient.id, tab]);

  // Allergy banner deep-link: scrolls/opens the Allergies tab.
  // No-op while the Allergies section is temporarily hidden.
  useEffect(() => {
    const open = () => {
      if (!TEMP_HIDDEN_TABS.has("allergies")) setTab("allergies");
    };
    window.addEventListener("emr:open-allergies", open);
    return () => window.removeEventListener("emr:open-allergies", open);
  }, []);

  useEffect(() => {
    if (!visibleTabs.some(t => t.value === tab)) setTab("vitals");
  }, [visibleTabs, tab]);

  useEffect(() => {
    if (formError) { const t = setTimeout(() => setFormError(null), 5000); return () => clearTimeout(t); }
  }, [formError]);

  useEffect(() => {
    if (successMessage) { const t = setTimeout(() => setSuccessMessage(null), 4000); return () => clearTimeout(t); }
  }, [successMessage]);

  // ── Strip scroll state (arrows + edge fades) ──────────────────────────────
  const updateArrows = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = stripRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    window.addEventListener("resize", updateArrows);
    return () => { ro.disconnect(); window.removeEventListener("resize", updateArrows); };
  }, [updateArrows, groupedTabs, filteredGroups]);

  // Keep the active chip in view whenever the section changes.
  useEffect(() => {
    const el = stripRef.current?.querySelector(`[data-tab-value="${tab}"]`);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [tab]);

  const scrollStrip = (dir: "left" | "right") => {
    stripRef.current?.scrollBy({ left: dir === "right" ? 260 : -260, behavior: "smooth" });
  };

  const jumpToGroup = (group: TabGroup) => {
    groupRefs.current[group]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };

  // Switch tab + bring the panel into view below the sticky header.
  const handleTabChange = useCallback((value: string) => {
    setTab(value);
    requestAnimationFrame(() => {
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  // Home/End shortcuts jump to the first/last section in the strip.
  const handleListKeyDown = (e: React.KeyboardEvent) => {
    const first = filteredGroups[0]?.tabs[0]?.value;
    const lastGroup = filteredGroups[filteredGroups.length - 1];
    const last = lastGroup?.tabs[lastGroup.tabs.length - 1]?.value;
    if (e.key === "Home" && first) { e.preventDefault(); handleTabChange(first); }
    if (e.key === "End" && last) { e.preventDefault(); handleTabChange(last); }
  };

  const billingReadOnly = !canManageBilling;
  const allergyBadgeCount = activeAllergyCount || (hasLegacyAllergy ? "!" : 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="min-w-0 w-full">
      {patient.id && (
        <div className="flex justify-end">
          <BreakGlass patientId={patient.id} />
        </div>
      )}

      {/* ── Sticky navigation header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 -mx-0.5 rounded-b-2xl bg-slate-50/95 px-0.5 pb-2 pt-1 backdrop-blur-md">
        {/* Toolbar: search + group jump pills */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[170px] flex-1 sm:w-72 sm:flex-none">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sections — e.g. bp, notes, bill…"
              aria-label="Search patient record sections"
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-8 text-xs font-semibold text-gray-700 shadow-sm outline-none placeholder:font-medium placeholder:text-gray-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Group jump pills (desktop) */}
          <div className="ml-auto hidden max-w-[360px] items-center gap-1.5 overflow-x-auto scrollbar-hide md:flex">
            {groupedTabs.map(({ group, tabs: gtabs }) => (
              <button
                key={group}
                type="button"
                onClick={() => jumpToGroup(group)}
                title={`Jump to ${GROUP_LABELS[group]} sections`}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-bold text-gray-500 shadow-sm transition-colors hover:border-gray-300 hover:text-gray-800"
              >
                {GROUP_LABELS[group]}
                <span className="rounded-full bg-gray-100 px-1.5 py-px text-[9px] font-black text-gray-400">{gtabs.length}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab strip with arrows + edge fades */}
        <div className="relative">
          {canLeft && (
            <button
              type="button"
              aria-label="Scroll sections left"
              onClick={() => scrollStrip("left")}
              className="absolute -left-0.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-md transition-colors hover:text-gray-800"
            >
              <ChevronLeft size={15} />
            </button>
          )}
          {canRight && (
            <button
              type="button"
              aria-label="Scroll sections right"
              onClick={() => scrollStrip("right")}
              className="absolute -right-0.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-md transition-colors hover:text-gray-800"
            >
              <ChevronRight size={15} />
            </button>
          )}
          <div aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 left-0 z-[5] w-6 bg-gradient-to-r from-slate-50 to-transparent transition-opacity ${canLeft ? "opacity-100" : "opacity-0"}`}
          />
          <div aria-hidden="true"
            className={`pointer-events-none absolute inset-y-0 right-0 z-[5] w-6 bg-gradient-to-l from-slate-50 to-transparent transition-opacity ${canRight ? "opacity-100" : "opacity-0"}`}
          />

          <div
            ref={stripRef}
            onScroll={updateArrows}
            className="scrollbar-hide max-w-full snap-x overflow-x-auto overscroll-x-contain rounded-2xl border border-gray-100 bg-white/80 p-1.5 shadow-sm"
          >
            <TabsList
              aria-label="Patient record sections"
              onKeyDown={handleListKeyDown}
              className="inline-flex h-auto min-w-max flex-nowrap items-stretch justify-start gap-1 bg-transparent p-0 shadow-none"
            >
              {filteredGroups.map(({ group, tabs }, groupIdx) => (
                <Fragment key={group}>
                  <div
                    ref={(el) => { groupRefs.current[group] = el; }}
                    className="flex shrink-0 flex-col gap-1 rounded-xl bg-gray-50/60 p-1"
                  >
                    <p className="px-1 text-[9px] font-black uppercase tracking-widest text-gray-400">
                      {GROUP_LABELS[group]}
                    </p>
                    <div className="flex flex-nowrap gap-1">
                      {tabs.map(({ value, label, icon: Icon, accent, activeBar }) => {
                        const isActive = tab === value;
                        const allergyBadge = value === "allergies" && allergyBadgeCount ? allergyBadgeCount : null;
                        return (
                          <TabsTrigger
                            key={value}
                            value={value}
                            data-tab-value={value}
                            className={`relative min-h-10 snap-start gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-all duration-200 ${
                              isActive
                                ? `border-gray-200 bg-white shadow-sm ${accent}`
                                : "border-transparent bg-transparent text-gray-500 hover:border-gray-100 hover:bg-white hover:text-gray-700"
                            }`}
                          >
                            {isActive && <span className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${activeBar}`} />}
                            <Icon size={14} className="shrink-0" />
                            <span>{label}</span>
                            {allergyBadge !== null && (
                              <span className="ml-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 py-px text-[9px] font-black text-white shadow-sm"
                                aria-label={`${allergyBadge === "!" ? "allergy on record" : `${allergyBadge} active allergies`}`}>
                                {allergyBadge}
                              </span>
                            )}
                          </TabsTrigger>
                        );
                      })}
                    </div>
                  </div>
                  {groupIdx < filteredGroups.length - 1 && (
                    <div aria-hidden="true" className="mx-1.5 w-px shrink-0 self-stretch bg-gray-100" />
                  )}
                </Fragment>
              ))}
            </TabsList>
          </div>

          {filteredGroups.length === 0 && query && (
            <p className="mt-2 rounded-xl border border-dashed border-gray-200 bg-white px-3 py-2 text-center text-xs text-gray-400">
              No sections match “{query}”.
            </p>
          )}
        </div>
      </div>

      {/* ── Panels ── */}
      <div ref={contentRef} className="scroll-mt-36 space-y-5 pt-5">
        {/* ── Vitals ── */}
        <TabsContent value="vitals" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
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
        <TabsContent value="consultations" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
          <div className="space-y-5">
            <SectionHeader icon={Stethoscope} color="text-red-600" bg="bg-red-50"
              title="Consultations" subtitle="Clinical findings and patient routing" />
            {(role === "Doctor" || role === "Admin") && patient?.id && (
              <Panel accent="bg-indigo-500" label="Quick Route — no consultation needed">
                <QuickRoutePanel patient={patient} />
              </Panel>
            )}
            {role === "Doctor" && patient?.id && (
              <Panel accent="bg-red-500" label="New Consultation">
                <div ref={formRef}>
                  {formError && <AlertBanner type="error" message={formError} />}
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
        <TabsContent value="prescriptions" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
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
            <DrugSafetyCheck patientId={patient.id} />
          </div>
        </TabsContent>

        {/* ── Lab ── */}
        <TabsContent value="lab" className="mt-0 min-w-0 animate-in fade-in-0 duration-150"><LabTab patient={patient} userRole={user?.role} /></TabsContent>
        <TabsContent value="radiology" className="mt-0 min-w-0 animate-in fade-in-0 duration-150"><RadiologyTab patient={patient} userRole={user?.role} /></TabsContent>

        {patient.id && (
          <>
            {/* ── Nurse charts ── */}
            <TabsContent value="drug-chart" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
              <DrugChart patientId={patient.id} staffId={staffId} readOnly={role !== "Nurse"} />
            </TabsContent>
            <TabsContent value="fluid-balance" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
              <FluidBalanceChart patientId={patient.id} staffId={staffId} readOnly={role !== "Nurse"} />
            </TabsContent>

            {/* ── Discharge ── */}
            <TabsContent value="discharge" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
              <div className="space-y-4">
                <SectionHeader icon={ClipboardCheck} color="text-emerald-600" bg="bg-emerald-50"
                  title="Discharge Summary" subtitle="Complete before sending patient to billing" />
                <DischargeNoteForm staffId={staffId} embedded
                  onSuccess={() => setSuccessMessage("Discharge note saved successfully.")} />
              </div>
            </TabsContent>

            {/* ── Billing ── */}
            <TabsContent value="billing" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
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
                  patient={patient}
                  readOnly={billingReadOnly}
                  cashierId={staffId}
                />
              </div>
            </TabsContent>

            {/* ── Appointments — all roles, patient-scoped ── */}
            <TabsContent value="appointments" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
              <AppointmentComponent
                staffId={staffId}
                patientId={patient.id}
                inPatientContext
                canManage={canManageBilling}
              />
            </TabsContent>

            {/* ── Documents — upload: FrontDesk/Admin; view: all roles ── */}
            <TabsContent value="documents" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
              <PatientDocumentsTab
                patientId={patient.id}
                staffId={staffId}
                canUpload={canManageBilling}
              />
            </TabsContent>

            {/* ── Structured allergies (powers prescription safety checks) ── */}
            <TabsContent value="allergies" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
              <div className="space-y-4">
                <SectionHeader icon={ShieldAlert} color="text-red-600" bg="bg-red-50"
                  title="Allergies" subtitle="Structured allergy list — checked automatically against new prescriptions" />
                <AllergiesTab patientId={patient.id} canEdit={canEditClinical || canEditFrontDesk} />
              </div>
            </TabsContent>

            {/* ── Immunizations ── */}
            <TabsContent value="immunizations" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
              <div className="space-y-4">
                <SectionHeader icon={Syringe} color="text-teal-600" bg="bg-teal-50"
                  title="Immunization Record" subtitle="Vaccination history with dose tracking and next-due dates" />
                <ImmunizationsTab patientId={patient.id} canEdit={canEditClinical} />
              </div>
            </TabsContent>

            {/* ── Vitals & lab trends ── */}
            <TabsContent value="trends" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
              <div className="space-y-4">
                <SectionHeader icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-50"
                  title="Trends" subtitle="Longitudinal charts for vitals and numeric lab results" />
                <TrendsTab patientId={patient.id} />
              </div>
            </TabsContent>

            {/* ── Growth charts ── */}
            <TabsContent value="growth" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
              <div className="space-y-4">
                <SectionHeader icon={Ruler} color="text-pink-600" bg="bg-pink-50"
                  title="Growth Charts (WHO)" subtitle="Weight / height / BMI percentiles for children 0–60 months" />
                <GrowthTab patient={patient} />
              </div>
            </TabsContent>

            {/* ── Surgery / OT ── */}
            <TabsContent value="surgery" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
              <div className="space-y-4">
                <SectionHeader icon={Scissors} color="text-rose-600" bg="bg-rose-50"
                  title="Surgery & Theatre" subtitle="Scheduling, status flow and operation notes" />
                <SurgeryTab patientId={patient.id} staffId={staffId} canEdit={role === "Doctor" || role === "Admin"} />
              </div>
            </TabsContent>

            {/* ── Referrals ── */}
            <TabsContent value="referrals" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
              <div className="space-y-4">
                <SectionHeader icon={Send} color="text-indigo-600" bg="bg-indigo-50"
                  title="Referrals" subtitle="External referrals with printable referral letters" />
                <ReferralsTab patient={patient} canEdit={role === "Doctor" || role === "Admin"} />
              </div>
            </TabsContent>

            {/* ── Medication reconciliation ── */}
            <TabsContent value="reconciliation" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
              <div className="space-y-4">
                <SectionHeader icon={ListChecks} color="text-violet-600" bg="bg-violet-50"
                  title="Medication Reconciliation" subtitle="Compare and reconcile meds at admission, transfer and discharge" />
                <ReconciliationTab patientId={patient.id} canEdit={canEditClinical || role === "Pharmacist"} />
              </div>
            </TabsContent>

            {/* ── Consent management ── */}
            <TabsContent value="consent" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
              <div className="space-y-4">
                <SectionHeader icon={FileSignature} color="text-emerald-600" bg="bg-emerald-50"
                  title="Consent Management" subtitle="Versioned consent records with printable forms" />
                <ConsentTab patient={patient} canEdit={canEditFrontDesk} />
              </div>
            </TabsContent>

            {/* ── Death / birth certificates ── */}
            <TabsContent value="certificates" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
              <div className="space-y-4">
                <SectionHeader icon={FileHeart} color="text-gray-600" bg="bg-gray-50"
                  title="Certificates" subtitle="Death and birth certificates with printable drafts" />
                <CertificatesTab patient={patient} canEdit={role === "Doctor" || role === "Nurse" || canEditFrontDesk} role={role} />
              </div>
            </TabsContent>

            {/* ── Imaging viewer ── */}
            <TabsContent value="imaging" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
              <div className="space-y-4">
                <SectionHeader icon={ImageIcon} color="text-cyan-600" bg="bg-cyan-50"
                  title="Imaging" subtitle="Study browser and zoomable viewer for attached films / scans" />
                <ImagingViewer patientId={patient.id} />
              </div>
            </TabsContent>

            {/* ── Interop exports ── */}
            <TabsContent value="exports" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
              <div className="space-y-4">
                <SectionHeader icon={FileDown} color="text-slate-600" bg="bg-slate-50"
                  title="Record Export" subtitle="FHIR R4 / HL7 v2 / CSV exports of this patient's record" />
                <ExportTab patientId={patient.id} />
              </div>
            </TabsContent>

            {/* ── Patient portal management ── */}
            {canEditFrontDesk && (
              <TabsContent value="portal" className="mt-0 min-w-0 animate-in fade-in-0 duration-150">
                <div className="space-y-4">
                  <SectionHeader icon={MonitorSmartphone} color="text-sky-600" bg="bg-sky-50"
                    title="Patient Portal" subtitle="Enable the patient's self-service login to their own records" />
                  <PortalAccess patient={patient} />
                </div>
              </TabsContent>
            )}
          </>
        )}
      </div>
    </Tabs>
  );
}
