"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-provider";
import { useCreateConsultation, useCreateLabRequest } from "@/hooks/use-emr";
import { updatePatientStatus } from "@/lib/supabase-service";
import { PatientStatus } from "@/types/models";
import { Staff } from "@/actions/staff/types";
import { toast } from "sonner";
import {
    Stethoscope, FlaskConical, Pill, ChevronDown, ChevronRight,
    Loader2, CheckCircle2, AlertCircle, Baby, User, Heart,
    Activity, Brain, Microscope, ClipboardList, BookOpen,
    Syringe, Users, FileText, List, Zap, Radio,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    patientId:            string;
    patientAge?:          number;
    patientGender?:       string;
    patientMedicalHistory?: string;
    availableStaff:       Staff[];
}

type ReferralTarget = "nurse" | "lab-tech" | "pharmacist" | "radiology" | "";

const LAB_TESTS = [
    "Full Blood Count (FBC)", "Malaria Parasite (MP)", "Blood Culture & Sensitivity",
    "Urinalysis", "Liver Function Test (LFT)", "Kidney Function Test (KFT)",
    "Fasting Blood Sugar (FBS)", "HBA1c", "Thyroid Function Test (TFT)",
    "HIV Screening", "Hepatitis B Surface Antigen", "Widal Test",
    "Electrolytes & Urea", "Lipid Profile", "Pregnancy Test (Urine/Serum)",
    "Stool Microscopy", "Sputum AFB", "Genotype", "Blood Group & Crossmatch",
];

