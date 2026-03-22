"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FaPills, FaFlask, FaCalendarAlt, FaNotesMedical, } from "react-icons/fa";
import { Activity, Pill } from "lucide-react";
import { MdAssignment, MdCheckCircle, MdOutlineEventNote, MdWarning } from "react-icons/md";
import ConsultationHistoryTable from "./consultation-history";
import PrescriptionDetails from "./prescription-details";
import PrescriptionHistory from "./prescription-history";
import { useAuth } from "@/context/auth-provider";
import ConsultationForm from "./consultation-form";
import { useConsultationContext } from "@/context/consultation/consultation";
import { usePatientContext } from "@/context/patients/patient-context";
import {  PatientStatus } from "@/context/patients/types";
import { getAllStaffs } from "@/actions/staff/get.staff";
import { useQuery } from "@tanstack/react-query";
import { Staff } from "@/actions/staff/types";
import { LabResultUploadForm } from "../lab-tech/lab-result-upload-form";
import VitalsCheckinAdvancedComponent from "../nurse/VitalsSuite";
import VitalsRecordDisplay from "./VitalRecordingDisplay";
import LabTab from "../lab-tech/components/lab-tab";
import { Patient } from "@/types/models";

const TAB_CONFIG = [
    {
        value: "vitals-recording",
        label: "Vitals",
        fullLabel: "Vitals Recording",
        icon: FaCalendarAlt,
        color: "text-primary",
    },
    {
        value: "consultations",
        label: "Consult",
        fullLabel: "Consultations",
        icon: FaNotesMedical,
        color: "text-emerald-600",
    },
    {
        value: "prescriptions",
        label: "Rx",
        fullLabel: "Prescriptions",
        icon: FaPills,
        color: "text-violet-600",
    },
    {
        value: "lab",
        label: "Lab",
        fullLabel: "Lab Results",
        icon: FaFlask,
        color: "text-sky-600",
    },
];

function EmptyState({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-400">
            <MdOutlineEventNote className="text-4xl opacity-40" />
            <p className="text-sm font-medium">{label}</p>
        </div>
    );
}

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
            className={`mb-5 flex items-start gap-3 px-4 py-3 rounded-xl border text-sm font-medium
                ${isError
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700"
                }`}
        >
            {isError ? (
                <MdWarning className="text-lg flex-shrink-0 mt-0.5" />
            ) : (
                <MdCheckCircle className="text-lg flex-shrink-0 mt-0.5" />
            )}
            <span>{message}</span>
        </div>
    );
}

