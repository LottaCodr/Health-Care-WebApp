"use client";

import dynamic from "next/dynamic";
import { useEffect, useCallback, useState, ReactNode } from "react";
import { usePatientStore } from "@/store/patient-store";
import { useConsultationStore } from "@/store/consultation-store";
import PatientDetailsSkeleton from "./skeleton";
import { Patient, PatientStatus } from "@/types/models";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-provider";
import ReturnPatient from "./return-patient";
import AllergyAlertBanner from "./allergy-alert-banner";
import PatientRecordDownload, { DownloadOptions } from "./patient-record-download";
import EditDemographicsDialog from "./edit-demographics-dialog";
import { CareTeamAvatarStack } from "@/components/emr/care-team";
// processReturnVisit is called internally by ReturnPatient — no import needed here.
import { generatePatientRecord } from "@/lib/actions/generate-patient-record";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    User, Mail, Phone, MapPin, Briefcase, ShieldAlert, CheckCircle,
    ClipboardList, Activity, Heart, Building2, CreditCard, Copy,
    Check, ChevronRight, ArrowLeft, AlertTriangle, Dna, Droplets,
    Baby, BookUser, Pill, History, Syringe, Download, Pencil,
} from "lucide-react";
import { useRouter } from "next/navigation";

const PatientDetailTabs = dynamic(() => import("./patient-detail-tabs"), {
  loading: () => (
    <div
      className="animate-pulse rounded-2xl border border-gray-100 bg-white h-52 w-full"
      aria-hidden
    />
  ),
});

interface Props {
    patient: Patient;
}

