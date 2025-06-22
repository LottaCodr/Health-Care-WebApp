"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { databases } from "@/lib/appwrite.config";
import { getAllStaffs } from "@/actions/staff/get.staff";
import { usePatientContext } from "@/context/patients/patient-context";
import { Staff } from "@/actions/staff/types";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

import PatientDetailsSkeleton from "./skeleton";
import { Patient } from "@/actions/patients/types";

const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;
const patientCollectionId = process.env.NEXT_PUBLIC_PATIENT_COLLECTION_ID!;

interface Props {
    patient: Patient;
}

export default function PatientDetailsComponent({ patient }: Props) {
    const { state, dispatch } = usePatientContext();

    const {
        data: staffList,
        isPending,
        isError,
    } = useQuery({
        queryKey: ["staffs"],
        queryFn: getAllStaffs,
    });

    const recipientRoles = ["doctor", "nurse", "pharmacist", "labtech"];

    useEffect(() => {
        if (patient) {
            dispatch({ type: "SET_PATIENT", payload: [patient] });
            dispatch({ type: "UPDATE_NOTES", payload: patient.notes || "" });
            dispatch({ type: "SET_STATUS", payload: patient.status || "" });
        }
    }, [patient, dispatch]);

    const handleSubmit = async () => {
        if (!state.recipientRole || !state.status || !state.notes.trim()) {
            toast.error("Please complete all fields before submitting.");
            return;
        }

        const selectedStaff = staffList?.find(
            (staff: Staff) =>
                staff.role === state.recipientRole &&
                staff.full_name === state.recipientName
        );

        try {
            dispatch({ type: "SET_LOADING", payload: true });

            await databases.updateDocument(databaseId, patientCollectionId, patient?.$id, {
                notes: state.notes,
                staff: [
                    {
                        $id: selectedStaff?.$id,
                        role: selectedStaff?.role,
                        full_name: selectedStaff?.full_name,
                    },
                ],
                status: state.status,
            });

            toast.success("Note and status successfully saved.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save note.");
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
        <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
            <section aria-labelledby="patient-profile">
                <Card className="shadow-md rounded-2xl border bg-white dark:bg-background">
                    <CardHeader className="pb-4 border-b">
                        <CardTitle id="patient-profile" className="text-2xl font-bold text-primary">
                            Patient Profile
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 text-sm text-muted-foreground mt-4">
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

            <section aria-labelledby="doctor-notes">
                <Card className="shadow-sm rounded-2xl border bg-white dark:bg-background">
                    <CardHeader className="pb-4 border-b">
                        <CardTitle id="doctor-notes" className="text-xl font-semibold text-primary">
                            Doctor's Note
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 mt-4">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="recipientRole">Send To</Label>
                                <Select
                                    onValueChange={(role) => {
                                        dispatch({ type: "SET_RECIPIENT_ROLE", payload: role });
                                        dispatch({ type: "SET_RECIPIENT_NAME", payload: "" });
                                    }}
                                    value={state.recipientRole}
                                >
                                    <SelectTrigger id="recipientRole">
                                        <SelectValue placeholder="Select recipient role" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white z-20">
                                        {recipientRoles.map((role) => (
                                            <SelectItem key={role} value={role}>
                                                {role.charAt(0).toUpperCase() + role.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {state.recipientRole && (
                                <div className="space-y-2">
                                    <Label htmlFor="recipientName">Select {state.recipientRole}</Label>
                                    <Select
                                        onValueChange={(name) => dispatch({ type: "SET_RECIPIENT_NAME", payload: name })}
                                        value={state.recipientName ?? undefined}
                                    >
                                        <SelectTrigger id="recipientName">
                                            <SelectValue placeholder={`Select ${state.recipientRole}`} />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white z-20">
                                            {staffList
                                                ?.filter((staff: Staff) => staff.role === state.recipientRole)
                                                .map((staff: Staff) => (
                                                    <SelectItem key={staff.$id} value={staff.full_name}>
                                                        {staff.full_name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {state.recipientName && (
                            <p className="text-sm text-muted-foreground">
                                👤 <span className="capitalize text-foreground inline-block rounded-full px-3 py-1 text-xs bg-green-700 font-semibold text-white">
                                    {state.recipientRole} {state.recipientName}
                                </span> will receive this note.
                            </p>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="status">Patient Status</Label>
                            <Select
                                onValueChange={(status) => dispatch({ type: "SET_STATUS", payload: status })}
                                value={state.status}
                            >
                                <SelectTrigger id="status">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent className="bg-white z-20">
                                    <SelectItem value="admitted">Admitted</SelectItem>
                                    <SelectItem value="under-observation">Under Observation</SelectItem>
                                    <SelectItem value="discharged">Discharged</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Doctor's Findings</Label>
                            <Textarea
                                id="notes"
                                placeholder="Write your findings, diagnosis, or prescriptions..."
                                value={state.notes}
                                onChange={(e) => dispatch({ type: "UPDATE_NOTES", payload: e.target.value })}
                                className="min-h-[160px] text-sm border-border rounded-xl"
                            />
                        </div>

                        <Button
                            onClick={handleSubmit}
                            disabled={state.loading || !state.notes.trim()}
                            className="w-full md:w-auto text-white text-base px-6 py-2 rounded-xl shadow-sm bg-blue-600 hover:bg-blue-700"
                        >
                            {state.loading ? "Saving..." : "Submit Note"}
                        </Button>
                    </CardContent>
                </Card>
            </section>
        </main>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <p className="leading-relaxed">
            <span className="font-semibold text-foreground">{label}:</span>{" "}
            <span className="ml-1 text-muted-foreground">{value || "Not provided"}</span>
        </p>
    );
}
