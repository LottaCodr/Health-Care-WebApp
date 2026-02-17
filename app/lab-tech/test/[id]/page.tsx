"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { useLabRequest, useUpdateLabRequest, useUpdatePatientStatus } from "@/hooks/use-emr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton, ErrorAlert, SuccessAlert } from "@/components/emr-ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/auth-provider";

export default function LabResultEntryScreen() {
    const router = useRouter();
    const params = useParams();
    const testId = params.id as string;

    const { user } = useAuth();
    const { authorized, loading: roleLoading } = useRoleProtection([UserRole.LabTechnician, UserRole.Admin]);
    const { data: labRequest, loading: labLoading } = useLabRequest(testId);

    const [results, setResults] = useState("");
    const [resultFile, setResultFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const { mutate: updateLabRequest } = useUpdateLabRequest();
    const { mutate: updatePatientStatus } = useUpdatePatientStatus();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setResultFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!testId || !labRequest) return;

        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            // Convert file to base64 if provided
            let fileData = "";
            if (resultFile) {
                const reader = new FileReader();
                await new Promise((resolve) => {
                    reader.onload = () => {
                        fileData = reader.result as string;
                        resolve(null);
                    };
                    reader.readAsDataURL(resultFile);
                });
            }

            // Update lab request with results
            const updatedRequest = await updateLabRequest(testId, {
                status: "Completed",
                results: results,
                completionDate: new Date().toISOString(),
            });

            // Update patient status to AwaitingDoctorReview
            if (updatedRequest?.patientId) {
                await updatePatientStatus(updatedRequest.patientId, "AwaitingDoctorReview" as any);
            }

            setSuccessMessage("Lab results submitted successfully. Doctor will be notified.");
            setTimeout(() => {
                router.push("/lab-tech/dashboard");
            }, 2000);
        } catch (err) {
            setErrorMessage((err as Error).message || "Failed to submit results");
        } finally {
            setSubmitting(false);
        }
    };

    if (roleLoading || labLoading) return <LoadingSkeleton />;

    if (!authorized) {
        return <ErrorAlert message="Unauthorized access. Lab Technicians only." />;
    }

    if (!labRequest) {
        return <ErrorAlert message="Lab request not found" />;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center gap-4">
                    <Link href="/lab-tech/dashboard">
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Submit Lab Results</h1>
                        <p className="text-gray-600 mt-1">Complete laboratory test documentation</p>
                    </div>
                </div>

                {/* Test Details */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Test Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600">Test Type</p>
                            <p className="font-semibold text-gray-900">{labRequest.testType}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Patient ID</p>
                            <p className="font-semibold text-gray-900">{labRequest.patientId}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Description</p>
                            <p className="text-gray-900">{labRequest.testDescription}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Priority</p>
                            <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${labRequest.priority === "Urgent"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-blue-100 text-blue-800"
                                    }`}
                            >
                                {labRequest.priority}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Results Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Test Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {successMessage && <SuccessAlert message={successMessage} />}
                        {errorMessage && <ErrorAlert message={errorMessage} />}

                        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                            {/* Test Results */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Test Results</label>
                                <textarea
                                    placeholder="Enter test results, values, and observations"
                                    value={results}
                                    onChange={(e) => setResults(e.target.value)}
                                    required
                                    rows={6}
                                    className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Upload Result File (Optional)</label>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                {resultFile && (
                                    <p className="text-sm text-gray-600 mt-2">
                                        Selected: {resultFile.name}
                                    </p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition"
                            >
                                {submitting ? "Submitting..." : "Submit Results"}
                            </button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
