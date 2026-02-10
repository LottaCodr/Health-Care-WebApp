"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole } from "@/types/models";
import { useCreateDispensingRecord, useUpdatePatientStatus, usePrescription, useUpdatePrescription } from "@/hooks/use-emr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton, ErrorAlert, SuccessAlert } from "@/components/emr-ui";
import { ArrowLeft, Check, X } from "lucide-react";
import Link from "next/link";

export default function DispenseMedicationScreen() {
    const router = useRouter();
    const params = useParams();
    const prescriptionId = params.id as string;

    const { user } = useAuth();
    const { authorized, loading: roleLoading } = useRoleProtection([UserRole.Pharmacist, UserRole.Admin]);

    const [dispensedMedications, setDispensedMedications] = useState<any[]>([]);
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const { data: prescription, loading: presLoading, error: presError } = usePrescription(prescriptionId);
    const [loading, setLoading] = useState(false);

    const { mutate: createRecord } = useCreateDispensingRecord();
    const { mutate: updatePatientStatusMutate } = useUpdatePatientStatus();
    const { mutate: updatePrescriptionMutate } = useUpdatePrescription();

    const toggleMedicationDispensed = (index: number) => {
        const updated = [...dispensedMedications];
        if (updated.includes(index)) {
            updated.splice(updated.indexOf(index), 1);
        } else {
            updated.push(index);
        }
        setDispensedMedications(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prescriptionId || !prescription) return;

        if (dispensedMedications.length === 0) {
            setErrorMessage("Please mark at least one medication as dispensed");
            return;
        }

        setSubmitting(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const dispensedList = prescription.medications
                .filter((_: any, idx: number) => dispensedMedications.includes(idx))
                .map((med: any) => ({
                    drugName: med.drugName,
                    quantityDispensed: 1,
                    dosage: med.dosage,
                    frequency: med.frequency,
                }));

            await createRecord({
                prescriptionId,
                patientId: prescription.patientId,
                pharmacistId: user?.$id,
                dispensedDate: new Date().toISOString(),
                dispensedMedications: dispensedList,
                notes,
            });

            // Update prescription status
            await updatePrescriptionMutate(prescriptionId, { status: "Dispensed" } as any);

            // Update patient status to AwaitingPayment
            await updatePatientStatusMutate(prescription.patientId, "AwaitingPayment" as any);

            setSuccessMessage("Medication dispensed successfully");
            setTimeout(() => {
                router.push("/pharmacist/dashboard");
            }, 2000);
        } catch (err) {
            setErrorMessage((err as Error).message || "Failed to dispense medication");
        } finally {
            setSubmitting(false);
        }
    };

    if (roleLoading || presLoading || loading) return <LoadingSkeleton />;

    if (!authorized) {
        return <ErrorAlert message="Unauthorized access. Pharmacists only." />;
    }

    if (presError) return <ErrorAlert message={presError.message} />;
    if (!prescription) {
        return <ErrorAlert message="Prescription not found" />;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center gap-4">
                    <Link href="/pharmacist/dashboard">
                        <button className="p-2 hover:bg-gray-200 rounded-lg transition">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Dispense Medication</h1>
                        <p className="text-gray-600 mt-1">Complete prescription fulfillment</p>
                    </div>
                </div>

                {/* Prescription Details */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Prescription Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-600">Patient ID</p>
                            <p className="font-semibold text-gray-900">{prescription.patientId}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Instructions</p>
                            <p className="text-gray-900">{prescription.instructions}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Medications to Dispense */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Medications</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {successMessage && <SuccessAlert message={successMessage} />}
                        {errorMessage && <ErrorAlert message={errorMessage} />}

                        <div className="space-y-3 mt-4">
                            {prescription.medications?.map((med: any, idx: number) => (
                                <div
                                    key={idx}
                                    className="p-4 border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-50 cursor-pointer transition"
                                    onClick={() => toggleMedicationDispensed(idx)}
                                >
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900">{med.drugName}</h3>
                                        <p className="text-sm text-gray-600">
                                            {med.dosage} • {med.frequency} • {med.duration}
                                        </p>
                                    </div>
                                    <div
                                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${dispensedMedications.includes(idx)
                                            ? "bg-green-500 border-green-500"
                                            : "border-gray-300"
                                            }`}
                                    >
                                        {dispensedMedications.includes(idx) && (
                                            <Check className="h-4 w-4 text-white" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Dispensing Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Dispensing Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                                <textarea
                                    placeholder="Any additional notes or warnings for the patient"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || dispensedMedications.length === 0}
                                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 transition"
                            >
                                {submitting ? "Dispensing..." : "Complete Dispensing"}
                            </button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
