"use client";

import React, { useMemo, useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth-provider";
import { motion, AnimatePresence } from "framer-motion";
import { User, Droplets, Pill, Calendar, ChevronRight, RotateCcw } from "lucide-react";
import ReturnPatient from "./return-patient";
import { processReturnVisit } from "@/lib/actions/patient-workflow.actions";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import {
    useAllPatients,
    usePatientsByStatus,
    patientKeys,
} from "@/hooks/emr/use-emr";
import { getPatientById } from "@/lib/services/patient.service";
import { calculateAge, formatDate } from "@/lib/utils";
import type { Patient } from "@/types/models";

// ══════════════════════════════════════════════════════════════════════════════
// ROLE → VISIBLE STATUSES
//
// Frontdesk and Admin: see every patient (useAllPatients)
// All other roles: see only patients at their specific stage(s)
// ══════════════════════════════════════════════════════════════════════════════

const ROLE_STATUSES: Record<string, string[] | null> = {
    Frontdesk: null,    // null = all patients
    Admin: null,
    Doctor: ["awaiting-consultation", "under-consultation"],
    Nurse: ["sent-to-nurse", "under-observation", "admitted"],
    LabTechnician: ["sent-to-lab"],
    Pharmacist: ["sent-to-pharmacy"],
    Radiologist: ["sent-to-radiology"],
};

// Role → destination route on card click
const ROLE_ROUTES: Record<string, (id: string) => string> = {
    Frontdesk: (id) => `/front-desk/patient/${id}`,
    FrontDesk: (id) => `/front-desk/patient/${id}`,
    Doctor: (id) => `/doctor/patients/${id}`,
    Nurse: (id) => `/nurse/queue/patient/${id}`,
    Labtech: (id) => `/lab-tech/requests/patient/${id}`,
    Pharmacist: (id) => `/pharmacist/queue/patient/${id}`,
    Radiologist: (id) => `/radiology/requests/patient/${id}`,
    Admin: (id) => `/admin/patient/${id}`,
};

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
    "registered": { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
    "awaiting-consultation": { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-400" },
    "under-consultation": { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
    "sent-to-nurse": { bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-500" },
    "sent-to-lab": { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
    "sent-to-pharmacy": { bg: "bg-pink-50", text: "text-pink-700", dot: "bg-pink-500" },
    "sent-to-radiology": { bg: "bg-cyan-50", text: "text-cyan-700", dot: "bg-cyan-500" },
    "awaiting-payment": { bg: "bg-orange-50", text: "text-orange-700 ", dot: "bg-orange-500" },
    "admitted": { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    "under-observation": { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
    "discharged": { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
    "no-status": { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400" },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["no-status"];
    const label = status.replace(/-/g, " ").replace(/^\w/, c => c.toUpperCase());
    return (
        <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold", cfg.bg, cfg.text)}>
            <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
            {label}
        </span>
    );
}

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },

};

const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } },
    exit: { opacity: 0, y: 8, transition: { duration: 0.15 } },
};

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 animate-pulse space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-200" />
                        <div className="space-y-2 flex-1">
                            <div className="h-3 bg-gray-200 rounded-full w-3/4" />
                            <div className="h-2.5 bg-gray-200 rounded-full w-1/2" />
                        </div>
                    </div>
                    <div className="space-y-2 pt-1">
                        <div className="h-2.5 bg-gray-200 rounded-full w-full" />
                        <div className="h-2.5 bg-gray-200 rounded-full w-5/6" />
                        <div className="h-2.5 bg-gray-200 rounded-full w-4/6" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Patient card grid ────────────────────────────────────────────────────────

function PatientGrid({
    patients,
    role,
}: {
    patients: Patient[];
    role: string;
}) {
    const router = useRouter();
    const qc = useQueryClient();
    const { user } = useAuth();
    const [returnPatient, setReturnPatient] = useState<Patient | null>(null);
    const staffId = user?.$id ?? user?.id ?? "";
    const canReturn = role === "Frontdesk" || role === "FrontDesk" || role === "Admin";

    const navigate = (id: string) => {
        const route = ROLE_ROUTES[role]?.(id);
        if (route) router.push(route);
    };

    const prefetch = (id: string) => {
        qc.prefetchQuery({
            queryKey: patientKeys.detail(id),
            queryFn: () => getPatientById(id),
            staleTime: 60_000,
        });
    };

    if (!patients.length) return (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                <User size={20} className="text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">No patients in your queue</p>
            <p className="text-xs text-gray-400">Patients will appear here once they reach this stage.</p>
        </div>
    );

    return (
        <>
        <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <AnimatePresence>
                {patients.map(patient => {
                    const pid = patient.id!;
                    const gender = (patient.gender ?? "").toLowerCase();
                    const isFemale = gender === "female";

                    return (
                        <motion.div
                            key={pid}
                            variants={cardVariants as any}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            layout
                            tabIndex={0}
                            role="button"
                            aria-label={`View ${patient.name}`}
                            onClick={() => navigate(pid)}
                            onMouseEnter={() => prefetch(pid)}
                            onKeyDown={e => (e.key === "Enter" || e.key === " ") && navigate(pid)}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            className="group relative flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 cursor-pointer outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 transition-all duration-150 overflow-hidden"
                        >
                            {/* Gender colour strip */}
                            <div className={clsx("h-1 w-full", isFemale ? "bg-pink-400" : "bg-blue-500")} />

                            <div className="p-5 flex flex-col gap-4 flex-1">

                                {/* Avatar + name */}
                                <div className="flex items-start gap-3">
                                    <div className={clsx(
                                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                        isFemale ? "bg-pink-50" : "bg-blue-50"
                                    )}>
                                        <User size={18} className={isFemale ? "text-pink-500" : "text-blue-600"} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-gray-900 truncate leading-tight" title={patient.name ?? ""}>
                                            {patient.name ?? <span className="italic text-gray-400">Unknown</span>}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            {patient.gender && (
                                                <span className={clsx("text-xs font-semibold", isFemale ? "text-pink-500" : "text-blue-500")}>
                                                    {patient.gender}
                                                </span>
                                            )}
                                            {patient.birth_date && (
                                                <span className="text-xs text-gray-400 font-medium">
                                                    {calculateAge(patient.birth_date)} yrs
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight size={15} className="text-gray-200 group-hover:text-blue-400 transition-colors shrink-0 mt-0.5" />
                                </div>

                                <div className="border-t border-gray-50" />

                                {/* Info */}
                                <div className="space-y-2.5">
                                    <InfoRow icon={<Calendar size={13} className="text-gray-400" />}>
                                        {patient.created_at ? formatDate(patient.created_at) : <span className="italic text-gray-300">No date</span>}
                                    </InfoRow>
                                    <InfoRow icon={<Droplets size={13} className="text-red-400" />} label="Blood">
                                        {patient.blood_group ?? <span className="italic text-gray-300">N/A</span>}
                                    </InfoRow>
                                    <InfoRow icon={<Pill size={13} className="text-pink-400" />} label="Allergies">
                                        <span className="truncate max-w-[140px] block" title={patient.allergies ?? ""}>
                                            {patient.allergies ?? <span className="italic text-gray-300">None listed</span>}
                                        </span>
                                    </InfoRow>
                                </div>

                                {/* Status */}
                                <div className="mt-auto pt-1 flex items-center justify-between gap-2">
                                    <StatusBadge status={patient.status ?? "no-status"} />
                                    {canReturn && patient.status === "discharged" && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setReturnPatient(patient);
                                            }}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-100"
                                        >
                                            <RotateCcw size={11} /> Return
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </motion.div>

        <Dialog open={!!returnPatient} onOpenChange={(o) => !o && setReturnPatient(null)}>
            <DialogContent className="max-w-lg p-0 border-0 bg-transparent shadow-none">
                {returnPatient?.id && (
                    <ReturnPatient
                        patientId={returnPatient.id}
                        patientName={returnPatient.name ?? "Patient"}
                        staffId={staffId}
                        onReturn={async (input) => {
                            await processReturnVisit(input);
                        }}
                        onCancel={() => setReturnPatient(null)}
                    />
                )}
            </DialogContent>
        </Dialog>
        </>
    );
}

// ─── All-patients view (Frontdesk + Admin) ────────────────────────────────────

function AllPatientsView({ role }: { role: string }) {
    const { data: patients = [], isPending } = useAllPatients();
    if (isPending) return <Skeleton />;
    return <PatientGrid patients={patients as Patient[]} role={role} />;
}

// ─── Role-filtered view ───────────────────────────────────────────────────────
// Renders one section per relevant status, each fetching independently.
// This means a Nurse only fires queries for sent-to-nurse, under-observation,
// and admitted — never touching doctor or pharmacy data.

function RoleFilteredView({
    statuses,
    role,
}: {
    statuses: string[];
    role: string;
}) {
    return (
        <>
            {statuses.map(status => (
                <StatusSection key={status} status={status} role={role} />
            ))}
        </>
    );
}

function StatusSection({ status, role }: { status: string; role: string }) {
    const { data: patients = [], isPending } = usePatientsByStatus(status as any);

    if (isPending) return <Skeleton />;
    if (!patients.length) return null;   // don't show empty sections

    const label = status.replace(/-/g, " ").replace(/^\w/, c => c.toUpperCase());
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG["no-status"];

    return (
        <div>
            {/* Section label — only useful when a role has multiple statuses */}
            {role === "Nurse" || role === "Admin" ? (
                <div className="flex items-center gap-2 px-6 pt-4 pb-1">
                    <span className={clsx("w-2 h-2 rounded-full", cfg.dot)} />
                    <p className={clsx("text-[10px] font-black uppercase tracking-widest", cfg.text)}>{label}</p>
                    <span className={clsx("text-[9px] font-black px-1.5 py-0.5 rounded-full", cfg.bg, cfg.text)}>
                        {patients.length}
                    </span>
                </div>
            ) : null}
            <PatientGrid patients={patients as Patient[]} role={role} />
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface PatientsTableProps {
    /** Optional: provide patients directly (disables internal role-aware fetching) */
    patients?: Patient[];
    /** Optional: loading state when patients are provided externally */
    isPending?: boolean;
    /** Optional: current page (for pagination context) */
    currentPage?: number;
    /** Optional: override the detected user role */
    roleOverride?: string;
}

const PatientsTable: React.FC<PatientsTableProps> = ({ 
    patients: externalPatients, 
    isPending: externalIsPending,
    roleOverride,
}) => {
    const { user } = useAuth();
    const role = roleOverride ?? user?.role ?? "Frontdesk";

    // If patients are provided externally (e.g. from a search/filter component), use them directly
    if (externalPatients !== undefined) {
        if (externalIsPending) return <Skeleton />;
        return <PatientGrid patients={externalPatients} role={role} />;
    }

    // Otherwise, use role-aware internal fetching
    const statuses = ROLE_STATUSES[role] ?? null;

    // Frontdesk and Admin see everything
    if (statuses === null) return <AllPatientsView role={role} />;

    return <RoleFilteredView statuses={statuses} role={role} />;
};

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({
    icon, label, children,
}: {
    icon: React.ReactNode;
    label?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="shrink-0">{icon}</span>
            {label && <span className="text-gray-400 font-medium shrink-0">{label}:</span>}
            <span className="font-medium">{children}</span>
        </div>
    );
}

export default PatientsTable;