export default function PatientDetailTabs({ patient }: { patient: Patient }) {
    const [tab, setTab] = useState("vitals-recording");
    const { state: consultationState, dispatch: consultationDispatch } = useConsultationContext();
    const { state: patientState, dispatch: patientDispatch } = usePatientContext();
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const formRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();

    const { data: staff = [] } = useQuery({
        queryKey: ["staffs"],
        queryFn: getAllStaffs,
    });

    const availableStaff = useMemo(
        () =>
            staff.filter(
                (s: Staff) =>
                    s.role &&
                    consultationState.referredTo &&
                    s.role.toLowerCase() === consultationState.referredTo
            ),
        [staff, consultationState.referredTo]
    );

    const [selectedStaffId, setSelectedStaffId] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (patient) {
            patientDispatch({ type: "SET_PATIENT", payload: [patient] });
            patientDispatch({ type: "UPDATE_NOTES", payload: patient.notes || "" });
            patientDispatch({ type: "SET_STATUS", payload: (patient.status as PatientStatus) || "no-status" });
            consultationDispatch({ type: "RESET_FORM" });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patient]);

    useEffect(() => {
        if (formError) {
            const t = setTimeout(() => setFormError(null), 5000);
            return () => clearTimeout(t);
        }
    }, [formError]);

    useEffect(() => {
        if (successMessage) {
            const t = setTimeout(() => setSuccessMessage(null), 4000);
            return () => clearTimeout(t);
        }
    }, [successMessage]);

    const scrollToFirstError = useCallback(() => {
        if (formRef.current) {
            const firstInvalid = formRef.current.querySelector("[aria-invalid='true']");
            if (firstInvalid) (firstInvalid as HTMLElement).focus();
        }
    }, []);

    const getMissingFields = useCallback((): string[] => {
        const missing: string[] = [];
        if (!patientState.status || patientState.status === "no-status") missing.push("Status");
        if (!consultationState.symptoms.trim()) missing.push("Symptoms");
        if (!consultationState.diagnosis.trim()) missing.push("Diagnosis");
        if (!consultationState.prescriptions.trim()) missing.push("Prescriptions");
        if (!consultationState.recommendations.trim()) missing.push("Recommendations");
        if (!consultationState.referredTo) missing.push("Referred To");
        if (!selectedStaffId) missing.push("Staff Assignment");
        return missing;
    }, [
        patientState.status,
        consultationState.symptoms,
        consultationState.diagnosis,
        consultationState.prescriptions,
        consultationState.recommendations,
        consultationState.referredTo,
        selectedStaffId,
    ]);

    

    const activeTab = TAB_CONFIG.find((t) => t.value === tab);

    return (
        <Tabs value={tab} onValueChange={setTab} className="w-full space-y-5">

            {/* ── Tab Bar ─────────────────────────────────────────────────── */}
            <TabsList className="flex w-full gap-1 bg-slate-100 border border-slate-200 rounded-2xl p-1.5 shadow-sm">
                {TAB_CONFIG.map(({ value, label, fullLabel, icon: Icon, color }) => (
                    <TabsTrigger
                        key={value}
                        value={value}
                        className={`
                            flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                            text-sm font-semibold transition-all duration-200
                            text-slate-500 hover:text-slate-700
                            data-[state=active]:bg-white data-[state=active]:shadow-md
                            data-[state=active]:${color} data-[state=active]:scale-[1.02]
                        `}
                        aria-label={fullLabel}
                    >
                        <Icon className={`text-base flex-shrink-0 ${tab === value ? color : ""}`} />
                        <span className="hidden sm:inline">{fullLabel}</span>
                        <span className="sm:hidden">{label}</span>
                    </TabsTrigger>
                ))}
            </TabsList>

            {/* ── Vitals Recording ────────────────────────────────────────── */}
           {/* Vitals Recording Tab */}
<TabsContent value="vitals-recording" className="mt-0">
    <div className="space-y-5">

        {/* ── Section header ── */}
        <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Activity size={17} className="text-blue-600" />
            </div>
            <div>
                <h3 className="text-sm font-bold text-gray-900 leading-tight">Vitals Recording</h3>
                <p className="text-xs text-gray-400 mt-0.5">Patient measurements and clinical observations</p>
            </div>
        </div>

        {/* ── Content grid ── */}
        <div className={`grid gap-5 ${user?.role === "Nurse" && patient.id ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>

            {/* Left — vitals display */}
            {patient.id && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
                        <div className="w-1.5 h-4 rounded-full bg-blue-500" />
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Latest Record</p>
                    </div>
                    <div className="p-5">
                        <VitalsRecordDisplay patientId={patient.id} />
                    </div>
                </div>
            )}

            {/* Right — vitals form (nurse only) */}
            {user?.role === "Nurse" && patient.id && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
                        <div className="w-1.5 h-4 rounded-full bg-green-500" />
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Record New Vitals</p>
                    </div>
                    <div className="p-5">
                        <VitalsCheckinAdvancedComponent patientId={patient.id} />
                    </div>
                </div>
            )}

        </div>

        {/* ── No patient fallback ── */}
        {!patient.id && (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                    <Activity size={20} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">No patient selected</p>
                <p className="text-xs text-gray-400 mt-1">Select a patient to view or record vitals</p>
            </div>
        )}
    </div>
</TabsContent>

            {/* ── Consultations ───────────────────────────────────────────── */}
            <TabsContent value="consultations" className="mt-0">
                <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                    {user?.role === "Doctor" && (
                        <>
                            <CardHeader className="bg-gradient-to-r from-emerald-50 via-emerald-50/40 to-transparent border-b border-slate-100 px-6 py-4">
                                <CardTitle className="flex items-center gap-2.5 text-base font-bold text-slate-800">
                                    <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <MdAssignment className="text-emerald-700 text-base" />
                                    </span>
                                    New Consultation
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6" ref={formRef}>
                                {formError && <AlertBanner type="error" message={formError} />}
                                {successMessage && <AlertBanner type="success" message={successMessage} />}
                                <ConsultationForm
                                    patientId={patient?.id!}
                                    // selectedStaffId={selectedStaffId}
                                    availableStaff={availableStaff}
                                    // onStaffSelect={setSelectedStaffId}
                                />
                            </CardContent>
                        </>
                    )}

                    {/* History — always visible */}
                    <div className={`px-6 pb-6 ${user?.role === "Doctor" ? "pt-0" : "pt-6"}`}>
                        {/* {user?.role === "Doctor" && ( */}
                        <div className="flex items-center gap-2 mb-4 pt-2 border-t border-slate-100">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Consultation History
                            </span>
                        </div>
                        {/* )} */}
                        <div className="rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
                            <ConsultationHistoryTable patientId={patient?.id!} />
                        </div>
                    </div>
                </Card>
            </TabsContent>

            {/* ── Prescriptions ── */}
            <TabsContent value="prescriptions" className="mt-0">
                <div className="space-y-5">

                    {/* ── Section header ── */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                            <Pill size={17} className="text-violet-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 leading-tight">Prescriptions</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Medication records and dispensing history</p>
                        </div>
                    </div>

                    {/* ── Content grid ── */}
                    <div className={`grid gap-5 ${user?.role === "Pharmacist" ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1"}`}>

                        {/* Left — create prescription (Pharmacist only) */}
                        {user?.role === "Pharmacist" && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
                                    <div className="w-1.5 h-4 rounded-full bg-violet-500" />
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">New Prescription</p>
                                </div>
                                <div className="p-5">
                                    <PrescriptionDetails patientId={patient?.id!} />
                                </div>
                            </div>
                        )}

                        {/* Right — history */}
                        {patient.id && (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-50">
                                    <div className="w-1.5 h-4 rounded-full bg-blue-500" />
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Prescription History</p>
                                </div>
                                <div className="p-5">
                                    <PrescriptionHistory patientId={patient.id} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── No patient fallback ── */}
                    {!patient.id && (
                        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
                            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                                <Pill size={20} className="text-gray-300" />
                            </div>
                            <p className="text-sm font-semibold text-gray-500">No patient selected</p>
                            <p className="text-xs text-gray-400 mt-1">Select a patient to view prescriptions</p>
                        </div>
                    )}
                </div>
            </TabsContent>

            {/* ── Lab Results ─────────────────────────────────────────────── */}
            <TabsContent value="lab" className="mt-0">
                <LabTab patient={patient} userRole={user?.role} />
            </TabsContent>
        </Tabs>
    );
}