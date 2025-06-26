"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { databases } from "@/lib/appwrite.config";
import { getAllStaffs } from "@/actions/staff/get.staff";
import { createConsultation } from "@/actions/consultations/consultation";
import { usePatientContext } from "@/context/patients/patient-context";
import { useConsultationContext } from "@/context/consultation/consultation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

import PatientDetailsSkeleton from "./skeleton";
import { Patient, PatientStatus } from "@/context/patients/types";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-provider";
import { ConsultationReferred } from "@/actions/consultations/types";
import ConsultationHistoryTable from "./consultation-history";

import { FaUserMd, FaNotesMedical, FaHeartbeat, FaPills, FaStethoscope } from "react-icons/fa";

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

    const { isPending, isError } = useQuery({
        queryKey: ["staffs"],
        queryFn: getAllStaffs,
    });

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

            toast({
                variant: "default",
                title: "Success",
                description: "Consultation successfully saved.",
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
                loading={consultationState.loading}
            />
        </main>
    );
}

function ConsultationForm({ symptoms, diagnosis, prescriptions, recommendations, referredTo, status, onSymptomsChange, onDiagnosisChange, onPrescriptionsChange, onRecommendationsChange, onReferredToChange, onStatusChange, onSubmit, loading }: any) {

    const patientStatuses = [
        { value: 'registered', label: 'Registered' },
        { value: 'awaitingConsultation', label: 'Awaiting Consultation' },
        { value: 'underConsultation', label: 'Under Consultation' },
        { value: 'sentToNurse', label: 'Sent to Nurse' },
        { value: 'sentToLab', label: 'Sent to Lab' },
        { value: 'sentToPharmacy', label: 'Sent to Pharmacy' },
        { value: 'awaitingPayment', label: 'Awaiting Payment' },
        { value: 'admitted', label: 'Admitted' },
        { value: 'underObservation', label: 'Under Observation' },
        { value: 'discharged', label: 'Discharged' },
        { value: 'noStatus', label: 'No Status' },
    ];

    return (
        <section aria-labelledby="doctor-consultation">
            <Card className="shadow-lg rounded-2xl border bg-white dark:bg-background">
                <CardHeader className="pb-4 border-b">
                    <CardTitle id="doctor-consultation" className="text-2xl font-semibold text-blue-900 flex items-center gap-2">
                        <FaStethoscope className="text-blue-700" /> Doctor's Consultation
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-8 mt-4">
                    <FormSection label="Symptoms" value={symptoms} onChange={onSymptomsChange} icon={<FaHeartbeat className="text-red-600" />} />
                    <FormSection label="Diagnosis" value={diagnosis} onChange={onDiagnosisChange} icon={<FaNotesMedical className="text-green-600" />} />
                    <FormSection label="Prescriptions" value={prescriptions} onChange={onPrescriptionsChange} icon={<FaPills className="text-purple-600" />} />
                    <FormSection label="Recommendations" value={recommendations} onChange={onRecommendationsChange} icon={<FaUserMd className="text-blue-600" />} />

                    <div className="space-y-2">
                        <Label htmlFor="status" className="text-lg font-medium text-gray-700">Patient Status</Label>
                        <Select onValueChange={onStatusChange} value={status}>
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent className="bg-white z-20">
                                {patientStatuses.map((status) => (
                                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="referredTo" className="text-lg font-medium text-gray-700">Refer To</Label>
                        <Select onValueChange={onReferredToChange} value={referredTo}>
                            <SelectTrigger id="referredTo">
                                <SelectValue placeholder="Select referral" />
                            </SelectTrigger>
                            <SelectContent className="bg-white z-20">
                                <SelectItem value="nurse">Nurse</SelectItem>
                                <SelectItem value="labtech">Lab Technician</SelectItem>
                                <SelectItem value="pharmacist">Pharmacist</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={onSubmit} disabled={loading} className="w-full md:w-auto text-white text-base px-8 py-3 rounded-xl shadow bg-blue-700 hover:bg-blue-800 transition">
                        {loading ? "Submitting..." : "Submit Consultation"}
                    </Button>
                </CardContent>
            </Card>
        </section>
    );
}

function FormSection({ label, value, onChange, icon }: { label: string; value: string; onChange: (val: string) => void; icon: JSX.Element }) {
    return (
        <div className="space-y-2">
            <Label htmlFor={label.toLowerCase()} className="text-lg font-medium text-gray-700 flex items-center gap-2">
                {icon} {label}
            </Label>
            <Textarea
                id={label.toLowerCase()}
                placeholder={`Enter ${label.toLowerCase()}...`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="min-h-[150px] text-base border-border rounded-xl"
            />
        </div>
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
