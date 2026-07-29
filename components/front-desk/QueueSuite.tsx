"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import { usePatientsByStatus, useUpdatePatientStatus } from "@/hooks/emr/use-patients";
import { PatientInfoCard, LoadingSkeleton, EmptyState, ErrorAlert, SuccessAlert } from "@/components/emr";

export default function QueueSuite() {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.FrontDesk, UserRole.Admin]);

    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const registeredPatients = usePatientsByStatus(PatientStatus.Registered);
    const awaitingConsultationPatients = usePatientsByStatus(PatientStatus.AwaitingConsultation);
    const updatePatientStatusMutation = useUpdatePatientStatus();

    if (!authorized) return null;

    const handleMoveToQueue = async (patientId: string, name: string) => {
        try {
            await updatePatientStatusMutation.mutate({ id: patientId, status: PatientStatus.AwaitingConsultation });
            setSuccessMessage(`${name} moved to consultation queue.`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-8">
            {successMessage && <SuccessAlert message={successMessage} />}

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Arrivals Lounge (Unprocessed)</h3>
                {registeredPatients.isLoading && <LoadingSkeleton rows={3} />}
                <div className="space-y-4">
                    {registeredPatients.data?.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="flex-1">
                                <p className="font-bold text-gray-900">{p.name}</p>
                                <p className="text-sm text-gray-500">Arrived: {new Date(p.created_at ?? "").toLocaleTimeString()}</p>
                            </div>
                            <button onClick={() => handleMoveToQueue(p.id, p.name)} className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold shadow-md shadow-blue-100 transition-all">
                                Move to Queue
                            </button>
                        </div>
                    ))}
                    {!registeredPatients.isLoading && registeredPatients.data?.length === 0 && (
                        <EmptyState title="Lounge Empty" description="No new arrivals awaiting triage" icon="✓" />
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Doctor&apos;s Queue</h3>
                <div className="space-y-3">
                    {awaitingConsultationPatients.data?.map((p, i) => (
                        <div key={p.id} className="flex items-center p-4 bg-blue-50 rounded-2xl border border-blue-100">
                            <span className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white font-bold rounded-full mr-4 shadow-lg shadow-blue-200">{i + 1}</span>
                            <div className="flex-1">
                                <p className="font-bold text-gray-900">{p.name}</p>
                                <p className="text-xs text-gray-600">{p.phone}</p>
                            </div>
                            <span className="text-sm font-semibold text-blue-700 px-3 py-1 bg-white rounded-full border border-blue-100 shadow-sm">Waiting</span>
                        </div>
                    ))}
                    {!awaitingConsultationPatients.isLoading && awaitingConsultationPatients.data?.length === 0 && (
                        <EmptyState title="Queue Empty" description="Consultation rooms are ready" icon="🥼" />
                    )}
                </div>
            </div>
        </div>
    );
}
