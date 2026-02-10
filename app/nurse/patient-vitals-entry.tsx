"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRoleProtection } from "@/lib/role-utils";
import { useAuth } from "@/context/auth-provider";
import { UserRole } from "@/types/models";
import { usePatient, useCreateNursingAction, useUpdatePatientStatus } from "@/hooks/use-emr";
import { LoadingSkeleton, ErrorAlert, SuccessAlert, PatientInfoCard } from "@/components/emr-ui";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const PatientVitalsEntryScreen: React.FC = () => {
    const router = useRouter();
    const search = useSearchParams();
    const patientId = search.get("patientId") || "";

    const { data: patient, loading: patientLoading, error: patientError } = usePatient(patientId);
    const { authorized, loading: roleLoading } = useRoleProtection([UserRole.Nurse, UserRole.Admin]);
    const { user } = useAuth();

    const [bp, setBp] = useState("");
    const [temp, setTemp] = useState("");
    const [pulse, setPulse] = useState("");
    const [treatment, setTreatment] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const { mutate: createAction } = useCreateNursingAction();
    const { mutate: updatePatientStatus } = useUpdatePatientStatus();

    useEffect(() => {
        if (!roleLoading && !authorized) {
            router.push("/unauthorized");
        }
    }, [authorized, roleLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId) return setErrorMessage("Patient ID missing");

        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const description = `Vitals - BP: ${bp}; Temp: ${temp}°C; Pulse: ${pulse} bpm. Treatment: ${treatment}. Notes: ${notes}`;

            await createAction({
                patientId,
                consultationId: "",
                actionType: "Vitals",
                description,
                status: "Completed",
                assignedNurse: user?.$id || "",
                completedBy: user?.$id || "",
                completionTime: new Date().toISOString(),
            } as any);

            await updatePatientStatus(patientId, "AwaitingNextStep" as any);

            setSuccessMessage("Vitals recorded and patient status updated.");
            setTimeout(() => router.push("/nurse/dashboard"), 1500);
        } catch (err) {
            setErrorMessage((err as Error).message || "Failed to record vitals");
        } finally {
            setSubmitting(false);
        }
    };

    if (roleLoading || patientLoading) return <LoadingSkeleton />;

    if (patientError) return <ErrorAlert error={patientError} />;

    if (!patient) return <ErrorAlert error={new Error("Patient not found")} />;

    return (
        <div className="min-h-screen p-6 bg-gray-50">
            <div className="max-w-3xl mx-auto">
                <div className="mb-6 flex items-center gap-4">
                    <Link href="/nurse/dashboard">
                        <button className="p-2 hover:bg-gray-200 rounded-lg">Back</button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">Record Vitals</h1>
                        <p className="text-sm text-gray-600">Patient: {patient.name}</p>
                    </div>
                </div>

                <PatientInfoCard patient={patient} />

                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Vitals & Treatment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {successMessage && <SuccessAlert message={successMessage} />}
                        {errorMessage && <ErrorAlert error={new Error(errorMessage)} />}

                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Blood Pressure (mmHg)</label>
                                    <input value={bp} onChange={(e) => setBp(e.target.value)} required className="w-full px-3 py-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Temperature (°C)</label>
                                    <input value={temp} onChange={(e) => setTemp(e.target.value)} required className="w-full px-3 py-2 border rounded" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Pulse (bpm)</label>
                                    <input value={pulse} onChange={(e) => setPulse(e.target.value)} required className="w-full px-3 py-2 border rounded" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Treatment Given</label>
                                <textarea value={treatment} onChange={(e) => setTreatment(e.target.value)} required rows={4} className="w-full px-3 py-2 border rounded" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
                                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded" />
                            </div>

                            <button type="submit" disabled={submitting} className="w-full bg-blue-600 text-white py-2 rounded">
                                {submitting ? "Saving..." : "Save Vitals & Complete"}
                            </button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PatientVitalsEntryScreen;