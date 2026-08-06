"use client";

import { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import { useLabRequest, useUpdateLabRequest, useUpdatePatientStatus } from "@/hooks/emr/use-emr";
import { LoadingSkeleton, SuccessAlert } from "@/components/emr";
import { Beaker, Clock, User, Calendar, FileText, AlertTriangle } from "lucide-react";
import TestTemplateForm from "./TestTemplateForm";
import { findTemplate } from "./test-templates";

interface LabSuiteProps {
    requestId: string;
    onComplete?: () => void;
}

export default function LabSuite({ requestId, onComplete }: LabSuiteProps) {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.LabTechnician, UserRole.Admin]);
    const { data: request, isLoading: requestLoading } = useLabRequest(requestId);

    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const updatePatientStatusMutation = useUpdatePatientStatus();
    const updateLabRequestMutation = useUpdateLabRequest();

    if (!authorized) return null;

    const handleTemplateSubmit = async (resultString: string) => {
        setSubmitting(true);
        try {
            updateLabRequestMutation.mutate({
                id: requestId,
                updates: {
                    status: "Completed",
                    completed_by: user?.$id,
                    completed_at: new Date().toISOString(),
                    result: resultString,
                },
            });

            if (request?.patient_id || request?.visit_id) {
                updatePatientStatusMutation.mutate({
                    id: (request?.patient_id || request?.visit_id)!,
                    status: PatientStatus.AwaitingConsultation,
                });
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

    const template = findTemplate(request?.test_type);

    return (
        <div className="space-y-6">
            {success && <SuccessAlert message={success} />}

            {/* Request info card */}
            {request && (
                <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                <Beaker className="text-indigo-600" size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{request?.test_type ?? "Lab Test"}</h3>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    {/* Category badge from template */}
                                    {template && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                            {template.category}
                                        </span>
                                    )}
                                    {!template && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                            <AlertTriangle size={9} />
                                            No template – free text
                                        </span>
                                    )}
                                    {request.priority && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            request.priority === "stat" ? "bg-red-50 text-red-700 border border-red-100" :
                                            request.priority === "urgent" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                            "bg-gray-50 text-gray-600 border border-gray-100"
                                        }`}>
                                            <Clock size={9} />
                                            {request.priority.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Doctor's notes */}
                    {request.notes && (
                        <div className="mt-4 px-4 py-3 bg-blue-50/60 border border-blue-100 rounded-xl">
                            <div className="flex items-center gap-1.5 mb-1">
                                <FileText size={11} className="text-blue-500" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Doctor&apos;s Note</p>
                            </div>
                            <p className="text-sm text-blue-800">{request.notes}</p>
                        </div>
                    )}

                    {/* Meta strip */}
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 flex-wrap">
                        {request.visit_id && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <User size={11} className="text-gray-400" />
                                <span className="font-mono font-bold">#{request.visit_id.slice(-8)}</span>
                            </div>
                        )}
                        {request.created_at && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <Calendar size={11} className="text-gray-400" />
                                <span>Requested {new Date(request.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Template-based form */}
            <TestTemplateForm
                testType={request?.test_type ?? ""}
                onSubmit={handleTemplateSubmit}
                submitting={submitting}
            />
        </div>
    );
}
