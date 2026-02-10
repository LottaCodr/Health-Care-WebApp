"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import { usePatientsByStatus, useUpdatePatientStatus } from "@/hooks/use-emr";
import {
    PatientInfoCard,
    LoadingSkeleton,
    EmptyState,
    ErrorAlert,
    SuccessAlert,
} from "@/components/emr-ui";

/**
 * Patient Queue Screen
 * Shows patients awaiting consultation and allows status updates
 */
export default function PatientQueue() {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.FrontDesk, UserRole.Admin]);

    const [dismissedErrors, setDismissedErrors] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Fetch patients by status
    const registeredPatients = usePatientsByStatus(PatientStatus.Registered);
    const awaitingConsultationPatients = usePatientsByStatus(
        PatientStatus.AwaitingConsultation
    );

    // Status update mutation
    const updatePatientStatusMutation = useUpdatePatientStatus();

    if (!authorized) {
        return null;
    }

    const handleMoveToConsultation = async (patientId: string, patientName: string) => {
        try {
            await updatePatientStatusMutation.mutate(patientId, PatientStatus.AwaitingConsultation);
            setSuccessMessage(`${patientName} has been moved to Awaiting Consultation`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
            console.error("Failed to update patient status:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <h1 className="text-3xl font-bold text-gray-900">Patient Queue</h1>
                    <p className="text-gray-600 mt-1">Manage patient flow through consultation</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {successMessage && (
                    <SuccessAlert
                        message={successMessage}
                        onDismiss={() => setSuccessMessage(null)}
                    />
                )}

                {/* Queue Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                        <p className="text-gray-600 text-sm font-medium">Registered (Waiting)</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                            {registeredPatients.data?.length || 0}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                        <p className="text-gray-600 text-sm font-medium">In Queue (Awaiting Consultation)</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                            {awaitingConsultationPatients.data?.length || 0}
                        </p>
                    </div>
                </div>

                {/* Registered Patients Section */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Newly Registered Patients</h2>
                    {registeredPatients.loading && <LoadingSkeleton rows={3} />}
                    {registeredPatients.error && !dismissedErrors.includes("registered") && (
                        <ErrorAlert
                            error={registeredPatients.error}
                            onDismiss={() => setDismissedErrors([...dismissedErrors, "registered"])}
                        />
                    )}
                    {!registeredPatients.loading && registeredPatients.data?.length === 0 && (
                        <EmptyState
                            title="No Newly Registered Patients"
                            description="All patients have been processed"
                            icon="✓"
                        />
                    )}
                    <div className="space-y-4">
                        {registeredPatients.data?.map((patient) => (
                            <div
                                key={patient.$id}
                                className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                                    <p className="text-sm text-gray-600">
                                        Registered: {new Date(patient.registrationDate).toLocaleString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleMoveToConsultation(patient.$id, patient.name)}
                                    disabled={updatePatientStatusMutation.loading}
                                    className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium whitespace-nowrap"
                                >
                                    {updatePatientStatusMutation.loading ? "Processing..." : "Move to Queue"}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Queue Section */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Consultation Queue (FIFO)
                    </h2>
                    {awaitingConsultationPatients.loading && <LoadingSkeleton rows={3} />}
                    {awaitingConsultationPatients.error &&
                        !dismissedErrors.includes("awaiting-consultation") && (
                            <ErrorAlert
                                error={awaitingConsultationPatients.error}
                                onDismiss={() =>
                                    setDismissedErrors([...dismissedErrors, "awaiting-consultation"])
                                }
                            />
                        )}
                    {!awaitingConsultationPatients.loading &&
                        awaitingConsultationPatients.data?.length === 0 && (
                            <EmptyState
                                title="Queue is Empty"
                                description="No patients waiting for consultation"
                                icon="✓"
                            />
                        )}
                    <div className="space-y-2">
                        {awaitingConsultationPatients.data?.map((patient, index) => (
                            <div
                                key={patient.$id}
                                className="flex items-center p-4 border rounded-lg bg-yellow-50 border-yellow-200"
                            >
                                <div className="w-8 h-8 rounded-full bg-yellow-500 text-white flex items-center justify-center font-bold mr-4">
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                                    <p className="text-sm text-gray-600">{patient.phone}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-600">
                                        Waiting since:{" "}
                                        {new Date(patient.registrationDate).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
