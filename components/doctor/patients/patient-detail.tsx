"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { databases } from "@/lib/appwrite.config";
import { getAllStaffs } from "@/actions/staff/get.staff";
import { createConsultation } from "@/actions/consultations/consultation";
import { usePatientContext } from "@/context/patients/patient-context";
import { useConsultationContext } from "@/context/consultation/consultation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import PatientDetailsSkeleton from "./skeleton";
import { Patient, PatientStatus } from "@/context/patients/types";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-provider";
import { ConsultationReferred } from "@/actions/consultations/types";
import ConsultationHistoryTable from "./consultation-history";

import { FaUserMd } from "react-icons/fa";
import { MdEmail, MdPhone, MdLocationOn, MdWork, MdMedicalServices, MdHistory, MdAssignment, MdWarning, MdCheckCircle, MdNote, MdArrowBack } from "react-icons/md";
import { BsGenderAmbiguous } from "react-icons/bs";
import ConsultationForm from "./consultation-form";
import { Staff } from "@/actions/staff/types";
import { assignNurse } from "@/actions/nursing-action/get.nurse.task";
import { assignPharmacist } from "@/actions/pharmacy/get.prescription";
import { assignLabTech } from "@/actions/lab-tech/get.labtech.task";

const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;
const patientCollectionId = process.env.NEXT_PUBLIC_PATIENT_COLLECTION_ID!;

interface Props {
    patient: Patient;
}

