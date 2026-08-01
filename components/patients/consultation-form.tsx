"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useConsultationStore, RequestPriority, PrescriptionItem, ConsultationStore } from "@/store/consultation-store";
import { useAuth } from "@/context/auth-provider";
import { PatientStatus } from "@/types/models";
import { Staff } from "@/actions/staff/types";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
    useCreateConsultation, useUpdatePatientStatus,
    useCreateLabRequest, useCreateRadiologyRequest,
    useActiveLabTests, useCreatePrescription, useDrugInventory,
} from "@/hooks/emr/use-emr";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { createAdmission } from "@/lib/services/admission.service";
import {
    Stethoscope, ClipboardList, Pill, ArrowRight, Loader2, CheckCircle2, Check,
    ChevronRight, FlaskConical, UserCog, Baby, User, Heart, Brain,
    Activity, FileText, Zap, Radio, ChevronDown,
    Building2, Plus, Trash2, Search,
} from "lucide-react";

const AIClinicalAssistant = dynamic(
    () => import("@/components/ai/AIClinicalAssistant"),
    { loading: () => <div className="animate-pulse h-32 bg-gray-50 rounded-2xl" /> }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    patientId: string;
    availableStaff: Staff[];
    onSuccess?: () => void;
    patientAge?: number;
    patientGender?: string;
    patientMedicalHistory?:string;
    patientAllergies?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Obstetric calculations (Naegele's rule) ─────────────────────────────────

function calcEDD(lmpDate: string): string {
    if (!lmpDate) return "";
    const lmp = new Date(lmpDate);
    if (isNaN(lmp.getTime())) return "";
    const edd = new Date(lmp.getTime() + 280 * 86_400_000); // LMP + 280 days
    return edd.toISOString().split("T")[0];
}

function calcEGA(lmpDate: string): string {
    if (!lmpDate) return "";
    const lmp = new Date(lmpDate);
    if (isNaN(lmp.getTime())) return "";
    const days = Math.floor((Date.now() - lmp.getTime()) / 86_400_000);
    if (days < 0) return "";
    const weeks = Math.floor(days / 7);
    const rem = days % 7;
    return rem === 0 ? `${weeks} weeks` : `${weeks} weeks + ${rem} day${rem > 1 ? "s" : ""}`;
}

const isPaed = (age?: number) => age !== undefined && age <= 12;
const isFemale = (gender?: string) => ["female", "f"].includes((gender ?? "").toLowerCase());

const REFERRAL_OPTIONS = [
    {
        value: "nurse",
        label: "Nurse",
        desc: "Post-consultation nursing care",
        icon: UserCog,
        status:"sent-to-nurse" as PatientStatus,
        color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-400",
    },
    {
        value: "lab-tech",
        label: "Lab Technician",
        desc: "Request laboratory investigations",
        icon: FlaskConical,
        status:"sent-to-lab" as PatientStatus,
        color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-400",
    },
    {
        value: "radiology",
        label: "Radiology",
        desc: "Imaging investigations",
        icon: Radio,
        status:"sent-to-radiology" as PatientStatus,
        color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-400",
    },
    {
        value: "pharmacist",
        label: "Pharmacist",
        desc: "Prescribe & dispense medications",
        icon: Pill,
        status:"sent-to-pharmacy" as PatientStatus,
        color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-400",
    },
    {
        value: "front-desk",
        label: "Front Desk",
        desc: "Admission / ward / surgery",
        icon: Building2,
        status:"admitted" as PatientStatus,
        color: "text-slate-700", bg: "bg-slate-100", border: "border-slate-400",
    },
] as const;

const PATIENT_STATUSES = [
    { value: "sent-to-nurse", label: "Sent to Nurse" },
    { value: "sent-to-lab", label: "Sent to Lab" },
    { value: "sent-to-pharmacy", label: "Sent to Pharmacy" },
    { value: "sent-to-radiology", label: "Sent to Radiology" },
    { value: "under-observation", label: "Under Observation" },
    { value: "admitted", label: "Admitted" },
    { value: "discharged", label: "Discharged" },
];

const FREQUENCIES = ["OD", "BD", "TDS", "QDS", "PRN", "STAT", "nocte", "mane"];

// ─── Shared UI ────────────────────────────────────────────────────────────────

const inputCls = "w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400 focus:bg-white transition-all";

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
            {children}{required && <span className="text-red-500 ml-0.5">*</span>}
        </p>
    );
}

