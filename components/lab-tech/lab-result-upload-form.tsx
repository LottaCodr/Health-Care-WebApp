"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { useLabRequest, useCompleteLabRequest } from "@/hooks/use-emr";
import { getPatientById } from "@/lib/appwrite-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle, CheckCircle2, Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LabResultUploadFormProps {
    labRequestId: string;
    patientId: string;
    testType: string;
    onSuccess?: () => void;
}

/**
 * Lab Result Upload Form
 * Allows lab technician to upload/record test results
 * Updates patient status to AwaitingPayment when complete
 */
export function LabResultUploadForm({
    labRequestId,
    patientId,
    testType,
    onSuccess,
}: LabResultUploadFormProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { toast } = useToast();

    // Fetch lab request details
    const { data: labRequest, loading: labLoading } = useLabRequest(labRequestId);
    const { mutate: completeLabRequest, loading: completing } = useCompleteLabRequest();

    const [formData, setFormData] = useState({
        results: "",
        normalRange: "",
        interpretation: "",
        remarks: "",
        resultFile: null as File | null,
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                setErrors((prev) => ({ ...prev, resultFile: "File size must be less than 10MB" }));
                return;
            }
            setFormData((prev) => ({
                ...prev,
                resultFile: file,
            }));
            setErrors((prev) => ({ ...prev, resultFile: "" }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.results.trim()) {
            newErrors.results = "Test results are required";
        }

        if (!formData.interpretation.trim()) {
            newErrors.interpretation = "Interpretation is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!validateForm()) {
            // toast.error("Please fill in all required fields");
            return;
        }

        // Combine all result information into a single string
        const combinedResults = `
Test Type: ${testType}
Date: ${new Date().toLocaleDateString()}

Results:
${formData.results}

Normal Range:
${formData.normalRange || "N/A"}

Interpretation:
${formData.interpretation}

Remarks:
${formData.remarks || "N/A"}
    `.trim();

        try {
            setUploadProgress(25);

            // If file was uploaded, we would handle file upload here
            // For now, we're storing the text results
            if (formData.resultFile) {
                // TODO: Implement file upload to Appwrite storage
                console.log("File upload would happen here:", formData.resultFile);
                setUploadProgress(50);
            }

            setUploadProgress(75);

            // Complete the lab request and update patient status
            const result = await completeLabRequest(labRequestId, combinedResults, patientId);

            if (result) {
                setUploadProgress(100);
                // toast.success("Lab results recorded and patient updated");

                // Reset form
                setFormData({
                    results: "",
                    normalRange: "",
                    interpretation: "",
                    remarks: "",
                    resultFile: null,
                });

                // Callback or redirect
                if (onSuccess) {
                    onSuccess();
                } else {
                    setTimeout(() => router.back(), 1500);
                }
            }
        } catch (error) {
            console.error("Error uploading lab results:", error);
            // toast.error("Failed to upload lab results. Please try again.");
            setUploadProgress(0);
        }
    };

    // if (labLoading) {
    //     return (
    //         <Card>
    //             <CardContent className="flex items-center justify-center py-12">
    //                 <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    //                 <span className="ml-2 text-muted-foreground">Loading lab request...</span>
    //             </CardContent>
    //         </Card>
    //     );
    // }

    // if (!labRequest) {
    //     return (
    //         <Card className="border-destructive">
    //             <CardContent className="flex items-center gap-3 py-6">
    //                 <AlertCircle className="h-5 w-5 text-destructive" />
    //                 <div>
    //                     <p className="font-semibold text-destructive">Lab request not found</p>
    //                     <p className="text-sm text-muted-foreground">Please check the request ID and try again</p>
    //                 </div>
    //             </CardContent>
    //         </Card>
    //     );
    // }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Lab Result Upload</CardTitle>
                <CardDescription>
                    Record and upload results for {testType}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Test Information */}
                    <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                        <h3 className="font-semibold text-slate-900">Test Information</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">Test Type:</span>
                                <p className="font-medium">{testType}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Status:</span>
                                {/* <p className="font-medium">{labRequest.status}</p> */}
                            </div>
                            <div>
                                <span className="text-muted-foreground">Priority:</span>
                                {/* <p className="font-medium">{labRequest.priority}</p> */}
                            </div>
                            <div>
                                <span className="text-muted-foreground">Request Date:</span>
                                <p className="font-medium">
                                    {/* {new Date(labRequest.requestDate).toLocaleDateString()} */}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Test Results */}
                    <div className="space-y-2">
                        <Label htmlFor="results">
                            Test Results <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="results"
                            name="results"
                            placeholder="Enter detailed test results here... (e.g., White Blood Cell Count: 7.5K, Red Blood Cell Count: 4.8M)"
                            value={formData.results}
                            onChange={handleInputChange}
                            rows={5}
                            className={errors.results ? "border-destructive" : ""}
                            disabled={completing}
                        />
                        {errors.results && (
                            <p className="text-sm text-destructive">{errors.results}</p>
                        )}
                    </div>

                    {/* Normal Range */}
                    <div className="space-y-2">
                        <Label htmlFor="normalRange">Normal Range (Optional)</Label>
                        <Input
                            id="normalRange"
                            name="normalRange"
                            placeholder="e.g., 4.5K - 11K"
                            value={formData.normalRange}
                            onChange={handleInputChange}
                            disabled={completing}
                        />
                    </div>

                    {/* Interpretation */}
                    <div className="space-y-2">
                        <Label htmlFor="interpretation">
                            Clinical Interpretation <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                            id="interpretation"
                            name="interpretation"
                            placeholder="Provide your interpretation of the test results..."
                            value={formData.interpretation}
                            onChange={handleInputChange}
                            rows={3}
                            className={errors.interpretation ? "border-destructive" : ""}
                            disabled={completing}
                        />
                        {errors.interpretation && (
                            <p className="text-sm text-destructive">{errors.interpretation}</p>
                        )}
                    </div>

                    {/* Additional Remarks */}
                    <div className="space-y-2">
                        <Label htmlFor="remarks">Additional Remarks (Optional)</Label>
                        <Textarea
                            id="remarks"
                            name="remarks"
                            placeholder="Any additional notes or observations..."
                            value={formData.remarks}
                            onChange={handleInputChange}
                            rows={2}
                            disabled={completing}
                        />
                    </div>

                    {/* File Upload */}
                    <div className="space-y-2">
                        <Label htmlFor="resultFile">Attach Test Report (Optional)</Label>
                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 hover:border-primary transition cursor-pointer">
                            <input
                                type="file"
                                id="resultFile"
                                onChange={handleFileChange}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                disabled={completing}
                                className="hidden"
                            />
                            <label htmlFor="resultFile" className="flex flex-col items-center gap-2 cursor-pointer">
                                <Upload className="h-6 w-6 text-muted-foreground" />
                                <div className="text-center">
                                    <p className="font-medium text-slate-900">
                                        {formData.resultFile ? formData.resultFile.name : "Click to upload"}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        PDF, DOC, DOCX, JPG, or PNG up to 10MB
                                    </p>
                                </div>
                            </label>
                        </div>
                        {errors.resultFile && (
                            <p className="text-sm text-destructive">{errors.resultFile}</p>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="space-y-2">
                            <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                            <p className="text-sm text-muted-foreground text-center">
                                Uploading: {uploadProgress}%
                            </p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex gap-2">
                        <Button
                            type="submit"
                            disabled={completing || uploadProgress > 0}
                            className="flex-1"
                        >
                            {completing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Submit Results
                                </>
                            )}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={completing}
                            onClick={() => router.back()}
                        >
                            Cancel
                        </Button>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-900">
                            <strong>Note:</strong> After submitting results, the patient will automatically be
                            moved to awaiting payment status. Make sure all results are accurate before
                            submission.
                        </p>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