export default function PatientDetailsComponent({ patient }: Props) {
    const patientStore      = usePatientStore();
    const consultationStore = useConsultationStore();
    const { user } = useAuth();
    


    const [showCopied,   setShowCopied]   = useState(false);
    const [activeGroup,  setActiveGroup]  = useState("basic");
    const [returnOpen,   setReturnOpen]   = useState(false);
    const [downloadOpen, setDownloadOpen] = useState(false);
    const [editDemoOpen, setEditDemoOpen] = useState(false);

    const role         = (user?.role ?? "").toLowerCase();
    const isFrontDesk  = role.includes("front");
    const isAdmin      = role.includes("admin");
    const canDownload  = isFrontDesk || isAdmin || role.includes("doc");
    const isDischarged =
        patient.status === PatientStatus.Discharged ||
        String(patient.status).toLowerCase() === "discharged";
    const staffId = user?.$id ?? user?.id ?? "";

    useEffect(() => {
        if (patient) {
            patientStore.setPatient([patient]);
            patientStore.updateNotes(patient.notes || "");
            patientStore.setStatus((patient.status as PatientStatus) || "no-status");
            consultationStore.resetForm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patient]);

    // Deep-link: /patient/[id]?readmit=1 (from the dashboard "Re-admit" action)
    // auto-opens the return-visit dialog for discharged patients.
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!patient?.id || !isFrontDesk || !isDischarged) return;
        const params = new URLSearchParams(window.location.search);
        if (params.get("readmit") === "1") setReturnOpen(true);
    }, [patient?.id, isFrontDesk, isDischarged]);

    const handleCopyId = useCallback(async (id: string) => {
        try {
            await navigator.clipboard.writeText(id);
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 1800);
        } catch {
            toast({ variant: "destructive", title: "Copy Failed", description: "Could not copy patient ID." });
        }
    }, []);

    const handleBack = useCallback(() => {
        if (window.history.length > 1) window.history.back();
    }, []);

    async function handleDownload(options: DownloadOptions) {
        try {
            // Fix RecordSection enum/type incompatibility by remapping sections if necessary to correct type import.
            // Force type assertion of sections to the correct type expected by generatePatientRecord.
            const { sections, ...restOptions } = options as any;
            const result = await generatePatientRecord({
                patientId: patient.id!,
                ...(sections ? { sections: sections as import('../../lib/actions/generate-patient-record').RecordSection[] } : {}),
                ...restOptions,
            });
 

            if (result.type === "pdf") {
                const bytes  = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
                const blob   = new Blob([bytes], { type: "application/pdf" });
                const url    = URL.createObjectURL(blob);
                const anchor = document.createElement("a");
                anchor.href     = url;
                anchor.download = result.filename;
                anchor.click();
                URL.revokeObjectURL(url);
            } else {
                const win = window.open("", "_blank", "width=1000,height=760,scrollbars=yes");
                if (win) {
                    win.document.write(result.html);
                    win.document.close();
                } else {
                    const blob = new Blob([result.html], { type: "text/html" });
                    const url  = URL.createObjectURL(blob);
                    window.open(url, "_blank");
                    URL.revokeObjectURL(url);
                }
            }

            toast({ title: "Record ready", description: "Patient record generated successfully." });
        } catch {
            toast({ variant: "destructive", title: "Export failed", description: "Could not generate patient record." });
            throw new Error("Export failed");
        }
    }

    if (consultationStore.loading) return <PatientDetailsSkeleton />;

    if (!patientStore.patient?.length) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
                    <AlertTriangle size={28} className="text-red-500" />
                </div>
                <p className="text-gray-600 font-semibold">Patient not found.</p>
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                    <ArrowLeft size={15} /> Go back
                </button>
            </div>
        );
    }

    const currentPatient = patientStore.patient[0];

    return (
        <main className="min-w-0 max-w-full py-2 sm:py-4 space-y-5 sm:space-y-7">

            {/* Return visit banner */}
            {isFrontDesk && isDischarged && patient.id && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-teal-50 border border-teal-100">
                    <p className="text-sm text-teal-800 font-medium">
                        This patient is discharged. Start a re-encounter to check them in again.
                   
                    </p>
                    <button
                        type="button"
                        onClick={() => setReturnOpen(true)}
                        className="shrink-0 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold"
                    >
                        Start Re-encounter
                   
                   
                    </button>
                </div>
            )}

            {/* Return visit dialog */}
            <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
                <DialogContent className="max-w-lg p-0 border-0 bg-transparent shadow-none">
                    <ReturnPatient
                        patientId={patient.id!}
                        patientName={patient.name ?? "Patient"}
                        staffId={staffId}
                        onSuccess={() => setReturnOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            {/* Download dialog */}
            <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="pb-2 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                <Download size={16} className="text-blue-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-sm font-bold text-gray-900">
                                    Download Patient Record
                                </DialogTitle>
                                <p className="text-xs text-gray-400 mt-0.5">{patient.name}</p>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="pt-2">
                        <PatientRecordDownload
                            patientId={patient.id!}
                            patientName={patient.name ?? "Patient"}
                            onDownload={handleDownload}
                        />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Allergy alert — always the first thing staff see on this record */}
            {patient.id && (
                <AllergyAlertBanner
                    patientId={patient.id}
                    legacyAllergies={(patient as any).allergies}
                />
            )}

            {/* Admin-only demographics correction — front-desk typos (name,
                sex, DOB, contact details) shouldn't require a DBA to fix. */}
            {isAdmin && patient.id && (
                <EditDemographicsDialog
                    patient={patient}
                    open={editDemoOpen}
                    onOpenChange={setEditDemoOpen}
                />
            )}

            {/* Profile card */}
            <PatientProfile
                patient={currentPatient}
                status={patientStore.status}
                onCopyId={() => handleCopyId(currentPatient.id || (currentPatient as any).$id || "")}
                showCopied={showCopied}
                activeGroup={activeGroup}
                setActiveGroup={setActiveGroup}
                canDownload={canDownload}
                onDownload={() => setDownloadOpen(true)}
                onEditDemographics={isAdmin ? () => setEditDemoOpen(true) : undefined}
            />

            <PatientDetailTabs patient={patient} />
        </main>
    );
}

// ─── Group definitions ────────────────────────────────────────────────────────

const GROUPS = [
    { id: "basic",     label: "Personal",  icon: User        },
    { id: "emergency", label: "Emergency", icon: ShieldAlert },
    { id: "medical",   label: "Medical",   icon: Activity    },
    { id: "insurance", label: "Insurance", icon: CreditCard  },
];

// ─── Patient profile ──────────────────────────────────────────────────────────