const RADIOLOGY_TESTS = [
    "Chest X-Ray (PA View)", "Abdominal X-Ray", "Skull X-Ray",
    "Spine X-Ray (Cervical/Thoracic/Lumbar)", "Pelvic X-Ray",
    "Limbs X-Ray", "Ultrasound Scan (Abdomen/Pelvis)",
    "Obstetric Ultrasound", "Breast Ultrasound", "Cranial Ultrasound",
    "CT Scan (Brain)", "CT Scan (Chest)", "CT Scan (Abdomen/Pelvis)",
    "MRI Brain", "MRI Spine", "Echocardiogram",
    "Doppler Studies", "Fluoroscopy",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isPaediatric = (age?: number) => age !== undefined && age <= 12;
const isFemale     = (gender?: string) => gender?.toLowerCase() === "female" || gender?.toLowerCase() === "f";

// ─── Field components ─────────────────────────────────────────────────────────

const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
        {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </p>
);

const Field = ({ children }: { children: React.ReactNode }) => (
    <div className="space-y-0">{children}</div>
);

const textareaClass = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 font-medium placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400 focus:bg-white resize-none transition-all";
const inputClass    = "w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 font-medium placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400 focus:bg-white transition-all";
const selectClass   = "w-full h-10 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400 focus:bg-white appearance-none transition-all";

// ─── Section accordion ────────────────────────────────────────────────────────

function Section({
    id, icon: Icon, title, badge, color = "text-red-600", bg = "bg-red-50",
    defaultOpen = false, children,
}: {
    id: string; icon: React.ElementType; title: string; badge?: string;
    color?: string; bg?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button type="button" onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50/60 transition-colors text-left">
                <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                    <Icon size={15} className={color} />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{title}</p>
                    {badge && <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest font-bold">{badge}</p>}
                </div>
                {open ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
            </button>
            {open && <div className="px-5 pb-5 space-y-4 border-t border-gray-50">{children}</div>}
        </div>
    );
}

// ─── Patient type banner ──────────────────────────────────────────────────────

function PatientTypeBanner({ isChild, isFem }: { isChild: boolean; isFem: boolean }) {
    return (
        <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold
                ${isChild ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-gray-50 border-gray-200 text-gray-600"}`}>
                {isChild ? <Baby size={13} /> : <User size={13} />}
                {isChild ? "Paediatric Patient" : "Adult Patient"}
            </div>
            {isFem && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-pink-50 border-pink-200 text-pink-700 text-xs font-bold">
                    <Heart size={13} />
                    Female — Obstetric Fields Enabled
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ConsultationForm({
    patientId, patientAge, patientGender, patientMedicalHistory, availableStaff,
}: Props) {
    const { user }                              = useAuth();
    const { mutate: createConsultation, loading: creating } = useCreateConsultation();
    const { mutate: createLabRequest }          = useCreateLabRequest();

    const isChild = isPaediatric(patientAge);
    const isFem   = isFemale(patientGender);

    // ── Section A: History ──
    const [presentingComplaint,         setPresentingComplaint]         = useState("");
    const [symptomsAnalysis,            setSymptomsAnalysis]            = useState("");
    const [aetiology,                   setAetiology]                   = useState("");
    const [historyComplications,        setHistoryComplications]        = useState("");
    const [historyTreatment,            setHistoryTreatment]            = useState("");
    // Paediatric only
    const [antenatalHistory,            setAntenatalHistory]            = useState("");
    const [nutritionalHistory,          setNutritionalHistory]          = useState("");
    const [developmentalMilestones,     setDevelopmentalMilestones]     = useState("");
    const [immunisationHistory,         setImmunisationHistory]         = useState("");
    // Shared
    const [pastMedicalHistory,          setPastMedicalHistory]          = useState(patientMedicalHistory ?? "");
    const [drugHistory,                 setDrugHistory]                 = useState("");
    const [familySocialHistory,         setFamilySocialHistory]         = useState("");
    // Female obstetric
    const [imp,                         setImp]                         = useState("");  // Impression
    const [lmp,                         setLmp]                         = useState("");  // Last Menstrual Period
    const [ega,                         setEga]                         = useState("");  // Estimated Gestational Age
    const [eod,                         setEod]                         = useState("");  // Expected Date of Delivery
    const [gravidity,                   setGravidity]                   = useState("");
    const [parity,                      setParity]                      = useState("");

    // ── Section B & C: Examination ──
    const [generalExamination,          setGeneralExamination]          = useState("");
    const [respiratorySystem,           setRespiratorySystem]           = useState("");
    const [cardiovascularSystem,        setCardiovascularSystem]        = useState("");
    const [gastrointestinalSystem,      setGastrointestinalSystem]      = useState("");

    // ── Section D–F ──
    const [summary,                     setSummary]                     = useState("");
    const [assessment,                  setAssessment]                  = useState("");
    const [investigations,              setInvestigations]              = useState("");
    const [treatment,                   setTreatment]                   = useState("");

    // ── Referral ──
    const [referredTo,                  setReferredTo]                  = useState<ReferralTarget>("");
    const [labTestType,                 setLabTestType]                 = useState("");
    const [labPriority,                 setLabPriority]                 = useState("routine");
    const [labNotes,                    setLabNotes]                    = useState("");
    const [radiologyTestType,           setRadiologyTestType]           = useState("");
    const [radiologyPriority,           setRadiologyPriority]           = useState("routine");
    const [radiologyNotes,              setRadiologyNotes]              = useState("");

    // ── Status ──
    const [submitting, setSubmitting] = useState(false);

    // ─── Build concatenated consultation fields ────────────────────────────────

    const buildSymptoms = () => {
        const parts = [
            `Presenting Complaint: ${presentingComplaint}`,
            symptomsAnalysis      ? `Analysis of Symptoms: ${symptomsAnalysis}`      : "",
            aetiology             ? `Aetiology/Cause: ${aetiology}`                  : "",
            historyComplications  ? `History of Complications: ${historyComplications}` : "",
            historyTreatment      ? `History of Treatment: ${historyTreatment}`      : "",
            isChild && antenatalHistory        ? `Antenatal/Delivery History: ${antenatalHistory}`  : "",
            isChild && nutritionalHistory      ? `Nutritional History: ${nutritionalHistory}`        : "",
            isChild && developmentalMilestones ? `Developmental Milestones: ${developmentalMilestones}` : "",
            isChild && immunisationHistory     ? `Immunisation History: ${immunisationHistory}`     : "",
            pastMedicalHistory    ? `Past Medical & Surgical History: ${pastMedicalHistory}` : "",
            drugHistory           ? `Drug History: ${drugHistory}`                   : "",
            familySocialHistory   ? `Family & Social History: ${familySocialHistory}` : "",
            isFem && imp          ? `IMP (Impression): ${imp}`                       : "",
            isFem && lmp          ? `LMP: ${lmp}`                                    : "",
            isFem && ega          ? `EGA (Estimated Gestational Age): ${ega} weeks`  : "",
            isFem && eod          ? `EOD (Expected Date of Delivery): ${eod}`        : "",
            isFem && gravidity    ? `Gravidity: ${gravidity}`                        : "",
            isFem && parity       ? `Parity: ${parity}`                              : "",
        ].filter(Boolean).join("\n\n");
        return parts;
    };

    const buildDiagnosis = () => {
        const parts = [
            `General Examination: ${generalExamination}`,
            respiratorySystem      ? `Respiratory System: ${respiratorySystem}`      : "",
            cardiovascularSystem   ? `Cardiovascular System: ${cardiovascularSystem}` : "",
            gastrointestinalSystem ? `Gastrointestinal System: ${gastrointestinalSystem}` : "",
            summary                ? `Summary: ${summary}`                           : "",
        ].filter(Boolean).join("\n\n");
        return parts;
    };

    const buildRecommendations = () => {
        const parts = [
            assessment    ? `Assessment: ${assessment}`       : "",
            investigations? `Investigations: ${investigations}`: "",
            treatment     ? `Treatment: ${treatment}`         : "",
        ].filter(Boolean).join("\n\n");
        return parts;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!presentingComplaint.trim()) {
            toast.error("Presenting complaint is required."); return;
        }
        if (!generalExamination.trim()) {
            toast.error("General examination is required."); return;
        }
        if (!assessment.trim()) {
            toast.error("Assessment is required."); return;
        }

        setSubmitting(true);
        try {
            // Map referral → patient status
            const statusMap: Record<string, PatientStatus> = {
                "nurse":      PatientStatus.SentToNurse,
                "lab-tech":   PatientStatus.SentToLab,
                "pharmacist": PatientStatus.SentToPharmacy,
                "radiology":  PatientStatus.SentToLab, // treated same as lab routing
            };

            await createConsultation({
                patientId,
                doctorId:        user?.$id ?? user?.id ?? "",
                symptoms:        buildSymptoms(),
                diagnosis:       buildDiagnosis(),
                prescriptions:   treatment,
                recommendations: buildRecommendations(),
                referredTo:      referredTo || undefined,
                assignedStaffId: undefined,
                status:          "underConsultation",
            });

            // Create lab request
            if (referredTo === "lab-tech" && labTestType) {
                await createLabRequest({
                    patientId,
                    requestedBy: user?.$id ?? user?.id ?? "",
                    testType:    labTestType,
                    priority:    labPriority,
                    notes:       labNotes || undefined,
                    status:      "pending",
                });
            }

            // Create radiology request (stored as lab request with "radiology" prefix)
            if (referredTo === "radiology" && radiologyTestType) {
                await createLabRequest({
                    patientId,
                    requestedBy: user?.$id ?? user?.id ?? "",
                    testType:    `[RADIOLOGY] ${radiologyTestType}`,
                    priority:    radiologyPriority,
                    notes:       radiologyNotes || undefined,
                    status:      "pending",
                });
            }

            // Update patient status
            if (referredTo && statusMap[referredTo]) {
                await updatePatientStatus(patientId, statusMap[referredTo]);
            }

            toast.success("Consultation saved successfully.");

        } catch (err: any) {
            toast.error(err?.message ?? "Failed to save consultation.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">

            {/* Patient type banner */}
            <PatientTypeBanner isChild={isChild} isFem={isFem} />

            {/* ════════════════════════════════════════════════════════
                SECTION A — HISTORY
            ═══════════════════════════════════════════════════════════ */}

            {/* A1: Presenting Complaint */}
            <Section id="pc" icon={ClipboardList} title="A. History" badge="Section A" defaultOpen color="text-red-600" bg="bg-red-50">

                <div className="pt-4 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-400">A1 · Presenting Complaint *</p>
                    <Field>
                        <textarea rows={3} value={presentingComplaint} onChange={(e) => setPresentingComplaint(e.target.value)}
                            placeholder="Chief complaint — what brings the patient in today?"
                            className={textareaClass} />
                    </Field>
                </div>

                {/* A2: History of Presenting Complaints */}
                <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-400">A2 · History of Presenting Complaints</p>
                    <div className="pl-3 border-l-2 border-red-100 space-y-4">
                        <Field>
                            <Label>Analysis of Symptoms</Label>
                            <textarea rows={3} value={symptomsAnalysis} onChange={(e) => setSymptomsAnalysis(e.target.value)}
                                placeholder="Onset, duration, character, radiation, aggravating/relieving factors..."
                                className={textareaClass} />
                        </Field>
                        <Field>
                            <Label>Aetiology / Cause</Label>
                            <textarea rows={2} value={aetiology} onChange={(e) => setAetiology(e.target.value)}
                                placeholder="Possible cause or aetiology of presenting complaint..."
                                className={textareaClass} />
                        </Field>
                        <Field>
                            <Label>History of Complications</Label>
                            <textarea rows={2} value={historyComplications} onChange={(e) => setHistoryComplications(e.target.value)}
                                placeholder="Any complications related to this condition..."
                                className={textareaClass} />
                        </Field>
                        <Field>
                            <Label>History of Treatment</Label>
                            <textarea rows={2} value={historyTreatment} onChange={(e) => setHistoryTreatment(e.target.value)}
                                placeholder="Previous treatments tried for this complaint..."
                                className={textareaClass} />
                        </Field>
                    </div>
                </div>

                {/* A3–A6: Paediatric only */}
                {isChild && (
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                            <Baby size={13} className="text-blue-600" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">A3–A6 · Paediatric History</p>
                        </div>
                        <div className="pl-3 border-l-2 border-blue-100 space-y-4">
                            <Field>
                                <Label>A3 · Antenatal / Delivery History</Label>
                                <textarea rows={3} value={antenatalHistory} onChange={(e) => setAntenatalHistory(e.target.value)}
                                    placeholder="Pregnancy complications, mode of delivery, birth weight, APGAR score..."
                                    className={textareaClass} />
                            </Field>
                            <Field>
                                <Label>A4 · Nutritional History</Label>
                                <textarea rows={2} value={nutritionalHistory} onChange={(e) => setNutritionalHistory(e.target.value)}
                                    placeholder="Breastfeeding history, weaning, current diet, nutritional status..."
                                    className={textareaClass} />
                            </Field>
                            <Field>
                                <Label>A5 · Developmental Milestones</Label>
                                <textarea rows={3} value={developmentalMilestones} onChange={(e) => setDevelopmentalMilestones(e.target.value)}
                                    placeholder="Motor, language, social milestones — age achieved or any delays..."
                                    className={textareaClass} />
                            </Field>
                            <Field>
                                <Label>A6 · Immunisation History</Label>
                                <textarea rows={2} value={immunisationHistory} onChange={(e) => setImmunisationHistory(e.target.value)}
                                    placeholder="Vaccines received — BCG, OPV, DPT, Hepatitis B, Measles, etc..."
                                    className={textareaClass} />
                            </Field>
                        </div>
                    </div>
                )}

                {/* A7–A9: Shared */}
                <div className="space-y-4 pt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-400">A7–A9 · General History</p>
                    <div className="pl-3 border-l-2 border-red-100 space-y-4">
                        <Field>
                            <Label>A7 · Past Medical & Surgical History</Label>
                            <textarea rows={3} value={pastMedicalHistory} onChange={(e) => setPastMedicalHistory(e.target.value)}
                                placeholder="Previous illnesses, hospitalisations, surgeries and outcomes..."
                                className={textareaClass} />
                        </Field>
                        <Field>
                            <Label>A8 · Drug History</Label>
                            <textarea rows={2} value={drugHistory} onChange={(e) => setDrugHistory(e.target.value)}
                                placeholder="Current medications, dosages, allergies to drugs..."
                                className={textareaClass} />
                        </Field>
                        <Field>
                            <Label>A9 · Family & Social History</Label>
                            <textarea rows={3} value={familySocialHistory} onChange={(e) => setFamilySocialHistory(e.target.value)}
                                placeholder="Family illnesses, smoking, alcohol, occupation, living conditions..."
                                className={textareaClass} />
                        </Field>
                    </div>
                </div>

                {/* Female Obstetric Fields */}
                {isFem && (
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-2 px-3 py-2 bg-pink-50 border border-pink-100 rounded-xl">
                            <Heart size={13} className="text-pink-600" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-pink-600">Obstetric History — Female Patient</p>
                        </div>
                        <div className="pl-3 border-l-2 border-pink-100">
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <Field>
                                    <Label>IMP (Impression / Working Diagnosis)</Label>
                                    <input type="text" value={imp} onChange={(e) => setImp(e.target.value)}
                                        placeholder="e.g. G3P2 at 32 weeks" className={inputClass} />
                                </Field>
                                <Field>
                                    <Label>LMP (Last Menstrual Period)</Label>
                                    <input type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} className={inputClass} />
                                </Field>
                                <Field>
                                    <Label>EGA (Estimated Gestational Age)</Label>
                                    <input type="text" value={ega} onChange={(e) => setEga(e.target.value)}
                                        placeholder="e.g. 32 weeks + 4 days" className={inputClass} />
                                </Field>
                                <Field>
                                    <Label>EOD (Expected/Estimated Date of Delivery)</Label>
                                    <input type="date" value={eod} onChange={(e) => setEod(e.target.value)} className={inputClass} />
                                </Field>
                                <Field>
                                    <Label>Gravidity (G)</Label>
                                    <input type="number" min="0" value={gravidity} onChange={(e) => setGravidity(e.target.value)}
                                        placeholder="Total pregnancies" className={inputClass} />
                                </Field>
                                <Field>
                                    <Label>Parity (P)</Label>
                                    <input type="text" value={parity} onChange={(e) => setParity(e.target.value)}
                                        placeholder="e.g. P2+0 or P1011" className={inputClass} />
                                </Field>
                            </div>
                        </div>
                    </div>
                )}
            </Section>

            {/* ════════════════════════════════════════════════════════
                SECTION B — GENERAL EXAMINATION
            ═══════════════════════════════════════════════════════════ */}
            <Section id="exam" icon={Activity} title="B. General Examination" badge="Section B" color="text-blue-600" bg="bg-blue-50">
                <div className="pt-4">
                    <textarea rows={4} value={generalExamination} onChange={(e) => setGeneralExamination(e.target.value)}
                        placeholder="General appearance, consciousness, orientation, vital signs review, pallor, jaundice, cyanosis, clubbing, lymphadenopathy, oedema..."
                        className={textareaClass} />
                </div>
            </Section>

            {/* ════════════════════════════════════════════════════════
                SECTION C — SYSTEMIC EXAMINATION
            ═══════════════════════════════════════════════════════════ */}
            <Section id="systemic" icon={Stethoscope} title="C. Systemic Examination" badge="Section C" color="text-teal-600" bg="bg-teal-50">
                <div className="pt-4 space-y-4">
                    {[
                        { label: "I. Respiratory System",       value: respiratorySystem,      onChange: setRespiratorySystem,      placeholder: "Inspection, palpation, percussion, auscultation of chest..." },
                        { label: "II. Cardiovascular System",   value: cardiovascularSystem,   onChange: setCardiovascularSystem,   placeholder: "Heart sounds, murmurs, peripheral pulses, JVP, apex beat..." },
                        { label: "III. Gastrointestinal System",value: gastrointestinalSystem, onChange: setGastrointestinalSystem, placeholder: "Abdomen inspection, bowel sounds, organomegaly, tenderness, ascites..." },
                    ].map(({ label, value, onChange, placeholder }) => (
                        <div key={label} className="pl-3 border-l-2 border-teal-100 space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">{label}</p>
                            <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)}
                                placeholder={placeholder} className={textareaClass} />
                        </div>
                    ))}
                </div>
            </Section>

            {/* ════════════════════════════════════════════════════════
                SECTION D — SUMMARY
            ═══════════════════════════════════════════════════════════ */}
            <Section id="summary" icon={FileText} title="D. Summary" badge="Section D" color="text-violet-600" bg="bg-violet-50">
                <div className="pt-4">
                    <textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)}
                        placeholder="Brief clinical summary — key findings and their significance..."
                        className={textareaClass} />
                </div>
            </Section>

            {/* ════════════════════════════════════════════════════════
                SECTION E — ASSESSMENT
            ═══════════════════════════════════════════════════════════ */}
            <Section id="assessment" icon={Brain} title="E. Assessment / Diagnosis" badge="Section E" color="text-amber-600" bg="bg-amber-50">
                <div className="pt-4">
                    <textarea rows={3} value={assessment} onChange={(e) => setAssessment(e.target.value)}
                        placeholder="Diagnosis or differential diagnoses with reasoning..."
                        className={textareaClass} />
                </div>
            </Section>

            {/* ════════════════════════════════════════════════════════
                SECTION F — MANAGEMENT
            ═══════════════════════════════════════════════════════════ */}
            <Section id="management" icon={Zap} title="F. Management" badge="Section F" color="text-green-600" bg="bg-green-50">
                <div className="pt-4 space-y-4">
                    <div className="pl-3 border-l-2 border-green-100 space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-green-600">I. Investigations Planned</p>
                        <textarea rows={2} value={investigations} onChange={(e) => setInvestigations(e.target.value)}
                            placeholder="Planned investigations — lab, imaging, other..."
                            className={textareaClass} />
                    </div>
                    <div className="pl-3 border-l-2 border-green-100 space-y-1.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-green-600">II. Treatment Plan</p>
                        <textarea rows={3} value={treatment} onChange={(e) => setTreatment(e.target.value)}
                            placeholder="Medications, dosages, duration, non-pharmacological interventions..."
                            className={textareaClass} />
                    </div>
                </div>
            </Section>

            {/* ════════════════════════════════════════════════════════
                REFERRAL
            ═══════════════════════════════════════════════════════════ */}
            <Section id="referral" icon={ChevronRight} title="Referral & Routing" badge="Where to send patient next" color="text-indigo-600" bg="bg-indigo-50">
                <div className="pt-4 space-y-4">
                    <Field>
                        <Label>Refer Patient To</Label>
                        <div className="relative">
                            <select value={referredTo} onChange={(e) => setReferredTo(e.target.value as ReferralTarget)}
                                className={selectClass}>
                                <option value="">— No referral —</option>
                                <option value="nurse">Nurse</option>
                                <option value="lab-tech">Lab Technician</option>
                                <option value="radiology">Radiology</option>
                                <option value="pharmacist">Pharmacist</option>
                            </select>
                            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    </Field>

                    {/* Lab request fields */}
                    {referredTo === "lab-tech" && (
                        <div className="space-y-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                            <div className="flex items-center gap-2">
                                <FlaskConical size={13} className="text-indigo-600" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Lab Request Details</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field>
                                    <Label required>Test Type</Label>
                                    <div className="relative">
                                        <select value={labTestType} onChange={(e) => setLabTestType(e.target.value)} className={selectClass}>
                                            <option value="">Select test...</option>
                                            {LAB_TESTS.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </Field>
                                <Field>
                                    <Label>Priority</Label>
                                    <div className="relative">
                                        <select value={labPriority} onChange={(e) => setLabPriority(e.target.value)} className={selectClass}>
                                            <option value="routine">Routine</option>
                                            <option value="urgent">Urgent</option>
                                            <option value="stat">STAT</option>
                                        </select>
                                        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </Field>
                            </div>
                            <Field>
                                <Label>Clinical Notes for Lab</Label>
                                <textarea rows={2} value={labNotes} onChange={(e) => setLabNotes(e.target.value)}
                                    placeholder="Any notes for the lab technician..." className={textareaClass} />
                            </Field>
                        </div>
                    )}

                    {/* Radiology request fields */}
                    {referredTo === "radiology" && (
                        <div className="space-y-3 p-4 bg-cyan-50 border border-cyan-100 rounded-2xl">
                            <div className="flex items-center gap-2">
                                <Radio size={13} className="text-cyan-600" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Radiology Request Details</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field>
                                    <Label required>Investigation Type</Label>
                                    <div className="relative">
                                        <select value={radiologyTestType} onChange={(e) => setRadiologyTestType(e.target.value)} className={selectClass}>
                                            <option value="">Select investigation...</option>
                                            {RADIOLOGY_TESTS.map((t) => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </Field>
                                <Field>
                                    <Label>Priority</Label>
                                    <div className="relative">
                                        <select value={radiologyPriority} onChange={(e) => setRadiologyPriority(e.target.value)} className={selectClass}>
                                            <option value="routine">Routine</option>
                                            <option value="urgent">Urgent</option>
                                            <option value="stat">STAT</option>
                                        </select>
                                        <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </Field>
                            </div>
                            <Field>
                                <Label>Clinical Notes for Radiologist</Label>
                                <textarea rows={2} value={radiologyNotes} onChange={(e) => setRadiologyNotes(e.target.value)}
                                    placeholder="Clinical indication, relevant history for radiologist..." className={textareaClass} />
                            </Field>
                        </div>
                    )}
                </div>
            </Section>

            {/* Submit */}
            <button type="submit" disabled={submitting || creating}
                className="w-full h-12 flex items-center justify-center gap-2.5 bg-red-700 hover:bg-red-800 text-white font-bold text-sm rounded-2xl shadow-lg shadow-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting || creating
                    ? <><Loader2 size={16} className="animate-spin" /> Saving Consultation...</>
                    : <><CheckCircle2 size={16} /> Save Consultation</>
                }
            </button>
        </form>
    );
}