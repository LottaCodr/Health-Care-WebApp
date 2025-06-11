"use client";

import { useEffect } from "react";
import { databases } from "@/lib/appwrite.config";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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
import { Patient } from "@/context/patients/types";
import { usePatientContext } from "@/context/patients/patient-context";
import { Staff } from "@/types/appwrite.types";
import { useQuery } from "@tanstack/react-query";
import { getAllStaffs } from "@/actions/staff/get.staff";

const databaseId = process.env.NEXT_PUBLIC_DATABASE_ID!;
const patientCollectionId = process.env.NEXT_PUBLIC_PATIENT_COLLECTION_ID!

type Props = {
    patient: Patient;
};

export default function PatientDetailsComponent({ patient }: Props) {

    const { state, dispatch } = usePatientContext()

    const { data, isPending, isError } = useQuery({
        queryKey: ['staffs'],
        queryFn: () => getAllStaffs(),
    })
    const recipientRoles = ["doctor", "nurse", "pharmacist", "labtech"];


    useEffect(() => {
        if (patient) {
            dispatch({ type: 'SET_PATIENT', payload: patient });
            dispatch({ type: 'UPDATE_NOTES', payload: patient.notes || '' });
        }
    }, [patient, dispatch]);



    const handleSubmit = async () => {
        if (!state.recipientRole || !state.status || !state.notes.trim()) {
            toast.error("Please complete all fields before submitting.");
            return;
        }

        const selectedStaff = data?.find(
            (staff: Staff) => staff.role === state.recipientRole && staff.full_name === state.recipientName
        );
        try {

            dispatch({ type: "SET_LOADING", payload: true });
            await databases.updateDocument(databaseId, patientCollectionId, patient?.$id, {
                notes: state.notes,
                staff: [{
                    $id: selectedStaff?.$id,
                    role: selectedStaff?.role,
                    full_name: selectedStaff?.full_name,
                }],
                status: state.status,
            });
            console.log('The note has been updated')

            toast.success("Note and status successfully saved.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to save note.");
        } finally {
            dispatch({ type: "SET_LOADING", payload: false });

        }
    };



    if (isPending || state.loading) return <PatientDetailsSkeleton />

    if (isError) {
        return <p className="text-red-600 text-center pt-10">Failed to load staff list.</p>;
    }
    if (!state.patient) {
        return (
            <p className="text-center pt-20 text-muted-foreground text-lg">
                Patient not found
            </p>
        );
    }

    return (
        <main className="max-w-5xl mx-6 px-6 py-12 space-y-12">
            <Card className="shadow-xl rounded-3xl border border-border bg-background">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-3xl font-bold text-primary">
                        Patient Profile
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5 text-base uppercase text-muted-foreground mt-4">
                    <InfoItem label="Name" value={state.patient?.name || "Not provided"} />
                    <InfoItem label="Gender" value={state.patient?.gender || "Not provided"} />
                    <InfoItem label="Email" value={state.patient?.email || "Not provided"} />
                    <InfoItem label="Phone" value={state.patient?.phone || "Not provided"} />
                    <InfoItem label="Occupation" value={state.patient?.occupation || "Not provided"} />
                    <InfoItem label="Address" value={state.patient?.address || "Not provided"} />
                    <InfoItem label="Allergies" value={state.patient?.allergies || "N/A"} />
                    <InfoItem label="Current Medication" value={state.patient?.currentMedication || "N/A"} />
                    <InfoItem label="Insurance Provider" value={state.patient?.insuranceProvider || "N/A"} />
                    <InfoItem label="Emergency Contact Number" value={state.patient?.emergencyContactNumber || "N/A"} />
                    <InfoItem label="Family Medical History" value={state.patient?.familyMedicalHistory || "N/A"} />
                    <InfoItem label="Disclosure Consent" value={typeof state.patient?.disclosureConsent === "boolean" ? (state.patient?.disclosureConsent ? "Yes" : "No") : (state.patient?.disclosureConsent || "N/A")} />
                    <InfoItem label="Past MedicalHistory" value={state.patient?.pastMedicalHistory || "N/A"} />
                    <InfoItem label="Current Status" value={state.status || "N/A"} />
                    <InfoItem label="note" value={patient.notes || "No note yet"} />
                </CardContent>
            </Card>

            <Card className="shadow-lg rounded-3xl border border-border bg-background">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-2xl font-semibold text-primary">
                        Add Doctor&#39;s Note
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="recipientRole">Send To</Label>
                        <Select
                            onValueChange={(role) => {
                                dispatch({ type: 'SET_RECIPIENT_ROLE', payload: role });
                                dispatch({ type: 'SET_RECIPIENT_NAME', payload: '' });
                            }}
                            value={state.recipientRole}
                        >
                            <SelectTrigger id="recipientRole" className="w-full md:w-1/2">
                                <SelectValue placeholder="Select recipient role" />
                            </SelectTrigger>
                            <SelectContent className="bg-white z-10">
                                {recipientRoles.map((role) => (
                                    <SelectItem key={role} value={role}>
                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {state.recipientRole && (
                            <div className="space-y-2 mt-4">
                                <Label htmlFor="recipientName">Select {state.recipientRole}</Label>
                                <Select
                                    onValueChange={(name) => dispatch({ type: 'SET_RECIPIENT_NAME', payload: name })}
                                    value={state.recipientName ?? undefined}
                                >
                                    <SelectTrigger id="recipientName" className="w-full md:w-1/2">
                                        <SelectValue placeholder={`Select ${state.recipientRole}`} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white z-10">
                                        {data
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
                        {state.recipientName && (
                            <p className="text-sm text-muted-foreground">
                                👤 <span className="capitalize text-foreground inline-block rounded-full px-3 py-1 text-xs bg-green-700 font-semibold text-white">{state.recipientRole} {' '} {state.recipientName}</span> will receive this note.
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="status">Patient Status</Label>
                        <Select onValueChange={(status) => { dispatch({ type: "SET_STATUS", payload: status }) }} value={state.status}>
                            <SelectTrigger id="status" className="w-full md:w-1/2">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent className="bg-white z-10">
                                <SelectItem value="admitted">Admitted</SelectItem>
                                <SelectItem value="under observation">Under Observation</SelectItem>
                                <SelectItem value="discharged">Discharged</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes" className="text-muted-foreground font-medium">
                            Write your findings, diagnosis, or prescriptions
                        </Label>
                        <Textarea
                            id="notes"
                            placeholder="Write your findings, diagnosis, or prescriptions..."
                            value={state.notes}
                            onChange={(note) => { dispatch({ type: "UPDATE_NOTES", payload: note.target.value }) }}
                            className="min-h-[160px] text-sm border-border rounded-xl"
                        />
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={state.loading || !state.notes.trim()}
                        className="w-full md:w-auto text-white text-base px-8 py-2 rounded-xl shadow-md"
                    >
                        {state.loading ? "Saving..." : "Submit Note"}
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}

function InfoItem({ label, value }: { label: string; value: string }) {
    return (
        <p className="leading-relaxed">
            <span className="font-semibold text-foreground">{label}:</span>{" "}
            <span className="ml-1 text-muted-foreground">{value}</span>
        </p>
    );
}