function PatientProfile({
    patient, status, onCopyId, showCopied, activeGroup, setActiveGroup,
    canDownload, onDownload, onEditDemographics,
}: {
    patient:          Patient;
    status:           PatientStatus;
    onCopyId:         () => void;
    showCopied:       boolean;
    activeGroup:      string;
    setActiveGroup:   (id: string) => void;
    canDownload:      boolean;
    onDownload:       () => void;
    /** Admin-only — opens the demographics correction dialog. */
    onEditDemographics?: () => void;
}) {
    const p = patient as any;

    const groups: Record<string, { label: string; icon: ReactNode; value: ReactNode }[]> = {
        basic: [
            { label: "Full Name",   icon: <User size={14} />,      value: patient.name },
            { label: "Gender",      icon: <User size={14} />,      value: patient.gender },
            { label: "Birth Date",  icon: <Baby size={14} />,      value: patient.birth_date ? new Date(patient.birth_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null },
            { label: "Religion",    icon: <BookUser size={14} />,  value: p.religion },
            { label: "Occupation",  icon: <Briefcase size={14} />, value: patient.occupation },
            { label: "Email",       icon: <Mail size={14} />,      value: patient.email },
            { label: "Phone",       icon: <Phone size={14} />,     value: patient.phone },
            { label: "Address",     icon: <MapPin size={14} />,    value: patient.address },
            {
                label: "Hospital Number",
                icon: <ClipboardList size={14} />,
                value: <span className="font-mono text-sm font-bold text-gray-800">{p.hospital_number || "—"}</span>,
            },
            {
                label: "Patient ID",
                icon: <ClipboardList size={14} />,
                value: (
                    <span className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500 truncate max-w-[140px]">
                            {p.userId || p.id || "—"}
                        </span>
                        <button
                            type="button"
                            onClick={onCopyId}
                            className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold transition-colors"
                        >
                            {showCopied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                        </button>
                    </span>
                ),
            },
        ],
        emergency: [
            { label: "Name",         icon: <User size={14} />,     value: patient.emergency_contact_name },
            { label: "Phone",        icon: <Phone size={14} />,    value: patient.emergency_contact_number },
            { label: "Relationship", icon: <BookUser size={14} />, value: patient.emergency_contact_relationship },
            { label: "Email",        icon: <Mail size={14} />,     value: patient.emergency_contact_email },
            { label: "Address",      icon: <MapPin size={14} />,   value: patient.emergency_contact_address },
        ],
        medical: [
            { label: "Allergies",                icon: <ShieldAlert size={14} />, value: patient.allergies },
            { label: "Blood Group",              icon: <Droplets size={14} />,   value: patient.blood_group },
            { label: "Genotype",                 icon: <Dna size={14} />,        value: patient.geno_type },

            { label: "Long-Term Medication",     icon: <Pill size={14} />,       value: patient.long_term_medication },
            { label: "Significant Med. History", icon: <History size={14} />,    value: patient.significant_medication_history },
            { label: "Covid Vaccination",        icon: <Syringe size={14} />,    value: patient.covid_vaccination_options },
        ],
        insurance: [
            { label: "HMO",            icon: <Building2 size={14} />,  value: patient.hmo ? "Yes" : "No" },
            { label: "HMO Name",       icon: <Building2 size={14} />,  value: patient.hmo_name },
            { label: "Policy Number",  icon: <CreditCard size={14} />, value: patient.policy_number },
            { label: "Company",        icon: <Building2 size={14} />,  value: patient.company ? "Yes" : "No" },
            { label: "Company Name",   icon: <Building2 size={14} />,  value: patient.company_name },
            { label: "Private Client", icon: <CheckCircle size={14} />,value: patient.private_client ? "Yes" : "No" },
        ],
    };

    const statusColors: Record<string, string> = {
        registered:              "bg-gray-100 text-gray-600",
        "awaiting-consultation": "bg-yellow-50 text-yellow-700",
        "under-consultation":    "bg-blue-50 text-blue-700",
        "sent-to-nurse":         "bg-teal-50 text-teal-700",
        "sent-to-lab":           "bg-indigo-50 text-indigo-700",
        "sent-to-pharmacy":      "bg-violet-50 text-violet-700",
        "awaiting-payment":      "bg-orange-50 text-orange-700",
        admitted:                "bg-red-50 text-red-700",
        "under-observation":     "bg-cyan-50 text-cyan-700",
        discharged:              "bg-green-50 text-green-700",
        "sent-to-radiology":     "bg-cyan-50 text-cyan-700",
        "no-status":             "bg-gray-100 text-gray-600",
    };

    const statusClass  = statusColors[status] || "bg-gray-100 text-gray-600";
    const activeFields = groups[activeGroup] ?? [];
    const router = useRouter();
    return (
        <section className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

            {/* ── Hero header ─────────────────────────────────────────────────── */}
            <div className="relative px-4 pt-6 pb-5 sm:px-6 sm:pt-8 sm:pb-6 bg-gradient-to-br from-blue-700 to-blue-900 overflow-hidden">
                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
                <div className="absolute top-8 -right-4 w-28 h-28 rounded-full bg-white/5" />

                <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
                        <User size={28} className="text-white" />
                    </div>

                    {/* Name & meta */}
                    <div className="flex-1 min-w-0">
                        <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Patient Profile</p>
                        <h2 className="text-xl sm:text-2xl font-bold text-white break-words">
                            {patient.name || <span className="italic text-white/70">Unnamed patient</span>}
                        </h2>
                        {/* Patient ID - prominently visible at top */}
                        <div className="flex flex-wrap items-center gap-2 mt-2.5">
                            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 backdrop-blur-sm">
                                <ClipboardList size={12} className="text-white/80" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/60">ID</span>
                                <span className="font-mono text-xs font-bold text-white tracking-wide max-w-[160px] truncate">
                                    {p.id || (p as any).$id || (patient as any).userId || "—"}
                                </span>
                                <button
                                    type="button"
                                    onClick={onCopyId}
                                    className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold transition-colors"
                                >
                                    {showCopied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
                                </button>
                            </span>
                            {p.hospital_number && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 backdrop-blur-sm">
                                    <ClipboardList size={12} className="text-white/80" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">HN</span>
                                    <span className="font-mono text-xs font-bold text-white tracking-wide">{p.hospital_number}</span>
                                </span>
                            )}
                            {patient.gender && (
                                <span className="text-xs text-white/70 bg-white/10 px-2 py-0.5 rounded-full">
                                    {patient.gender}
                                </span>
                            )}
                            {patient.birth_date && (
                                <span className="text-xs text-white/70 bg-white/10 px-2 py-0.5 rounded-full">
                                    DOB: {new Date(patient.birth_date).toLocaleDateString()}
                                </span>
                            )}
                            {patient.id && (
                                <CareTeamAvatarStack
                                    patientId={patient.id}
                                    patientName={patient.name}
                                    hospitalNumber={p.hospital_number}
                                    variant="hero"
                                    size="sm"
                                />
                            )}
                        </div>
                    </div>

                    {/* Right-side actions: status + view timeline + download record */}
                    <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2 shrink-0">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusClass}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {status || "No Status"}
                        </span>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => router.push(`/patient-timeline/${patient.id}`)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-all backdrop-blur-sm shadow-xs"
                                title="View chronological patient journey timeline"
                            >
                                <History size={12} />
                                View Timeline
                            </button>

                            {onEditDemographics && (
                                <button
                                    type="button"
                                    onClick={onEditDemographics}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-all backdrop-blur-sm shadow-xs"
                                    title="Correct registration details — name, sex, date of birth, contact info (admin only)"
                                >
                                    <Pencil size={12} />
                                    Edit Demographics
                                </button>
                            )}

                            {canDownload && (
                                <button
                                    type="button"
                                    onClick={onDownload}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-all backdrop-blur-sm"
                                    title="Export or print comprehensive medical record"
                                >
                                    <Download size={12} />
                                    Download Record
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Group tab nav ─────────────────────────────────────────────────── */}
            <div className="flex border-b border-gray-100 px-2 overflow-x-auto scrollbar-hide">
                {GROUPS.map((g) => {
                    const Icon     = g.icon;
                    const isActive = activeGroup === g.id;
                    return (
                        <button
                            key={g.id}
                            type="button"
                            onClick={() => setActiveGroup(g.id)}
                            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all duration-150 ${
                                isActive
                                    ? "border-blue-700 text-blue-700"
                                    : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200"
                            }`}
                        >
                            <Icon size={15} />
                            {g.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Fields grid ───────────────────────────────────────────────────── */}
            <div className="px-4 py-4 sm:px-6 sm:py-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeFields.map((field) => (
                        <InfoItem key={field.label} label={field.label} icon={field.icon} value={field.value} />
                    ))}
                </div>
            </div>
        </section>
    );
}

// ─── Info item ────────────────────────────────────────────────────────────────

function InfoItem({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
    const isEmpty = value === null || value === undefined || value === "";
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-3.5 hover:border-blue-100 hover:bg-blue-50/30 transition-colors group">
            <div className="mt-0.5 w-7 h-7 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0 text-gray-400 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors shadow-sm">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
                {isEmpty
                    ? <p className="text-sm text-gray-300 italic">Not provided</p>
                    : <div className="text-sm font-medium text-gray-800 break-words">{value}</div>
                }
            </div>
        </div>
    );
}