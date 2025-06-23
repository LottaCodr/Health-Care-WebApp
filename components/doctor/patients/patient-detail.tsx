"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { databases } from "@/lib/appwrite.config";
import { getAllStaffs } from "@/actions/staff/get.staff";
import { usePatientContext } from "@/context/patients/patient-context";
import { Staff } from "@/actions/staff/types";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

import PatientDetailsSkeleton from "./skeleton";
import { Patient } from "@/actions/patients/types";
import { PatientStatus } from "@/context/patients/types"; // Make sure this is the correct path

const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;
const patientCollectionId = process.env.NEXT_PUBLIC_PATIENT_COLLECTION_ID!;

interface Props {
    patient: Patient;
}

export default function PatientDetailsComponent({ patient }: Props) {
    const { state, dispatch } = usePatientContext();

    const { data: staffList, isPending, isError } = useQuery({
        queryKey: ["staffs"],
        queryFn: getAllStaffs,
    });

    useEffect(() => {
        if (patient) {
            dispatch({ type: "SET_PATIENT", payload: [patient] });
            dispatch({ type: "UPDATE_NOTES", payload: patient.note || "" });
            dispatch({ type: "SET_STATUS", payload: (patient.status as PatientStatus) || 'no-status' });
            dispatch({ type: "SET_SYMPTOMS", payload: patient.symptoms || "" });
            dispatch({ type: "SET_DIAGNOSIS", payload: patient.diagnosis || "" });
            dispatch({ type: "SET_PRESCRIPTIONS", payload: patient.prescriptions || "" });
            dispatch({ type: "SET_RECOMMENDATIONS", payload: patient.recommendations || "" });
        }
    }, [patient, dispatch]);

    const handleSubmit = async () => {
        if (
            !state.status || state.status === 'no-status' ||
            !state.symptoms.trim() ||
            !state.diagnosis.trim() ||
            !state.prescriptions.trim() ||
            !state.recommendations.trim()
        ) {
            toast.error("Please complete all consultation fields before submitting.");
            return;
        }

        try {
            dispatch({ type: "SET_LOADING", payload: true });

            await databases.updateDocument(databaseId, patientCollectionId, patient?.userId, {
                notes: state.notes,
                status: state.status,
                symptoms: state.symptoms,
                diagnosis: state.diagnosis,
                prescriptions: state.prescriptions,
                recommendations: state.recommendations,
            });

            toast.success("Consultation successfully saved.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save consultation.");
        } finally {
            dispatch({ type: "SET_LOADING", payload: false });
        }
    };

    if (isPending || state.loading) return <PatientDetailsSkeleton />;

    if (isError) {
        return <p className="text-red-600 text-center pt-10">Failed to load staff list.</p>;
    }

    if (!state.patient || !state.patient.length) {
        return (
            <p className="text-center pt-20 text-muted-foreground text-lg">Patient not found</p>
        );
    }

    const currentPatient = state.patient[0];

    return (
        <main className="max-w-6xl mx-6 px-4 md:px-6 py-10 space-y-12">
            {/* Patient Profile */}
            <section aria-labelledby="patient-profile">
                <Card className="shadow-lg rounded-2xl border bg-white dark:bg-background">
                    <CardHeader className="pb-4 border-b">
                        <CardTitle id="patient-profile" className="text-3xl font-bold text-blue-900">
                            Patient Profile
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-x-10 gap-y-4 text-base text-muted-foreground mt-4">
                        {Object.entries({
                            Name: currentPatient.name,
                            Gender: currentPatient.gender,
                            Email: currentPatient.email,
                            Phone: currentPatient.phone,
                            Occupation: currentPatient.occupation,
                            Address: currentPatient.address,
                            Allergies: currentPatient.allergies,
                            "Current Medication": currentPatient.currentMedication,
                            "Insurance Provider": currentPatient.insuranceProvider,
                            "Emergency Contact Number": currentPatient.emergencyContactNumber,
                            "Family Medical History": currentPatient.familyMedicalHistory,
                            "Disclosure Consent": currentPatient.disclosureConsent ? "Yes" : "No",
                            "Past Medical History": currentPatient.pastMedicalHistory,
                            "Current Status": state.status,
                            Note: currentPatient.notes || "No note yet",
                        }).map(([label, value]) => (
                            <InfoItem key={label} label={label} value={value} />
                        ))}
                    </CardContent>
                </Card>
            </section>

            {/* Doctor Consultation */}
            <section aria-labelledby="doctor-consultation">
                <Card className="shadow-lg rounded-2xl border bg-white dark:bg-background">
                    <CardHeader className="pb-4 border-b">
                        <CardTitle id="doctor-consultation" className="text-2xl font-semibold text-blue-900">
                            Doctor's Consultation
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-8 mt-4">
                        <FormSection label="Symptoms" value={state.symptoms} onChange={(val) => dispatch({ type: "SET_SYMPTOMS", payload: val })} />
                        <FormSection label="Diagnosis" value={state.diagnosis} onChange={(val) => dispatch({ type: "SET_DIAGNOSIS", payload: val })} />
                        <FormSection label="Prescriptions" value={state.prescriptions} onChange={(val) => dispatch({ type: "SET_PRESCRIPTIONS", payload: val })} />
                        <FormSection label="Recommendations" value={state.recommendations} onChange={(val) => dispatch({ type: "SET_RECOMMENDATIONS", payload: val })} />

                        <div className="space-y-2">
                            <Label htmlFor="status" className="text-lg font-medium text-gray-700">Patient Status</Label>
                            <Select
                                onValueChange={(status) => dispatch({ type: "SET_STATUS", payload: status as PatientStatus })}
                                value={state.status}
                            >
                                <SelectTrigger id="status">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent className="bg-white z-20">
                                    <SelectItem value="admitted">Admitted</SelectItem>
                                    <SelectItem value="under-observation">Under Observation</SelectItem>
                                    <SelectItem value="discharged">Discharged</SelectItem>
                                    <SelectItem value="no-status">No Status</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            onClick={handleSubmit}
                            disabled={state.loading}
                            className="w-full md:w-auto text-white text-base px-8 py-3 rounded-xl shadow bg-blue-700 hover:bg-blue-800 transition"
                        >
                            {state.loading ? "Submitting..." : "Submit Consultation"}
                        </Button>
                    </CardContent>
                </Card>
            </section>
        </main>
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

function FormSection({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (val: string) => void;
}) {
    return (
        <div className="space-y-2">
            <Label htmlFor={label.toLowerCase()} className="text-lg font-medium text-gray-700">{label}</Label>
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
