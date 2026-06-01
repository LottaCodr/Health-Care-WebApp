"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useConsultationStore, RequestPriority } from "@/store/consultation-store";
import { useAuth } from "@/context/auth-provider";
import { PatientStatus } from "@/types/models";
import { Staff } from "@/actions/staff/types";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
    useCreateConsultation,
    useUpdatePatientStatus,
    useCreateLabRequest,
    useCreateRadiologyRequest,
    useActiveLabTests,
    // useActiveRadiologyTests,
    useDrugInventory
} from "@/hooks/emr/use-emr";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// NEW: Import Checkbox and cn for MultiSelect
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

const AIClinicalAssistant = dynamic(
    () => import("@/components/ai/AIClinicalAssistant"),
    { loading: () => <div className="animate-pulse h-32 bg-gray-50 rounded-2xl" /> }
);

import {
    Stethoscope, ClipboardList, Pill,
    ArrowRight, Loader2, CheckCircle2,
    ChevronRight, FlaskConical, UserCog, Baby, User,
    Heart, Brain, Activity, FileText, Zap, Radio,
    ChevronDown,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    patientId: string;
    availableStaff: Staff[];
    onSuccess?: () => void;
    patientAge?: number;
    patientGender?: string;
    patientMedicalHistory?: string;
    patientAllergies?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const isPaed = (age?: number) => age !== undefined && age <= 12;
const isFemale = (gender?: string) => ["female", "f"].includes((gender ?? "").toLowerCase());

const REFERRAL_OPTIONS = [
    {
        value: "nurse",
        label: "Nurse",
        desc: "Post-consultation nursing care",
        icon: UserCog,
        status: "sent-to-nurse" as PatientStatus,
        color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-400",
    },
    {
        value: "lab-tech",
        label: "Lab Technician",
        desc: "Request laboratory investigations",
        icon: FlaskConical,
        status: "sent-to-lab" as PatientStatus,
        color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-400",
    },
    {
        value: "radiology",
        label: "Radiology",
        desc: "Imaging investigations",
        icon: Radio,
        status: "sent-to-radiology" as PatientStatus,   // ← correct status
        color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-400",
    },
    {
        value: "pharmacist",
        label: "Pharmacist",
        desc: "Dispense prescribed medications",
        icon: Pill,
        status: "sent-to-pharmacy" as PatientStatus,
        color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-400",
    },
] as const;

// Use active lab tests for lab and radiology options
const { data: labCatalog } = useActiveLabTests();

// Grab all test strings from active lab tests for multi-select
const LAB_TESTS: string[] = React.useMemo(() => {
    if (!labCatalog) return [];
    return Object.values(labCatalog)
        .flat()
        .filter(t => !(
            t.category?.toLowerCase().includes("radiology") ||
            t.test_name?.toLowerCase().includes("x-ray") ||
            t.test_name?.toLowerCase().includes("ct") ||
            t.test_name?.toLowerCase().includes("mri") ||
            t.test_name?.toLowerCase().includes("ultrasound")
        ))
        .map(t => t.test_name);
}, [labCatalog]);

const RADIOLOGY_TESTS: string[] = React.useMemo(() => {
    if (!labCatalog) return [];
    return Object.values(labCatalog)
        .flat()
        .filter(t =>
            t.category?.toLowerCase().includes("radiology") ||
            t.test_name?.toLowerCase().includes("x-ray") ||
            t.test_name?.toLowerCase().includes("ct") ||
            t.test_name?.toLowerCase().includes("mri") ||
            t.test_name?.toLowerCase().includes("ultrasound")
        )
        .map(t => t.test_name);
}, [labCatalog]);

const PATIENT_STATUSES = [
    { value: "sent-to-nurse", label: "Sent to Nurse" },
    { value: "sent-to-lab", label: "Sent to Lab" },
    { value: "sent-to-pharmacy", label: "Sent to Pharmacy" },
    { value: "sent-to-radiology", label: "Sent to Radiology" },
    { value: "under-observation", label: "Under Observation" },
    { value: "discharged", label: "Discharged" },
];

// ─── MultiSelect Sub-component ────────────────────────────────────────────────

type MultiSelectProps = {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
    label?: string;
};

function MultiSelect({ options, selected, onChange, placeholder, label }: MultiSelectProps) {
    const [open, setOpen] = useState(false);

    const handleToggle = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter((item) => item !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const display =
        selected.length > 0
            ? selected.join(", ")
            : placeholder || "Select...";

    return (
        <div className="w-full relative">
            <button
                type="button"
                className={cn(
                    "w-full h-10 px-3 flex justify-between items-center rounded-xl border border-gray-200 bg-white text-sm",
                    "focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400 transition-all"
                )}
                onClick={() => setOpen(v => !v)}
            >
                <span className={cn(selected.length === 0 ? "text-gray-400" : "text-gray-900")}>{display}</span>
                <ChevronDown size={16} className="text-gray-400 ml-2" />
            </button>
            {open && (
                <div className="absolute z-30 mt-1 left-0 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    <ul className="p-2 space-y-1">
                        {options.map((opt) => (
                            <li
                                key={opt}
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-50",
                                    selected.includes(opt) ? "bg-gray-100 font-semibold" : "",
                                )}
                                onClick={() => handleToggle(opt)}
                            >
                                <Checkbox
                                    className="w-4 h-4"
                                    checked={selected.includes(opt)}
                                    // @ts-ignore (ui component prop)
                                    tabIndex={-1}
                                    aria-label={'checkbox'}
                                />
                                <span className="text-sm">{opt}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const inputCls = "w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400 focus:bg-white transition-all";

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
            {children}
            {required && <span className="text-red-500 ml-0.5">*</span>}
        </p>
    );
}

function Section({
    id, icon: Icon, title, badge,
    color = "text-red-600", bg = "bg-red-50",
    defaultOpen = false, children,
}: {
    id: string;
    icon: React.ElementType;
    title: string;
    badge?: string;
    color?: string;
    bg?: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div id={id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50/60 transition-colors text-left"
            >
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                    <Icon size={15} className={color} />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{title}</p>
                    {badge && <p className="text-[10px] text-gray-400 mt-0.5 font-bold uppercase tracking-widest">{badge}</p>}
                </div>
                {open
                    ? <ChevronDown size={14} className="text-gray-400 shrink-0" />
                    : <ChevronRight size={14} className="text-gray-400 shrink-0" />
                }
            </button>
            {open && (
                <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">
                    {children}
                </div>
            )}
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ConsultationForm({
    patientId,
    availableStaff,
    onSuccess,
    patientAge,
    patientGender,
    patientMedicalHistory,
    patientAllergies,
}: Props) {
    const { user } = useAuth();

    // ── Hooks — all called unconditionally at top level ──────────────────────
    const { mutate: createConsultation, isPending: cLoading } = useCreateConsultation();
    const { mutate: updateStatus } = useUpdatePatientStatus();
    const { mutate: createLabRequest, isPending: lLoading } = useCreateLabRequest();
    const { mutate: createRadRequest, isPending: rLoading } = useCreateRadiologyRequest();

    const loading = cLoading || lLoading || rLoading;

    const isChild = isPaed(patientAge);
    const isFem = isFemale(patientGender);

    // ── Store ────────────────────────────────────────────────────────────────
    const {
        presentingComplaint, symptomsAnalysis, aetiology, historyComplications, historyTreatment,
        antenatalHistory, nutritionalHistory, developmentalMilestones, immunisationHistory, pastMedicalHistory,
        drugHistory, familySocialHistory, imp, lmp, ega, eod, gravidity, parity,
        generalExam, respiratory, cardiovascular, gastrointestinal, summary, assessment,
        investigations, prescriptions, recommendations, referredTo, statusOverride,
        labTestType, labPriority, labNotes, radTestType, radPriority, radNotes,
        setField, resetForm
    } = useConsultationStore();

    // Initialize pastMedicalHistory if provided and empty
    useEffect(() => {
        if (patientMedicalHistory && !pastMedicalHistory) {
            setField("pastMedicalHistory", patientMedicalHistory);
        }
    }, [patientMedicalHistory]);

    const referralOption = REFERRAL_OPTIONS.find(r => r.value === referredTo);
    const nextStatusLabel = referralOption?.label ?? "Nurse";
    const nextStatus = referralOption?.status ?? ("sent-to-nurse" as PatientStatus);

    // ── Build concatenated text fields ────────────────────────────────────────

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
        isFem && imp ? `IMP (Impression): ${imp}` : "",
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
        gastrointestinal ? `GI System:\n${gastrointestinal}` : "",
        summary ? `Summary:\n${summary}` : "",
    ].filter(Boolean).join("\n\n");

    const buildRecommendations = () => [
        assessment ? `Assessment:\n${assessment}` : "",
        investigations ? `Investigations:\n${investigations}` : "",
        recommendations ? `Recommendations:\n${recommendations}` : "",
    ].filter(Boolean).join("\n\n");

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!presentingComplaint.trim()) { toast.error("Presenting complaint is required."); return; }
        if (!assessment.trim()) { toast.error("Assessment / diagnosis is required."); return; }
        if (referredTo === "lab-tech" && (!labTestType || labTestType.length === 0)) { toast.error("Select at least one lab test type."); return; }
        if (referredTo === "radiology" && (!radTestType || radTestType.length === 0)) { toast.error("Select a radiology investigation type."); return; }

        const doctorId = user?.id ?? user?.$id ?? "";

        // 1 — Save consultation note
        createConsultation(
            {
                patientId,
                doctorId,
                symptoms: buildSymptoms(),
                diagnosis: buildDiagnosis(),
                prescriptions: prescriptions || undefined,
                recommendations: buildRecommendations(),
                referredTo: referredTo || undefined,
                status: "underConsultation",
            },
            {
                onSuccess: () => {
                    // 2 — Create investigation request if applicable
                    if (referredTo === "lab-tech") {
                        createLabRequest({
                            patientId,
                            requestedBy: doctorId,
                            testType: labTestType.join(", "),
                            priority: labPriority,   // typed as RequestPriority — no cast needed
                            notes: labNotes || undefined,
                            status: "pending",
                        });
                    }

                    if (referredTo === "radiology") {
                        // Use the dedicated radiology service — it prepends "[RADIOLOGY] " automatically
                        createRadRequest({
                            patientId,
                            requestedBy: doctorId,
                            testType: radTestType.join(", "),   // service adds the prefix
                            priority: radPriority,   // typed as RequestPriority — no cast needed
                            notes: radNotes || undefined,
                        });
                    }

                    // 3 — Move patient to next status
                    const resolvedStatus = statusOverride
                        ? (statusOverride as PatientStatus)
                        : nextStatus;

                    updateStatus(
                        { id: patientId, status: resolvedStatus },
                        { onError: () => toast.error("Consultation saved but patient status could not be updated.") }
                    );

                    toast.success(`Consultation saved. Patient routed to ${nextStatusLabel}.`);

                    // Reset key fields
                    resetForm();
                    onSuccess?.();
                },
                onError: (err: any) =>
                    toast.error(err?.message ?? "Failed to submit consultation."),
            }
        );
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">

            {/* Patient type banners */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold
                    ${isChild ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-600"}`}>
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

                    {/* Paediatric A3–A6 */}
                    {isChild && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                                <Baby size={13} className="text-blue-600" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">A3–A6 · Paediatric History</p>
                            </div>
                            <div className="pl-3 border-l-2 border-blue-100 space-y-4">
                                {[
                                    { label: "A3 · Antenatal / Delivery History", val: antenatalHistory, key: "antenatalHistory", ph: "Pregnancy complications, mode of delivery, birth weight, APGAR score..." },
                                    { label: "A4 · Nutritional History", val: nutritionalHistory, key: "nutritionalHistory", ph: "Breastfeeding, weaning, current diet, nutritional status..." },
                                    { label: "A5 · Developmental Milestones", val: developmentalMilestones, key: "developmentalMilestones", ph: "Motor, language, social milestones — achieved or delayed..." },
                                    { label: "A6 · Immunisation History", val: immunisationHistory, key: "immunisationHistory", ph: "BCG, OPV, DPT, Hepatitis B, Measles, Pentavalent..." },
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

                    {/* A7–A9 General History */}
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

                    {/* Female obstetric */}
                    {isFem && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-3 py-2 bg-pink-50 border border-pink-100 rounded-xl">
                                <Heart size={13} className="text-pink-600" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-pink-600">Obstetric History — Female Patient</p>
                            </div>
                            <div className="pl-3 border-l-2 border-pink-100 grid grid-cols-2 gap-3">
                                {[
                                    { label: "IMP (Impression)", val: imp, key: "imp", type: "text", ph: "e.g. G3P2 at 32 weeks" },
                                    { label: "LMP (Last Menstrual Period)", val: lmp, key: "lmp", type: "date", ph: "" },
                                    { label: "EGA (Gestational Age)", val: ega, key: "ega", type: "text", ph: "e.g. 32 weeks + 4 days" },
                                    { label: "EOD (Expected Delivery)", val: eod, key: "eod", type: "date", ph: "" },
                                    { label: "Gravidity (G)", val: gravidity, key: "gravidity", type: "number", ph: "Total pregnancies" },
                                    { label: "Parity (P)", val: parity, key: "parity", type: "text", ph: "e.g. P2+0 or P1011" },
                                ].map(({ label, val, key, type, ph }) => (
                                    <div key={label} className="space-y-1.5">
                                        <FieldLabel>{label}</FieldLabel>
                                        <input type={type} value={val} onChange={e => setField(key as any, e.target.value)} placeholder={ph} className={inputCls} />
                                    </div>
                                ))}
                            </div>
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
                            { label: "I. Respiratory System", val: respiratory, key: "respiratory", ph: "Inspection, palpation, percussion, auscultation — breath sounds, added sounds..." },
                            { label: "II. Cardiovascular System", val: cardiovascular, key: "cardiovascular", ph: "Heart sounds, murmurs, apex beat, JVP, peripheral pulses, BP..." },
                            { label: "III. Gastrointestinal System", val: gastrointestinal, key: "gastrointestinal", ph: "Abdomen — inspection, bowel sounds, tenderness, organomegaly, ascites..." },
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

                {/* ── E. Assessment — required ── */}
                <Section id="assessment-sec" icon={Brain} title="E. Assessment / Diagnosis" badge="Section E — Required" color="text-amber-600" bg="bg-amber-50" defaultOpen>
                    <Textarea rows={3} value={assessment} onChange={e => setField("assessment", e.target.value)}
                        placeholder="Diagnosis or differential diagnoses with clinical reasoning..."
                        className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-amber-400" />
                </Section>

                {/* ── F. Management ── */}
                <Section id="management" icon={Zap} title="F. Management" badge="Section F" color="text-green-600" bg="bg-green-50">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-green-600">I. Investigations Planned</p>
                            <Textarea rows={2} value={investigations} onChange={e => setField("investigations", e.target.value)}
                                placeholder="Planned lab tests, imaging, other investigations..."
                                className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-green-400" />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-green-600">II. Treatment Plan</p>
                            <Textarea rows={3} value={prescriptions} onChange={e => setField("prescriptions", e.target.value)}
                                placeholder="Medications, dosages, frequency, duration..."
                                className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-green-400" />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Recommendations</p>
                            <Textarea rows={2} value={recommendations} onChange={e => setField("recommendations", e.target.value)}
                                placeholder="Follow-up, lifestyle advice, return instructions..."
                                className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-green-400" />
                        </div>
                    </div>
                </Section>

                {/* ── AI Clinical Assistant ── */}
                <AIClinicalAssistant
                    symptoms={presentingComplaint}
                    diagnosis={assessment}
                    patientAge={patientAge}
                    patientGender={patientGender}
                    medicalHistory={pastMedicalHistory || patientMedicalHistory}
                    allergies={patientAllergies}
                />

                {/* ── Routing ── */}
                <Section id="routing" icon={ArrowRight} title="Patient Routing" badge="Referral & status update" defaultOpen color="text-indigo-600" bg="bg-indigo-50">

                    {/* Referral option cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {REFERRAL_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            const isSelected = referredTo === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setField("referredTo", isSelected ? "" : opt.value)}
                                    className={`flex flex-col items-start gap-2 p-3 rounded-xl border-2 text-left transition-all duration-150
                                        ${isSelected
                                            ? `${opt.border} ${opt.bg}`
                                            : "border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white"
                                        }`}
                                >
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

                    {/* Lab request details panel */}
                    {referredTo === "lab-tech" && (
                        <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <FlaskConical size={13} className="text-indigo-600" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Lab Request Details</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <FieldLabel required>Test Type</FieldLabel>
                                    <MultiSelect
                                        options={LAB_TESTS}
                                        selected={labTestType}
                                        onChange={(newSelected) => setField("labTestType", newSelected)}
                                        placeholder="Select test(s)..."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <FieldLabel>Priority</FieldLabel>
                                    <Select
                                        value={labPriority}
                                        onValueChange={(v) => setField("labPriority", v as RequestPriority)}
                                    >
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

                    {/* Radiology request details panel */}
                    {referredTo === "radiology" && (
                        <div className="rounded-2xl border-2 border-cyan-200 bg-cyan-50/40 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Radio size={13} className="text-cyan-600" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Radiology Request Details</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <FieldLabel required>Investigation Type</FieldLabel>
                                    <MultiSelect
                                        options={RADIOLOGY_TESTS}
                                        selected={radTestType}
                                        onChange={(newSelected) => setField("radTestType", newSelected)}
                                        placeholder="Select radiology investigation(s)..."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <FieldLabel>Priority</FieldLabel>
                                    <Select
                                        value={radPriority}
                                        onValueChange={(v) => setField("radPriority", v as RequestPriority)}
                                    >
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
                                <FieldLabel>Clinical Indication for Radiologist</FieldLabel>
                                <Textarea rows={2} value={radNotes} onChange={e => setField("radNotes", e.target.value)}
                                    placeholder="Relevant clinical history, specific area of concern..."
                                    className="text-sm bg-white border-gray-200 rounded-xl resize-none placeholder:text-gray-300" />
                            </div>
                        </div>
                    )}

                    {/* Status override + preview */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                        <div className="space-y-1.5">
                            <FieldLabel>Override Status (optional)</FieldLabel>
                            <Select onValueChange={(v) => setField("statusOverride", v)} value={statusOverride}>
                                <SelectTrigger className="h-10 text-sm bg-gray-50 border-gray-200 rounded-xl">
                                    <SelectValue placeholder="Auto (based on referral)" />
                                </SelectTrigger>
                                <SelectContent className="bg-white shadow-xl rounded-xl">
                                    {PATIENT_STATUSES.map(s => (
                                        <SelectItem key={s.value} value={s.value} className="text-sm">
                                            {s.label}
                                        </SelectItem>
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
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-2xl shadow-lg shadow-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed py-3.5"
                >
                    {loading
                        ? <><Loader2 size={16} className="animate-spin" /> Saving...</>
                        : <><CheckCircle2 size={16} /> Submit & Route Patient <ArrowRight size={15} /></>
                    }
                </button>
            </form>
        </div>
    );
}