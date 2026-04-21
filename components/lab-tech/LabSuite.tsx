"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import { useLabRequestsByPatient, useUpdateLabRequest, useUpdatePatientStatus } from "@/hooks/emr/use-emr";
import { LoadingSkeleton, ErrorAlert, SuccessAlert, PatientInfoCard } from "@/components/emr";
import { Button } from "@/components/ui/button";
import { Beaker, FileText, CheckCircle } from "lucide-react";

interface LabSuiteProps {
    requestId: string;
    onComplete?: () => void;
}

export default function LabSuite({ requestId, onComplete }: LabSuiteProps) {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.LabTechnician, UserRole.Admin]);
    const { data: request, loading: requestLoading } = useLabRequestsByPatient(requestId);

    const [results, setResults] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

    const updateRequestMutation = useUpdateLabRequest();
    const updatePatientStatusMutation = useUpdatePatientStatus();

    if (!authorized) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await updateRequestMutation.mutate(requestId, {
                status: "Completed",
                testResults: results,
                completedBy: user?.$id,
                resultDate: new Date().toISOString(),
            });

            if (request?.patientId) {
                // Determine next status - usually back to doctor for review
                await updatePatientStatusMutation.mutate(request.patientId, PatientStatus.AwaitingConsultation);
            }

            setSuccess("Test results submitted successfully.");
            if (onComplete) setTimeout(onComplete, 2000);
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (requestLoading) return <LoadingSkeleton rows={5} />;

    return (
        <div className="space-y-8">
            {success && <SuccessAlert message={success} />}
            {request && (
                <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                        <Beaker className="text-blue-600" />
                        <h3 className="text-xl font-bold text-gray-900">{request.testType}</h3>
                    </div>
                    <p className="text-gray-600 font-medium">{request.testDescription}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 space-y-6">
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-wider">
                        <FileText size={16} className="text-blue-600" /> Laboratory Findings
                    </label>
                    <textarea value={results} onChange={e => setResults(e.target.value)} rows={8} className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-mono" placeholder="Enter specimen findings, reference ranges, and conclusions..." required />
                </div>

                <Button type="submit" disabled={submitting} className="w-full py-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-lg font-bold shadow-xl shadow-blue-100 transition-all flex gap-3">
                    <CheckCircle />
                    {submitting ? "Processing Results..." : "Authorize & Release Results"}
                </Button>
            </form>
        </div>
    );
}
