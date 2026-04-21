"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/auth-provider";
import { PatientStatus } from "@/types/models";
import { Staff } from "@/actions/staff/types";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateConsultation, useUpdatePatientStatus, useCreateLabRequest } from "@/hooks/emr/use-emr";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const AIClinicalAssistant = dynamic(
    () => import("@/components/ai/AIClinicalAssistant"),
    { loading: () => <div className="animate-pulse h-32 bg-gray-50 rounded-2xl" /> }
);
import {
    Stethoscope, HeartPulse, ClipboardList, Pill,
    UserRound, ArrowRight, Loader2, CheckCircle2,
    ChevronRight, FlaskConical, UserCog, Baby, User,
    Heart, Brain, Activity, FileText, Zap, Radio,
    ChevronDown, X,
} from "lucide-react";

// ─── Props ────────────────────────────────────────────────────────────────────

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
    { value: "nurse", label: "Nurse", desc: "Post-consultation nursing care", icon: UserCog, status: PatientStatus.SentToNurse, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-400" },
    { value: "lab-tech", label: "Lab Technician", desc: "Request laboratory investigations", icon: FlaskConical, status: PatientStatus.SentToLab, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-400" },
    { value: "radiology", label: "Radiology", desc: "Imaging investigations", icon: Radio, status: PatientStatus.SentToLab, color: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-400" },
    { value: "pharmacist", label: "Pharmacist", desc: "Dispense prescribed medications", icon: Pill, status: PatientStatus.SentToPharmacy, color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-400" },
] as const;

const LAB_TESTS = [
    "Full Blood Count (FBC)", "Malaria Parasite Test", "Urinalysis",
    "Blood Sugar (Fasting)", "Blood Sugar (Random)", "Liver Function Test (LFT)",
    "Kidney Function Test (KFT)", "Widal Test (Typhoid)", "HIV Screening",
    "Hepatitis B Surface Ag", "HBA1c", "Thyroid Function Test",
    "Lipid Profile", "Electrolytes & Urea", "Blood Culture & Sensitivity",
    "Pregnancy Test", "Stool Microscopy", "Sputum AFB",
    "Blood Group & Crossmatch", "Genotype", "ECG",
    "Other (specify in notes)",
];

const RADIOLOGY_TESTS = [
    "Chest X-Ray (PA)", "Abdominal X-Ray", "Skull X-Ray",
    "Cervical Spine X-Ray", "Thoracic Spine X-Ray", "Lumbar Spine X-Ray",
    "Pelvic X-Ray", "Limbs X-Ray", "Ultrasound Scan (Abdomen/Pelvis)",
    "Obstetric Ultrasound", "Breast Ultrasound", "Cranial Ultrasound",
    "CT Scan — Brain", "CT Scan — Chest", "CT Scan — Abdomen/Pelvis",
    "MRI — Brain", "MRI — Spine", "Echocardiogram",
    "Doppler Studies", "Fluoroscopy", "Other (specify in notes)",
];

const PATIENT_STATUSES = [
    { value: "sent-to-nurse", label: "Sent to Nurse" },
    { value: "sent-to-lab", label: "Sent to Lab" },
    { value: "sent-to-pharmacy", label: "Sent to Pharmacy" },
    { value: "under-observation", label: "Under Observation" },
    { value: "discharged", label: "Discharged" },
];

// ─── Field components ─────────────────────────────────────────────────────────

const inputCls = "w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400 focus:bg-white transition-all";
const selectCls = "w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400 focus:bg-white appearance-none transition-all";

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
            {children}{required && <span className="text-red-500 ml-0.5">*</span>}
        </p>
    );
}

function Section({
    id, icon: Icon, title, badge, color = "text-red-600", bg = "bg-red-50",
    defaultOpen = false, children,
}: {
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
            {open && <div className="px-5 pb-5 space-y-4 border-t border-gray-50 pt-4">{children}</div>}
        </div>
    );
}

function FieldCard({
    id, step, icon, label, helper, children, onFocus,
}: {
    id: string; step: number; icon: React.ReactNode; label: string;
    helper?: string; children: React.ReactNode; onFocus?: () => void;
}) {
    return (
        <div id={id} onFocus={onFocus}
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 transition-all overflow-hidden">
            <div className="flex items-center gap-3 px-6 pt-5 pb-3 border-b border-gray-50">
                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center shrink-0">{icon}</div>
                <div>
                    <p className="text-sm font-bold text-gray-800">{label}</p>
                    {helper && <p className="text-xs text-gray-400 mt-0.5">{helper}</p>}
                </div>
                <span className="ml-auto text-xs font-bold text-gray-200 tracking-widest">0{step}</span>
            </div>
            <div className="px-6 py-4">{children}</div>
            <div className="h-0.5 w-0 group-focus-within:w-full bg-red-600 transition-all duration-300 ease-out" />
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ConsultationForm({
    patientId, availableStaff, onSuccess,
    patientAge, patientGender, patientMedicalHistory, patientAllergies,
}: Props) {
    const { user } = useAuth();
    const { mutate: createConsultation, loading: cLoading } = useCreateConsultation();
    const { mutate: updateStatus, loading: sLoading } = useUpdatePatientStatus();
    const { mutate: createLabRequest, loading: lLoading } = useCreateLabRequest();

    const isChild = isPaed(patientAge);
    const isFem = isFemale(patientGender);
    const loading = cLoading || sLoading || lLoading;

    // ── History fields ──
    const [presentingComplaint, setPresentingComplaint] = useState("");
    const [symptomsAnalysis, setSymptomsAnalysis] = useState("");
    const [aetiology, setAetiology] = useState("");
    const [historyComplications, setHistoryComplications] = useState("");
    const [historyTreatment, setHistoryTreatment] = useState("");
    const [antenatalHistory, setAntenatalHistory] = useState("");
    const [nutritionalHistory, setNutritionalHistory] = useState("");
    const [developmentalMilestones, setDevelopmentalMilestones] = useState("");
    const [immunisationHistory, setImmunisationHistory] = useState("");
    const [pastMedicalHistory, setPastMedicalHistory] = useState(patientMedicalHistory ?? "");
    const [drugHistory, setDrugHistory] = useState("");
    const [familySocialHistory, setFamilySocialHistory] = useState("");
    // Female obstetric
    const [imp, setImp] = useState("");
    const [lmp, setLmp] = useState("");
    const [ega, setEga] = useState("");
    const [eod, setEod] = useState("");
    const [gravidity, setGravidity] = useState("");
    const [parity, setParity] = useState("");

    // ── Examination ──
    const [generalExam, setGeneralExam] = useState("");
    const [respiratory, setRespiratory] = useState("");
    const [cardiovascular, setCardiovascular] = useState("");
    const [gastrointestinal, setGastrointestinal] = useState("");

    // ── Summary / Assessment / Management ──
    const [summary, setSummary] = useState("");
    const [assessment, setAssessment] = useState("");
    const [investigations, setInvestigations] = useState("");
    const [prescriptions, setPrescriptions] = useState("");
    const [recommendations, setRecommendations] = useState("");

    // ── Routing ──
    const [referredTo, setReferredTo] = useState("");
    const [selectedStaffId, setSelectedStaffId] = useState("");
    const [statusOverride, setStatusOverride] = useState("");
    const [labTestType, setLabTestType] = useState("");
    const [labPriority, setLabPriority] = useState("routine");
    const [labNotes, setLabNotes] = useState("");
    const [radTestType, setRadTestType] = useState("");
    const [radPriority, setRadPriority] = useState("routine");
    const [radNotes, setRadNotes] = useState("");

    const referralOption = REFERRAL_OPTIONS.find(r => r.value === referredTo);
    const nextStatusLabel = referralOption?.label ?? "Nurse";
    const nextStatus = (referralOption?.status ?? PatientStatus.SentToNurse) as PatientStatus;

    // Build concatenated symptoms / diagnosis strings
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!presentingComplaint.trim()) { toast.error("Presenting complaint is required."); return; }
        if (!assessment.trim()) { toast.error("Assessment / diagnosis is required."); return; }
        if (referredTo === "lab-tech" && !labTestType) { toast.error("Select a lab test type."); return; }
        if (referredTo === "radiology" && !radTestType) { toast.error("Select a radiology investigation type."); return; }

        try {
            await createConsultation({
                patientId,
                doctorId: user?.$id ?? user?.id ?? "",
                symptoms: buildSymptoms(),
                diagnosis: buildDiagnosis(),
                prescriptions: prescriptions || undefined,
                recommendations: buildRecommendations(),
                referredTo: referredTo || undefined,
                assignedStaffId: selectedStaffId || undefined,
                status: "underConsultation",
            });

            if (referredTo === "lab-tech") {
                await createLabRequest({ patientId, requestedBy: user?.$id ?? user?.id, testType: labTestType, priority: labPriority || undefined, notes: labNotes || undefined, status: "pending" });
            }
            if (referredTo === "radiology") {
                await createLabRequest({ patientId, requestedBy: user?.$id ?? user?.id, testType: `[RADIOLOGY] ${radTestType}`, priority: radPriority || undefined, notes: radNotes || undefined, status: "pending" });
            }

            const resolvedStatus = statusOverride ? (statusOverride as PatientStatus) : nextStatus;
            await updateStatus(patientId, resolvedStatus);

            toast.success(`Consultation saved. Patient routed to ${nextStatusLabel}.`);
            // Reset key fields
            setPresentingComplaint(""); setAssessment(""); setPrescriptions("");
            setRecommendations(""); setReferredTo(""); setLabTestType(""); setRadTestType("");
            onSuccess?.();
        } catch (err: any) {
            toast.error(err?.message ?? "Failed to submit consultation.");
        }
    };

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

                {/* ── SECTION A: History ── */}
                <Section id="history" icon={ClipboardList} title="A. History" badge="Presenting complaints & background" defaultOpen>

                    <div className="space-y-1.5">
                        <FieldLabel required>A1 · Presenting Complaint</FieldLabel>
                        <Textarea rows={3} value={presentingComplaint} onChange={e => setPresentingComplaint(e.target.value)}
                            placeholder="Chief complaint — what brings the patient in today?"
                            className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-red-400" />
                    </div>

                    <div className="pl-3 border-l-2 border-red-100 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400">A2 · History of Presenting Complaints</p>
                        {[
                            { label: "Analysis of Symptoms", val: symptomsAnalysis, set: setSymptomsAnalysis, ph: "Onset, duration, character, radiation, aggravating/relieving factors..." },
                            { label: "Aetiology / Cause", val: aetiology, set: setAetiology, ph: "Possible cause or predisposing factors..." },
                            { label: "History of Complications", val: historyComplications, set: setHistoryComplications, ph: "Any complications arising from this condition..." },
                            { label: "History of Treatment", val: historyTreatment, set: setHistoryTreatment, ph: "Treatments tried before — medications, procedures, outcomes..." },
                        ].map(({ label, val, set, ph }) => (
                            <div key={label} className="space-y-1.5">
                                <FieldLabel>{label}</FieldLabel>
                                <Textarea rows={2} value={val} onChange={e => set(e.target.value)} placeholder={ph}
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
                                    { label: "A3 · Antenatal / Delivery History", val: antenatalHistory, set: setAntenatalHistory, ph: "Pregnancy complications, mode of delivery, birth weight, APGAR score..." },
                                    { label: "A4 · Nutritional History", val: nutritionalHistory, set: setNutritionalHistory, ph: "Breastfeeding, weaning, current diet, nutritional status..." },
                                    { label: "A5 · Developmental Milestones", val: developmentalMilestones, set: setDevelopmentalMilestones, ph: "Motor, language, social milestones — achieved or delayed..." },
                                    { label: "A6 · Immunisation History", val: immunisationHistory, set: setImmunisationHistory, ph: "BCG, OPV, DPT, Hepatitis B, Measles, Pentavalent..." },
                                ].map(({ label, val, set, ph }) => (
                                    <div key={label} className="space-y-1.5">
                                        <FieldLabel>{label}</FieldLabel>
                                        <Textarea rows={2} value={val} onChange={e => set(e.target.value)} placeholder={ph}
                                            className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-blue-400" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* A7–A9 Shared */}
                    <div className="pl-3 border-l-2 border-red-100 space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400">A7–A9 · General History</p>
                        {[
                            { label: "A7 · Past Medical & Surgical History", val: pastMedicalHistory, set: setPastMedicalHistory, ph: "Previous illnesses, hospitalisations, operations..." },
                            { label: "A8 · Drug History", val: drugHistory, set: setDrugHistory, ph: "Current medications, allergies to drugs..." },
                            { label: "A9 · Family & Social History", val: familySocialHistory, set: setFamilySocialHistory, ph: "Family illnesses, smoking, alcohol, occupation..." },
                        ].map(({ label, val, set, ph }) => (
                            <div key={label} className="space-y-1.5">
                                <FieldLabel>{label}</FieldLabel>
                                <Textarea rows={2} value={val} onChange={e => set(e.target.value)} placeholder={ph}
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
                                    { label: "IMP (Impression)", val: imp, set: setImp, type: "text", ph: "e.g. G3P2 at 32 weeks" },
                                    { label: "LMP (Last Menstrual Period)", val: lmp, set: setLmp, type: "date", ph: "" },
                                    { label: "EGA (Gestational Age)", val: ega, set: setEga, type: "text", ph: "e.g. 32 weeks + 4 days" },
                                    { label: "EOD (Expected Delivery)", val: eod, set: setEod, type: "date", ph: "" },
                                    { label: "Gravidity (G)", val: gravidity, set: setGravidity, type: "number", ph: "Total pregnancies" },
                                    { label: "Parity (P)", val: parity, set: setParity, type: "text", ph: "e.g. P2+0 or P1011" },
                                ].map(({ label, val, set, type, ph }) => (
                                    <div key={label} className="space-y-1.5">
                                        <FieldLabel>{label}</FieldLabel>
                                        <input type={type} value={val} onChange={e => set(e.target.value)} placeholder={ph} className={inputCls} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </Section>

                {/* ── SECTION B: General Examination ── */}
                <Section id="exam" icon={Activity} title="B. General Examination" badge="Section B" color="text-blue-600" bg="bg-blue-50">
                    <Textarea rows={4} value={generalExam} onChange={e => setGeneralExam(e.target.value)}
                        placeholder="General appearance, consciousness, pallor, jaundice, cyanosis, clubbing, lymphadenopathy, oedema, vital signs review..."
                        className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-blue-400" />
                </Section>

                {/* ── SECTION C: Systemic Examination ── */}
                <Section id="systemic" icon={Stethoscope} title="C. Systemic Examination" badge="Section C" color="text-teal-600" bg="bg-teal-50">
                    <div className="space-y-4">
                        {[
                            { label: "I. Respiratory System", val: respiratory, set: setRespiratory, ph: "Inspection, palpation, percussion, auscultation — breath sounds, added sounds..." },
                            { label: "II. Cardiovascular System", val: cardiovascular, set: setCardiovascular, ph: "Heart sounds, murmurs, apex beat, JVP, peripheral pulses, BP..." },
                            { label: "III. Gastrointestinal System", val: gastrointestinal, set: setGastrointestinal, ph: "Abdomen — inspection, bowel sounds, tenderness, organomegaly, ascites..." },
                        ].map(({ label, val, set, ph }) => (
                            <div key={label} className="pl-3 border-l-2 border-teal-100 space-y-1.5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">{label}</p>
                                <Textarea rows={3} value={val} onChange={e => set(e.target.value)} placeholder={ph}
                                    className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-teal-400" />
                            </div>
                        ))}
                    </div>
                </Section>

                {/* ── SECTION D: Summary ── */}
                <Section id="summary" icon={FileText} title="D. Summary" badge="Section D" color="text-violet-600" bg="bg-violet-50">
                    <Textarea rows={4} value={summary} onChange={e => setSummary(e.target.value)}
                        placeholder="Brief clinical summary of key findings and their significance..."
                        className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-violet-400" />
                </Section>

                {/* ── SECTION E: Assessment ── */}
                <Section id="assessment-sec" icon={Brain} title="E. Assessment / Diagnosis" badge="Section E — Required" color="text-amber-600" bg="bg-amber-50" defaultOpen>
                    <Textarea rows={3} value={assessment} onChange={e => setAssessment(e.target.value)}
                        placeholder="Diagnosis or differential diagnoses with clinical reasoning..."
                        className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-amber-400" />
                </Section>

                {/* ── SECTION F: Management ── */}
                <Section id="management" icon={Zap} title="F. Management" badge="Section F" color="text-green-600" bg="bg-green-50">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-green-600">I. Investigations Planned</p>
                            <Textarea rows={2} value={investigations} onChange={e => setInvestigations(e.target.value)}
                                placeholder="Planned lab tests, imaging, other investigations..."
                                className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-green-400" />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-green-600">II. Treatment Plan</p>
                            <Textarea rows={3} value={prescriptions} onChange={e => setPrescriptions(e.target.value)}
                                placeholder="Medications, dosages, frequency, duration..."
                                className="text-sm border-gray-200 bg-gray-50 rounded-xl resize-none placeholder:text-gray-300 focus:border-green-400" />
                        </div>
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-green-600">Recommendations</p>
                            <Textarea rows={2} value={recommendations} onChange={e => setRecommendations(e.target.value)}
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
                    {/* Referral cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {REFERRAL_OPTIONS.map((opt) => {
                            const Icon = opt.icon;
                            const isSelected = referredTo === opt.value;
                            return (
                                <button key={opt.value} type="button"
                                    onClick={() => { setReferredTo(isSelected ? "" : opt.value); setSelectedStaffId(""); }}
                                    className={`flex flex-col items-start gap-2 p-3 rounded-xl border-2 text-left transition-all duration-150
                                        ${isSelected ? `${opt.border} ${opt.bg}` : "border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white"}`}>
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

                    {/* Lab request details */}
                    {referredTo === "lab-tech" && (
                        <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <FlaskConical size={13} className="text-indigo-600" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Lab Request Details</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <FieldLabel required>Test Type</FieldLabel>
                                    <Select onValueChange={setLabTestType} value={labTestType}>
                                        <SelectTrigger className="h-10 text-sm bg-white border-gray-200 rounded-xl">
                                            <SelectValue placeholder="Select test..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white shadow-xl rounded-xl max-h-60">
                                            {LAB_TESTS.map(t => <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <FieldLabel>Priority</FieldLabel>
                                    <Select onValueChange={setLabPriority} value={labPriority}>
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
                                <Textarea rows={2} value={labNotes} onChange={e => setLabNotes(e.target.value)}
                                    placeholder="e.g. Patient is fasting. Collect before medication..."
                                    className="text-sm bg-white border-gray-200 rounded-xl resize-none placeholder:text-gray-300" />
                            </div>
                        </div>
                    )}

                    {/* Radiology request details */}
                    {referredTo === "radiology" && (
                        <div className="rounded-2xl border-2 border-cyan-200 bg-cyan-50/40 p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Radio size={13} className="text-cyan-600" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Radiology Request Details</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <FieldLabel required>Investigation Type</FieldLabel>
                                    <Select onValueChange={setRadTestType} value={radTestType}>
                                        <SelectTrigger className="h-10 text-sm bg-white border-gray-200 rounded-xl">
                                            <SelectValue placeholder="Select investigation..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white shadow-xl rounded-xl max-h-60">
                                            {RADIOLOGY_TESTS.map(t => <SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <FieldLabel>Priority</FieldLabel>
                                    <Select onValueChange={setRadPriority} value={radPriority}>
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
                                <Textarea rows={2} value={radNotes} onChange={e => setRadNotes(e.target.value)}
                                    placeholder="Relevant clinical history, specific area of concern..."
                                    className="text-sm bg-white border-gray-200 rounded-xl resize-none placeholder:text-gray-300" />
                            </div>
                        </div>
                    )}

                    {/* Status override + preview */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                        <div className="space-y-1.5">
                            <FieldLabel>Override Status (optional)</FieldLabel>
                            <Select onValueChange={setStatusOverride} value={statusOverride}>
                                <SelectTrigger className="h-10 text-sm bg-gray-50 border-gray-200 rounded-xl">
                                    <SelectValue placeholder="Auto (based on referral)" />
                                </SelectTrigger>
                                <SelectContent className="bg-white shadow-xl rounded-xl">
                                    {PATIENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>)}
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
                    className="w-full h-13 flex items-center justify-center gap-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-2xl shadow-lg shadow-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed py-3.5">
                    {loading
                        ? <><Loader2 size={16} className="animate-spin" /> Saving...</>
                        : <><CheckCircle2 size={16} /> Submit & Route Patient <ArrowRight size={15} /></>
                    }
                </button>
            </form>
        </div>
    );
}