function Section({ id, icon: Icon, title, badge, color = "text-red-600", bg = "bg-red-50", defaultOpen = false, children }: {
    id: string; icon: React.ElementType; title: string; badge?: string;
    color?: string; bg?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div id={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button type="button" onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50/60 transition-colors text-left">
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                    <Icon size={15} className={color} />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{title}</p>
                    {badge && <p className="text-[10px] text-gray-400 mt-0.5 font-bold uppercase tracking-widest">{badge}</p>}
                </div>
                {open ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
            </button>
            {open && (
                <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">{children}</div>
            )}
        </div>
    );
}

function MultiSelect({ options, selected, onChange, placeholder }: {
    options: string[]; selected: string[]; onChange: (s: string[]) => void; placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter(i => i !== v) : [...selected, v]);
    return (
        <div className="relative w-full">
            <button type="button" onClick={() => setOpen(v => !v)}
                className="w-full h-10 px-3 flex justify-between items-center rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400 transition-all">
                <span className={selected.length === 0 ? "text-gray-400" : "text-gray-900 truncate"}>
                    {selected.length === 0 ? placeholder : selected.join(", ")}
                </span>
                <ChevronDown size={16} className="text-gray-400 ml-2 shrink-0" />
            </button>
            {open && (
                <div className="absolute z-30 mt-1 left-0 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    <ul className="p-2 space-y-1">
                        {options.map(opt => (
                            <li key={opt} onClick={() => toggle(opt)}
                                className={cn("flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-50", selected.includes(opt) ? "bg-gray-100 font-semibold" : "")}>
                                <Checkbox className="w-4 h-4" checked={selected.includes(opt)} tabIndex={-1} aria-label="checkbox" />
                                <span className="text-sm">{opt}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ─── Admission panel ──────────────────────────────────────────────────────────

function AdmissionPanel({ store }: { store: ConsultationStore }) {
    return (
        <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/40 p-4 space-y-4">
            <div className="flex items-center gap-2">
                <Building2 size={13} className="text-slate-600" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Admission Details</p>
            </div>

            {/* Admission type + urgency */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <FieldLabel required>Admission Type</FieldLabel>
                    <Select value={store.admissionType} onValueChange={v => store.setField("admissionType", v as any)}>
                        <SelectTrigger className="h-10 text-sm bg-white border-gray-200 rounded-xl">
                            <SelectValue placeholder="Select type…" />
                        </SelectTrigger>
                        <SelectContent className="bg-white shadow-xl rounded-xl">
                            <SelectItem value="ward">🛏 Ward Admission</SelectItem>
                            <SelectItem value="surgical">🔪 Surgical Admission</SelectItem>
                            <SelectItem value="icu">🚨 ICU / High Dependency</SelectItem>
                            <SelectItem value="maternity">🤱 Maternity Ward</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <FieldLabel required>Urgency</FieldLabel>
                    <Select value={store.admissionUrgency} onValueChange={v => store.setField("admissionUrgency", v as any)}>
                        <SelectTrigger className="h-10 text-sm bg-white border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-white shadow-xl rounded-xl">
                            <SelectItem value="routine">Routine</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Target ward */}
            <div className="space-y-1.5">
                <FieldLabel>Target Ward / Unit</FieldLabel>
                <input value={store.admissionWard} onChange={e => store.setField("admissionWard", e.target.value)}
                    placeholder="e.g. Maternity Ward B, Paediatric Ward, Surgical Ward…" className={inputCls} />
            </div>

            {/* Clinical indication */}
            <div className="space-y-1.5">
                <FieldLabel required>Clinical Indication for Admission</FieldLabel>
                <Textarea rows={3} value={store.admissionIndication}
                    onChange={e => store.setField("admissionIndication", e.target.value)}
                    placeholder="Reason the patient requires admission — diagnosis, expected procedure, clinical status…"
                    className="text-sm border-gray-200 bg-white rounded-xl resize-none placeholder:text-gray-300 focus:border-slate-400" />
            </div>

            {/* Notes for ward staff */}
            <div className="space-y-1.5">
                <FieldLabel>Special Instructions for Ward / Front Desk</FieldLabel>
                <Textarea rows={2} value={store.admissionNotes}
                    onChange={e => store.setField("admissionNotes", e.target.value)}
                    placeholder="Allergies to note, isolation precautions, mobility restrictions, nil by mouth…"
                    className="text-sm border-gray-200 bg-white rounded-xl resize-none placeholder:text-gray-300 focus:border-slate-400" />
            </div>

            {/* Status preview */}
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-100 border border-slate-200">
                <CheckCircle2 size={13} className="text-slate-600 shrink-0" />
                <p className="text-xs text-slate-700 font-medium">
                    Patient status will be set to <span className="font-bold">Admitted</span>.
                    Front desk will be notified to assign a bed.
                </p>
            </div>
        </div>
    );
}

// ─── Doctor prescription panel ────────────────────────────────────────────────

function DoctorPrescriptionPanel({ store }: { store: ConsultationStore }) {
    const { data: inventory = [] } = useDrugInventory();
    const [queries, setQueries] = useState<Record<string, string>>({});
    const [openId, setOpenId] = useState<string | null>(null);

    function getFiltered(id: string) {
        const q = (queries[id] ?? "").toLowerCase();
        if (!q) return (inventory as any[]).slice(0, 6);
        return (inventory as any[]).filter((d: any) =>
            d.drug_name?.toLowerCase().includes(q) ||
            (d.generic_name ?? "").toLowerCase().includes(q)
        ).slice(0, 8);
    }

    return (
        <div className="rounded-2xl border-2 border-pink-200 bg-pink-50/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Pill size={13} className="text-pink-600" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-pink-600">Prescriptions</p>
                </div>
                <button type="button" onClick={store.addPrescriptionItem}
                    className="flex items-center gap-1 text-xs text-pink-600 font-semibold hover:underline">
                    <Plus size={12} /> Add drug
                </button>
            </div>

            {store.prescriptionItems.length === 0 && (
                <button type="button" onClick={store.addPrescriptionItem}
                    className="w-full py-4 rounded-xl border-2 border-dashed border-pink-200 text-xs text-pink-400 font-semibold hover:border-pink-300 hover:bg-pink-50/50 transition-all flex items-center justify-center gap-2">
                    <Plus size={13} /> Add first prescription
                </button>
            )}

            {store.prescriptionItems.map((item, idx) => (
                <div key={item.id} className="bg-white rounded-xl border border-pink-100 p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-pink-500">
                            {item.drugName || `Drug ${idx + 1}`}
                        </p>
                        <button type="button" onClick={() => store.removePrescriptionItem(item.id)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={11} />
                        </button>
                    </div>

                    {/* Drug name with autocomplete */}
                    <div className="relative">
                        <div className="relative">
                            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                                value={queries[item.id] ?? item.drugName}
                                onChange={e => {
                                    setQueries(q => ({ ...q, [item.id]: e.target.value }));
                                    store.updatePrescriptionItem(item.id, "drugName", e.target.value);
                                    setOpenId(item.id);
                                }}
                                onFocus={() => setOpenId(item.id)}
                                placeholder="Search drug name…"
                                className="w-full h-8 pl-8 pr-3 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-pink-300 focus:border-pink-300"
                            />
                        </div>
                        {openId === item.id && getFiltered(item.id).length > 0 && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                                {getFiltered(item.id).map((drug: any) => (
                                    <button key={drug.id} type="button"
                                        onClick={() => {
                                            store.updatePrescriptionItem(item.id, "drugName", drug.drug_name);
                                            setQueries(q => ({ ...q, [item.id]: drug.drug_name }));
                                            setOpenId(null);
                                        }}
                                        className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-pink-50 text-sm">
                                        <div className="w-6 h-6 rounded-lg bg-pink-50 flex items-center justify-center text-[10px] font-bold text-pink-600 shrink-0">
                                            {drug.drug_name[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{drug.drug_name}</p>
                                            {drug.generic_name && <p className="text-[10px] text-gray-400 truncate">{drug.generic_name}</p>}
                                        </div>
                                        <span className="text-[10px] text-gray-400 shrink-0">{drug.quantity} left</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Dosage + Frequency + Duration */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Dosage *</p>
                            <input value={item.dosage}
                                onChange={e => store.updatePrescriptionItem(item.id, "dosage", e.target.value)}
                                placeholder="e.g. 500mg"
                                className="w-full h-8 px-2 rounded-lg border border-gray-200 bg-gray-50 text-xs focus:outline-none focus:ring-1 focus:ring-pink-300" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Frequency</p>
                            <select value={item.frequency}
                                onChange={e => store.updatePrescriptionItem(item.id, "frequency", e.target.value)}
                                className="w-full h-8 px-2 rounded-lg border border-gray-200 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-pink-300">
                                {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Duration</p>
                            <input value={item.duration}
                                onChange={e => store.updatePrescriptionItem(item.id, "duration", e.target.value)}
                                placeholder="e.g. 5 days"
                                className="w-full h-8 px-2 rounded-lg border border-gray-200 bg-gray-50 text-xs focus:outline-none focus:ring-1 focus:ring-pink-300" />
                        </div>
                    </div>

                    {/* Notes */}
                    <input value={item.notes}
                        onChange={e => store.updatePrescriptionItem(item.id, "notes", e.target.value)}
                        placeholder="Instructions (e.g. Take after meals, avoid alcohol)"
                        className="w-full h-8 px-3 rounded-lg border border-gray-200 bg-gray-50 text-xs focus:outline-none focus:ring-1 focus:ring-pink-300" />
                </div>
            ))}

            {store.prescriptionItems.length > 0 && (
                <p className="text-[10px] text-pink-600 bg-pink-50 rounded-xl px-3 py-2 border border-pink-100">
                    {store.prescriptionItems.length} drug{store.prescriptionItems.length > 1 ? "s" : ""} will be sent to the pharmacist on submit.
                    The pharmacist will confirm dispensing and collect payment.
                </p>
            )}
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ConsultationForm({
    patientId, availableStaff, onSuccess,
    patientAge, patientGender, patientMedicalHistory, patientAllergies,
}: Props) {
    const { user } = useAuth();

    const { mutate: createConsultation, isPending: cLoading } = useCreateConsultation();
    const { mutate: updateStatus } = useUpdatePatientStatus();
    const { mutateAsync: createLabRequestAsync, isPending: lLoading } = useCreateLabRequest();
    const { mutateAsync: createRadRequestAsync, isPending: rLoading } = useCreateRadiologyRequest();
    const { mutateAsync: createPrescriptionAsync } = useCreatePrescription();
    const { data: labCatalog } = useActiveLabTests();

    const [admissionSaving, setAdmissionSaving] = useState(false);
    const loading = cLoading || lLoading || rLoading || admissionSaving;
    const isChild = isPaed(patientAge);
    const isFem = isFemale(patientGender);

    const LAB_TESTS: string[] = useMemo(() => {
        if (!labCatalog) return [];
        return Object.values(labCatalog).flat()
            .filter(t => !["radiology","x-ray","ct","mri","ultrasound"].some(k =>
                t.category?.toLowerCase().includes(k) || t.test_name?.toLowerCase().includes(k)))
            .map(t => t.test_name);
    }, [labCatalog]);

    const RADIOLOGY_TESTS: string[] = useMemo(() => {
        if (!labCatalog) return [];
        return Object.values(labCatalog).flat()
            .filter(t => ["radiology","x-ray","ct","mri","ultrasound"].some(k =>
                t.category?.toLowerCase().includes(k) || t.test_name?.toLowerCase().includes(k)))
            .map(t => t.test_name);
    }, [labCatalog]);

    const store = useConsultationStore();
    const {
        presentingComplaint, symptomsAnalysis, aetiology, historyComplications, historyTreatment,
        antenatalHistory, nutritionalHistory, developmentalMilestones, immunisationHistory,
        pastMedicalHistory, drugHistory, familySocialHistory,
        imp, lmp, ega, eod, gravidity, parity,
        generalExam, respiratory, cardiovascular, gastrointestinal,
        summary, assessment, investigations, prescriptions, recommendations,
        referredTo, statusOverride,
        labTestType, labPriority, labNotes,
        radTestType, radPriority, radNotes,
        setField, resetForm,
    } = store;

    useEffect(() => {
        if (patientMedicalHistory && !pastMedicalHistory) setField("pastMedicalHistory", patientMedicalHistory);
    }, [patientMedicalHistory]);

    const referralOption = REFERRAL_OPTIONS.find(r => r.value === referredTo);
    const nextStatusLabel = referralOption?.label ?? "Nurse";
    const nextStatus = referralOption?.status ?? ("sent-to-nurse" as PatientStatus);

    const buildSymptoms = () => [
        `Presenting Complaint:\n${presentingComplaint}`,
        symptomsAnalysis ? `Analysis of Symptoms:\n${symptomsAnalysis}` : "",
        aetiology ? `Aetiology/Cause:\n${aetiology}` : "",
        historyComplications ? `History of Complications:\n${historyComplications}` : "",
        historyTreatment ? `History of Treatment:\n${historyTreatment}` : "",
        isChild && antenatalHistory ? `Antenatal/Delivery History:\n${antenatalHistory}` : "",
        isChild && nutritionalHistory ? `Nutritional History:\n${nutritionalHistory}` : "",
        isChild && developmentalMilestones ? `Developmental Milestones:\n${developmentalMilestones}` : "",
        isChild && immunisationHistory ? `Immunisation History:\n${immunisationHistory}` : "",
        pastMedicalHistory ? `Past Medical & Surgical History:\n${pastMedicalHistory}` : "",
        drugHistory ? `Drug History:\n${drugHistory}` : "",
        familySocialHistory ? `Family & Social History:\n${familySocialHistory}` : "",
        isFem && imp ? `IMP: ${imp}` : "",
        isFem && lmp ? `LMP: ${lmp}` : "",
        isFem && ega ? `EGA: ${ega} weeks` : "",
        isFem && eod ? `EOD: ${eod}` : "",
        isFem && gravidity ? `Gravidity: G${gravidity}` : "",
        isFem && parity ? `Parity: P${parity}` : "",
    ].filter(Boolean).join("\n\n");

    const buildDiagnosis = () => [
        generalExam ? `General Examination:\n${generalExam}` : "",
        respiratory ? `Respiratory System:\n${respiratory}` : "",
        cardiovascular ? `Cardiovascular System:\n${cardiovascular}` : "",
        gastrointestinal? `GI System:\n${gastrointestinal}` : "",
        summary ? `Summary:\n${summary}` : "",
    ].filter(Boolean).join("\n\n");

    const buildRecommendations = () => [
        assessment ? `Assessment:\n${assessment}` : "",
        investigations ? `Investigations:\n${investigations}` : "",
        recommendations ? `Recommendations:\n${recommendations}` : "",
        referredTo === "front-desk" && store.admissionIndication
            ? `Admission Indication:\n${store.admissionIndication}` : "",
        referredTo === "front-desk" && store.admissionNotes
            ? `Admission Notes:\n${store.admissionNotes}` : "",
    ].filter(Boolean).join("\n\n");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!presentingComplaint.trim()) { toast.error("Presenting complaint is required."); return; }
        if (!assessment.trim()) { toast.error("Assessment / diagnosis is required."); return; }
        if (referredTo === "lab-tech" && (!labTestType || labTestType.length === 0)) { toast.error("Select at least one lab test."); return; }
        if (referredTo === "radiology" && (!radTestType || radTestType.length === 0)) { toast.error("Select a radiology investigation."); return; }
        if (referredTo === "front-desk" && !store.admissionType) { toast.error("Select an admission type."); return; }
        if (referredTo === "front-desk" && !store.admissionIndication.trim()) { toast.error("Clinical indication for admission is required."); return; }

        const doctorId = user?.id ?? user?.$id ?? "";

        // Front Desk — BLOCKING, and done FIRST: if the admission record can't
        // be written, we stop here entirely. Nothing is saved, nothing is
        // half-done, and the doctor's retry click is a clean single attempt
        // with no duplicate consultation notes left behind.
        if (referredTo === "front-desk" && store.admissionType) {
            setAdmissionSaving(true);
            try {
                await createAdmission({
                    patient_id: patientId,
                    admission_type: store.admissionType as any,
                    urgency: store.admissionUrgency,
                    ward_name: store.admissionWard || undefined,
                    indication: store.admissionIndication || undefined,
                    notes: store.admissionNotes || undefined,
                    assigned_by: doctorId,
                });
            } catch (err: any) {
                setAdmissionSaving(false);
                toast.error(
                    err?.message ??
                    "Failed to create the admission record. Nothing has been saved yet — click Submit again to retry.",
                    { duration: 8000 }
                );
                return; // ── stop here: consultation is never submitted
            }
            setAdmissionSaving(false);
        }

        createConsultation(
            {
                patientId, doctorId,
                symptoms: buildSymptoms(),
                diagnosis: buildDiagnosis(),
                prescriptions: prescriptions || undefined,
                recommendations: buildRecommendations(),
                referredTo: referredTo || undefined,
                status: "underConsultation",
            },
            {
                onSuccess: async () => {
                    // Lab request — ONE ROW PER TEST, not one joined string.
                    // Previously all selected tests were comma-joined into a
                    // single request ("CBC, Malaria Parasite, Urinalysis"),
                    // which meant the Lab Tech dashboard's pending count
                    // undercounted actual workload (3 tests = "1 pending"),
                    // and there was no way to mark individual tests complete
                    // independently of the others.
                    if (referredTo === "lab-tech") {
                        await Promise.all(
                            labTestType.map(test =>
                                createLabRequestAsync({
                                    patientId,
                                    requestedBy: doctorId,
                                    testType: test,
                                    priority: labPriority,
                                    notes: labNotes || undefined,
                                    status: "pending",
                                })
                            )
                        );
                    }
                    // Radiology request — same fix, same reasoning.
                    if (referredTo === "radiology") {
                        await Promise.all(
                            radTestType.map(test =>
                                createRadRequestAsync({
                                    patientId,
                                    requestedBy: doctorId,
                                    testType: test,
                                    priority: radPriority,
                                    notes: radNotes || undefined,
                                })
                            )
                        );
                    }
                    // Structured prescriptions
                    if (referredTo === "pharmacist" && store.prescriptionItems.length > 0) {
                        await Promise.all(
                            store.prescriptionItems.map(item => {
                                if (!item.drugName.trim() || !item.dosage.trim()) return Promise.resolve();
                                return createPrescriptionAsync({
                                    patientId,
                                    pharmacistId: undefined,
                                    drugName: item.drugName,
                                    dosage: `${item.dosage} ${item.frequency}`.trim(),
                                    duration: item.duration || undefined,
                                    price: 0,
                                    notes: item.notes || undefined,
                                    dispensed: false,
                                });
                            })
                        );
                    }

                    // Patient status — admission record (if any) already exists by this point
                    const resolvedStatus = statusOverride
                        ? (statusOverride as PatientStatus)
                        : nextStatus;
                    updateStatus(
                        { id: patientId, status: resolvedStatus },
                        { onError: () => toast.error("Consultation saved but status could not be updated.") }
                    );

                    toast.success(`Consultation saved. Patient routed to ${nextStatusLabel}.`);
                    resetForm();
                    onSuccess?.();
                },
                onError: (err: any) => toast.error(err?.message ?? "Failed to submit consultation."),
            }
        );
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${isChild ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-600"}`}>
                    {isChild ? <Baby size={13} /> : <User size={13} />}
                    {isChild ? "Paediatric" : "Adult"}
                </div>
                {isFem && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-pink-50 border-pink-200 text-pink-700 text-xs font-bold">
                        <Heart size={13} /> Female — Obstetric fields enabled
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* ── A. History ── */}
                <Section id="history" icon={ClipboardList} title="A. History" badge="Presenting complaints & background" defaultOpen>
                    <div className="space-y-1.5">
                        <FieldLabel required>A1 · Presenting Complaint</FieldLabel>
                        <Textarea rows={3} value={presentingComplaint} onChange={e => setField("presentingComplaint", e.target.value)}
                            placeholder="Chief complaint — what brings the patient in today?"
                            className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-red-400" />
                    </div>
                    <div className="pl-3 border-l-2 border-red-100 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400">A2 · History of Presenting Complaints</p>
                        {[
                            { label: "Analysis of Symptoms", val: symptomsAnalysis, key: "symptomsAnalysis", ph: "Onset, duration, character, radiation, aggravating/relieving factors..." },
                            { label: "Aetiology / Cause", val: aetiology, key: "aetiology", ph: "Possible cause or predisposing factors..." },
                            { label: "History of Complications", val: historyComplications, key: "historyComplications", ph: "Any complications arising from this condition..." },
                            { label: "History of Treatment", val: historyTreatment, key: "historyTreatment", ph: "Treatments tried before — medications, procedures, outcomes..." },
                        ].map(({ label, val, key, ph }) => (
                            <div key={label} className="space-y-1.5">
                                <FieldLabel>{label}</FieldLabel>
                                <Textarea rows={2} value={val} onChange={e => setField(key as any, e.target.value)} placeholder={ph}
                                    className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-red-400" />
                            </div>
                        ))}
                    </div>
                    {isChild && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                                <Baby size={13} className="text-blue-600" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">A3–A6 · Paediatric History</p>
                            </div>
                            <div className="pl-3 border-l-2 border-blue-100 space-y-4">
                                {[
                                    { label: "A3 · Antenatal / Delivery History", val: antenatalHistory, key: "antenatalHistory", ph: "Pregnancy complications, mode of delivery, birth weight, APGAR score..." },
                                    { label: "A4 · Nutritional History", val: nutritionalHistory, key: "nutritionalHistory", ph: "Breastfeeding, weaning, current diet..." },
                                    { label: "A5 · Developmental Milestones", val: developmentalMilestones, key: "developmentalMilestones", ph: "Motor, language, social milestones — achieved or delayed..." },
                                    { label: "A6 · Immunisation History", val: immunisationHistory, key: "immunisationHistory", ph: "BCG, OPV, DPT, Hepatitis B, Measles..." },
                                ].map(({ label, val, key, ph }) => (
                                    <div key={label} className="space-y-1.5">
                                        <FieldLabel>{label}</FieldLabel>
                                        <Textarea rows={2} value={val} onChange={e => setField(key as any, e.target.value)} placeholder={ph}
                                            className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-blue-400" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="pl-3 border-l-2 border-red-100 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400">A7–A9 · General History</p>
                        {[
                            { label: "A7 · Past Medical & Surgical History", val: pastMedicalHistory, key: "pastMedicalHistory", ph: "Previous illnesses, hospitalisations, operations..." },
                            { label: "A8 · Drug History", val: drugHistory, key: "drugHistory", ph: "Current medications, allergies to drugs..." },
                            { label: "A9 · Family & Social History", val: familySocialHistory, key: "familySocialHistory", ph: "Family illnesses, smoking, alcohol, occupation..." },
                        ].map(({ label, val, key, ph }) => (
                            <div key={label} className="space-y-1.5">
                                <FieldLabel>{label}</FieldLabel>
                                <Textarea rows={2} value={val} onChange={e => setField(key as any, e.target.value)} placeholder={ph}
                                    className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-red-400" />
                            </div>
                        ))}
                    </div>
                    {isFem && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-3 py-2 bg-pink-50 border border-pink-100 rounded-xl">
                                <Heart size={13} className="text-pink-600" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-pink-600">Obstetric History</p>
                            </div>
                            <div className="pl-3 border-l-2 border-pink-100 grid grid-cols-2 gap-3">
                                {/* IMP — manual text */}
                                <div className="space-y-1.5">
                                    <FieldLabel>IMP (Impression)</FieldLabel>
                                    <input type="text" value={imp} onChange={e => setField("imp", e.target.value)}
                                        placeholder="e.g. G3P2 at 32 weeks" className={inputCls} />
                                </div>

                                {/* LMP — drives EGA + EDD auto-calc */}
                                <div className="space-y-1.5">
                                    <FieldLabel>LMP (Last Menstrual Period)</FieldLabel>
                                    <input type="date" value={lmp}
                                        onChange={e => {
                                            const newLmp = e.target.value;
                                            setField("lmp", newLmp);
                                            setField("ega", calcEGA(newLmp));
                                            setField("eod", calcEDD(newLmp));
                                        }}
                                        className={inputCls} />
                                </div>

                                {/* EGA — auto-calculated on LMP entry, but editable for ultrasound override */}
                                <div className="space-y-1.5">
                                    <FieldLabel>EGA (Gestational Age) <span className="text-pink-400 font-normal normal-case">· auto-calculated</span></FieldLabel>
                                    <input type="text" value={ega} onChange={e => setField("ega", e.target.value)}
                                        placeholder="Enter LMP to auto-calculate, or override here"
                                        className={`${inputCls} bg-pink-50/50`} />
                                </div>

                                {/* EDD — auto-calculated on LMP entry, but editable for ultrasound override */}
                                <div className="space-y-1.5">
                                    <FieldLabel>EDD (Expected Date of Delivery) <span className="text-pink-400 font-normal normal-case">· auto-calculated</span></FieldLabel>
                                    <input type="date" value={eod} onChange={e => setField("eod", e.target.value)}
                                        className={`${inputCls} bg-pink-50/50`} />
                                </div>

                                {/* Gravidity — manual */}
                                <div className="space-y-1.5">
                                    <FieldLabel>Gravidity (G)</FieldLabel>
                                    <input type="number" value={gravidity} onChange={e => setField("gravidity", e.target.value)}
                                        placeholder="Total pregnancies" className={inputCls} />
                                </div>

                                {/* Parity — manual */}
                                <div className="space-y-1.5">
                                    <FieldLabel>Parity (P)</FieldLabel>
                                    <input type="text" value={parity} onChange={e => setField("parity", e.target.value)}
                                        placeholder="e.g. P2+0" className={inputCls} />
                                </div>
                            </div>
                            <p className="text-[10px] text-pink-400 pl-3">
                                EGA and EDD are calculated automatically from LMP using Naegele's rule (LMP + 280 days). Override manually if ultrasound dating differs.
                            </p>
                        </div>
                    )}
                </Section>

                {/* ── B. General Examination ── */}
                <Section id="exam" icon={Activity} title="B. General Examination" badge="Section B" color="text-blue-600" bg="bg-blue-50">
                    <Textarea rows={4} value={generalExam} onChange={e => setField("generalExam", e.target.value)}
                        placeholder="General appearance, consciousness, pallor, jaundice, cyanosis, clubbing, lymphadenopathy, oedema, vital signs review..."
                        className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-blue-400" />
                </Section>

                {/* ── C. Systemic Examination ── */}
                <Section id="systemic" icon={Stethoscope} title="C. Systemic Examination" badge="Section C" color="text-teal-600" bg="bg-teal-50">
                    <div className="space-y-4">
                        {[
                            { label: "I. Respiratory System", val: respiratory, key: "respiratory", ph: "Inspection, palpation, percussion, auscultation..." },
                            { label: "II. Cardiovascular System", val: cardiovascular, key: "cardiovascular", ph: "Heart sounds, murmurs, apex beat, JVP, peripheral pulses..." },
                            { label: "III. Gastrointestinal System",val: gastrointestinal, key: "gastrointestinal", ph: "Abdomen — inspection, bowel sounds, tenderness, organomegaly..." },
                        ].map(({ label, val, key, ph }) => (
                            <div key={label} className="pl-3 border-l-2 border-teal-100 space-y-1.5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">{label}</p>
                                <Textarea rows={3} value={val} onChange={e => setField(key as any, e.target.value)} placeholder={ph}
                                    className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-teal-400" />
                            </div>
                        ))}
                    </div>
                </Section>

                {/* ── D. Summary ── */}
                <Section id="summary" icon={FileText} title="D. Summary" badge="Section D" color="text-violet-600" bg="bg-violet-50">
                    <Textarea rows={4} value={summary} onChange={e => setField("summary", e.target.value)}
                        placeholder="Brief clinical summary of key findings and their significance..."
                        className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-violet-400" />
                </Section>

                {/* ── E. Assessment ── */}
                <Section id="assessment-sec" icon={Brain} title="E. Assessment / Diagnosis" badge="Section E — Required" color="text-amber-600" bg="bg-amber-50" defaultOpen>
                    <Textarea rows={3} value={assessment} onChange={e => setField("assessment", e.target.value)}
                        placeholder="Diagnosis or differential diagnoses with clinical reasoning..."
                        className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-amber-400" />
                </Section>

                {/* ── F. Management ── */}
                <Section id="management" icon={Zap} title="F. Management" badge="Section F" color="text-green-600" bg="bg-green-50">
                    <div className="space-y-4">
                        {/* Investigations are now requested via the structured, multi-select
                            Lab / Radiology panels in the Routing section below — not here.
                            Having both a free-text box and a structured selector caused
                            confusion in practice (duplicate, inconsistent data entry). */}
                        <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-green-50/60 border border-green-100 rounded-xl">
                            <FlaskConical size={13} className="text-green-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-green-700 leading-relaxed">
                                To request lab tests or imaging, select <span className="font-semibold">Lab Technician</span> or{" "}
                                <span className="font-semibold">Radiology</span> in Patient Routing below — you can select multiple tests at once.
                            </p>
                        </div>

                        {[
                            { label: "I. Treatment Plan", val: prescriptions, key: "prescriptions", ph: "Medications, dosages, frequency, duration...", rows: 3 },
                            { label: "Recommendations", val: recommendations, key: "recommendations", ph: "Follow-up, lifestyle advice, return instructions...", rows: 2 },
                        ].map(({ label, val, key, ph, rows }) => (
                            <div key={label} className="space-y-1.5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-green-600">{label}</p>
                                <Textarea rows={rows} value={val} onChange={e => setField(key as any, e.target.value)} placeholder={ph}
                                    className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-green-400" />
                            </div>
                        ))}
                    </div>
                </Section>

                {/* ── AI Clinical Assistant ── */}
                <AIClinicalAssistant
                    symptoms={presentingComplaint} diagnosis={assessment}
                    patientAge={patientAge} patientGender={patientGender}
                    medicalHistory={pastMedicalHistory || patientMedicalHistory}
                    allergies={patientAllergies}
                />

                {/* ── Routing ── */}
                <Section id="routing" icon={ArrowRight} title="Patient Routing" badge="Referral & status update" defaultOpen color="text-indigo-600" bg="bg-indigo-50">

                    {/* Referral cards — 3 per row on mobile, all 5 in one row on larger */}
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {REFERRAL_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            const isSelected = referredTo === opt.value;
                            return (
                                <button key={opt.value} type="button"
                                    onClick={() => setField("referredTo", isSelected ? "" : opt.value)}
                                    className={`flex flex-col items-start gap-2 p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                                        isSelected ? `${opt.border} ${opt.bg}` : "border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white"
                                    }`}>
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? opt.bg : "bg-white border border-gray-100"}`}>
                                        <Icon size={14} className={isSelected ? opt.color : "text-gray-400"} />
                                    </div>
                                    <div>
                                        <p className={`text-xs font-bold ${isSelected ? "text-gray-900" : "text-gray-600"}`}>{opt.label}</p>
                                        <p className="text-[9px] text-gray-400 mt-0.5 leading-snug">{opt.desc}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Lab request panel */}
                    {referredTo === "lab-tech" && (
                        <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <FlaskConical size={13} className="text-indigo-600" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Lab Request Details</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <FieldLabel required>Test Type</FieldLabel>
                                    <MultiSelect options={LAB_TESTS} selected={labTestType} onChange={v => setField("labTestType", v)} placeholder="Select test(s)..." />
                                </div>
                                <div className="space-y-1.5">
                                    <FieldLabel>Priority</FieldLabel>
                                    <Select value={labPriority} onValueChange={v => setField("labPriority", v as RequestPriority)}>
                                        <SelectTrigger className="h-10 text-sm bg-white border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-white shadow-xl rounded-xl">
                                            <SelectItem value="routine">Routine</SelectItem>
                                            <SelectItem value="urgent">Urgent</SelectItem>
                                            <SelectItem value="stat">STAT</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <FieldLabel>Notes for Lab Tech</FieldLabel>
                                <Textarea rows={2} value={labNotes} onChange={e => setField("labNotes", e.target.value)}
                                    placeholder="e.g. Patient is fasting. Collect before medication..."
                                    className="text-sm bg-white border-gray-200 rounded-xl resize-none placeholder:text-gray-300" />
                            </div>
                        </div>
                    )}

                    {/* Radiology request panel */}
                    {referredTo === "radiology" && (
                        <div className="rounded-2xl border-2 border-cyan-200 bg-cyan-50/40 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Radio size={13} className="text-cyan-600" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Radiology Request Details</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <FieldLabel required>Investigation Type</FieldLabel>
                                    <MultiSelect options={RADIOLOGY_TESTS} selected={radTestType} onChange={v => setField("radTestType", v)} placeholder="Select investigation(s)..." />
                                </div>
                                <div className="space-y-1.5">
                                    <FieldLabel>Priority</FieldLabel>
                                    <Select value={radPriority} onValueChange={v => setField("radPriority", v as RequestPriority)}>
                                        <SelectTrigger className="h-10 text-sm bg-white border-gray-200 rounded-xl"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-white shadow-xl rounded-xl">
                                            <SelectItem value="routine">Routine</SelectItem>
                                            <SelectItem value="urgent">Urgent</SelectItem>
                                            <SelectItem value="stat">STAT</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <FieldLabel>Clinical Indication</FieldLabel>
                                <Textarea rows={2} value={radNotes} onChange={e => setField("radNotes", e.target.value)}
                                    placeholder="Relevant clinical history, specific area of concern..."
                                    className="text-sm bg-white border-gray-200 rounded-xl resize-none placeholder:text-gray-300" />
                            </div>
                        </div>
                    )}

                    {/* Pharmacist — prescription panel */}
                    {referredTo === "pharmacist" && <DoctorPrescriptionPanel store={store} />}

                    {/* Front desk — admission panel */}
                    {referredTo === "front-desk" && <AdmissionPanel store={store} />}

                    {/* Status override + preview */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                        <div className="space-y-1.5">
                            <FieldLabel>Override Status (optional)</FieldLabel>
                            <Select onValueChange={v => setField("statusOverride", v)} value={statusOverride}>
                                <SelectTrigger className="h-10 text-sm bg-gray-50 border-gray-200 rounded-xl">
                                    <SelectValue placeholder="Auto (based on referral)" />
                                </SelectTrigger>
                                <SelectContent className="bg-white shadow-xl rounded-xl">
                                    {PATIENT_STATUSES.map(s => (
                                        <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end">
                            <div className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
                                <CheckCircle2 size={13} className="text-blue-500 shrink-0" />
                                <p className="text-xs text-blue-700 font-medium">
                                    Patient → <span className="font-bold">{nextStatusLabel}</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Submit */}
                <button type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-2xl shadow-lg shadow-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed py-3.5">
                    {loading
                        ? <><Loader2 size={16} className="animate-spin" /> Saving...</>
                        : <><CheckCircle2 size={16} /> Submit & Route Patient <ArrowRight size={15} /></>
                    }
                </button>
            </form>
        </div>
    );
}