export default function PatientDetailsComponent({ patient }: Props) {
    const { state: patientState, dispatch: patientDispatch } = usePatientContext();
    const { state: consultationState, dispatch: consultationDispatch } = useConsultationContext();
    const { user } = useAuth();

    const currentDoctorId = user?.$id;

    const { data: staff = [], isPending, isError, refetch } = useQuery({
        queryKey: ["staffs"],
        queryFn: getAllStaffs,
    });

    const [selectedStaffId, setSelectedStaffId] = useState<string | undefined>(undefined);
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showCopied, setShowCopied] = useState(false);

    // For focusing the first invalid field
    const formRef = useRef<HTMLDivElement>(null);

    // Initialize patient and consultation state only when patient changes
    useEffect(() => {
        if (patient) {
            patientDispatch({ type: "SET_PATIENT", payload: [patient] });
            patientDispatch({ type: "UPDATE_NOTES", payload: patient.notes || "" });
            patientDispatch({ type: "SET_STATUS", payload: (patient.status as PatientStatus) || "no-status" });
            consultationDispatch({ type: "RESET_FORM" });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patient]);

    // Clear error/success messages after a timeout
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

    // Copy patient ID to clipboard
    const handleCopyId = useCallback(async (id: string) => {
        try {
            await navigator.clipboard.writeText(id);
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 1500);
        } catch {
            toast({
                variant: "destructive",
                title: "Copy Failed",
                description: "Could not copy patient ID.",
            });
        }
    }, []);

    // Scroll to first error field
    const scrollToFirstError = useCallback(() => {
        if (formRef.current) {
            const firstInvalid = formRef.current.querySelector("[aria-invalid='true']");
            if (firstInvalid) {
                (firstInvalid as HTMLElement).focus();
            }
        }
    }, []);

    // Validate form fields and return missing fields
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

    // Memoize available staff for the selected referral type
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

    // Main submit handler
    const handleSubmit = useCallback(async () => {
        setFormError(null);
        setSuccessMessage(null);

        const missingFields = getMissingFields();

        if (missingFields.length > 0) {
            const msg = `Please complete: ${missingFields.join(", ")}.`;
            setFormError(msg);
            toast({
                variant: "destructive",
                title: "Missing Fields",
                description: msg,
            });
            scrollToFirstError();
            return;
        }

        try {
            consultationDispatch({ type: "SET_LOADING", payload: true });

            // Update patient status only if changed
            if (patientState.status !== patient.status) {
                await databases.updateDocument(databaseId, patientCollectionId, patient.$id!, { status: patientState.status });
            }

            await createConsultation({
                patientId: patient.$id!,
                doctorId: currentDoctorId!,
                symptom: consultationState.symptoms,
                diagnosis: consultationState.diagnosis,
                prescription: consultationState.prescriptions,
                recommendation: consultationState.recommendations,
                consultationDate: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                referredTo: consultationState.referredTo,
            });

            const selectedStaff = staff.find((s) => s.$id === selectedStaffId);

            if (!selectedStaff) {
                setFormError("Selected staff not found.");
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Selected staff not found.",
                });
                return;
            }

            const role = selectedStaff.role?.toLowerCase();

            if (role === "nurse") {
                await assignNurse({
                    patientId: patient.$id!,
                    nurseId: selectedStaffId!,
                    doctorInstructions: consultationState.recommendations,
                    prescribedMedication: consultationState.prescriptions,
                    doctorDiagnosis: consultationState.diagnosis,
                    taskDate: new Date().toISOString()
                });
            } else if (role === "pharmacist") {
                console.log("assigning pharmacist", selectedStaffId);
                await assignPharmacist({
                    patientId: patient.$id!,
                    pharmacyId: selectedStaffId!,
                    doctorInstructions: consultationState.recommendations,
                    doctorPrescription: consultationState.prescriptions,
                    status: "pending",
                    createdAt: new Date().toISOString()
                });
            } else if (role === "lab-tech") {
                await assignLabTech({
                    patientId: patient.$id!,
                    labTechId: selectedStaffId!,
                    doctorInstructions: consultationState.recommendations,
                    doctorMedications: consultationState.prescriptions,
                    doctorDiagnosis: consultationState.diagnosis,
                    doctorRecommendations: consultationState.recommendations,
                    feedback: "",
                    testResults: "",
                    status: "awaitingPayment",
                    createdAt: new Date().toISOString()

                });
            } else {
                setFormError("The selected staff is not a nurse or pharmacist.");
                toast({
                    variant: "destructive",
                    title: "Invalid Role",
                    description: `The selected staff is not a nurse or pharmacist.`,
                });
                return;
            }

            setSuccessMessage("Consultation and task successfully assigned.");
            toast({
                variant: "default",
                title: "Success",
                description: "Consultation and task successfully assigned.",
            });

            consultationDispatch({ type: "RESET_FORM" });
            setSelectedStaffId(undefined);

        } catch (error) {
            console.error(error);
            setFormError("Failed to save consultation.");
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to save consultation.",
            });
        } finally {
            consultationDispatch({ type: "SET_LOADING", payload: false });
        }
    }, [
        consultationDispatch,
        consultationState.diagnosis,
        consultationState.prescriptions,
        consultationState.recommendations,
        consultationState.referredTo,
        consultationState.symptoms,
        currentDoctorId,
        getMissingFields,
        patient.$id,
        patient.status,
        patientState.status,
        scrollToFirstError,
        selectedStaffId,
        staff
    ]);

    // Refresh staff list
    const handleRefresh = useCallback(() => {
        refetch();
        toast({
            variant: "default",
            title: "Refreshed",
            description: "Staff list refreshed.",
        });
    }, [refetch]);

    // Back navigation
    const handleBack = useCallback(() => {
        if (window.history.length > 1) {
            window.history.back();
        }
    }, []);

    if (isPending || consultationState.loading) return <PatientDetailsSkeleton />;
    if (isError) return (
        <ErrorMessage
            message="Failed to load staff list."
            actionLabel="Retry"
            onAction={handleRefresh}
        />
    );
    if (!patientState.patient || !patientState.patient.length) return (
        <ErrorMessage
            message="Patient not found."
            actionLabel="Back"
            onAction={handleBack}
        />
    );

    const currentPatient = patientState.patient[0];

    return (
        <main className="max-w-6xl mx-auto px-2 md:px-6 py-10 space-y-10">
            <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/2">
                    <PatientProfile
                        patient={currentPatient}
                        status={patientState.status}
                        onCopyId={() => handleCopyId(currentPatient.$id!)}
                        showCopied={showCopied}
                    />
                </div>
                <div className="w-full md:w-1/2">
                    <Card className="shadow-lg rounded-2xl border bg-white dark:bg-background h-full flex flex-col">
                        <ConsultationHistoryTable patientId={currentPatient.$id!} />
                    </Card>
                </div>
            </div>
            <div>
                <Card className="shadow-lg rounded-2xl border bg-white dark:bg-background">
                    <CardHeader className="pb-2 border-b flex items-center justify-between">
                        <CardTitle className="text-2xl font-semibold text-blue-900 flex items-center gap-2">
                            <MdAssignment className="text-blue-700" /> New Consultation
                        </CardTitle>
                        <button
                            aria-label="Back"
                            className="ml-auto text-gray-500 hover:text-blue-700 transition"
                            onClick={handleBack}
                            title="Back"
                        >
                            <MdArrowBack className="text-2xl" />
                        </button>
                    </CardHeader>
                    <CardContent className="pt-6" ref={formRef}>
                        {formError && (
                            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                                <MdWarning className="text-xl" />
                                <span>{formError}</span>
                            </div>
                        )}
                        {successMessage && (
                            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 flex items-center gap-2">
                                <MdCheckCircle className="text-xl" />
                                <span>{successMessage}</span>
                            </div>
                        )}
                        <ConsultationForm
                            symptoms={consultationState.symptoms}
                            diagnosis={consultationState.diagnosis}
                            prescriptions={consultationState.prescriptions}
                            recommendations={consultationState.recommendations}
                            referredTo={consultationState.referredTo}
                            status={patientState.status}
                            onSymptomsChange={(val) => consultationDispatch({ type: "SET_SYMPTOMS", payload: val })}
                            onDiagnosisChange={(val) => consultationDispatch({ type: "SET_DIAGNOSIS", payload: val })}
                            onPrescriptionsChange={(val) => consultationDispatch({ type: "SET_PRESCRIPTIONS", payload: val })}
                            onRecommendationsChange={(val) => consultationDispatch({ type: "SET_RECOMMENDATIONS", payload: val })}
                            onReferredToChange={(val) => consultationDispatch({ type: "SET_REFERRED_TO", payload: val as ConsultationReferred })}
                            onStatusChange={(status) => patientDispatch({ type: "SET_STATUS", payload: status as PatientStatus })}
                            onSubmit={handleSubmit}
                            loading={consultationState.loading}
                            selectedStaffId={selectedStaffId}
                            availableStaff={availableStaff}
                            onStaffSelect={setSelectedStaffId}
                        />
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

const profileFields = [
    {
        label: "Name",
        icon: <FaUserMd className="text-blue-600" />,
        key: "name",
    },
    {
        label: "Gender",
        icon: <BsGenderAmbiguous className="text-pink-500" />,
        key: "gender",
    },
    {
        label: "Email",
        icon: <MdEmail className="text-green-600" />,
        key: "email",
    },
    {
        label: "Phone",
        icon: <MdPhone className="text-yellow-600" />,
        key: "phone",
    },
    {
        label: "Occupation",
        icon: <MdWork className="text-purple-600" />,
        key: "occupation",
    },
    {
        label: "Address",
        icon: <MdLocationOn className="text-red-600" />,
        key: "address",
    },
    {
        label: "Allergies",
        icon: <MdWarning className="text-orange-600" />,
        key: "allergies",
    },
    {
        label: "Current Medication",
        icon: <MdMedicalServices className="text-blue-500" />,
        key: "currentMedication",
    },
    {
        label: "Insurance Provider",
        icon: <MdCheckCircle className="text-green-500" />,
        key: "insuranceProvider",
    },
    {
        label: "Emergency Contact Number",
        icon: <MdPhone className="text-red-500" />,
        key: "emergencyContactNumber",
    },
    {
        label: "Family Medical History",
        icon: <MdHistory className="text-gray-500" />,
        key: "familyMedicalHistory",
    },
    {
        label: "Disclosure Consent",
        icon: <MdCheckCircle className="text-green-600" />,
        key: "disclosureConsent",
        render: (val: boolean) => (val ? "Yes" : "No"),
    },
    {
        label: "Past Medical History",
        icon: <MdHistory className="text-gray-400" />,
        key: "pastMedicalHistory",
    },
    {
        label: "Current Status",
        icon: <MdAssignment className="text-blue-700" />,
        key: "status",
    },
    {
        label: "Note",
        icon: <MdNote className="text-gray-700" />,
        key: "notes",
        render: (val: string) => val || "No note yet",
    },
    {
        label: "Patient ID",
        icon: <MdAssignment className="text-blue-400" />,
        key: "$id",
        render: (val: string, onCopyId: () => void, showCopied: boolean) => (
            <span className="flex items-center gap-2">
                <span className="font-mono text-xs">{val}</span>
                <button
                    className="ml-1 px-1 py-0.5 rounded bg-gray-100 hover:bg-blue-100 text-xs text-blue-700"
                    onClick={onCopyId}
                    title="Copy Patient ID"
                    type="button"
                >
                    {showCopied ? "Copied!" : "Copy"}
                </button>
            </span>
        ),
    },
];

function PatientProfile({
    patient,
    status,
    onCopyId,
    showCopied,
}: {
    patient: Patient;
    status: string;
    onCopyId: () => void;
    showCopied: boolean;
}) {
    // Compose a new object to map keys to values, including status and notes
    const patientData: Record<string, any> = {
        ...patient,
        status,
        notes: patient?.notes || "No note yet",
    };

    return (
        <section aria-labelledby="patient-profile">
            <Card className="shadow-lg rounded-2xl border bg-white dark:bg-background">
                <CardHeader className="pb-4 border-b flex flex-col md:flex-row md:items-center gap-2">
                    <CardTitle id="patient-profile" className="text-3xl font-bold text-blue-900 flex items-center gap-2">
                        <FaUserMd className="text-blue-700" /> Patient Profile
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-base text-muted-foreground mt-4">
                    {profileFields.map(({ label, icon, key, render }) => (
                        <InfoItem
                            key={label}
                            label={label}
                            icon={icon}
                            value={
                                render
                                    ? key === "$id"
                                        ? render(
                                            patientData[key] as never,
                                            onCopyId,
                                            showCopied
                                        )
                                        : render(patientData[key] as never, onCopyId, showCopied)
                                    : (patientData[key] ?? "Not provided")
                            }
                        />
                    ))}
                </CardContent>
            </Card>
        </section>
    );
}

function InfoItem({ label, value, icon }: { label: string; value: string | React.ReactNode; icon: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 bg-gray-50 dark:bg-muted/30 rounded-lg px-3 py-2 shadow-sm">
            <span className="mt-1">{icon}</span>
            <div>
                <span className="block font-semibold text-gray-900 dark:text-white">{label}:</span>
                <span className="ml-1 text-gray-700 dark:text-gray-200">{value || "Not provided"}</span>
            </div>
        </div>
    );
}

function ErrorMessage({
    message,
    actionLabel,
    onAction,
}: {
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}) {
    return (
        <div className="flex flex-col bg-white items-center justify-center pt-20">
            <MdWarning className="text-4xl text-red-500 mb-2" />
            <p className="text-center text-red-600 text-lg font-medium">{message}</p>
            {actionLabel && onAction && (
                <button
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    onClick={onAction}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
