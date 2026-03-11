"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/auth-provider";
import { useRoleProtection } from "@/lib/role-utils";
import { UserRole, PatientStatus } from "@/types/models";
import { usePrescription, useUpdatePrescription, useCreateDispensingRecord, useUpdatePatientStatus } from "@/hooks/use-emr";
import { LoadingSkeleton, ErrorAlert, SuccessAlert } from "@/components/emr";
import { Button } from "@/components/ui/button";
import { Pill, Check, Clipboard, AlertCircle } from "lucide-react";

interface PharmacySuiteProps {
    prescriptionId: string;
    onComplete?: () => void;
}

export default function PharmacySuite({ prescriptionId, onComplete }: PharmacySuiteProps) {
    const { user } = useAuth();
    const { authorized } = useRoleProtection([UserRole.Pharmacist, UserRole.Admin]);
    const { data: prescription, loading: presLoading } = usePrescription(prescriptionId);

    const [dispensedIndices, setDispensedIndices] = useState<number[]>([]);
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

    const createRecordMutation = useCreateDispensingRecord();
    const updatePrescriptionMutation = useUpdatePrescription();
    const updatePatientStatusMutation = useUpdatePatientStatus();

    if (!authorized) return null;

    const toggleMed = (idx: number) => {
        setDispensedIndices(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (dispensedIndices.length === 0) return;
        setSubmitting(true);
        try {
            const dispensedList = prescription!.medications
                .filter((_: any, idx: number) => dispensedIndices.includes(idx))
                .map((med: any) => ({
                    drugName: med.drugName,
                    quantityDispensed: 1, // Simplified
                    dosage: med.dosage,
                    frequency: med.frequency,
                }));

            await createRecordMutation.mutate({
                prescriptionId,
                patientId: prescription!.patientId,
                pharmacistId: user?.$id,
                dispensedDate: new Date().toISOString(),
                dispensedMedications: dispensedList,
                notes,
            } as any);

            await updatePrescriptionMutation.mutate(prescriptionId, { status: "Dispensed" } as any);
            await updatePatientStatusMutation.mutate(prescription!.patientId, PatientStatus.AwaitingPayment);

            setSuccess("Medications dispensed and billing triggered.");
            if (onComplete) setTimeout(onComplete, 2000);
        } catch (error) {
            console.error(error);
        } finally {
            setSubmitting(false);
        }
    };

    if (presLoading) return <LoadingSkeleton rows={5} />;

    return (
        <div className="space-y-8">
            {success && <SuccessAlert message={success} />}
            {prescription && (
                <div className="bg-white p-8 rounded-[2rem] border border-blue-100 shadow-sm flex justify-between items-start">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-blue-600 uppercase tracking-widest">
                            <Clipboard size={16} /> Clinical Instructions
                        </div>
                        <p className="text-xl font-bold text-gray-900 leading-tight">{prescription.instructions}</p>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {prescription?.medications?.map((med: any, idx: number) => (
                    <div key={idx} onClick={() => toggleMed(idx)} className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex justify-between items-center ${dispensedIndices.includes(idx) ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-100" : "bg-white border-gray-100 hover:border-blue-200"}`}>
                        <div className="flex gap-4 items-center">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${dispensedIndices.includes(idx) ? "bg-white text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                                <Pill size={24} />
                            </div>
                            <div>
                                <p className={`text-lg font-black ${dispensedIndices.includes(idx) ? "text-white" : "text-gray-900"}`}>{med.drugName}</p>
                                <p className={`text-sm font-medium ${dispensedIndices.includes(idx) ? "text-blue-100" : "text-gray-500"}`}>{med.dosage} • {med.frequency} • {med.duration}</p>
                            </div>
                        </div>
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${dispensedIndices.includes(idx) ? "bg-white border-white" : "border-gray-200"}`}>
                            {dispensedIndices.includes(idx) && <Check size={20} className="text-blue-600" />}
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 space-y-6">
                <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-gray-700 uppercase tracking-widest">
                        <AlertCircle size={16} className="text-orange-600" /> Pharmacist Notes for Patient
                    </label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Warning/Advice (e.g., Take after meals, may cause drowsiness)..." />
                </div>

                <Button type="submit" disabled={submitting || dispensedIndices.length === 0} className="w-full py-8 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-lg font-bold shadow-xl shadow-blue-100 transition-all flex gap-3">
                    {submitting ? "Processing Dispensing..." : "Confirm Dispensing & Process Billing"}
                </Button>
            </form>
        </div>
    );
}
