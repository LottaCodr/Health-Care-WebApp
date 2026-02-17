"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { useNursingActionsByPatient, useCreateNursingAction, useUpdateNursingAction, useUpdatePatientStatus, usePatient } from "@/hooks/use-emr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton, ErrorAlert, SuccessAlert } from "@/components/emr-ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

// Get task ID from params - this is for recording/updating a single nursing action
export default function NursingActionScreen() {
    const router = useRouter();
    const params = useParams();
    const taskId = params.id as string;

    const { user } = useAuth();
    const { authorized, loading: roleLoading } = useRoleProtection([UserRole.Nurse, UserRole.Admin]);

    const [vitalsBP, setVitalsBP] = useState("");
    const [vitalsTemp, setVitalsTemp] = useState("");
    const [vitalsPulse, setVitalsPulse] = useState("");
    const [treatment, setTreatment] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const { mutate: updateAction } = useUpdateNursingAction();
    const { mutate: updatePatientStatus } = useUpdatePatientStatus();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taskId) return;

        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            // Update nursing action with vitals and treatment
            const updatedAction = await updateAction(taskId, {
                status: "Completed",
                description: `BP: ${vitalsBP}, Temp: ${vitalsTemp}°C, Pulse: ${vitalsPulse} bpm. Treatment: ${treatment}. Notes: ${notes}`,
                completedBy: user?.$id,
                completionTime: new Date().toISOString(),
            });

            // Update patient status to AwaitingNextStep
            if (updatedAction?.patientId) {
                await updatePatientStatus(updatedAction.patientId, "AwaitingNextStep" as any);
            }

            setSuccessMessage("Nursing action completed successfully");
            setTimeout(() => {
                router.push("/nurse/dashboard");
            }, 2000);
        } catch (err) {
            setErrorMessage((err as Error).message || "Failed to complete action");
        } finally {
            setSubmitting(false);
        }
    };

    if (roleLoading) return <LoadingSkeleton />;

    if (!authorized) {
        return <ErrorAlert message="Unauthorized access. Nurses only." />;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center gap-4">
                    <Link href="/nurse/dashboard">
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Record Nursing Action</h1>
                        <p className="text-gray-600 mt-1">Complete patient care documentation</p>
                    </div>
                </div>

                {/* Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Patient Vitals & Treatment</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {successMessage && <SuccessAlert message={successMessage} />}
                        {errorMessage && <ErrorAlert message={errorMessage} />}

                        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                            {/* Vitals Section */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Vital Signs</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Blood Pressure (mmHg)</label>
                                        <input
                                            type="text"
                                            placeholder="120/80"
                                            value={vitalsBP}
                                            onChange={(e) => setVitalsBP(e.target.value)}
                                            required
                                            className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Temperature (°C)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            placeholder="37.5"
                                            value={vitalsTemp}
                                            onChange={(e) => setVitalsTemp(e.target.value)}
                                            required
                                            className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Pulse (bpm)</label>
                                        <input
                                            type="number"
                                            placeholder="72"
                                            value={vitalsPulse}
                                            onChange={(e) => setVitalsPulse(e.target.value)}
                                            required
                                            className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Treatment Section */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Treatment Administered</h3>
                                <textarea
                                    placeholder="Describe treatment provided (e.g., Injection given, Wound dressed, etc.)"
                                    value={treatment}
                                    onChange={(e) => setTreatment(e.target.value)}
                                    required
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Additional Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
                                <textarea
                                    placeholder="Any additional observations or comments"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition"
                            >
                                {submitting ? "Completing..." : "Complete Action"}
                            </button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
