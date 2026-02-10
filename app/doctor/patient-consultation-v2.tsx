"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus, PrescriptionMedication } from "@/types/models";
import {
    usePatient,
    useCreateConsultation,
    useCreatePrescription,
    useCreateLabRequest,
    useUpdatePatientStatus,
    useUpdateConsultation,
} from "@/hooks/use-emr";
import {
    PatientInfoCard,
    LoadingSkeleton,
    EmptyState,
    ErrorAlert,
    SuccessAlert,
} from "@/components/emr-ui";

interface ConsultationFormData {
    symptoms: string;
    diagnosis: string;
    prescriptions: PrescriptionMedication[];
    labTests: {
        testType: string;
        testDescription: string;
        priority: "Normal" | "Urgent";
    }[];
    notes: string;
    sendToNurse: boolean;
}

/**
 * Patient Consultation Screen
 * Used by doctors to conduct consultations and create prescriptions/lab requests
 */
export default function PatientConsultation({
    patientId,
}: {
    patientId?: string;
}) {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.Doctor, UserRole.Admin]);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPatientId, setSelectedPatientId] = useState(patientId || "");
    const [currentStep, setCurrentStep] = useState(1);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [dismissedErrors, setDismissedErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState<ConsultationFormData>({
        symptoms: "",
        diagnosis: "",
        prescriptions: [],
        labTests: [],
        notes: "",
        sendToNurse: false,
    });

    const [newMedication, setNewMedication] = useState<PrescriptionMedication>({
        drugName: "",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
    });

    const [newLabTest, setNewLabTest] = useState<{
        testType: string;
        testDescription: string;
        priority: "Normal" | "Urgent";
    }>({
        testType: "",
        testDescription: "",
        priority: "Normal",
    });

    // Fetch patient data
    const patient = usePatient(selectedPatientId);

    // Mutations
    const createConsultationMutation = useCreateConsultation();
    const createPrescriptionMutation = useCreatePrescription();
    const createLabRequestMutation = useCreateLabRequest();
    const updatePatientStatusMutation = useUpdatePatientStatus();

    if (!authorized) {
        return null;
    }

    const handleFormChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]:
                type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleAddMedication = () => {
        if (
            !newMedication.drugName ||
            !newMedication.dosage ||
            !newMedication.frequency
        ) {
            alert("Please fill in all medication fields");
            return;
        }

        setFormData((prev) => ({
            ...prev,
            prescriptions: [...prev.prescriptions, newMedication],
        }));

        setNewMedication({
            drugName: "",
            dosage: "",
            frequency: "",
            duration: "",
            instructions: "",
        });
    };

    const handleRemoveMedication = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            prescriptions: prev.prescriptions.filter((_, i) => i !== index),
        }));
    };

    const handleAddLabTest = () => {
        if (!newLabTest.testType) {
            alert("Please select a test type");
            return;
        }

        setFormData((prev) => ({
            ...prev,
            labTests: [...prev.labTests, newLabTest],
        }));

        setNewLabTest({
            testType: "",
            testDescription: "",
            priority: "Normal",
        });
    };

    const handleRemoveLabTest = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            labTests: prev.labTests.filter((_, i) => i !== index),
        }));
    };

    const handleSubmitConsultation = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPatientId) {
            alert("Please select a patient");
            return;
        }

        if (!formData.symptoms || !formData.diagnosis) {
            alert("Please fill in symptoms and diagnosis");
            return;
        }

        try {
            // Create consultation record
            const consultation = await createConsultationMutation.mutate({
                patientId: selectedPatientId,
                doctorId: user?.$id || "",
                startTime: new Date().toISOString(),
                symptoms: formData.symptoms,
                diagnosis: formData.diagnosis,
                notes: formData.notes,
                status: "Completed",
            });

            // Create prescriptions if any
            if (formData.prescriptions.length > 0) {
                await createPrescriptionMutation.mutate({
                    consultationId: consultation.$id,
                    patientId: selectedPatientId,
                    doctorId: user?.$id || "",
                    medications: formData.prescriptions,
                    instructions: formData.notes,
                    dosageDuration: "",
                    status: "Active",
                    createdDate: new Date().toISOString(),
                });
            }

            // Create lab requests if any
            for (const labTest of formData.labTests) {
                await createLabRequestMutation.mutate({
                    patientId: selectedPatientId,
                    consultationId: consultation.$id,
                    doctorId: user?.$id || "",
                    testType: labTest.testType,
                    testDescription: labTest.testDescription,
                    status: "Pending",
                    priority: labTest.priority,
                    requestDate: new Date().toISOString(),
                });
            }

            // Update patient status
            let newStatus = PatientStatus.SentToPharmacy;
            if (formData.labTests.length > 0) newStatus = PatientStatus.SentToLab;
            if (formData.sendToNurse) newStatus = PatientStatus.SentToNurse;

            await updatePatientStatusMutation.mutate(selectedPatientId, newStatus);

            setSuccessMessage(
                `Consultation completed successfully! Patient status updated to: ${newStatus}`
            );

            // Reset form
            setFormData({
                symptoms: "",
                diagnosis: "",
                prescriptions: [],
                labTests: [],
                notes: "",
                sendToNurse: false,
            });
            setSelectedPatientId("");
            setCurrentStep(1);

            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (error) {
            console.error("Failed to submit consultation:", error);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 pb-4 border-b">
                            Step 1: Patient Selection & Symptoms
                        </h3>

                        {!selectedPatientId && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Patient
                                </label>
                                <input
                                    type="text"
                                    placeholder="Search patient by name or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                                />
                                {/* TODO: Implement patient search results */}
                            </div>
                        )}

                        {patient.data && <PatientInfoCard patient={patient.data} />}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Chief Complaint / Symptoms *
                            </label>
                            <textarea
                                name="symptoms"
                                value={formData.symptoms}
                                onChange={handleFormChange}
                                placeholder="Describe the patient's symptoms..."
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 pb-4 border-b">
                            Step 2: Diagnosis & Assessment
                        </h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Diagnosis *
                            </label>
                            <textarea
                                name="diagnosis"
                                value={formData.diagnosis}
                                onChange={handleFormChange}
                                placeholder="Enter your diagnosis..."
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes & Observations
                            </label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleFormChange}
                                placeholder="Additional notes..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                name="sendToNurse"
                                id="sendToNurse"
                                checked={formData.sendToNurse}
                                onChange={handleFormChange}
                                className="w-4 h-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <label htmlFor="sendToNurse" className="ml-2 text-sm text-gray-700">
                                Send to Nursing for vital monitoring
                            </label>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 pb-4 border-b">
                            Step 3: Prescriptions
                        </h3>

                        {/* Add Medication */}
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <h4 className="font-semibold text-gray-900 mb-4">Add Medication</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    placeholder="Drug Name"
                                    value={newMedication.drugName}
                                    onChange={(e) =>
                                        setNewMedication({
                                            ...newMedication,
                                            drugName: e.target.value,
                                        })
                                    }
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Dosage (e.g., 500mg)"
                                    value={newMedication.dosage}
                                    onChange={(e) =>
                                        setNewMedication({
                                            ...newMedication,
                                            dosage: e.target.value,
                                        })
                                    }
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Frequency (e.g., 3x daily)"
                                    value={newMedication.frequency}
                                    onChange={(e) =>
                                        setNewMedication({
                                            ...newMedication,
                                            frequency: e.target.value,
                                        })
                                    }
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Duration (e.g., 7 days)"
                                    value={newMedication.duration}
                                    onChange={(e) =>
                                        setNewMedication({
                                            ...newMedication,
                                            duration: e.target.value,
                                        })
                                    }
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="Special Instructions"
                                value={newMedication.instructions}
                                onChange={(e) =>
                                    setNewMedication({
                                        ...newMedication,
                                        instructions: e.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-3"
                            />
                            <button
                                type="button"
                                onClick={handleAddMedication}
                                className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                            >
                                + Add Medication
                            </button>
                        </div>

                        {/* Medications List */}
                        {formData.prescriptions.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">
                                    Medications ({formData.prescriptions.length})
                                </h4>
                                <div className="space-y-2">
                                    {formData.prescriptions.map((med, index) => (
                                        <div
                                            key={index}
                                            className="flex justify-between items-start p-3 bg-gray-50 border rounded-lg"
                                        >
                                            <div>
                                                <p className="font-medium text-gray-900">{med.drugName}</p>
                                                <p className="text-sm text-gray-600">
                                                    {med.dosage} - {med.frequency} for {med.duration}
                                                </p>
                                                {med.instructions && (
                                                    <p className="text-sm text-gray-600">
                                                        Instructions: {med.instructions}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveMedication(index)}
                                                className="text-red-600 hover:text-red-800 font-medium text-sm"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 pb-4 border-b">
                            Step 4: Lab Tests
                        </h3>

                        {/* Add Lab Test */}
                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                            <h4 className="font-semibold text-gray-900 mb-4">Request Lab Test</h4>
                            <select
                                value={newLabTest.testType}
                                onChange={(e) =>
                                    setNewLabTest({ ...newLabTest, testType: e.target.value })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 mb-3"
                            >
                                <option value="">Select Test Type</option>
                                <option value="Blood Test">Blood Test (Complete Blood Count)</option>
                                <option value="Urinalysis">Urinalysis</option>
                                <option value="X-Ray">X-Ray</option>
                                <option value="Ultrasound">Ultrasound</option>
                                <option value="ECG">ECG (Electrocardiogram)</option>
                                <option value="CT Scan">CT Scan</option>
                                <option value="Biochemistry">Biochemistry Panel</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Test Description (optional)"
                                value={newLabTest.testDescription}
                                onChange={(e) =>
                                    setNewLabTest({
                                        ...newLabTest,
                                        testDescription: e.target.value,
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 mb-3"
                            />
                            <select
                                value={newLabTest.priority}
                                onChange={(e) =>
                                    setNewLabTest({
                                        ...newLabTest,
                                        priority: e.target.value as "Normal" | "Urgent",
                                    })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 mb-3"
                            >
                                <option value="Normal">Normal Priority</option>
                                <option value="Urgent">Urgent</option>
                            </select>
                            <button
                                type="button"
                                onClick={handleAddLabTest}
                                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors"
                            >
                                + Add Lab Test
                            </button>
                        </div>

                        {/* Lab Tests List */}
                        {formData.labTests.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-3">
                                    Lab Tests ({formData.labTests.length})
                                </h4>
                                <div className="space-y-2">
                                    {formData.labTests.map((test, index) => (
                                        <div
                                            key={index}
                                            className="flex justify-between items-start p-3 bg-gray-50 border rounded-lg"
                                        >
                                            <div>
                                                <p className="font-medium text-gray-900">{test.testType}</p>
                                                {test.testDescription && (
                                                    <p className="text-sm text-gray-600">
                                                        {test.testDescription}
                                                    </p>
                                                )}
                                                <p className="text-sm text-gray-600">
                                                    Priority: {test.priority}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveLabTest(index)}
                                                className="text-red-600 hover:text-red-800 font-medium text-sm"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-3xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Patient Consultation
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Conduct consultation and create medical records
                    </p>
                </div>

                {/* Progress Indicator */}
                <div className="mb-8 flex justify-between">
                    {[
                        { step: 1, label: "Patient" },
                        { step: 2, label: "Diagnosis" },
                        { step: 3, label: "Prescription" },
                        { step: 4, label: "Lab Tests" },
                    ].map(({ step, label }) => (
                        <div key={step} className="flex items-center flex-1">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold cursor-pointer ${step <= currentStep
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-200 text-gray-600"
                                    }`}
                                onClick={() => setCurrentStep(step)}
                            >
                                {step}
                            </div>
                            {step < 4 && (
                                <div
                                    className={`flex-1 h-1 mx-2 ${step < currentStep ? "bg-blue-600" : "bg-gray-200"
                                        }`}
                                ></div>
                            )}
                            <span className="text-xs text-gray-600 ml-1">{label}</span>
                        </div>
                    ))}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmitConsultation} className="bg-white rounded-lg shadow p-8">
                    {successMessage && (
                        <SuccessAlert
                            message={successMessage}
                            onDismiss={() => setSuccessMessage(null)}
                        />
                    )}

                    {patient.error && !dismissedErrors.includes("patient") && (
                        <ErrorAlert
                            error={patient.error}
                            onDismiss={() => setDismissedErrors([...dismissedErrors, "patient"])}
                        />
                    )}

                    {patient.loading && currentStep === 1 && (
                        <LoadingSkeleton rows={3} />
                    )}

                    {renderStep()}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-8 pt-6 border-t">
                        <button
                            type="button"
                            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                            disabled={currentStep === 1}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            ← Previous
                        </button>

                        {currentStep < 4 ? (
                            <button
                                type="button"
                                onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Next →
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={createConsultationMutation.loading}
                                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {createConsultationMutation.loading
                                    ? "Completing..."
                                    : "Complete Consultation"}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
