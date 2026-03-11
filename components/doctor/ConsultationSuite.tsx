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
} from "@/hooks/use-emr";
import {
    PatientInfoCard,
    ConsultationCard,
    LoadingSkeleton,
    EmptyState,
    ErrorAlert,
    SuccessAlert,
} from "@/components/emr";

/**
 * Consultation Suite Component
 * Extracted from root app/doctor/patient-consultation-v2.tsx
 */
export default function ConsultationSuite({
    patientId,
}: {
    patientId: string;
}) {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.Doctor, UserRole.Admin]);

    const [currentStep, setCurrentStep] = useState(1);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [dismissedErrors, setDismissedErrors] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        symptoms: "",
        diagnosis: "",
        prescriptions: [] as PrescriptionMedication[],
        labTests: [] as {
            testType: string;
            testDescription: string;
            priority: "Normal" | "Urgent";
        }[],
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
    const patient = usePatient(patientId);

    // Mutations
    const createConsultationMutation = useCreateConsultation();
    const createPrescriptionMutation = useCreatePrescription();
    const createLabRequestMutation = useCreateLabRequest();
    const updatePatientStatusMutation = useUpdatePatientStatus();

    if (!authorized) return null;

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
        if (!newMedication.drugName || !newMedication.dosage || !newMedication.frequency) {
            alert("Please fill in drug name, dosage, and frequency");
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.symptoms || !formData.diagnosis) {
            alert("Please provide at least symptoms and diagnosis");
            return;
        }

        try {
            const consultation = await createConsultationMutation.mutate({
                patientId,
                doctorId: user?.$id || "",
                startTime: new Date().toISOString(),
                symptoms: formData.symptoms,
                diagnosis: formData.diagnosis,
                notes: formData.notes,
                status: "Completed",
            });

            if (formData.prescriptions.length > 0) {
                await createPrescriptionMutation.mutate({
                    consultationId: consultation.$id,
                    patientId,
                    doctorId: user?.$id || "",
                    medications: formData.prescriptions,
                    instructions: formData.notes,
                    dosageDuration: "",
                    status: "Active",
                    createdDate: new Date().toISOString(),
                });
            }

            for (const test of formData.labTests) {
                await createLabRequestMutation.mutate({
                    patientId,
                    consultationId: consultation.$id,
                    doctorId: user?.$id || "",
                    testType: test.testType,
                    testDescription: test.testDescription,
                    status: "Pending",
                    priority: test.priority,
                    requestDate: new Date().toISOString(),
                });
            }

            let nextStatus = PatientStatus.SentToPharmacy;
            if (formData.labTests.length > 0) nextStatus = PatientStatus.SentToLab;
            if (formData.sendToNurse) nextStatus = PatientStatus.SentToNurse;

            await updatePatientStatusMutation.mutate(patientId, nextStatus);

            setSuccessMessage("Consultation finalized successfully.");
            setTimeout(() => setSuccessMessage(null), 5000);
            setCurrentStep(1);
        } catch (error) {
            console.error(error);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-gray-800">Step 1: Patient & Symptoms</h3>
                        {patient.data && <PatientInfoCard patient={patient.data} />}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Symptoms / Chief Complaint</label>
                            <textarea
                                name="symptoms"
                                value={formData.symptoms}
                                onChange={handleFormChange}
                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                rows={4}
                                placeholder="Describe patient symptoms..."
                            />
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-gray-800">Step 2: Diagnosis & Notes</h3>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Clinical Diagnosis</label>
                            <textarea
                                name="diagnosis"
                                value={formData.diagnosis}
                                onChange={handleFormChange}
                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                rows={4}
                                placeholder="Enter diagnosis..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Internal Notes</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleFormChange}
                                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                rows={3}
                                placeholder="Additional details..."
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                name="sendToNurse"
                                checked={formData.sendToNurse}
                                onChange={handleFormChange}
                                className="w-5 h-5 accent-blue-600"
                            />
                            <label className="text-sm font-medium text-gray-700">Refer to nursing for vitals</label>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-gray-800">Step 3: Prescriptions</h3>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="Drug Name"
                                    value={newMedication.drugName}
                                    onChange={(e) => setNewMedication({ ...newMedication, drugName: e.target.value })}
                                    className="p-2 border rounded-lg"
                                />
                                <input
                                    type="text"
                                    placeholder="Dosage"
                                    value={newMedication.dosage}
                                    onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
                                    className="p-2 border rounded-lg"
                                />
                                <input
                                    type="text"
                                    placeholder="Frequency"
                                    value={newMedication.frequency}
                                    onChange={(e) => setNewMedication({ ...newMedication, frequency: e.target.value })}
                                    className="p-2 border rounded-lg"
                                />
                                <input
                                    type="text"
                                    placeholder="Duration"
                                    value={newMedication.duration}
                                    onChange={(e) => setNewMedication({ ...newMedication, duration: e.target.value })}
                                    className="p-2 border rounded-lg"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleAddMedication}
                                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                            >
                                + Add Medication
                            </button>
                        </div>
                        <div className="space-y-2">
                            {formData.prescriptions.map((m, i) => (
                                <div key={i} className="flex justify-between p-3 bg-blue-50 rounded-lg border border-blue-100 italic text-sm">
                                    <span>{m.drugName} ({m.dosage}) - {m.frequency}</span>
                                    <button onClick={() => setFormData(p => ({ ...p, prescriptions: p.prescriptions.filter((_, idx) => idx !== i) }))} className="text-red-500 hover:underline">Remove</button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-gray-800">Step 4: Laboratory Requests</h3>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                            <select
                                value={newLabTest.testType}
                                onChange={(e) => setNewLabTest({ ...newLabTest, testType: e.target.value })}
                                className="w-full p-2 border rounded-lg"
                            >
                                <option value="">Select Test Type</option>
                                <option value="Blood Test">Blood Test</option>
                                <option value="Urinalysis">Urinalysis</option>
                                <option value="Imaging">Imaging (X-Ray/US)</option>
                            </select>
                            <button
                                type="button"
                                onClick={handleAddLabTest}
                                className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold"
                            >
                                + Add Lab Request
                            </button>
                        </div>
                        <div className="space-y-2">
                            {formData.labTests.map((t, i) => (
                                <div key={i} className="flex justify-between p-3 bg-orange-50 rounded-lg border border-orange-100 italic text-sm">
                                    <span>{t.testType} - {t.priority}</span>
                                    <button onClick={() => setFormData(p => ({ ...p, labTests: p.labTests.filter((_, idx) => idx !== i) }))} className="text-red-500 hover:underline">Remove</button>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="w-full">
            {/* Steps Indicator */}
            <div className="flex justify-between mb-8">
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} className={`flex-1 h-2 rounded-full mx-1 ${s <= currentStep ? "bg-blue-600" : "bg-gray-200"}`} />
                ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                {successMessage && <SuccessAlert message={successMessage} />}
                {patient.loading && <LoadingSkeleton rows={4} />}
                {renderStep()}

                <div className="flex justify-between pt-4 border-t">
                    <button
                        type="button"
                        onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                        className={`px-6 py-2 rounded-xl font-medium transition-all ${currentStep === 1 ? "hidden" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                        Back
                    </button>
                    {currentStep < 4 ? (
                        <button
                            type="button"
                            onClick={() => setCurrentStep(prev => prev + 1)}
                            className="ml-auto px-6 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
                        >
                            Next Step
                        </button>
                    ) : (
                        <button
                            type="submit"
                            className="ml-auto px-8 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-md shadow-green-200"
                        >
                            Finalize Consultation
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
