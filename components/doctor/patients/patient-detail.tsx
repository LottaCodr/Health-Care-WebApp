"use client";

import { useEffect, useState } from "react";
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
import ConsultationForm from "./consultation-form";
import { Staff } from "@/actions/staff/types";
import { assignNurse } from "@/actions/nursing-action/get.nurse.task";

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

    const { data: staff, isPending, isError } = useQuery({
        queryKey: ["staffs"],
        queryFn: getAllStaffs,
    });

    const [selectedStaffId, setSelectedStaffId] = useState<string | undefined>(undefined);


    useEffect(() => {
        if (patient) {
            patientDispatch({ type: "SET_PATIENT", payload: [patient] });
            patientDispatch({ type: "UPDATE_NOTES", payload: patient.notes || "" });
            patientDispatch({ type: "SET_STATUS", payload: (patient.status as PatientStatus) || "no-status" });

            consultationDispatch({ type: "RESET_FORM" });
        }
    }, [patient, patientDispatch, consultationDispatch]);

    const handleSubmit = async () => {
        if (!patientState.status || patientState.status === "no-status" ||
            !consultationState.symptoms.trim() ||
            !consultationState.diagnosis.trim() ||
            !consultationState.prescriptions.trim() ||
            !consultationState.recommendations.trim() ||
            !consultationState.referredTo
        ) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Please complete all consultation fields before submitting.",
            });
            return;
        }

        try {
            consultationDispatch({ type: "SET_LOADING", payload: true });

            await databases.updateDocument(databaseId, patientCollectionId, patient.$id!, { status: patientState.status });

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

            await assignNurse({
                patientId: patient.$id!,
                nurseId: selectedStaffId!,
                doctorInstructions: consultationState.recommendations,
                prescribedMedication: consultationState.prescriptions,
                doctorDiagnosis: consultationState.diagnosis,
                taskDate: new Date().toISOString()
            });

            toast({
                variant: "default",
                title: "Success",
                description: "Consultation and task successfully assigned.",
            });

            consultationDispatch({ type: "RESET_FORM" });

        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to save consultation.",
            });
        } finally {
            consultationDispatch({ type: "SET_LOADING", payload: false });
        }
    };

    if (isPending || consultationState.loading) return <PatientDetailsSkeleton />;
    if (isError) return <ErrorMessage message="Failed to load staff list." />;
    if (!patientState.patient || !patientState.patient.length) return <ErrorMessage message="Patient not found." />;

    const currentPatient = patientState.patient[0];

    return (
        <main className="max-w-6xl mx-6 px-4 md:px-6 py-10 space-y-12">
            <PatientProfile patient={currentPatient} status={patientState.status} />
            <ConsultationHistoryTable patientId={currentPatient.$id!} />
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
                loading={consultationState.loading} selectedStaffId={selectedStaffId} availableStaff={staff.filter((s: Staff) => s.role === consultationState.referredTo)} onStaffSelect={setSelectedStaffId} />
        </main>
    );
}


function PatientProfile({ patient, status }: { patient: Patient; status: string }) {
    return (
        <section aria-labelledby="patient-profile">
            <Card className="shadow-lg rounded-2xl border bg-white dark:bg-background">
                <CardHeader className="pb-4 border-b">
                    <CardTitle id="patient-profile" className="text-3xl font-bold text-blue-900 flex items-center gap-2">
                        <FaUserMd className="text-blue-700" /> Patient Profile
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-x-10 gap-y-4 text-base text-muted-foreground mt-4">
                    {Object.entries({
                        Name: patient.name,
                        Gender: patient.gender,
                        Email: patient.email,
                        Phone: patient.phone,
                        Occupation: patient.occupation,
                        Address: patient.address,
                        Allergies: patient.allergies,
                        "Current Medication": patient.currentMedication,
                        "Insurance Provider": patient.insuranceProvider,
                        "Emergency Contact Number": patient.emergencyContactNumber,
                        "Family Medical History": patient.familyMedicalHistory,
                        "Disclosure Consent": patient.disclosureConsent ? "Yes" : "No",
                        "Past Medical History": patient.pastMedicalHistory,
                        "Current Status": status,
                        Note: patient?.notes || "No note yet",
                    }).map(([label, value]) => (
                        <InfoItem key={label} label={label} value={value} />
                    ))}
                </CardContent>
            </Card>
        </section>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <p className="leading-relaxed text-gray-800">
            <span className="font-semibold text-gray-900">{label}:</span>{" "}
            <span className="ml-1 text-gray-700">{value || "Not provided"}</span>
        </p>
    );
}

function ErrorMessage({ message }: { message: string }) {
    return <p className="text-center pt-20 text-red-600 text-lg">{message}</p>;
}
